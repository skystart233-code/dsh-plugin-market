#!/usr/bin/env node
/**
 * Render README previews from the real panel styles with sample data.
 *
 *   node tools/preview.mjs            # write HTML into tools/.preview
 *   node tools/preview.mjs --shot     # also capture docs/*.png with Edge/Chrome
 *
 * The previews are deliberately static: no React, no Harness, no profile data.
 * They exercise the same class names, spacing, and theme tokens as client.js so
 * a layout regression in the panel shows up here too.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tools', '.preview');
const DOCS = join(ROOT, 'docs');

/** Pull the CSS string array out of client.js, so previews cannot drift. */
function readPanelCss() {
  const source = readFileSync(join(ROOT, 'client.js'), 'utf8');
  const match = source.match(/const CSS = \[([\s\S]*?)\]\.join\('\\n'\);/);
  if (match === null) throw new Error('client.js: CSS array not found');
  const parts = new Function(`return [${match[1]}];`)();
  return parts.join('\n');
}

const PANEL_CSS = readPanelCss();

const THEME = `
:root {
  --dsw-alias-bg-base: #f7f7f8;
  --dsw-alias-bg-layer-1: #ffffff;
  --dsw-alias-bg-layer-2: #f1f1f3;
  --dsw-alias-bg-overlay: #ffffff;
  --dsw-alias-border-l1: #ececef;
  --dsw-alias-border-l2: #dcdce1;
  --dsw-alias-label-primary: #18181b;
  --dsw-alias-label-secondary: #71717a;
  --dsw-alias-brand-primary: #18181b;
  --dsw-alias-state-success-primary: #16a34a;
  --dsw-alias-state-error-primary: #dc2626;
}
html, body { margin: 0; padding: 0; background: var(--dsw-alias-bg-base); }
body {
  width: 1440px;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
* { box-sizing: border-box; }
.dshMkt-root { height: auto; min-height: 100vh; }
.dshMkt-spinner { color: var(--dsw-alias-label-secondary); }
.dshMkt-btn svg, .dshMkt-metaItem svg, .dshMkt-statePill svg { display: block; }
.dshMkt-cardFoot .dshMkt-grow { flex: 1 1 auto; }
.dshMkt-done svg { display: block; }
body::after { content: ""; position: fixed; inset: 0; border: 1px solid rgba(0,0,0,.055); pointer-events: none; }
.dshMkt-overlay { background: rgba(15,18,24,.5); }
.dshMkt-overlay, .dshMkt-modal, .dshMkt-toast { animation: none !important; }
`;

const ICON_PATHS = {
  bag: '<path d="M6.2 8.5h11.6l-.8 9.1a2 2 0 0 1-2 1.9H9a2 2 0 0 1-2-1.9L6.2 8.5Z"/><path d="M9.5 8.5V6.7a3.5 3.5 0 0 1 7 0v1.8"/><path d="M10.8 12.4h4.4M13 10.2v4.4"/>',
  search: '<circle cx="10.8" cy="10.8" r="5.4"/><path d="m14.8 14.8 4.2 4.2"/>',
  refresh: '<path d="M20 11a8 8 0 1 1-2.4-5.7"/><path d="M20 4v6h-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
  chat: '<path d="M20 11.6a7.6 7.6 0 0 1-8 7.4 8.7 8.7 0 0 1-3.4-.7L4 20l1.5-4A7.3 7.3 0 0 1 4 11.6 7.6 7.6 0 0 1 12 4a7.6 7.6 0 0 1 8 7.6Z"/>',
  star: '<path d="m12 4 2.5 5.1 5.6.8-4 4 .9 5.6L12 16.9 7 19.5l.9-5.6-4-4 5.6-.8L12 4Z"/>',
  download: '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 19h14"/>',
  check: '<path d="m5 12.5 4.4 4.4L19 6.8"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  shield: '<path d="M12 3.5 19 6v5.4c0 4.4-2.8 7.6-7 9.1-4.2-1.5-7-4.7-7-9.1V6l7-2.5Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  spark: '<path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z"/><path d="M19 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/>',
};

/** 24px stroke icon. */
function icon(name, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] ?? ''}</svg>`;
}

/** The real bundle icon, inlined so the preview is one self-contained file. */
const MARK = `<svg width="26" height="26" viewBox="0 0 128 128" aria-hidden="true">
<defs><linearGradient id="mg" x1="18" y1="10" x2="110" y2="120" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#fb923c"/><stop offset=".55" stop-color="#ef4444"/><stop offset="1" stop-color="#b91c1c"/>
</linearGradient></defs>
<g fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
<path d="M34 52h60l-4.1 40.2a9 9 0 0 1-9 8.1H47.1a9 9 0 0 1-9-8.1L34 52Z"/>
<path d="M51 52v-6.7a13 13 0 0 1 26 0V52"/><path d="M52 71h24"/><path d="M64 59v24"/>
</g></svg>`;

const LOGO_COLORS = [
  ['#fff1f2', '#be123c'],
  ['#eef2ff', '#4338ca'],
  ['#ecfdf5', '#047857'],
  ['#eff6ff', '#1d4ed8'],
  ['#fdf4ff', '#a21caf'],
  ['#f0f9ff', '#0369a1'],
  ['#fefce8', '#a16207'],
  ['#f5f3ff', '#6d28d9'],
];

function logo(letter, index = 0) {
  const [background, color] = LOGO_COLORS[index % LOGO_COLORS.length];
  return `<span class="dshMkt-logo" style="background:${background};color:${color}">${letter}</span>`;
}

function meta(stars, downloads, version) {
  return `<div class="dshMkt-meta">
    <span class="dshMkt-metaItem">${icon('star', 13)}${stars}</span>
    <span class="dshMkt-metaItem">${icon('download', 13)}${downloads}</span>
    <span class="dshMkt-metaItem">${version}</span>
  </div>`;
}

const chatButton = (title) =>
  `<button class="dshMkt-btn" data-kind="quiet" title="和 ${title} 对话">${icon('chat', 16)}</button>`;
const externalButton = () =>
  `<button class="dshMkt-btn" data-kind="quiet" title="打开仓库">${icon('external', 16)}</button>`;

/** Catalog card used by the Discover preview. */
function card(item, index) {
  return `<article class="dshMkt-card">
    <div class="dshMkt-cardTop">
      ${logo(item.letter, index)}
      <div class="dshMkt-cardHead">
        <h3 class="dshMkt-cardTitle">${item.title}</h3>
        <span class="dshMkt-cardOwner">${item.owner}</span>
      </div>
      <span class="dshMkt-cat">${item.category}</span>
    </div>
    <p class="dshMkt-desc">${item.description}</p>
    ${meta(item.stars, item.downloads, item.version)}
    <div class="dshMkt-cardFoot">
      ${item.installed
        ? `<span class="dshMkt-done">${icon('check', 14)}已安装</span>`
        : `<button class="dshMkt-btn" data-kind="primary">安装</button>`}
      <button class="dshMkt-btn" data-kind="ghost">详情</button>
      <span class="dshMkt-grow"></span>
      ${chatButton(item.title)}
      ${externalButton()}
    </div>
  </article>`;
}

/** Installed card with switch, update and disabled-reason affordances. */
function installedCard(item, index) {
  return `<article class="dshMkt-card">
    <div class="dshMkt-cardTop">
      ${logo(item.letter, index)}
      <div class="dshMkt-cardHead">
        <h3 class="dshMkt-cardTitle">${item.title}</h3>
        <span class="dshMkt-cardOwner">${item.owner}</span>
      </div>
      <div class="dshMkt-cardSide">
        <span class="dshMkt-cat">${item.category}</span>
        <button class="dshMkt-switch" data-on="${item.enabled}" aria-checked="${item.enabled}" role="switch" aria-label="${item.title}">
          <span class="dshMkt-switchKnob"></span>
        </button>
      </div>
    </div>
    <p class="dshMkt-desc">${item.description}</p>
    <div class="dshMkt-meta">
      <span class="dshMkt-metaItem">${item.version}</span>
      <span class="dshMkt-statePill" data-on="${item.enabled}">
        <span class="dshMkt-dot"></span>${item.enabled ? '已启用' : '已停用'}
      </span>
      ${item.latest ? `<span class="dshMkt-metaItem">最新 ${item.latest}</span>` : ''}
    </div>
    ${item.disabledReason ? `<div class="dshMkt-meta"><button class="dshMkt-whyBtn">为什么停用？</button><span class="dshMkt-tag">${item.disabledReason}</span></div>` : ''}
    <div class="dshMkt-cardFoot">
      ${item.latest ? `<button class="dshMkt-btn" data-kind="primary">更新到 ${item.latest}</button>` : ''}
      <button class="dshMkt-btn" data-kind="danger">卸载</button>
      <button class="dshMkt-btn" data-kind="ghost">详情</button>
      <span class="dshMkt-grow"></span>
      ${chatButton(item.title)}
      ${externalButton()}
    </div>
  </article>`;
}

const DISCOVER = [
  {
    title: 'billion-context', owner: 'ranxianglei', category: '会话与消息', letter: 'B',
    description: 'billion-context 官方版：上下文压缩插件，兼顾小窗口（100k 上下文足矣）省 token 和超长会话（数月级别几十亿 token 单会话）。',
    stars: '3,149', downloads: '2101', version: 'v0.1.208', installed: true,
  },
  {
    title: 'dsh-pet', owner: 'PC2005-cloud', category: '娱乐', letter: 'D',
    description: 'DSH Web UI 桌面宠物，Windows / macOS / Linux 三端可用：浏览器浮层或透明置顶桌面窗口，106 个透明动画、带挤压与粒子的甩拖反应。',
    stars: '3,496', downloads: '184k', version: 'v0.3.8',
  },
  {
    title: 'DSH-better-sidebar', owner: 'omdsh-dev', category: 'UI 增强', letter: 'D',
    description: '侧边栏完整工作台：内置文件渲染编辑、终端、Git 与子代理，支持三方插件注册新 Tab。',
    stars: '4,645', downloads: '214k', version: 'v0.28.2',
  },
  {
    title: 'dsh-context', owner: 'bowenliang123', category: '用量与计费', letter: 'D',
    description: 'DSH 上下文洞察面板：Context 仪表盘 + /context 命令 + Context 浏览器，查看 Context 的分类组成、内容详情、演进趋势、压缩/注入事件。',
    stars: '3,724', downloads: '194k', version: 'v0.77.0',
  },
  {
    title: 'dsh-skills-manager', owner: 'MichengAI', category: '开发与运行时', letter: 'S',
    description: '可视化安装、启用和更新 DSH 技能包，支持本地目录与 Git 仓库。',
    stars: '1,982', downloads: '96k', version: 'v0.6.2',
  },
  {
    title: 'Envoy 链接阅读器', owner: 'envoy-dsh', category: '浏览器与网页', letter: 'E',
    description: '贴一条链接，Agent 直接把内容读给你。抖音、小红书、B 站视频自动解析，文章 / PDF / 音频秒变可引用 Markdown。',
    stars: '2,870', downloads: '121k', version: 'v0.1.38', installed: true,
  },
  {
    title: 'IM 机器人（dsh-im）', owner: '@xmanrui/dsh-im', category: '通知与集成', letter: 'I',
    description: '通过二维码或机器人凭据将 IM 机器人接入 DeepSeek Harness，支持飞书、微信、钉钉、企业微信、QQ、Slack、Telegram、Discord。',
    stars: '5,102', downloads: '263k', version: 'v5.4.0',
  },
  {
    title: 'dsh-theme', owner: 'dsh-theme', category: '主题与外观', letter: 'T',
    description: 'DSH Web UI 主题包：30 款即插即用的 CSS 主题，每款含浅色与深色变体，集成于「设置 → 通用」，并提供程序化 API。',
    stars: '2,441', downloads: '158k', version: 'v1.0.1',
  },
  {
    title: 'DSH 用量看板', owner: '@local/dsh-usage-board', category: '用量与计费', letter: 'U',
    description: '在设置里增加一个「用量」页面，统计本地会话日志中的 token 消耗，看看今天到底花了多少。',
    stars: '1,206', downloads: '42k', version: 'v1.0.0', installed: true,
  },
  {
    title: 'dsh-whale-widget', owner: 'dsh-whale-widget', category: 'UI 增强', letter: 'W',
    description: '右下角常驻的小鲸鱼挂件：余额、今日已用与每轮对话消耗（含峰谷价），余额预警与今日预算的泡泡内容都可编辑。',
    stars: '3,908', downloads: '177k', version: 'v0.4.2',
  },
  {
    title: 'Codex 子智能体', owner: '@deepseek-ai/dsh-subagent-codex', category: '开发与运行时', letter: 'C',
    description: '使用 Codex 原生认证和设置委派单个任务。',
    stars: '2,115', downloads: '88k', version: 'v0.2.1-rc.5',
  },
  {
    title: 'dsh-market', owner: 'dsh-market', category: '插件市场与管理', letter: 'M',
    description: '在 DeepSeek Harness 设置页内浏览、搜索并安装社区插件，支持分类筛选、一键更新与停用。',
    stars: '8,235', downloads: '690k', version: 'v1.73.1',
  },
];

const INSTALLED = [
  {
    title: '私人入口', owner: '@local/dsh-personal-launcher', category: '界面', letter: 'T',
    description: '把侧边栏底部的账号行换成你的名字、字母徽标和「私人空间」标签。',
    version: 'v1.0.0', enabled: true,
  },
  {
    title: '插件市场', owner: '@local/dsh-plugin-market', category: '插件市场与管理', letter: 'M',
    description: '在侧边栏浏览 goodcase.ai 的 DSH 插件榜目录，一键安装或卸载插件。',
    version: 'v1.0.0', enabled: true,
  },
  {
    title: '用量看板', owner: '@local/dsh-usage-board', category: '用量与计费', letter: 'U',
    description: '在设置里增加一个「用量」页面，统计本地会话日志中的 token 消耗。',
    version: 'v1.0.0', enabled: true,
  },
  {
    title: 'IM 机器人（dsh-im）', owner: '@xmanrui/dsh-im', category: '通知与集成', letter: 'I',
    description: '通过二维码或机器人凭据将 IM 机器人接入 DeepSeek Harness，支持飞书、微信、钉钉、企业微信、QQ、Slack、Telegram、Discord。',
    version: 'v5.4.0', latest: 'v5.7.0', enabled: true,
  },
  {
    title: 'billion-context', owner: 'billion-context', category: '会话与消息', letter: 'B',
    description: '上下文压缩插件，兼顾小窗口省 token 和超长会话；压缩结果仍可回溯。',
    version: 'v0.1.210', enabled: true,
  },
  {
    title: 'dsh-theme', owner: 'dsh-theme', category: '主题与外观', letter: 'D',
    description: '30 款即插即用的 CSS 主题，每款含浅色与深色变体。',
    version: 'v1.0.1', enabled: true,
  },
  {
    title: 'Envoy 链接阅读器', owner: 'envoy-dsh', category: '浏览器与网页', letter: 'E',
    description: '贴一条链接，Agent 直接把内容读给你；视频、文章、PDF 都能变成可引用的 Markdown。',
    version: 'v0.1.38', enabled: true,
  },
  {
    title: 'dsh-whale-widget', owner: 'dsh-whale-widget', category: 'UI 增强', letter: 'W',
    description: '右下角常驻的小鲸鱼挂件：余额、今日已用与每轮对话消耗，泡泡内容可编辑。',
    version: 'v0.4.2', enabled: true,
  },
  {
    title: 'Codex 子智能体', owner: '@deepseek-ai/dsh-subagent-codex', category: '开发与运行时', letter: 'C',
    description: '使用 Codex 原生认证和设置委派单个任务。',
    version: 'v0.2.1-rc.2', latest: 'v0.2.1-rc.5', enabled: false,
    disabledReason: '版本不兼容',
  },
];

const ASK_QUESTIONS = [
  '这个插件是做什么的？',
  '它现在为什么没生效 / 报错？',
  '装它安全吗？会动我的文件吗？',
  '帮我看看它的源码和实现。',
  '我想改一个地方，应该从哪里下手？',
  '有新版本了，值得更新吗？',
];

function hero({ installed = false, stats = null } = {}) {
  return `<header class="dshMkt-hero">
    <div class="dshMkt-heroTop">
      <span class="dshMkt-mark">${MARK}</span>
      <div class="dshMkt-headings">
        <h1 class="dshMkt-title">插件市场</h1>
        <p class="dshMkt-tagline">核过、能装、有人说说明的 DSH 插件。</p>
      </div>
      <a class="dshMkt-siteLink" href="#">打开网页版 ${icon('external', 14)}</a>
    </div>
    <div class="dshMkt-stats">
      <span class="dshMkt-stat"><b>7,557</b>收录</span>
      <span class="dshMkt-stat"><b>7,517</b>可一键安装</span>
      <span class="dshMkt-stat"><b>23</b>分类</span>
      <span class="dshMkt-stat"><b>2026-10-28</b>快照</span>
    </div>
  </header>`;
}

function tabs(active) {
  return `<div class="dshMkt-tabs">
    <button class="dshMkt-tab" data-active="${active === 'discover'}">发现 <span class="dshMkt-tabCount">7,557</span></button>
    <button class="dshMkt-tab" data-active="${active === 'installed'}">已安装 <span class="dshMkt-tabCount">9</span></button>
  </div>`;
}

const CATEGORIES = ['全部', 'AGI 架构探索', 'UI 增强', '用量与计费', '主题与外观', '模型与账号接入', '身份与通信', '会话与消息', '记忆', '工具与能力', 'WSL 与 Windows'];

function discoverPage() {
  return `<div class="dshMkt-root"><div class="dshMkt-inner">
    ${hero()}
    ${tabs('discover')}
    <div class="dshMkt-toolbar">
      <label class="dshMkt-search">
        <span class="dshMkt-searchIcon">${icon('search', 16)}</span>
        <input class="dshMkt-input" placeholder="搜索插件、作者、能力…" readonly>
      </label>
      <select class="dshMkt-select"><option>下载最多</option></select>
      <button class="dshMkt-toggle"><span class="dshMkt-dot"></span>已安装</button>
      <button class="dshMkt-toggle" title="刷新">${icon('refresh', 15)}</button>
    </div>
    <div class="dshMkt-cats">
      ${CATEGORIES.map((name, index) => `<button class="dshMkt-chip" data-active="${index === 0}">${name}</button>`).join('')}
    </div>
    <div class="dshMkt-resultsHead"><span>7,557 个插件</span><span>第 1 / 315 页</span></div>
    <div class="dshMkt-grid">${DISCOVER.slice(0, 9).map(card).join('')}</div>
    <div class="dshMkt-pager">
      <button class="dshMkt-pageBtn" disabled>←</button>
      <span class="dshMkt-statePill">1 / 315</span>
      <button class="dshMkt-pageBtn">→</button>
    </div>
    <p class="dshMkt-footNote">数据快照 2026-10-28 · 7,557 个插件来自 DSH 插件榜（goodcase.ai）。第三方插件以你本人的权限运行。</p>
    <p class="dshMkt-thanks">感谢 goodcase.ai 与 awesome-dsh-plugin 整理这份插件目录，也感谢每一位愿意分享作品的插件作者。</p>
  </div></div>`;
}

function installedPage() {
  return `<div class="dshMkt-root"><div class="dshMkt-inner">
    ${hero()}
    ${tabs('installed')}
    <div class="dshMkt-toolbar">
      <label class="dshMkt-search">
        <span class="dshMkt-searchIcon">${icon('search', 16)}</span>
        <input class="dshMkt-input" placeholder="搜索已安装的插件…" readonly>
      </label>
      <button class="dshMkt-btn dshMkt-batchBtn" data-kind="primary">一键更新（2）</button>
      <button class="dshMkt-toggle" title="刷新">${icon('refresh', 15)}</button>
    </div>
    <div class="dshMkt-resultsHead"><span>已安装 9 个</span><span>7 个已启用</span></div>
    <div class="dshMkt-grid">${INSTALLED.map(installedCard).join('')}</div>
    <p class="dshMkt-footNote">数据快照 2026-10-28 · 7,557 个插件来自 DSH 插件榜（goodcase.ai）。第三方插件以你本人的权限运行。</p>
    <p class="dshMkt-thanks">感谢 goodcase.ai 与 awesome-dsh-plugin 整理这份插件目录，也感谢每一位愿意分享作品的插件作者。</p>
  </div></div>`;
}

function chatOverlay() {
  return `<div class="dshMkt-overlay">
    <div class="dshMkt-modal" role="dialog" aria-modal="true" aria-label="和 billion-context 对话">
      <div class="dshMkt-modalHead">
        ${logo('B', 0)}
        <div style="flex:1;min-width:0">
          <h2 class="dshMkt-modalTitle">和 billion-context 对话</h2>
          <div class="dshMkt-modalSub">插件档案已经在上下文里，你只需要提问。</div>
        </div>
        <button class="dshMkt-close" aria-label="关闭">${icon('close', 16)}</button>
      </div>
      <p class="dshMkt-modalDesc">这个插件能做什么？装它安全吗？想改哪里？选一个常见问题，或者直接问。</p>
      <div class="dshMkt-askList">
        ${ASK_QUESTIONS.map((question) => `<button class="dshMkt-askItem">
          ${icon('chat', 16)}<span style="flex:1">${question}</span>${icon('arrowRight', 15)}
        </button>`).join('')}
      </div>
      <p class="dshMkt-askNote">插件档案会作为隐藏上下文一起发送，对话里只会看到你的问题。</p>
      <div class="dshMkt-modalFoot">
        <span class="dshMkt-grow"></span>
        <button class="dshMkt-btn" data-kind="ghost">取消</button>
        <button class="dshMkt-btn" data-kind="primary">直接提问</button>
      </div>
    </div>
  </div>`;
}

function documentFor(title, body, height) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${THEME}\n${PANEL_CSS}</style>
<style>body{height:${height}px}.dshMkt-root{min-height:${height}px}</style>
</head>
<body>${body}</body>
</html>`;
}

const pages = [
  { name: 'discover', title: '插件市场 · 发现', body: discoverPage(), width: 1440, height: 1160 },
  { name: 'installed', title: '插件市场 · 已安装', body: installedPage(), width: 1440, height: 1120 },
  {
    name: 'chat',
    title: '插件市场 · 提问',
    body: `${discoverPage()}${chatOverlay()}`,
    width: 1440,
    height: 900,
  },
];

mkdirSync(OUT, { recursive: true });
for (const page of pages) {
  const file = join(OUT, `${page.name}.html`);
  writeFileSync(file, documentFor(page.title, page.body, page.height), 'utf8');
  console.log(`wrote ${file}`);
}

const browsers = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

if (process.argv.includes('--shot')) {
  const browser = browsers.find((candidate) => existsSync(candidate));
  if (browser === undefined) throw new Error('No Edge/Chrome found; install one or open tools/.preview/*.html');
  mkdirSync(DOCS, { recursive: true });
  for (const page of pages) {
    const file = join(OUT, `${page.name}.html`);
    const out = join(DOCS, `${page.name}.png`);
    execFileSync(browser, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--disable-extensions',
      '--force-device-scale-factor=1.5',
      `--window-size=${page.width},${page.height}`,
      '--virtual-time-budget=1200',
      `--screenshot=${out}`,
      `file:///${file.replaceAll('\\', '/')}`,
    ], { stdio: 'ignore' });
    console.log(`wrote ${out}`);
  }
}
