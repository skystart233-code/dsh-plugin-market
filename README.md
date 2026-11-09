# DSH Plugin Market（插件市场）

A sidebar plugin market for DeepSeek Harness. It turns the
[dsh.goodcase.ai](https://dsh.goodcase.ai/) catalog (the DSH 插件榜 snapshot,
sourced from awesome-dsh-plugin.com) into a native panel with search, category
filters, sorting, and **one-click install / uninstall** through the Harness
plugin manager.

## Install from GitHub

The public repository is
[skystart233-code/dsh-plugin-market](https://github.com/skystart233-code/dsh-plugin-market).

It is a normal DSH bundle: `package.json` declares `dsh.bundle.patch`, both
halves are plain JavaScript, and there is no build step. Add the repository as
a bundle spec in a profile with the Harness plugin manager, then restart DSH.
The package name `@local/dsh-plugin-market` is kept because the author's desktop
profile links this checkout directly; a fork can rename it to its own scope
before publishing to npm.

To develop against a local checkout, link the directory in the profile's
`package.json` and add the same key to `dsh.profile.bundles`:

```json
"@local/dsh-plugin-market": "link:C:/path/to/dsh-plugin-market"
```

## Where it appears

- **Sidebar entry**: registers its own icon + label into `sidebar.panellist`,
  next to the shipped 插件 and 自动化任务 rows (order `5`).
- **Main panel**: registers the matching `main` key `plugin-market`, which the
  shell selects when the sidebar row is clicked.

The icon is a stroke storefront/bag with a plus, matching the host's line-art
nav icons; it inherits `currentColor` so it follows the active theme.

## How it works

- `catalog.json` — a dated snapshot of the 7,557-entry catalog (name, owner,
  category, bilingual description, npm name/version, stars, downloads,
  capabilities, links, install command, a derived install spec, and the site's
  static verification verdict). 7,517 entries declare a `dsh` manifest and are
  one-click installable; the remaining 40 keep their command for manual use.
  Rebuild it with `node scripts/build-catalog.mjs` (fetches the live site) or
  pass a saved Turbopack chunk.
- `index.js` — Host half. Serves `POST /api/dsh-market/*` on the Harness web
  server: `bootstrap`, `search`, `installed`, `install`, `jobs`, `poll`,
  `cancel`, `set-enabled`, `chat`, and `remove`. Installs call the real
  `pluginManager.installBundle` service; uninstalls call `removeBundle` and
  enable/disable calls `setBundleEnabled`. The endpoint is same-origin and
  POST-only, and install jobs are polled so a long `pnpm` run never holds an
  HTTP request open. Jobs stay on the Host for 30 minutes after they finish.
- `client.js` — Client half. Registers the sidebar icon and the page, with
  search debounce, category chips, sorting, pagination, a detail sheet,
  uninstall confirmation, build-script approval, and progress/error toasts.
  It has two tabs: **发现** (the catalog) and **已安装** (every profile-installed
  bundle, including local/linked plugins the catalog does not list, with enable
  state, update availability, and uninstall). Each installed card carries an
  enable/disable switch; disabled cards also link to a **为什么停用** analysis
  sheet that distinguishes a manual disable, a version incompatibility (with the
  exact module requirements and runtime), a load error, and an
  installation-provided bundle. An incompatible card offers the matching
  `installTarget` update as the fix. Update availability compares semver
  precedence, so an older catalog snapshot never offers a downgrade.
  When updates exist, the Installed toolbar offers **一键更新（n）**: it installs
  each updatable plugin in turn, shows the batch position in the floating panel,
  and cancels the rest if one item needs build-script approval (that item's
  approval sheet still opens).
- `test/market.test.mjs` — host handler tests (`node --test test/market.test.mjs`):
  catalog shape, search/filter/sort, installed annotations, the installed view,
  install job polling, build approval, removal, and request fencing.

Install progress:

- The installing card expands with a progress bar, phase label (准备安装 →
  解析依赖 → 下载并链接 → 安装与激活), elapsed time, and a cancel action.
- A floating progress panel stays in the viewport, so the job remains visible
  after scrolling or opening the Installed tab.
- Because `installBundle` reports only the final result, the fill is a time-based
  estimate that eases toward 95% and jumps to done when the Host reports
  `applied`; the phase labels follow the same elapsed-time estimate.

App-store style background install:

- The job lives on the Host, not in the panel. Leaving the market page (or
  switching tabs) does not cancel it.
- On re-entry the panel calls `jobs`: a running install is adopted and its
  progress resumes from the original `startedAt`; a finished one produces a
  single completion toast and refreshes the installed facts; an install
  awaiting build-script approval reopens the approval sheet. Finished jobs are
  announced once per browser via local storage.
- While a fresh install has no installed bundle row yet, the Installed tab shows
  a synthetic "installing" card at the top with the same progress bar.
- The active tab (Discover / Installed) is remembered per browser session, so
  returning to the market lands where the user left it.

One-click install flow:

1. Click **安装** on a card (or in the detail sheet).
2. Host starts `installBundle(spec)` and returns a request id.
3. The panel polls; if pnpm reports `pendingBuilds`, a dialog lists the scripts
   and only proceeds after **允许并继续**.
4. On success the page refreshes the installation facts; if the change needs a
   restart the toast says so.

## Chat about one plugin

Every Discover and Installed card has a chat button in its action row. It opens
a small **ask** sheet with six common questions (what it does, common failures,
safety, review, changes, updates) plus **自己提问**. Choosing a question starts a
normal conversation with that question already sent; choosing 自己提问 opens the
same primed conversation with no message, so the user only types their question.

The plugin brief is **not** placed in the composer. The Host route
`POST /api/dsh-market/chat` creates the session through `sessionController`,
resolves its live agent, registers the brief on `agent.ctx` as a system-prompt
context named `plugin-market-brief` (order 950, `interpolate: false`), sends the
chosen question as a normal queued user message, and returns the session id. The
client refreshes the session list and calls `uiWorkspace.openSession(sessionId)`.
The transcript therefore shows only the question and the answer — the brief is
invisible background, like a support agent who already knows the account.

The brief is built from the card's real market record (name, package, version,
installed/enabled state, source path or npm spec, repo/page, update and
disabled-reason data) and carries these working rules:

```text
你正在协助我处理 DSH 插件市场里的一个插件，目标是诊断、答疑或改造它。

【插件档案】
- 名称 / 包名 / 版本 / 安装状态 / 启用状态
- 分类 / 来源 / 仓库 / 插件页
- 市场新版本、停用原因、市场安装命令
【市场描述】
...
【工作要求】
1. 先读真实源码和 manifest，不要只凭市场描述推断。
2. 直接回答用户的问题，不要复述这份档案。
3. 改造前说明范围、风险、回滚方式；只改这个插件。
4. 不把直接修改 node_modules 当长期方案；优先源码、link 目录或可持久化覆盖。
5. 删除、覆盖、凭据、全局设置先征得同意。
6. 完成后说明文件、验证方式和是否需要重启。
【对话约定】
这份档案是隐藏上下文，用户看不到。用户的具体问题会作为下一条用户消息出现。
```

## Security

Third-party plugins run with the user's own permissions. The panel shows this
warning in the detail sheet and in the build-script dialog. Being listed in the
catalog is not a security review.

## Notes

- The snapshot date is shown in the panel header. It is a static file, so the
  market works offline and does not re-download several megabytes per visit.
- Removing a bundle that the installation itself provides is disabled in the UI
  (`removable` comes from `listBundles`).
- Host and Client code are plain JavaScript; no build step is required.

## Acknowledgements

- Catalog data comes from [dsh.goodcase.ai](https://dsh.goodcase.ai/) (the
  DSH 插件榜), which is built on the
  [awesome-dsh-plugin](https://github.com/billLiao/awesome-dsh-plugin) list.
  Thank you to the curators for keeping the directory and its verification
  notes public.
- Thank you to every plugin author who shared their work in the catalog; this
  panel only indexes what they built.
- Thanks to DeepSeek Harness for the plugin runtime, web slots, and theme
  tokens that make a native panel possible.
- This project is unofficial and is not affiliated with DeepSeek. Third-party
  plugins run with your own permissions; a catalog listing is not a security
  review.
