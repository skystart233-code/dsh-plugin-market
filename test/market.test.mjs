import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../index.js';

/** Build a fake plugin context plus a callable route. */
function harness({ installed = [], install = async () => ({ changed: true, application: 'applied', stage: 'install', target: 'x' }), services = {} } = {}) {
  let handler;
  const registrations = [];
  const manager = {
    async listBundles() { return installed; },
    async installBundle(spec, options) { return install(spec, options); },
    async removeBundle(name) { return { changed: true, application: 'applied', stage: 'remove', target: name }; },
    async setBundleEnabled(name, enabled) {
      return { changed: true, application: 'applied', stage: 'enable', target: name, enabled };
    },
    async cancelInstall() { return { status: 'not-running' }; },
  };
  const ctx = {
    webServer: {
      register(route) {
        registrations.push(route);
        handler = route.handler;
        return () => {};
      },
    },
    effect(fn) { return fn(); },
    get(name) { return name === 'pluginManager' ? manager : services[name]; },
    logger: { warn() {}, info() {} },
  };
  apply(ctx);
  assert.ok(handler, 'route registered');
  assert.deepEqual(registrations[0].path, '/api/dsh-market');

  async function call(method, body = {}, headers = {}) {
    const raw = Buffer.from(JSON.stringify(body));
    const req = {
      method: headers.method ?? 'POST',
      url: `/api/dsh-market/${method}`,
      headers: {
        host: '127.0.0.1:57496',
        origin: 'http://127.0.0.1:57496',
        'content-type': 'application/json',
        ...headers,
      },
      async *[Symbol.asyncIterator]() { yield raw; },
    };
    let result;
    const res = {
      writeHead(status, responseHeaders) { result = { status, headers: responseHeaders }; },
      end(payload) { result.body = JSON.parse(payload.toString()); },
    };
    await handler(req, res);
    return result;
  }
  return { call, manager };
}

test('bootstrap reports the snapshot', async () => {
  const { call } = harness();
  const result = await call('bootstrap');
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.value.count, 7557);
  assert.equal(result.body.value.installable, 7517);
  assert.equal(result.body.value.updated, '2026-10-28');
});

test('search matches names and descriptions, paged', async () => {
  const { call } = harness();
  const result = await call('search', { text: 'sidebar', limit: 5 });
  assert.equal(result.status, 200);
  const value = result.body.value;
  assert.ok(value.total > 0);
  assert.equal(value.entries.length, 5);
  assert.ok(value.entries.some((entry) => entry.name === 'DSH-better-sidebar'));
  assert.equal(value.nextOffset, 5);
});

test('category filter and name sort work', async () => {
  const { call } = harness();
  const result = await call('search', { category: 'fun', sort: 'name', limit: 8 });
  const value = result.body.value;
  assert.ok(value.total > 0);
  assert.ok(value.entries.every((entry) => entry.category === 'fun'));
  const names = value.entries.map((entry) => entry.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});

test('plugins without a dsh manifest are not one-click installable', async () => {
  const { call } = harness();
  const result = await call('search', { text: 'dsh-workspace-activity', limit: 5 });
  const entry = result.body.value.entries.find((item) => item.name === 'dsh-workspace-activity');
  assert.ok(entry);
  assert.equal(entry.installable, false);
  assert.equal(entry.manifest, false);
});

test('installed bundles are annotated and filtered', async () => {
  const { call } = harness({
    installed: [{
      name: 'dsh-better-sidebar', version: '0.28.2', enabled: true,
      removable: true, official: false, rows: [],
    }],
  });
  const result = await call('search', { text: 'DSH-better-sidebar', installedOnly: true });
  const value = result.body.value;
  assert.equal(value.total, 1);
  assert.equal(value.entries[0].status, 'installed');
  assert.equal(value.entries[0].installedVersion, '0.28.2');
});

test('installed view lists only profile-installed bundles with catalog metadata', async () => {
  const { call } = harness({
    installed: [
      {
        name: 'dsh-better-sidebar', version: '0.28.2', enabled: true, installed: true,
        removable: true, official: false, rows: [],
      },
      {
        name: '@deepseek-ai/dsh-base', version: '0.2.1-rc.3', enabled: true, installed: false,
        removable: false, official: false, rows: [],
      },
    ],
  });
  const result = await call('installed');
  assert.equal(result.status, 200);
  assert.equal(result.body.value.total, 1);
  const row = result.body.value.bundles[0];
  assert.equal(row.name, 'dsh-better-sidebar');
  assert.equal(row.inCatalog, true);
  assert.equal(row.updateAvailable, false);
  assert.ok(row.description.zh.includes('侧边栏'));
});

test('jobs lets a returning panel adopt a running install', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const { call } = harness({
    install: async (spec) => {
      await gate;
      return { changed: true, application: 'applied', stage: 'install', target: spec };
    },
  });
  const started = await call('install', { spec: 'dsh-pet', name: 'dsh-pet' });
  assert.equal(started.status, 200);
  const running = await call('jobs');
  assert.equal(running.body.value.jobs.length, 1);
  assert.equal(running.body.value.jobs[0].state, 'running');
  assert.equal(running.body.value.jobs[0].name, 'dsh-pet');
  assert.equal(running.body.value.jobs[0].spec, 'dsh-pet');
  assert.ok(running.body.value.jobs[0].startedAt > 0);
  release();
  await new Promise((resolve) => setTimeout(resolve, 30));
  const done = await call('jobs');
  assert.equal(done.body.value.jobs[0].state, 'done');
  assert.equal(done.body.value.jobs[0].result.application, 'applied');
});

test('only a newer catalog version counts as an update', async () => {
  const { call } = harness({
    installed: [
      {
        name: 'dsh-theme', version: '9.9.9', enabled: true, installed: true,
        removable: true, official: false, rows: [],
      },
      {
        name: 'dsh-better-sidebar', version: '0.0.1', enabled: true, installed: true,
        removable: true, official: false, rows: [],
      },
    ],
  });
  const view = await call('installed');
  const theme = view.body.value.bundles.find((row) => row.name === 'dsh-theme');
  const sidebar = view.body.value.bundles.find((row) => row.name === 'dsh-better-sidebar');
  assert.equal(theme.updateAvailable, false);
  assert.equal(sidebar.updateAvailable, true);
  const search = await call('search', { text: 'dsh-theme' });
  const entry = search.body.value.entries.find((item) => item.name === 'dsh-theme');
  assert.equal(entry.status, 'installed');
});

test('install forwards the existing enabled state', async () => {
  let seen;
  const { call } = harness({
    install: async (spec, options) => {
      seen = options;
      return { changed: true, application: 'applied', stage: 'install', target: spec };
    },
  });
  await call('install', { spec: 'dsh-theme', name: 'dsh-theme', enabled: false });
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(seen.enabled, false);
});

test('set-enabled flips one bundle layer', async () => {
  const { call } = harness();
  const result = await call('set-enabled', { name: 'dsh-theme', enabled: false });
  assert.equal(result.status, 200);
  assert.equal(result.body.value.stage, 'enable');
  assert.equal(result.body.value.enabled, false);
});

test('installed view exposes the disabled reason and install target', async () => {
  const { call } = harness({
    installed: [{
      name: '@deepseek-ai/dsh-subagent-codex', version: '0.2.1-rc.2',
      enabled: false, installed: true, removable: true, official: true, rows: [],
      error: {
        code: 'incompatible-version',
        incompatible: [{
          name: '@deepseek-ai/dsh-subagent-codex', version: '0.2.1-rc.2',
          runtimeVersion: '0.2.1-rc.3', requirements: { '@deepseek-ai/dsh-llm': '0.2.1-rc.2' },
        }],
      },
      installTarget: {
        spec: '@deepseek-ai/dsh-subagent-codex@0.2.1-rc.3', version: '0.2.1-rc.3',
      },
    }],
  });
  const result = await call('installed');
  const row = result.body.value.bundles[0];
  assert.equal(row.error.code, 'incompatible-version');
  assert.equal(row.errorCode, 'incompatible-version');
  assert.equal(row.updateAvailable, true);
  assert.equal(row.latestVersion, '0.2.1-rc.3');
  assert.equal(row.spec, '@deepseek-ai/dsh-subagent-codex@0.2.1-rc.3');
  assert.equal(row.installable, true);
});

test('install starts a job and poll returns its result', async () => {
  const { call } = harness({
    install: async (spec) => ({
      changed: true, application: 'restart-required', stage: 'install',
      target: spec, bundle: spec, version: '1.0.0',
      packageResult: { exitCode: 0, output: 'done', truncated: false, logPath: '' },
    }),
  });
  const started = await call('install', { spec: 'dsh-pet', name: 'dsh-pet' });
  assert.equal(started.status, 200);
  const requestId = started.body.value.requestId;
  assert.ok(requestId);
  await new Promise((resolve) => setTimeout(resolve, 30));
  const polled = await call('poll', { requestId });
  assert.equal(polled.body.value.state, 'done');
  assert.equal(polled.body.value.result.application, 'restart-required');
});

test('install surfaces pending build scripts', async () => {
  const { call } = harness({
    install: async () => ({ changed: false, application: 'failed', stage: 'install', target: 'x', pendingBuilds: ['prepare'] }),
  });
  const started = await call('install', { spec: 'x', name: 'x' });
  await new Promise((resolve) => setTimeout(resolve, 30));
  const polled = await call('poll', { requestId: started.body.value.requestId });
  assert.equal(polled.body.value.state, 'approval-required');
  assert.deepEqual(polled.body.value.result.pendingBuilds, ['prepare']);
});

test('remove calls the manager', async () => {
  const { call } = harness();
  const result = await call('remove', { name: 'dsh-pet' });
  assert.equal(result.body.value.application, 'applied');
});

test('chat primes a hidden brief and sends the first question', async () => {
  const seen = { create: null, contexts: [], prompts: [] };
  const { call } = harness({
    services: {
      sessionController: {
        async create(request) { seen.create = request; return { sessionId: 's-chat' }; },
        async resolveAgent(id) {
          assert.equal(id, 's-chat');
          return {
            agent: {
              id,
              ctx: {
                systemPrompt: {
                  context(value) { seen.contexts.push(value); return () => {}; },
                },
                effect(fn) { fn(); },
              },
            },
          };
        },
        async prompt(request) { seen.prompts.push(request); return { accepted: true }; },
      },
    },
  });
  const result = await call('chat', { brief: '【插件档案】test', question: '这个插件安全吗？' });
  assert.equal(result.status, 200);
  assert.equal(result.body.value.sessionId, 's-chat');
  assert.deepEqual(seen.create, {});
  assert.equal(seen.contexts.length, 1);
  assert.equal(seen.contexts[0].name, 'plugin-market-brief');
  assert.equal(seen.contexts[0].text, '【插件档案】test');
  assert.equal(seen.contexts[0].interpolate, false);
  assert.equal(seen.prompts.length, 1);
  assert.equal(seen.prompts[0].sessionId, 's-chat');
  assert.equal(seen.prompts[0].mode, 'queue');
  assert.equal(seen.prompts[0].content[0].text, '这个插件安全吗？');
  assert.ok(seen.prompts[0].requestId);
});

test('chat can prime a session without sending a question', async () => {
  let prompted = 0;
  const { call } = harness({
    services: {
      sessionController: {
        async create() { return { sessionId: 's-blank' }; },
        async resolveAgent() {
          return {
            agent: {
              ctx: {
                systemPrompt: { context() { return () => {}; } },
                effect(fn) { fn(); },
              },
            },
          };
        },
        async prompt() { prompted += 1; return { accepted: true }; },
      },
    },
  });
  const result = await call('chat', { brief: '【插件档案】test', question: '' });
  assert.equal(result.status, 200);
  assert.equal(result.body.value.sessionId, 's-blank');
  assert.equal(prompted, 0);
});

test('chat reports a missing session controller', async () => {
  const { call } = harness();
  const result = await call('chat', { brief: 'x', question: 'hi' });
  assert.equal(result.status, 400);
  assert.equal(result.body.ok, false);
  assert.match(result.body.error.message, /会话控制器/);
});

test('cross-site, GET, and unknown methods are refused', async () => {
  const { call } = harness();
  const crossSite = await call('search', {}, { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' });
  assert.equal(crossSite.status, 403);
  const get = await call('search', {}, { method: 'GET' });
  assert.equal(get.status, 405);
  const unknown = await call('nope', {});
  assert.equal(unknown.status, 404);
});
