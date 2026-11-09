# 🛍️ DSH 插件市场

> 把 DSH 插件榜搬进侧边栏：搜索、安装、更新、启停、卸载，都在一个面板里完成。

![插件市场发现页](docs/discover.png)

*界面预览：使用真实组件样式和样例数据渲染；实际内容以你的 profile 为准。*

## 🫡 为什么做这个

我用 DSH 的第一周，装插件是这样一个循环：先在网页榜单里翻，找到名字，复制安装命令，切回终端，粘贴，回车，等 pnpm，重启，再回网页确认它到底装上了没有。

插件越来越多，这个循环就越来越烦。手机应用商店早就把这件事做得很自然了——搜一下、点安装、看着进度走、不想要了就关掉。DSH 里为什么不能也这样？

所以有了这个项目：把 [dsh.goodcase.ai](https://dsh.goodcase.ai/) 的 7,557 条 DSH 插件目录，做成侧边栏里的一个原生面板。它调用 Harness 自己的 `pluginManager`，安装的是真实插件，不是另一个网页。

它不是官方商店，也不替代插件作者的主页。它只是把「发现 → 安装 → 管理」这段路缩短了一点。

## ✨ 能做什么

- **7,557 个插件，23 个分类**：按名称、作者、能力搜索，按下载量、Star、更新时间排序。
- **一键安装 / 卸载**：安装任务在 Host 上跑，离开页面不会中断；回到市场会自动接上进度。
- **像应用商店一样更新**：显示「最新 vX」，支持单个更新；有多个时可**一键更新（n）**，队列逐个执行。
- **每个已安装插件一个开关**：启停立即生效；需要重启时会明确提示。
- **停用不是黑盒**：点「为什么停用？」能看到是手动关闭、版本不兼容（含模块要求和运行时版本）、加载错误，还是安装自带的 bundle。
- **安装前先看清楚**：详情页展示作者、仓库、下载量、安装命令和市场描述；需要构建脚本时，先列出来等你批准。
- **针对单个插件提问**：每张卡片都有对话按钮，六个常见问题点一下就直接开聊；插件档案作为**隐藏上下文**带入，聊天记录里只会看到你的问题和回答。
- **中英双语**：跟随 DSH 的界面语言；深色 / 浅色主题都走系统 token。
- **离线可用**：目录是随包发布的静态快照，不会每次打开都重新下载几 MB。

## 📸 界面

### 已安装

![已安装页](docs/installed.png)

每个插件一张卡：版本、启用状态、是否有新版本、开关、卸载。停用的 Codex 子智能体会标明「版本不兼容」，并给出可修复的更新入口。

### 插件对话

![插件对话](docs/chat.png)

六个常见问题覆盖「它是做什么的 / 为什么没生效 / 安全吗 / 帮我读源码 / 我想改一处 / 值不值得更新」。点任意一条，问题会自动发出，插件档案已经在模型上下文里。

## 🧩 安装

前提：DSH 已经能正常打开 Web UI，并且你知道自己要装进哪个 profile（通常是 `desktop`）。

### 方式一：Release 包（推荐）

从 [v1.0.0 Release](https://github.com/skystart233-code/dsh-plugin-market/releases/tag/v1.0.0) 安装固定版本，内容已经打包好，不需要构建：

```bash
dsh plugin --profile <profile> add https://github.com/skystart233-code/dsh-plugin-market/releases/download/v1.0.0/local-dsh-plugin-market-1.0.0.tgz
```

### 方式二：GitHub 源码

想跟进 `main` 的最新改动：

```bash
dsh plugin --profile <profile> add github:skystart233-code/dsh-plugin-market
```

### 方式三：本地开发

```bash
git clone https://github.com/skystart233-code/dsh-plugin-market.git
cd dsh-plugin-market
```

在 profile 的 `package.json` 里加一条 link，并把同名 key 加进 `dsh.profile.bundles`：

```json
"@local/dsh-plugin-market": "link:C:/path/to/dsh-plugin-market"
```

装好后重启 DSH。侧边栏的「插件」和「自动化任务」之间会出现一个**插件市场**图标——线性店铺袋加一个加号，和旁边的导航图标同一套线条。

> 包名目前是 `@local/dsh-plugin-market`，因为作者的 desktop profile 直接 link 了这个目录。npm 上的 `dsh-plugin-market` 已被其他项目占用，所以暂未发布 npm 包；GitHub 和 Release 安装都可正常使用。

## 🗺️ 界面结构

```text
DSH Web
├─ 侧边栏
│  ├─ 插件
│  ├─ 插件市场      ← 本插件（order 5）
│  ├─ 自动化任务
│  └─ 更多
└─ 主面板
   ├─ 发现 7,557
   │  ├─ 搜索 / 分类 / 排序
   │  └─ 插件卡片 → 安装 / 详情 / 提问
   └─ 已安装（当前 profile）
      ├─ 启用开关
      ├─ 更新 / 一键更新
      ├─ 卸载
      └─ 为什么停用？
```

## 🎛 几个关键细节

### 安装进度

安装中的卡片会展开：阶段文案（准备安装 → 解析依赖 → 下载并链接 → 安装与激活）、进度条、已用时间、取消按钮。右下角还有一块悬浮进度面板，滚动列表或切到「已安装」也不会丢。

`pluginManager.installBundle` 只返回最终结果，拿不到 pnpm 的实时字节进度，所以进度条是按耗时平滑估算的（最高到 95%，完成时跳到结束），阶段也按同一套时间推进。这是有意的取舍：宁可给一个诚实的估算，也不让按钮一直转圈。

### 离开页面，安装继续

任务属于 Host，不属于面板。切走、刷新、去别的会话，安装都不会被取消。

回来时面板会调用 `jobs`：

- 运行中的任务 → 接管，进度从原始 `startedAt` 继续；
- 已完成的任务 → 只弹一次完成提示，并刷新已安装状态；
- 等待构建脚本批准的任务 → 重新打开批准框。

已安装页顶部还会为「还没有产生安装记录」的进行中任务显示一张临时卡片。完成提示按浏览器去重，不会每次回来都重复弹。

### 一键更新

已安装页统计所有「市场版本严格高于本地版本」的插件，工具栏出现**一键更新（n）**。队列逐个安装，悬浮面板显示 `第 i / n 个`；某个插件需要构建脚本批准时会暂停队列，避免在用户没看见的时候执行脚本。版本比较用 semver 优先级，旧快照不会把新版本「更新」成旧版本。

### 停用分析

「为什么停用？」不是一句通用文案，而是按真实原因分类：

| 原因 | 面板会告诉你 |
| --- | --- |
| 手动关闭 | 你可以随时打开开关 |
| 版本不兼容 | 缺哪个模块、要求什么版本、当前运行时是什么 |
| 加载错误 | 插件返回的 diagnostic / error code |
| 安装自带 | 这个 bundle 由安装过程提供，不应单独卸载 |
| 只读 / 内置 | 当前 profile 不允许在这里改 |

不兼容的卡片会直接给出匹配的 `installTarget` 更新按钮，点一下就能修。

### 插件对话

对话按钮打开一个提问弹层，而不是把一大段 prompt 塞进输入框。选一个问题后：

1. Host 通过 `sessionController` 创建一个普通会话；
2. 解析出这个会话的 live agent，在 `agent.ctx` 上注册 `plugin-market-brief` 系统提示（order 950，`interpolate: false`）；
3. 把问题作为一条普通的排队用户消息发进去；
4. 客户端刷新会话列表，打开这个会话。

所以聊天记录里只有问题和回答。插件档案来自卡片的真实市场记录（名称、包名、版本、安装/启用状态、来源、仓库、更新、停用原因），并带着几条工作要求：先读真实源码和 manifest、不要复述档案、改造前说明范围和回滚、不要把直接改 `node_modules` 当长期方案、删除/覆盖/凭据先征得同意。

## 📦 数据从哪来

`catalog.json` 是 2026-10-28 的静态快照，来自 [dsh.goodcase.ai](https://dsh.goodcase.ai/)（DSH 插件榜），其底层是 [awesome-dsh-plugin](https://github.com/billLiao/awesome-dsh-plugin) 列表。

| 字段 | 来源 |
| --- | --- |
| 名称 / 作者 / 分类 / 双语描述 | 目录快照 |
| npm 包名 / 版本 / Stars / 下载量 | 目录快照 |
| 仓库 / 插件页 / 安装命令 | 目录快照 |
| 是否可一键安装 | 是否声明 `dsh` manifest（7,517 / 7,557） |
| 已安装 / 启用 / 加载错误 | 当前 profile 的 `pluginManager.listBundles()` |
| 是否有更新 | 快照版本与运行时版本做 semver 比较 |

重新生成目录：

```bash
node scripts/build-catalog.mjs            # 抓取线上站点
node scripts/build-catalog.mjs --chunk <saved-turbopack-chunk>
```

## 🏗 它是怎么工作的

```text
client.js  ──POST /api/dsh-market/*──▶  index.js
   │                                      │
   │  sidebar.panellist / main            ├─ pluginManager.installBundle
   │  React + DSH theme tokens            ├─ removeBundle / setBundleEnabled
   │                                      ├─ listBundles
   └─ catalog.json（静态快照）             └─ sessionController + agent.ctx
```

- `index.js` — Host 半边。在 Harness Web 服务上挂 `POST /api/dsh-market/*`，同源校验，只接受 JSON。安装走真实的 `pluginManager.installBundle`，卸载走 `removeBundle`，启停走 `setBundleEnabled`。耗时任务放进 Host 的 jobs，客户端轮询，不让一个 HTTP 请求挂几分钟。
- `client.js` — Client 半边。注册侧边栏图标和主面板，负责搜索、筛选、分页、弹层、进度、开关和对话入口。样式全部走 `--dsw-alias-*` token，自动跟随深浅色主题。
- `catalog.json` — 静态目录，7,557 条。面板离线也能打开。
- `test/market.test.mjs` — Host 处理函数测试，覆盖目录形状、搜索/筛选/排序、已安装标注、安装轮询、构建批准、卸载、同源围栏和对话路由。

Host 路由：

| 路由 | 作用 |
| --- | --- |
| `bootstrap` | 目录统计、分类、已安装数量 |
| `search` | 搜索 / 分类 / 排序 / 分页，附带安装状态 |
| `installed` | 当前 profile 已安装的 bundle + 市场元数据 |
| `install` | 启动安装任务，返回 request id |
| `jobs` | 列出未完成任务，供重新进入时接管 |
| `poll` | 查询单个任务的状态 / 结果 |
| `cancel` | 取消正在运行的任务 |
| `set-enabled` | 启用 / 停用一个 bundle |
| `chat` | 创建带隐藏档案的会话并发送问题 |
| `remove` | 卸载 bundle |

## 🔒 安全与边界

第三方插件以**你自己的权限**运行。面板里的「第三方插件以你本人的权限运行」不是装饰，详情页和构建批准框里都会重复提醒。

- 被目录收录不等于安全审计。目录只整理作者公开的信息和站点侧的静态验证结论。
- 安装时如果 pnpm 发现构建脚本，面板会列出脚本内容，只有点「允许并继续」才会执行。
- 安装接口同源、POST-only；不是本机 Web 页面发起的请求会被拒绝。
- 这个面板本身也只是一个 bundle：它不能绕过 `pluginManager` 的权限，也不能替你决定信任哪个插件。

## 🚧 不做什么 / 已知限制

- **不是官方商店**，和 DeepSeek 没有隶属关系。
- **目录不是实时的**：快照日期写在面板顶部；新插件要重新生成 `catalog.json` 才会出现。
- **进度是估算**：见上文，Host 只给最终结果。
- **一次只跑一个安装**：Host 用单任务避免 pnpm 并发写同一个 profile；一键更新是顺序队列。
- **不能在页面里卸载自己**：当前市场这个 bundle 的卸载按钮会禁用，避免自己把自己拆掉。
- **npm 暂未发布**：包名保留 `@local/`，安装请走 GitHub 或 Release。
- 预览图是用 `tools/preview.mjs` 渲染的静态样例，不是自动化视觉回归测试。

## 🧪 开发

```bash
# Host 处理函数测试（18 项）
node --test test/market.test.mjs

# 语法检查
node --check index.js
node --check client.js

# 重新生成 README 里的三张预览图（需要 Edge 或 Chrome）
node tools/preview.mjs --shot
```

没有构建步骤：`index.js` 和 `client.js` 都是普通 JavaScript，改完重载 bundle 即可。

目录结构：

```text
dsh-plugin-market/
├─ index.js              Host 半边 + 路由 + 安装任务
├─ client.js             Client 半边 + 样式 + 交互
├─ catalog.json          7,557 条目录快照
├─ cordis.patch.yml      bundle 声明
├─ scripts/
│  └─ build-catalog.mjs  从线上站点重建目录
├─ tools/
│  └─ preview.mjs        渲染 README 预览图
├─ test/
│  └─ market.test.mjs    Host 测试
└─ docs/                 README 图片
```

## 🌏 English

A sidebar plugin market for DeepSeek Harness. It turns the dsh.goodcase.ai catalog (7,557 plugins, 23 categories) into a native panel with search, install, update, enable/disable, and uninstall. Installs run on the Host and survive leaving the page; progress resumes when you come back. Every plugin has a support-chat button that sends the plugin brief as invisible system context, so the transcript only shows your question and the answer.

```bash
dsh plugin --profile <profile> add https://github.com/skystart233-code/dsh-plugin-market/releases/download/v1.0.0/local-dsh-plugin-market-1.0.0.tgz
```

Restart DSH, then open **插件市场** in the sidebar. Third-party plugins run with your own permissions; a catalog listing is not a security review. MIT licensed.

## 🙏 致谢

- 目录数据来自 [dsh.goodcase.ai](https://dsh.goodcase.ai/)（DSH 插件榜），它建立在 [awesome-dsh-plugin](https://github.com/billLiao/awesome-dsh-plugin) 之上。谢谢维护者把这些信息整理成公开、可检索、带验证结论的列表。
- 谢谢每一位把作品放进目录的插件作者。这个面板只是索引，真正让它有用的是你们写的东西。
- 谢谢 DeepSeek Harness 提供的插件运行时、Web slot 和主题 token，让一个第三方面板可以长得像原生界面。
- 页面底部的致谢也保留着同样的意思：**感谢 goodcase.ai 与 awesome-dsh-plugin 整理这份插件目录，也感谢每一位愿意分享作品的插件作者。**

## License

[MIT](LICENSE) © 2026 TKK
