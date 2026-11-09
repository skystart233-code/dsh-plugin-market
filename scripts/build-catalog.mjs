#!/usr/bin/env node
/**
 * Build `catalog.json` for the DSH plugin market from the dsh.goodcase.ai
 * (DSH 插件榜) snapshot.
 *
 * The site renders its catalog on the client; the full snapshot ships inside a
 * Turbopack chunk as `s.exports = JSON.parse('…')`. This script fetches the
 * /plugins page, finds that chunk, decodes the literal, trims the fields the
 * panel actually renders, and writes a compact catalog beside index.js.
 *
 * Usage:
 *   node scripts/build-catalog.mjs                # fetch the live site
 *   node scripts/build-catalog.mjs <chunk.js>     # decode a saved chunk
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'catalog.json');
const SITE = 'https://dsh.goodcase.ai';

/** Decode the single-quoted JS string literal that starts at `at`. */
function decodeLiteralAt(chunk, at) {
  const q = chunk.indexOf("'", at);
  if (q < 0) throw new Error('string literal not found in chunk');
  let out = '';
  for (let i = q + 1; i < chunk.length; i += 1) {
    const c = chunk[i];
    if (c === "'") return out;
    if (c !== '\\') { out += c; continue; }
    const n = chunk[i + 1];
    i += 1;
    if (n === '"') out += '"';
    else if (n === '\\') out += '\\';
    else if (n === 'n') out += '\n';
    else if (n === 'r') out += '\r';
    else if (n === 't') out += '\t';
    else if (n === 'u') { out += String.fromCharCode(parseInt(chunk.slice(i + 1, i + 5), 16)); i += 4; }
    else out += n;
  }
  throw new Error('unterminated string literal');
}

/** All JSON literals in one chunk that parse as objects. */
function jsonLiterals(chunk) {
  const found = [];
  let from = 0;
  for (;;) {
    const at = chunk.indexOf('JSON.parse(', from);
    if (at < 0) break;
    from = at + 10;
    try {
      found.push(JSON.parse(decodeLiteralAt(chunk, at)));
    } catch {
      // not every JSON.parse in the bundle is one of the data documents
    }
  }
  return found;
}

/** Pull the catalog + verification documents out of one chunk, or null. */
function tryChunk(chunk) {
  if (!chunk.includes('"capabilityRedLines"')) return null;
  const literals = jsonLiterals(chunk);
  const catalog = literals.find((value) => Array.isArray(value?.plugins) && value.plugins.length > 100);
  if (catalog === undefined) return null;
  const verification = literals.find((value) => value?.results && typeof value.results === 'object');
  return { catalog, verification: verification?.results ?? {} };
}

/** Fetch the /plugins page and decode the largest data-bearing chunk. */
async function fetchCatalog() {
  const html = await (await fetch(`${SITE}/plugins`)).text();
  const srcs = [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((m) => m[1]);
  const chunks = [];
  for (const src of srcs) {
    const url = new URL(src.replace(/&amp;/g, '&'), SITE);
    const body = await (await fetch(url)).text();
    if (body.includes('"capabilityRedLines"')) chunks.push(body);
  }
  for (const chunk of chunks.sort((a, b) => b.length - a.length)) {
    const data = tryChunk(chunk);
    if (data) return data;
  }
  throw new Error('catalog chunk not found');
}

/** `dsh plugin --profile web add <spec>` → `<spec>`. */
function installSpec(entry) {
  if (entry.npm) return entry.npm;
  const command = typeof entry.install === 'string' ? entry.install : '';
  const match = command.match(/dsh plugin\s+--profile\s+\S+\s+add\s+(.+)$/);
  if (!match) return null;
  let spec = match[1].trim().replace(/^["']|["']$/g, '');
  if (spec.startsWith('github:') || /^https?:\/\//.test(spec) || /^[./~]/.test(spec)) return spec;
  return null;
}

function trim(entry, verification) {
  const check = verification[`${entry.owner}/${entry.name}`];
  const scripts = [
    ...(Array.isArray(check?.lifecycleScripts) ? check.lifecycleScripts : []),
    ...(Array.isArray(check?.buildOnInstall) ? check.buildOnInstall : []),
  ];
  return {
    name: entry.name,
    owner: entry.owner,
    category: entry.category,
    description: entry.description ?? {},
    npm: entry.npm ?? null,
    version: entry.version ?? null,
    stars: entry.stars ?? 0,
    downloads: entry.downloads ?? null,
    capabilities: entry.capabilities ?? [],
    repo: entry.url ?? null,
    page: entry.page ?? null,
    install: entry.install ?? null,
    spec: installSpec(entry),
    added: entry.added ?? null,
    icon: entry.icon ?? null,
    manifest: check?.hasDshManifest === true,
    verdict: check?.verdict ?? null,
    buildScripts: [...new Set(scripts)],
  };
}

const only = process.argv[2];
const loaded = only
  ? tryChunk(await readFile(only, 'utf8'))
  : await fetchCatalog();
if (!loaded) throw new Error('no catalog');
const { catalog: data, verification } = loaded;

const plugins = data.plugins.map((entry) => trim(entry, verification));
const withSpec = plugins.filter((p) => p.spec && p.manifest).length;
const catalog = {
  name: data.name,
  url: data.url,
  source: data.source,
  updated: data.updated,
  count: plugins.length,
  installable: withSpec,
  fetchedAt: new Date().toISOString(),
  categories: data.categories,
  plugins,
};

await writeFile(OUT, JSON.stringify(catalog), 'utf8');
console.log(`wrote ${OUT}`);
console.log(`snapshot ${catalog.updated} · ${plugins.length} plugins · ${withSpec} one-click installable`);
