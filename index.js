/**
 * Host half of the DSH plugin market.
 *
 * Serves the dsh.goodcase.ai snapshot (`catalog.json`) over one loopback HTTP
 * endpoint and performs real installs/removals through the Harness
 * `pluginManager` service, so the panel's buttons are one click rather than a
 * copied shell command.
 *
 * The endpoint is POST-only JSON. Requests must come from the page itself
 * (same Host, no cross-site fetch); the catalog is read-only apart from the
 * install/remove methods the panel calls.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

/** Absolute path of the bundled snapshot. */
const CATALOG_PATH = join(dirname(fileURLToPath(import.meta.url)), 'catalog.json');

/** Route prefix owned by this plugin. */
const ROUTE = '/api/dsh-market';

/** Largest JSON request this endpoint accepts. */
const MAX_BODY = 64 * 1024;

/** How long a finished install result stays readable by the poller. */
const JOB_TTL_MS = 30 * 60 * 1000;

/** Services this plugin needs at activation. */
export const inject = ['webServer'];

/** Bound JSON response writer. */
function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

/** Whether one request may reach the plugin routes. */
function trustedRequest(req) {
  const host = req.headers.host;
  if (typeof host !== 'string' || host === '') return false;
  const hostUrl = (() => {
    try { return new URL(`http://${host}`); } catch { return undefined; }
  })();
  if (hostUrl === undefined) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  const origin = req.headers.origin;
  if (typeof origin !== 'string' || origin === '') {
    // A browser POST always carries Origin; without one, accept only loopback.
    return hostUrl.hostname === '127.0.0.1' || hostUrl.hostname === 'localhost' || hostUrl.hostname === '[::1]' || hostUrl.hostname === '::1';
  }
  if (origin === 'dsh-app://app') return true;
  try {
    const originUrl = new URL(origin);
    return originUrl.host === hostUrl.host;
  } catch {
    return false;
  }
}

/** Read a bounded JSON request body. */
async function readJson(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY) throw new Error('request body too large');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (text.trim() === '') return {};
  return JSON.parse(text);
}

/** One human-readable error message from an unknown throw. */
function messageOf(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try { return JSON.stringify(error); } catch { return 'unknown error'; }
}

/** Normalize localized text from the snapshot into `{ zh, en }`. */
function localized(value) {
  if (typeof value === 'string') return { zh: value, en: value };
  if (value === null || typeof value !== 'object') return { zh: '', en: '' };
  return {
    zh: typeof value.zh === 'string' ? value.zh : (typeof value.en === 'string' ? value.en : ''),
    en: typeof value.en === 'string' ? value.en : (typeof value.zh === 'string' ? value.zh : ''),
  };
}

/** Numeric publish-like timestamp from a YYYY-MM-DD string, for sorting. */
function addedAt(value) {
  const ms = typeof value === 'string' ? Date.parse(`${value}T00:00:00Z`) : NaN;
  return Number.isFinite(ms) ? ms : 0;
}

/** Parse a dotted semver string into core parts and prerelease identifiers. */
function parseVersion(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/^v/i, '').split('+')[0];
  const [core, prerelease] = cleaned.split('-');
  const parts = core.split('.').map((part) => Number(part));
  if (parts.length === 0 || parts.some((part) => !Number.isInteger(part) || part < 0)) return null;
  return { parts, prerelease: prerelease === undefined || prerelease === '' ? [] : prerelease.split('.') };
}

/**
 * Semver precedence, enough for the versions this catalog publishes.
 * Returns null when either side is not a dotted version.
 */
function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (a === null || b === null) return null;
  const length = Math.max(a.parts.length, b.parts.length, 3);
  for (let i = 0; i < length; i += 1) {
    const diff = (a.parts[i] ?? 0) - (b.parts[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  if (a.prerelease.length === 0 && b.prerelease.length > 0) return 1;
  if (a.prerelease.length > 0 && b.prerelease.length === 0) return -1;
  for (let i = 0; i < Math.max(a.prerelease.length, b.prerelease.length); i += 1) {
    const x = a.prerelease[i];
    const y = b.prerelease[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xNumeric = /^\d+$/.test(x);
    const yNumeric = /^\d+$/.test(y);
    if (xNumeric && yNumeric) {
      const diff = Number(x) - Number(y);
      if (diff !== 0) return diff > 0 ? 1 : -1;
    } else if (xNumeric !== yNumeric) {
      return xNumeric ? -1 : 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

/**
 * Host-side face of the market: catalog, installation facts, install jobs.
 */
class Market {
  /** @param {any} ctx - plugin context. */
  constructor(ctx) {
    this.ctx = ctx;
    this.catalogPromise = null;
    this.jobs = new Map();
    this.activeInstall = null;
    this.installedCache = null;
    this.installedCachedAt = 0;
  }

  /** Load and pre-index the bundled snapshot once. */
  async catalog() {
    if (this.catalogPromise === null) {
      this.catalogPromise = readFile(CATALOG_PATH, 'utf8').then((raw) => {
        const data = JSON.parse(raw);
        data.plugins = data.plugins.map((entry) => {
          const description = localized(entry.description);
          return {
            ...entry,
            description,
            _hay: [
              entry.name,
              entry.npm ?? '',
              entry.owner ?? '',
              description.zh,
              description.en,
              ...(entry.capabilities ?? []),
            ].join(' ').toLowerCase(),
            _added: addedAt(entry.added),
          };
        });
        return data;
      });
    }
    return this.catalogPromise;
  }

  /** Installed bundle facts, cached briefly because the panel asks repeatedly. */
  async installed() {
    if (this.installedCache !== null && Date.now() - this.installedCachedAt < 2500) {
      return this.installedCache;
    }
    const manager = this.ctx.get('pluginManager');
    if (manager === undefined) {
      this.installedCache = { available: false, bundles: [] };
      this.installedCachedAt = Date.now();
      return this.installedCache;
    }
    const list = await manager.listBundles();
    const bundles = list.map((bundle) => ({
      name: bundle.name,
      version: bundle.version ?? null,
      enabled: bundle.enabled === true,
      installed: bundle.installed === true,
      removable: bundle.removable === true,
      official: bundle.official === true,
      readOnlyReason: bundle.readOnlyReason ?? null,
      title: bundle.meta?.title ?? null,
      description: bundle.meta?.description ?? bundle.description ?? null,
      icon: bundle.meta?.icon ?? null,
      metaError: bundle.meta?.error ?? null,
      availability: bundle.availability ?? null,
      source: bundle.source ?? null,
      error: bundle.error ?? null,
      errorCode: bundle.error?.code ?? null,
      installTarget: bundle.installTarget ?? null,
      modules: (bundle.rows ?? []).map((row) => row.moduleName),
    }));
    this.installedCache = { available: true, bundles };
    this.installedCachedAt = Date.now();
    return this.installedCache;
  }

  /** Installed bundles joined with catalog metadata for the Installed tab. */
  async installedView() {
    const [catalog, installed] = await Promise.all([this.catalog(), this.installed()]);
    const index = new Map();
    for (const entry of catalog.plugins) {
      if (typeof entry.npm === 'string' && entry.npm !== '') index.set(entry.npm, entry);
      if (typeof entry.name === 'string' && entry.name !== '') index.set(entry.name, entry);
    }
    const rows = installed.bundles.filter((bundle) => bundle.installed === true).map((bundle) => {
      let entry;
      for (const key of [bundle.name, ...bundle.modules]) {
        entry = index.get(key);
        if (entry !== undefined) break;
      }
      const comparison = entry?.version === undefined || bundle.version === null
        ? null
        : compareVersions(entry.version, bundle.version);
      const targetComparison = bundle.installTarget?.version === undefined || bundle.version === null
        ? null
        : compareVersions(bundle.installTarget.version, bundle.version);
      const updateComparison = comparison !== null ? comparison : targetComparison;
      const fallbackSpec = updateComparison !== null && updateComparison > 0
        ? (bundle.installTarget?.spec ?? null)
        : null;
      const spec = entry?.spec ?? fallbackSpec;
      return {
        name: bundle.name,
        title: bundle.title ?? entry?.name ?? null,
        description: entry?.description ?? bundle.description,
        category: entry?.category ?? null,
        icon: bundle.icon ?? entry?.icon ?? null,
        version: bundle.version,
        latestVersion: entry?.version ?? bundle.installTarget?.version ?? null,
        updateAvailable: updateComparison !== null && updateComparison > 0,
        enabled: bundle.enabled,
        removable: bundle.removable,
        official: bundle.official,
        availability: bundle.availability,
        readOnlyReason: bundle.readOnlyReason,
        source: bundle.source,
        error: bundle.error ?? null,
        errorCode: bundle.errorCode,
        metaError: bundle.metaError ?? null,
        installTarget: bundle.installTarget ?? null,
        owner: entry?.owner ?? null,
        stars: entry?.stars ?? 0,
        downloads: entry?.downloads ?? null,
        capabilities: entry?.capabilities ?? [],
        install: entry?.install ?? null,
        spec,
        installable: entry === undefined
          ? (typeof spec === 'string' && spec !== '')
          : (entry.manifest === true && typeof entry.spec === 'string' && entry.spec !== ''),
        buildScripts: entry?.buildScripts ?? [],
        page: entry?.page ?? null,
        repo: entry?.repo ?? null,
        added: entry?.added ?? null,
        inCatalog: entry !== undefined,
        modules: bundle.modules,
      };
    });
    rows.sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name));
    return { available: installed.available, total: rows.length, bundles: rows };
  }

  /** Drop the installation cache after a mutation. */
  invalidateInstalled() {
    this.installedCache = null;
  }

  /** Installation status of one entry against the installed map. */
  static statusOf(entry, byName) {
    const keys = [entry.npm, entry.name, entry.spec].filter((key) => typeof key === 'string' && key !== '');
    let found;
    for (const key of keys) {
      found = byName.get(key);
      if (found !== undefined) break;
    }
    if (found === undefined) return { status: 'not-installed', installedVersion: null, removable: false, enabled: false };
    const installedVersion = found.version;
    const comparison = entry.version === null ? null : compareVersions(entry.version, installedVersion);
    return {
      // A catalog version older than what is installed is not an update.
      status: comparison !== null && comparison > 0 ? 'different-version' : 'installed',
      installedVersion,
      removable: found.removable,
      enabled: found.enabled,
    };
  }

  /** Page of entries for a query. */
  async search(query) {
    const catalog = await this.catalog();
    const installed = await this.installed();
    const byName = new Map();
    for (const bundle of installed.bundles) {
      byName.set(bundle.name, bundle);
      for (const moduleName of bundle.modules) {
        if (!byName.has(moduleName)) byName.set(moduleName, bundle);
      }
    }
    const text = typeof query.text === 'string' ? query.text.trim().toLowerCase() : '';
    const terms = text === '' ? [] : text.split(/\s+/);
    const category = typeof query.category === 'string' ? query.category : '';
    const installedOnly = query.installedOnly === true;
    const sort = typeof query.sort === 'string' ? query.sort : 'recommended';
    const offset = Number.isInteger(query.offset) && query.offset > 0 ? query.offset : 0;
    const limit = Number.isInteger(query.limit) && query.limit > 0 ? Math.min(query.limit, 60) : 24;

    let rows = catalog.plugins;
    if (category !== '') rows = rows.filter((entry) => entry.category === category);
    if (terms.length > 0) {
      rows = rows.filter((entry) => terms.every((term) => entry._hay.includes(term)));
    }
    if (installedOnly) {
      rows = rows.filter((entry) => Market.statusOf(entry, byName).status !== 'not-installed');
    }

    const sorted = [...rows];
    if (sort === 'downloads') sorted.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0) || (b.stars ?? 0) - (a.stars ?? 0));
    else if (sort === 'latest') sorted.sort((a, b) => b._added - a._added || (b.stars ?? 0) - (a.stars ?? 0));
    else if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0) || (b.downloads ?? 0) - (a.downloads ?? 0));

    const page = sorted.slice(offset, offset + limit).map((entry) => {
      const status = Market.statusOf(entry, byName);
      return {
        name: entry.name,
        owner: entry.owner,
        category: entry.category,
        description: entry.description,
        npm: entry.npm,
        version: entry.version,
        stars: entry.stars ?? 0,
        downloads: entry.downloads ?? null,
        capabilities: entry.capabilities ?? [],
        repo: entry.repo,
        page: entry.page,
        install: entry.install,
        spec: entry.spec,
        added: entry.added,
        icon: entry.icon,
        manifest: entry.manifest === true,
        installable: entry.manifest === true && typeof entry.spec === 'string' && entry.spec !== '',
        buildScripts: entry.buildScripts ?? [],
        status: status.status,
        installedVersion: status.installedVersion,
        removable: status.removable,
        enabled: status.enabled,
      };
    });

    return {
      total: rows.length,
      offset,
      nextOffset: offset + limit < rows.length ? offset + limit : null,
      entries: page,
      installedAvailable: installed.available,
    };
  }

  /** Bootstrap payload for the panel header. */
  async bootstrap() {
    const catalog = await this.catalog();
    return {
      title: catalog.name,
      site: catalog.url,
      source: catalog.source,
      updated: catalog.updated,
      fetchedAt: catalog.fetchedAt,
      count: catalog.count,
      installable: catalog.installable,
      categories: catalog.categories,
      installed: (await this.installed()).bundles.filter((bundle) => bundle.installed === true).length,
    };
  }

  /** Start one install job and return its id. */
  async install(request) {
    const manager = this.ctx.get('pluginManager');
    if (manager === undefined) throw new Error('当前 Harness 没有可用的插件管理器');
    if (this.activeInstall !== null) throw new Error('已有安装任务进行中，请等待它完成');
    const spec = typeof request.spec === 'string' ? request.spec.trim() : '';
    if (spec === '') throw new Error('这个条目没有可执行的安装规格');
    const label = typeof request.name === 'string' ? request.name : spec;
    const approvedBuilds = Array.isArray(request.approvedBuilds)
      ? request.approvedBuilds.filter((name) => typeof name === 'string')
      : [];
    const enabled = request.enabled === true ? true : (request.enabled === false ? false : undefined);
    this.pruneJobs();
    const id = randomUUID();
    const job = {
      id,
      label,
      spec,
      enabled,
      state: 'running',
      startedAt: Date.now(),
      result: null,
      error: null,
    };
    this.jobs.set(id, job);
    this.activeInstall = id;
    if (approvedBuilds.length > 0) {
      // The approval that led to this retry is superseded; keep the new job only.
      for (const [oldId, old] of this.jobs) {
        if (oldId !== id && old.state === 'approval-required' && old.spec === spec) this.jobs.delete(oldId);
      }
    }
    void this.runJob(job, approvedBuilds);
    return { requestId: id };
  }

  /** Run one installBundle call to completion. */
  async runJob(job, approvedBuilds) {
    const manager = this.ctx.get('pluginManager');
    try {
      const result = await manager.installBundle(job.spec, {
        requestId: job.id,
        ...(job.enabled === undefined ? {} : { enabled: job.enabled }),
        ...(approvedBuilds.length > 0 ? { approvedBuilds } : {}),
      });
      job.result = result;
      job.state = Array.isArray(result.pendingBuilds) && result.pendingBuilds.length > 0
        ? 'approval-required'
        : 'done';
    } catch (error) {
      job.state = 'error';
      job.error = messageOf(error);
    } finally {
      job.finishedAt = Date.now();
      this.activeInstall = null;
      this.invalidateInstalled();
    }
  }

  /** Stop a running install. */
  async cancel(requestId) {
    const manager = this.ctx.get('pluginManager');
    if (manager === undefined) throw new Error('当前 Harness 没有可用的插件管理器');
    const job = this.jobs.get(requestId);
    if (job === undefined) return { status: 'not-running' };
    const outcome = await manager.cancelInstall(requestId);
    if (this.activeInstall === requestId) this.activeInstall = null;
    if (outcome.status === 'cancelled' || outcome.status === 'not-running') {
      job.state = 'cancelled';
    }
    this.invalidateInstalled();
    return outcome;
  }

  /** Poll one install job. */
  poll(requestId) {
    const job = this.jobs.get(requestId);
    if (job === undefined) return { state: 'unknown' };
    return {
      state: job.state,
      name: job.label,
      spec: job.spec,
      enabled: job.enabled,
      startedAt: job.startedAt,
      result: job.result === null ? null : presentChange(job.result),
      error: job.error,
    };
  }

  /**
   * Every job the panel may still care about. A client that re-enters the
   * market adopts a running job from here, so an install behaves like an app
   * store download instead of vanishing with the panel.
   */
  listJobs() {
    this.pruneJobs();
    return [...this.jobs.values()]
      .filter((job) => job.state !== 'cancelled')
      .map((job) => ({
        requestId: job.id,
        name: job.label,
        spec: job.spec,
        enabled: job.enabled,
        state: job.state,
        startedAt: job.startedAt,
        result: job.result === null ? null : presentChange(job.result),
        error: job.error,
      }));
  }

  /** Remove one installed bundle. */
  async remove(request) {
    const manager = this.ctx.get('pluginManager');
    if (manager === undefined) throw new Error('当前 Harness 没有可用的插件管理器');
    if (this.activeInstall !== null) throw new Error('安装任务进行中，暂时不能卸载');
    const name = typeof request.name === 'string' ? request.name.trim() : '';
    if (name === '') throw new Error('缺少要卸载的包名');
    const result = await manager.removeBundle(name);
    this.invalidateInstalled();
    return presentChange(result);
  }

  /** Enable or disable one installed bundle layer. */
  async setEnabled(request) {
    const manager = this.ctx.get('pluginManager');
    if (manager === undefined) throw new Error('当前 Harness 没有可用的插件管理器');
    if (this.activeInstall !== null) throw new Error('安装任务进行中，暂时不能切换插件状态');
    const name = typeof request.name === 'string' ? request.name.trim() : '';
    if (name === '') throw new Error('缺少要切换的包名');
    if (typeof request.enabled !== 'boolean') throw new Error('缺少 enabled 状态');
    const result = await manager.setBundleEnabled(name, request.enabled);
    this.invalidateInstalled();
    return presentChange(result);
  }

  /**
   * Open a new conversation primed with a hidden plugin brief, then send the
   * user's first question as a normal message. The brief lives in the agent's
   * system-prompt context, so the transcript only shows the question and the
   * answer — the customer-service experience the panel asks for.
   */
  async openChat(request) {
    const controller = this.ctx.get('sessionController');
    if (controller === undefined) throw new Error('当前 Harness 没有可用的会话控制器');
    const brief = typeof request.brief === 'string' ? request.brief.trim() : '';
    const question = typeof request.question === 'string' ? request.question.trim() : '';
    if (brief === '') throw new Error('缺少插件背景信息');
    if (brief.length > 24000) throw new Error('插件背景信息过长');
    if (question.length > 6000) throw new Error('问题过长');

    const created = await controller.create({});
    const sessionId = created?.sessionId;
    if (typeof sessionId !== 'string' || sessionId === '') {
      throw new Error('会话创建失败');
    }
    const resolved = await controller.resolveAgent(sessionId);
    if (resolved === null || typeof resolved !== 'object' || resolved.agent === undefined) {
      throw new Error('无法连接新会话的 Agent');
    }
    const agentCtx = resolved.agent.ctx;
    if (agentCtx === null || agentCtx === undefined) {
      throw new Error('新会话的 Agent 没有可用的上下文');
    }
    const systemPrompt = agentCtx.systemPrompt ?? agentCtx.get?.('systemPrompt');
    if (systemPrompt === undefined || typeof systemPrompt.context !== 'function') {
      throw new Error('当前 Harness 没有可用的 system prompt 服务');
    }
    const register = () => systemPrompt.context({
      name: 'plugin-market-brief',
      order: 950,
      text: brief,
      interpolate: false,
    });
    if (typeof agentCtx.effect === 'function') {
      agentCtx.effect(register, 'plugin-market: hidden plugin brief');
    } else {
      register();
    }

    if (question !== '') {
      await controller.prompt({
        requestId: randomUUID(),
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text: question }],
      });
    }
    return { sessionId };
  }

  /** Forget finished jobs older than the TTL. */
  pruneJobs() {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (job.state === 'running') continue;
      const finishedAt = typeof job.finishedAt === 'number' ? job.finishedAt : job.startedAt;
      if (now - finishedAt > JOB_TTL_MS) this.jobs.delete(id);
    }
  }
}

/** Trim a ChangeResult for the wire, keeping the fields the panel reports. */
function presentChange(result) {
  if (result === null || typeof result !== 'object') return result;
  const pkg = result.packageResult;
  return {
    changed: result.changed === true,
    application: result.application ?? null,
    restartReason: result.restartReason ?? null,
    stage: result.stage ?? null,
    target: result.target ?? null,
    enabled: result.enabled ?? null,
    bundle: result.bundle ?? null,
    version: result.version ?? null,
    pendingBuilds: Array.isArray(result.pendingBuilds) ? result.pendingBuilds : [],
    approvedBuilds: Array.isArray(result.approvedBuilds) ? result.approvedBuilds : [],
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    error: result.error === undefined ? null : result.error,
    package: pkg === undefined || pkg === null ? null : {
      exitCode: pkg.exitCode ?? null,
      kind: pkg.kind ?? null,
      timedOut: pkg.timedOut === true,
      truncated: pkg.truncated === true,
      output: typeof pkg.output === 'string' ? pkg.output.slice(-6000) : '',
    },
  };
}

/**
 * Register the market endpoint.
 * @param {any} ctx - the plugin context.
 */
export function apply(ctx) {
  const market = new Market(ctx);

  const methods = {
    bootstrap: () => market.bootstrap(),
    search: (body) => market.search(body ?? {}),
    installed: () => market.installedView(),
    install: (body) => market.install(body ?? {}),
    jobs: () => ({ jobs: market.listJobs() }),
    poll: (body) => market.poll(typeof body.requestId === 'string' ? body.requestId : ''),
    cancel: (body) => market.cancel(typeof body.requestId === 'string' ? body.requestId : ''),
    remove: (body) => market.remove(body ?? {}),
    'set-enabled': (body) => market.setEnabled(body ?? {}),
    chat: (body) => market.openChat(body ?? {}),
  };

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler: async (req, res) => {
      if (!trustedRequest(req)) {
        send(res, 403, { ok: false, error: { code: 'forbidden', message: 'forbidden' } });
        return;
      }
      if (req.method !== 'POST') {
        send(res, 405, { ok: false, error: { code: 'method', message: 'POST only' } });
        return;
      }
      const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname;
      const method = pathname.startsWith(`${ROUTE}/`) ? pathname.slice(ROUTE.length + 1) : '';
      const run = Object.hasOwn(methods, method) ? methods[method] : undefined;
      if (run === undefined) {
        send(res, 404, { ok: false, error: { code: 'not-found', message: `unknown method "${method}"` } });
        return;
      }
      try {
        const value = await run(await readJson(req));
        send(res, 200, { ok: true, value });
      } catch (error) {
        ctx.logger.warn('plugin-market: %s failed: %s', method, messageOf(error));
        send(res, 400, { ok: false, error: { code: 'failed', message: messageOf(error) } });
      }
    },
  }), 'plugin-market: /api/dsh-market routes');
}
