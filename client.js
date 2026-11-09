window.__ModuleLoader__.load({
  id: '@local/dsh-plugin-market',
  factory(require) {
    /**
     * DSH plugin market.
     *
     * The panel is fed by the dsh.goodcase.ai snapshot through this bundle's
     * own loopback endpoint (`/api/dsh-market/*`), and its Install/Uninstall
     * buttons call the Harness plugin manager on the Host. The sidebar entry
     * registers into `sidebar.panellist`; the page registers the matching
     * `main` key so the shell's own button selects it.
     */
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    /** Locale namespace owned by this plugin. */
    const NS = 'plugin-market';
    /** Host endpoint served by index.js. */
    const API = '/api/dsh-market';
    /** Rows per page. */
    const PAGE_SIZE = 24;
    /** This bundle cannot uninstall itself while it is the open page. */
    const SELF = '@local/dsh-plugin-market';

    const en = {
      nav: 'Market',
      title: 'Plugin Market',
      tagline: 'Verified, installable DSH plugins with plain-language descriptions.',
      siteLink: 'Open web version',
      statPlugins: 'plugins',
      statInstallable: 'one-click installable',
      statCategories: 'categories',
      statSnapshot: 'snapshot',
      searchPlaceholder: 'Search plugins, authors, capabilities…',
      all: 'All',
      sortRecommended: 'Recommended',
      sortDownloads: 'Most downloaded',
      sortLatest: 'Newest',
      sortName: 'Name',
      tabDiscover: 'Discover',
      tabInstalled: 'Installed',
      installedSearch: 'Search installed plugins…',
      installedResults: '{n} installed',
      enabledCount: '{n} enabled',
      enabled: 'Enabled',
      disabled: 'Disabled',
      whyDisabled: 'Why disabled?',
      chat: 'Chat about this plugin',
      chatUnavailable: 'Could not open a conversation.',
      askTitle: 'Ask about this plugin',
      askIntro: 'Pick a common question, or ask your own. The plugin background is attached automatically and stays out of the chat.',
      askNote: 'The plugin profile is hidden context: you will only see your question and the answer.',
      askOwn: 'Ask my own question',
      askOpening: 'Opening a conversation…',
      askFailed: 'Could not open the conversation: {message}',
      askQWhat: 'What does this plugin do? Is it worth using?',
      askQIssue: 'What is wrong with it? Why is it disabled?',
      askQSafe: 'Is it safe? Does it read my files or use the network?',
      askQReview: 'Review the code for obvious bugs or risks.',
      askQChange: 'I want to change a feature. Where should I start?',
      askQUpdate: 'How do I update or uninstall it? Will an update lose settings?',
      reasonTitle: 'Why this plugin is disabled',
      reasonIncompatible: 'Version incompatible',
      reasonIncompatibleBody: 'The loader stopped this plugin because its declared DSH module versions do not match the running Harness.',
      reasonRequirement: '{module} requires {required}, runtime is {runtime}',
      reasonCurrentRuntime: 'Current runtime: {runtime}',
      reasonManual: 'Disabled manually',
      reasonManualBody: 'No version or load error is recorded. The plugin was turned off manually or was installed disabled. Turn the switch on to restore it.',
      reasonReadOnly: 'Provided by the installation',
      reasonReadOnlyBody: 'This bundle comes from the DSH installation and cannot be toggled here.',
      reasonError: 'Plugin load error',
      reasonErrorBody: 'The loader reported: {message}',
      reasonFixUpdate: 'Version mismatch — update to v{version} to fix it.',
      enable: 'Enable',
      disable: 'Disable',
      enableDone: '{name} enabled',
      disableDone: '{name} disabled',
      enableRestart: '{name} will be active after a restart',
      disableRestart: '{name} will be off after a restart',
      toggleFailed: 'Could not change state: {message}',
      toggleOverridden: 'The change is overridden by a higher-priority layer.',
      builtIn: 'Built in',
      selfMarket: 'This market',
      incompatible: 'Version incompatible',
      latest: 'latest v{version}',
      results: '{n} plugins',
      pageOf: 'Page {page} / {pages}',
      loading: 'Loading catalog…',
      loadingInstalled: 'Reading installed plugins…',
      searching: 'Searching…',
      loadFailed: 'Could not load the market: {message}',
      empty: 'No plugins match this filter.',
      retry: 'Retry',
      install: 'Install',
      installing: 'Installing…',
      installed: 'Installed',
      update: 'Update to v{version}',
      updateAll: 'Update all ({n})',
      batchDone: 'Updated {n} plugins',
      batchDonePartial: 'Updated {n}, {failed} failed',
      batchPaused: 'Batch update paused: a plugin needs build-script approval',
      batchCancelled: 'Batch update cancelled',
      updatingName: 'Updating {name}',
      batchProgress: 'Updating {index}/{total}',
      uninstall: 'Uninstall',
      details: 'Details',
      copyCommand: 'Copy command',
      copied: 'Copied',
      notOneClick: 'Manual install',
      buildScripts: 'Install scripts: {scripts}',
      buildScriptsTitle: 'Install scripts',
      stars: 'stars',
      downloads: 'downloads',
      version: 'v{version}',
      added: 'Added {date}',
      by: 'by {owner}',
      capabilities: 'Capabilities',
      installCommand: 'Install command',
      links: 'Links',
      repo: 'GitHub',
      page: 'Plugin page',
      security: 'Third-party plugins run with your permissions. Being listed is not a security review — check the source before installing.',
      uninstallTitle: 'Uninstall {name}?',
      uninstallBody: 'The package is removed from this profile and its rows are unloaded.',
      confirmUninstall: 'Uninstall',
      cancel: 'Cancel',
      buildsTitle: 'Build scripts need approval',
      buildsBody: '{name} wants to run these install scripts: {builds}. They execute third-party code during installation.',
      approveBuilds: 'Allow and continue',
      installDone: '{name} installed',
      installRestart: '{name} installed — restart DSH to finish',
      installFailed: 'Install failed: {message}',
      installOverridden: '{name} installed but a higher-priority layer overrides it',
      uninstallDone: '{name} uninstalled',
      uninstallFailed: 'Uninstall failed: {message}',
      cancelled: 'Installation cancelled',
      cancelInstall: 'Cancel installation',
      phaseStarting: 'Preparing install',
      phaseResolving: 'Resolving dependencies',
      phaseDownloading: 'Downloading and linking',
      phaseActivating: 'Installing and activating',
      elapsed: '{time} elapsed',
      progressHint: 'You can keep browsing while this runs.',
      slowHint: 'pnpm is still running; plugins with builds can take a few minutes.',
      installProgressLabel: 'Installing {name}',
      approvalNote: 'Waiting for your approval',
      output: 'Package manager output',
      removeUnavailable: 'Provided by the installation and cannot be removed.',
      footer: 'Data snapshot {date} · {count} plugins from DSH 插件榜 (goodcase.ai). Third-party plugins run with your own permissions.',
      thanks: 'Thanks to goodcase.ai and awesome-dsh-plugin for curating this catalog, and to every plugin author who shared their work.',
      emptyInstalled: 'No installed plugins in this view.',
    };

    const zh = {
      nav: '插件市场',
      title: '插件市场',
      tagline: '核过、能装、有人话说明的 DSH 插件。',
      siteLink: '打开网页版',
      statPlugins: '收录',
      statInstallable: '可一键安装',
      statCategories: '分类',
      statSnapshot: '快照',
      searchPlaceholder: '搜索插件、作者、能力…',
      all: '全部',
      sortRecommended: '推荐',
      sortDownloads: '下载最多',
      sortLatest: '最新收录',
      sortName: '名称',
      tabDiscover: '发现',
      tabInstalled: '已安装',
      installedSearch: '搜索已安装的插件…',
      installedResults: '已安装 {n} 个',
      enabledCount: '{n} 个已启用',
      enabled: '已启用',
      disabled: '已停用',
      whyDisabled: '为什么停用？',
      chat: '针对这个插件对话',
      chatUnavailable: '无法打开新会话。',
      askTitle: '问问这个插件',
      askIntro: '选一个常见问题，或直接问。插件背景会自动带入，不会出现在对话里。',
      askNote: '插件档案是隐藏上下文：你只会看到自己的问题和回答。',
      askOwn: '直接提问',
      askOpening: '正在打开对话…',
      askFailed: '无法打开对话：{message}',
      askQWhat: '这个插件是做什么的？值得用吗？',
      askQIssue: '它现在有什么问题？为什么停用了？',
      askQSafe: '它安全吗？会读我的文件或联网吗？',
      askQReview: '帮我检查代码，有没有明显的 bug 或风险。',
      askQChange: '我想改一个功能，应该从哪里下手？',
      askQUpdate: '怎么更新或卸载它？更新会丢配置吗？',
      reasonTitle: '为什么这个插件被停用',
      reasonIncompatible: '版本不兼容',
      reasonIncompatibleBody: '插件声明的 DSH 模块版本与当前运行的 Harness 不一致，加载器因此停用了它。',
      reasonRequirement: '{module} 需要 {required}，当前运行时是 {runtime}',
      reasonCurrentRuntime: '当前运行时：{runtime}',
      reasonManual: '手动停用',
      reasonManualBody: '没有记录到版本或加载错误。这个插件是被手动关闭的，或者安装时就没有启用；打开开关即可恢复。',
      reasonReadOnly: '由安装提供',
      reasonReadOnlyBody: '这个 bundle 来自 DSH 安装本身，不能在这里切换。',
      reasonError: '插件加载错误',
      reasonErrorBody: '加载器报告：{message}',
      reasonFixUpdate: '版本不匹配——更新到 v{version} 即可修复。',
      enable: '启用',
      disable: '停用',
      enableDone: '{name} 已启用',
      disableDone: '{name} 已停用',
      enableRestart: '{name} 将在重启后启用',
      disableRestart: '{name} 将在重启后停用',
      toggleFailed: '切换失败：{message}',
      toggleOverridden: '这次修改被更高优先级的层覆盖了。',
      builtIn: '内置',
      selfMarket: '当前市场',
      incompatible: '版本不兼容',
      latest: '最新 v{version}',
      results: '{n} 个插件',
      pageOf: '第 {page} / {pages} 页',
      loading: '正在加载目录…',
      loadingInstalled: '正在读取已安装插件…',
      searching: '正在搜索…',
      loadFailed: '插件市场加载失败：{message}',
      empty: '没有符合条件的插件。',
      retry: '重试',
      install: '安装',
      installing: '安装中…',
      installed: '已安装',
      update: '更新到 v{version}',
      updateAll: '一键更新（{n}）',
      batchDone: '已更新 {n} 个插件',
      batchDonePartial: '已更新 {n} 个，{failed} 个失败',
      batchPaused: '批量更新已暂停：有插件需要批准构建脚本',
      batchCancelled: '已取消批量更新',
      updatingName: '正在更新 {name}',
      batchProgress: '更新中 {index}/{total}',
      uninstall: '卸载',
      details: '详情',
      copyCommand: '复制命令',
      copied: '已复制',
      notOneClick: '不可一键安装',
      buildScripts: '安装脚本：{scripts}',
      buildScriptsTitle: '安装脚本',
      stars: '星标',
      downloads: '下载',
      version: 'v{version}',
      added: '收录于 {date}',
      by: '作者 {owner}',
      capabilities: '能力',
      installCommand: '安装命令',
      links: '链接',
      repo: 'GitHub',
      page: '插件页',
      security: '第三方插件以你本人的权限运行。收录不等于安全审查，装前建议看源码。',
      uninstallTitle: '卸载 {name}？',
      uninstallBody: '该包会从当前 profile 移除，相关插件行会卸载。',
      confirmUninstall: '卸载',
      cancel: '取消',
      buildsTitle: '需要批准构建脚本',
      buildsBody: '{name} 要求在安装时运行这些脚本：{builds}。它们会执行第三方代码。',
      approveBuilds: '允许并继续',
      installDone: '{name} 安装完成',
      installRestart: '{name} 已安装，重启 DSH 后生效',
      installFailed: '安装失败：{message}',
      installOverridden: '{name} 已安装，但被更高优先级的层覆盖',
      uninstallDone: '{name} 已卸载',
      uninstallFailed: '卸载失败：{message}',
      cancelled: '安装已取消',
      cancelInstall: '取消安装',
      phaseStarting: '准备安装',
      phaseResolving: '解析依赖',
      phaseDownloading: '下载并链接依赖',
      phaseActivating: '安装与激活',
      elapsed: '已用 {time}',
      progressHint: '安装期间可以继续浏览。',
      slowHint: 'pnpm 仍在运行，带构建的插件可能需要几分钟。',
      installProgressLabel: '正在安装 {name}',
      approvalNote: '等待你批准',
      output: '包管理器输出',
      removeUnavailable: '由安装提供，无法单独卸载。',
      footer: '数据快照 {date} · {count} 个插件来自 DSH 插件榜（goodcase.ai）。第三方插件以你本人的权限运行。',
      thanks: '感谢 goodcase.ai 与 awesome-dsh-plugin 整理这份插件目录，也感谢每一位愿意分享作品的插件作者。',
      emptyInstalled: '当前视图里没有已安装的插件。',
    };

    /** Replace `{name}` placeholders in one dictionary string. */
    function interpolate(text, params) {
      if (params === undefined) return text;
      return String(text).replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
    }

    /** Bind the locale namespace with a bundled fallback dictionary. */
    function translate(t, dict) {
      return (key, params) => {
        const value = typeof t === 'function' ? t(key, params) : undefined;
        const fallback = interpolate(dict[key] ?? key, params);
        if (typeof value !== 'string' || value.length === 0 || value === key) return fallback;
        return value;
      };
    }

    /** Pick the localized half of a snapshot string or `{zh, en}` object. */
    function pick(value, active) {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return value;
      const first = active.startsWith('zh') ? value.zh : value.en;
      const second = active.startsWith('zh') ? value.en : value.zh;
      return typeof first === 'string' && first !== '' ? first : (typeof second === 'string' ? second : '');
    }

    /** Compact number for stars/downloads. */
    function compact(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
      if (value >= 10000) return `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}k`;
      return String(value);
    }

    /** Stable hue for a plugin's letter tile. */
    function hueOf(name) {
      let hash = 0;
      for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 360;
      return hash;
    }

    /**
     * Estimated fill for an install that has no per-byte progress events.
     * It eases toward 95% and only reaches 100 when the Host reports done.
     */
    function progressOf(ms) {
      const value = 6 + 89 * (1 - Math.exp(-ms / 20000));
      return Math.min(95, Math.max(6, Math.round(value)));
    }

    /** Coarse phase label for elapsed install time. */
    function phaseOf(ms) {
      if (ms < 2500) return 'phaseStarting';
      if (ms < 9000) return 'phaseResolving';
      if (ms < 30000) return 'phaseDownloading';
      return 'phaseActivating';
    }

    /** `12s` or `1m 07s` for the install timer. */
    function formatElapsed(ms) {
      const seconds = Math.max(0, Math.floor(ms / 1000));
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
    }

    /** Terminal jobs already reported in this browser, so re-entry is quiet. */
    const NOTIFIED_KEY = `${NS}.notified`;
    /** The update-all queue survives leaving the panel in this browser tab. */
    const BATCH_KEY = `${NS}.batch`;

    /** @returns {string[]} ids already reported. */
    function readNotified() {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(NOTIFIED_KEY) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
      } catch {
        return [];
      }
    }

    /** @returns {boolean} whether this job's result was already announced. */
    function wasNotified(id) {
      return typeof id === 'string' && id !== '' && readNotified().includes(id);
    }

    /** Remember one terminal job id (bounded, browser-local). */
    function markNotified(id) {
      if (typeof id !== 'string' || id === '') return;
      try {
        const current = readNotified();
        if (current.includes(id)) return;
        current.push(id);
        window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(current.slice(-120)));
      } catch {
        /* a full or blocked storage only costs one duplicate toast */
      }
    }

    /** @returns {{items: {spec: string, name: string, enabled?: boolean}[], index: number, failed: number} | null} */
    function readStoredBatch() {
      try {
        const parsed = JSON.parse(window.sessionStorage.getItem(BATCH_KEY) ?? 'null');
        if (parsed === null || typeof parsed !== 'object') return null;
        if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
        if (!Number.isInteger(parsed.index) || parsed.index < 0 || parsed.index >= parsed.items.length) return null;
        return {
          items: parsed.items.filter((item) => typeof item?.spec === 'string' && typeof item?.name === 'string'),
          index: parsed.index,
          failed: Number.isInteger(parsed.failed) ? parsed.failed : 0,
        };
      } catch {
        return null;
      }
    }

    /** Persist or clear the update-all queue for this browser tab. */
    function saveStoredBatch(batch) {
      try {
        if (batch === null) window.sessionStorage.removeItem(BATCH_KEY);
        else window.sessionStorage.setItem(BATCH_KEY, JSON.stringify(batch));
      } catch {
        /* continuity only; the live queue still works in this panel */
      }
    }

    /** POST one market method and unwrap its envelope. */
    async function call(method, body) {
      const response = await fetch(`${API}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`HTTP ${response.status}`);
      }
      if (payload === null || typeof payload !== 'object' || payload.ok !== true) {
        const message = payload?.error?.message;
        throw new Error(typeof message === 'string' && message !== '' ? message : `HTTP ${response.status}`);
      }
      return payload.value;
    }

    //#region icons
    /** Sidebar panel icon: a store bag with a plus, matching the host's line art. */
    function PanelIcon(props) {
      const size = typeof props?.size === 'number' ? props.size : 18;
      return h('svg', {
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        style: { display: 'block' },
      },
        h('path', { d: 'M4 8.5h16l-1.05 10.2a2.2 2.2 0 0 1-2.2 2H7.25a2.2 2.2 0 0 1-2.2-2L4 8.5Z' }),
        h('path', { d: 'M8.4 8.5V6.7a3.6 3.6 0 0 1 7.2 0v1.8' }),
        h('path', { d: 'M9.4 13.4h5.2' }),
        h('path', { d: 'M12 10.8v5.2' }));
    }

    /** Small stroke icons used inside the panel. */
    function Icon(props) {
      const name = props.name;
      const size = props.size ?? 16;
      const common = {
        viewBox: '0 0 24 24', width: size, height: size, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': 'true', style: { display: 'block', flex: 'none' },
      };
      if (name === 'search') return h('svg', common, h('circle', { cx: 11, cy: 11, r: 6.2 }), h('path', { d: 'm15.6 15.6 4 4' }));
      if (name === 'star') return h('svg', common, h('path', { d: 'm12 4.4 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.7l5-.7L12 4.4Z' }));
      if (name === 'download') return h('svg', common, h('path', { d: 'M12 4v10' }), h('path', { d: 'm7.5 10.2 4.5 4.4 4.5-4.4' }), h('path', { d: 'M5 19h14' }));
      if (name === 'external') return h('svg', common, h('path', { d: 'M14 4h6v6' }), h('path', { d: 'M20 4 11 13' }), h('path', { d: 'M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4' }));
      if (name === 'copy') return h('svg', common, h('rect', { x: 9, y: 9, width: 11, height: 11, rx: 2 }), h('path', { d: 'M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3' }));
      if (name === 'check') return h('svg', common, h('path', { d: 'm5 12.5 4.4 4.3L19 6.8' }));
      if (name === 'x') return h('svg', common, h('path', { d: 'm6 6 12 12M18 6 6 18' }));
      if (name === 'refresh') return h('svg', common, h('path', { d: 'M20 6v5h-5' }), h('path', { d: 'M19.3 11a7.5 7.5 0 1 0 .2 4.5' }));
      if (name === 'arrow') return h('svg', common, h('path', { d: 'm9 6 6 6-6 6' }));
      if (name === 'chat') return h('svg', common,
        h('path', { d: 'M20.5 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-3 2.5v-5.6a7.5 7.5 0 0 1-1-3.9A7.5 7.5 0 0 1 10.5 4h2.5a7.5 7.5 0 0 1 7.5 7.5Z' }),
        h('path', { d: 'M8.5 10.5h7M8.5 13.5h4.5' }));
      if (name === 'spark') return h('svg', common, h('path', { d: 'M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9 12 3.5Z' }));
      return null;
    }

    /** Accessible enable/disable switch used on installed cards. */
    function Switch(props) {
      const checked = props.checked === true;
      const label = checked ? props.offLabel : props.onLabel;
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': checked,
        'aria-label': label,
        title: label,
        className: 'dshMkt-switch',
        'data-on': String(checked),
        'data-busy': String(props.busy === true),
        disabled: props.disabled === true || props.busy === true,
        onClick: () => props.onChange(!checked),
      }, h('span', { className: 'dshMkt-switchKnob' }));
    }

    /** Explain a disabled bundle from the data the Host reported. */
    function disabledReason(bundle, t) {
      if (bundle.enabled === true) return null;
      const error = bundle.error;
      if (error?.code === 'incompatible-version' && Array.isArray(error.incompatible) && error.incompatible.length > 0) {
        return {
          kind: 'incompatible',
          title: t('reasonIncompatible'),
          body: t('reasonIncompatibleBody'),
          details: error.incompatible.flatMap((item) => [
            `${item.name}@${item.version}`,
            ...Object.entries(item.requirements ?? {}).map(([moduleName, required]) => (
              t('reasonRequirement', { module: moduleName, required, runtime: item.runtimeVersion })
            )),
          ]),
        };
      }
      if (error !== null && error !== undefined && typeof error.code === 'string') {
        return {
          kind: 'error',
          title: t('reasonError'),
          body: t('reasonErrorBody', { message: error.diagnostic ?? error.code }),
          details: [],
        };
      }
      if (typeof bundle.metaError === 'string' && bundle.metaError !== '') {
        return {
          kind: 'error',
          title: t('reasonError'),
          body: t('reasonErrorBody', { message: bundle.metaError }),
          details: [],
        };
      }
      if (typeof bundle.readOnlyReason === 'string' && bundle.readOnlyReason !== '') {
        return {
          kind: 'readonly',
          title: t('reasonReadOnly'),
          body: t('reasonReadOnlyBody'),
          details: [],
        };
      }
      return { kind: 'manual', title: t('reasonManual'), body: t('reasonManualBody'), details: [] };
    }

    /** One-line Chinese reason for the chat brief, independent of the UI locale. */
    function disabledReasonText(bundle) {
      const error = bundle.error;
      if (error?.code === 'incompatible-version' && Array.isArray(error.incompatible) && error.incompatible.length > 0) {
        const parts = error.incompatible.map((item) => {
          const requirements = Object.entries(item.requirements ?? {})
            .map(([moduleName, required]) => `${moduleName} ${required}`)
            .join('、');
          return `${item.name}@${item.version} 要求 ${requirements}，当前运行时 ${item.runtimeVersion}`;
        });
        return `版本不兼容：${parts.join('；')}`;
      }
      if (error !== null && error !== undefined && typeof error.code === 'string') {
        return `${error.code}${typeof error.diagnostic === 'string' ? `：${error.diagnostic}` : ''}`;
      }
      if (typeof bundle.metaError === 'string' && bundle.metaError !== '') return bundle.metaError;
      if (typeof bundle.readOnlyReason === 'string' && bundle.readOnlyReason !== '') {
        return `安装提供的 bundle（${bundle.readOnlyReason}）`;
      }
      return '没有记录版本或加载错误，可能是手动停用';
    }

    /**
     * The brief placed in a fresh conversation's composer. It gives the next
     * agent the plugin's exact market record plus the working rules for a
     * diagnosis or a change, so the user only has to add their question.
     */
    function buildPluginBrief(info) {
      const lines = [
        '你正在协助我处理 DSH 插件市场里的一个插件，目标是诊断、答疑或改造它。',
        '',
        '【插件档案】',
        `- 名称：${info.title || info.name}`,
        `- 包名：${info.name}`,
        info.installed
          ? `- 安装状态：已安装${info.version ? `（${info.version}）` : ''}`
          : `- 安装状态：未安装${info.version ? `（市场候选版本 ${info.version}）` : ''}`,
        info.installed ? `- 启用状态：${info.enabled === true ? '已启用' : '已停用'}` : null,
        info.category ? `- 分类：${info.category}` : null,
        info.source ? `- 来源：${info.source}` : null,
        info.repo ? `- 仓库：${info.repo}` : null,
        info.page ? `- 插件页：${info.page}` : null,
        info.updateAvailable && info.latestVersion ? `- 市场里有新版本：${info.latestVersion}` : null,
        info.installed && info.enabled !== true && info.disableReason
          ? `- 停用原因：${info.disableReason}`
          : null,
        info.install ? `- 市场安装命令：${info.install}` : null,
        '',
        '【市场描述】',
        info.description || '（市场没有更多描述）',
        '',
        '【工作要求】',
        '1. 先读这个插件的真实源码和 manifest（package.json 的 dsh 声明），不要只凭市场描述推断。安装来源可能是本地 link 目录、profile 的 node_modules，也可能是 GitHub 仓库。',
        '2. 直接回答用户的具体问题，不要复述这份档案，也不要向用户提及“系统提示/前置词/隐藏上下文”。',
        '3. 如果我要改造：先说明改动范围、风险和回滚方式，再动手；只改这个插件相关的文件，不碰其他插件和全局配置。',
        '4. 不要把直接修改 node_modules 里的第三方包当作长期方案（升级会被覆盖）；优先改源码仓库、本地 link 目录或做可持久化的覆盖方案，并说明取舍。',
        '5. 涉及删除、覆盖、凭据、全局设置时先征求我的同意。',
        '6. 完成后说明改了哪些文件、如何验证、是否需要重启 DSH。',
        '',
        '【对话约定】',
        '这份插件档案是隐藏上下文，用户看不到。用户的具体问题会作为下一条用户消息给出；直接回答，不要复述档案。',
        '如果用户的问题涉及改造，按上面的工作要求执行。',
      ].filter((line) => line !== null);
      return lines.join('\n');
    }

    /** Common first questions offered by the chat sheet. */
    const ASK_QUESTIONS = [
      'askQWhat', 'askQIssue', 'askQSafe', 'askQReview', 'askQChange', 'askQUpdate',
    ];
    //#endregion

    const CSS = [
      '.dshMkt-root{height:100%;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-sizing:border-box}',
      '.dshMkt-inner{width:100%;max-width:1120px;margin:0 auto;padding:28px 32px 56px;box-sizing:border-box}',
      '.dshMkt-hero{display:flex;flex-direction:column;gap:18px;margin-bottom:22px}',
      '.dshMkt-heroTop{display:flex;align-items:center;gap:14px;min-width:0}',
      '.dshMkt-mark{width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:13px;color:#fff;background:linear-gradient(135deg,#f97316,#e0432f 58%,#b91c1c);box-shadow:0 6px 18px rgba(224,67,47,.28)}',
      '.dshMkt-headings{min-width:0;flex:1}',
      '.dshMkt-title{font-size:22px;line-height:30px;font-weight:600;margin:0;letter-spacing:-.01em}',
      '.dshMkt-tagline{font-size:13px;line-height:19px;color:var(--dsw-alias-label-secondary);margin:1px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dshMkt-siteLink{display:inline-flex;align-items:center;gap:6px;flex:none;font-size:12.5px;line-height:18px;height:30px;padding:0 11px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);text-decoration:none;background:transparent}',
      '.dshMkt-siteLink:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.dshMkt-stats{display:flex;flex-wrap:wrap;gap:8px}',
      '.dshMkt-stat{display:flex;align-items:baseline;gap:5px;padding:5px 11px;border-radius:999px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1);font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary)}',
      '.dshMkt-stat b{font-size:13.5px;line-height:18px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}',
      '.dshMkt-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}',
      '.dshMkt-search{position:relative;flex:1 1 280px;min-width:220px;display:flex;align-items:center}',
      '.dshMkt-searchIcon{position:absolute;left:11px;color:var(--dsw-alias-label-secondary);pointer-events:none;display:flex}',
      '.dshMkt-input{width:100%;height:38px;box-sizing:border-box;padding:0 34px 0 34px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13.5px;line-height:20px;outline:none}',
      '.dshMkt-input::placeholder{color:var(--dsw-alias-label-secondary)}',
      '.dshMkt-input:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px rgba(59,110,240,.14)}',
      '.dshMkt-clear{position:absolute;right:6px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.dshMkt-clear:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.dshMkt-select{height:38px;box-sizing:border-box;padding:0 28px 0 11px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none;cursor:pointer;appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--dsw-alias-label-secondary) 50%),linear-gradient(135deg,var(--dsw-alias-label-secondary) 50%,transparent 50%);background-position:calc(100% - 15px) 17px,calc(100% - 11px) 17px;background-size:4px 4px,4px 4px;background-repeat:no-repeat}',
      '.dshMkt-toggle{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 13px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer;white-space:nowrap}',
      '.dshMkt-toggle:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dshMkt-toggle[data-on=true]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1)}',
      '.dshMkt-dot{width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.55}',
      '.dshMkt-toggle[data-on=true] .dshMkt-dot{opacity:1}',
      '.dshMkt-cats{display:flex;gap:7px;overflow-x:auto;padding:2px 0 4px;margin-bottom:6px;scrollbar-width:thin}',
      '.dshMkt-tabs{display:flex;gap:20px;border-bottom:.5px solid var(--dsw-alias-border-l1);margin-bottom:14px}',
      '.dshMkt-tab{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13.5px;line-height:20px;padding:0 1px 9px;margin-bottom:-.5px;cursor:pointer;display:flex;align-items:center;gap:6px;border-bottom:2px solid transparent}',
      '.dshMkt-tab:hover{color:var(--dsw-alias-label-primary)}',
      '.dshMkt-tab[data-active=true]{color:var(--dsw-alias-label-primary);font-weight:600;border-bottom-color:var(--dsw-alias-brand-primary)}',
      '.dshMkt-tabCount{font-size:11px;line-height:16px;padding:1px 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-weight:500;font-variant-numeric:tabular-nums}',
      '.dshMkt-tab[data-active=true] .dshMkt-tabCount{color:var(--dsw-alias-brand-primary)}',
      '.dshMkt-batchBtn{height:38px;border-radius:10px;flex:none;padding:0 14px}',
      '.dshMkt-statePill{display:inline-flex;align-items:center;gap:5px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}',
      '.dshMkt-statePill[data-on=true]{color:var(--dsw-alias-state-success-primary)}',
      '.dshMkt-switch{width:34px;height:20px;border-radius:999px;padding:0;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);position:relative;cursor:pointer;flex:none;transition:background .15s ease,border-color .15s ease}',
      '.dshMkt-switch[data-on=true]{background:var(--dsw-alias-state-success-primary);border-color:transparent}',
      '.dshMkt-switch:disabled{opacity:.55;cursor:default}',
      '.dshMkt-switch[data-busy=true]{opacity:.7}',
      '.dshMkt-switchKnob{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s ease}',
      '.dshMkt-switch[data-on=true] .dshMkt-switchKnob{transform:translateX(14px)}',
      '.dshMkt-whyBtn{appearance:none;border:0;background:transparent;padding:0;font:inherit;font-size:11px;line-height:16px;color:var(--dsw-alias-brand-primary);cursor:pointer;text-decoration:underline;text-underline-offset:2px}',
      '.dshMkt-whyBtn:hover{opacity:.8}',
      '.dshMkt-reasonList{display:flex;flex-direction:column;gap:5px;margin:10px 0 0;padding:10px 12px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l1);font-size:11.5px;line-height:18px;color:var(--dsw-alias-label-secondary);word-break:break-word}',
      '.dshMkt-reasonLine{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}',
      '.dshMkt-reasonTitle{font-size:14px;line-height:20px;font-weight:600;margin:0 0 4px}',
      '.dshMkt-reasonAction{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:.5px solid var(--dsw-alias-border-l1)}',
      '.dshMkt-chip{flex:none;height:28px;padding:0 11px;border-radius:999px;border:.5px solid transparent;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;line-height:18px;cursor:pointer;white-space:nowrap}',
      '.dshMkt-chip:hover{color:var(--dsw-alias-label-primary)}',
      '.dshMkt-chip[data-active=true]{background:var(--dsw-alias-brand-primary);color:#fff}',
      '.dshMkt-resultsHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0 10px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);min-height:18px}',
      '.dshMkt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(296px,1fr));gap:14px}',
      '.dshMkt-card{display:flex;flex-direction:column;gap:10px;padding:15px 15px 13px;border-radius:14px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);min-width:0;transition:border-color .12s ease,box-shadow .12s ease}',
      '.dshMkt-card:hover{border-color:var(--dsw-alias-border-l2);box-shadow:0 6px 20px rgba(0,0,0,.06)}',
      '.dshMkt-cardTop{display:flex;align-items:center;gap:10px;min-width:0}',
      '.dshMkt-cardSide{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:none}',
      '.dshMkt-logo{width:38px;height:38px;flex:none;border-radius:11px;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary);border:.5px solid var(--dsw-alias-border-l1)}',
      '.dshMkt-logo img{width:100%;height:100%;object-fit:cover;display:block}',
      '.dshMkt-cardHead{min-width:0;flex:1;display:flex;flex-direction:column;gap:1px}',
      '.dshMkt-cardTitle{font-size:14.5px;line-height:21px;font-weight:600;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dshMkt-cardOwner{font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dshMkt-cat{flex:none;font-size:11px;line-height:16px;padding:2px 7px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);max-width:96px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dshMkt-desc{margin:0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;min-height:57px}',
      '.dshMkt-desc[data-expanded=true]{display:block;min-height:0}',
      '.dshMkt-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary)}',
      '.dshMkt-metaItem{display:inline-flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums}',
      '.dshMkt-cardFoot{display:flex;align-items:center;gap:8px;margin-top:auto;padding-top:2px}',
      '.dshMkt-btn{appearance:none;font:inherit;font-size:13px;line-height:20px;height:32px;padding:0 14px;border-radius:8px;border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;text-decoration:none}',
      '.dshMkt-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
      '.dshMkt-btn[data-kind=primary]{background:var(--dsw-alias-brand-primary);color:#fff}',
      '.dshMkt-btn[data-kind=primary]:hover:not(:disabled){filter:brightness(1.08)}',
      '.dshMkt-btn[data-kind=primary]:disabled{opacity:.55;cursor:default}',
      '.dshMkt-btn[data-kind=ghost]{background:transparent;color:var(--dsw-alias-label-secondary);border:.5px solid var(--dsw-alias-border-l2)}',
      '.dshMkt-btn[data-kind=ghost]:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.dshMkt-btn[data-kind=quiet]{background:transparent;color:var(--dsw-alias-label-secondary);padding:0 8px}',
      '.dshMkt-btn[data-kind=quiet]:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.dshMkt-btn[data-kind=danger]{background:transparent;color:var(--dsw-alias-state-error-primary);border:.5px solid var(--dsw-alias-border-l2)}',
      '.dshMkt-btn[data-kind=danger]:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dshMkt-done{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;color:var(--dsw-alias-state-success-primary);white-space:nowrap}',
      '.dshMkt-pager{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:20px}',
      '.dshMkt-pageBtn{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer}',
      '.dshMkt-pageBtn:disabled{opacity:.4;cursor:default}',
      '.dshMkt-pageBtn:not(:disabled):hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dshMkt-footNote{margin:22px 0 0;font-size:11.5px;line-height:18px;color:var(--dsw-alias-label-secondary);border-top:.5px solid var(--dsw-alias-border-l1);padding-top:14px}',
      '.dshMkt-thanks{margin:8px 0 0;font-size:11.5px;line-height:18px;color:var(--dsw-alias-label-secondary);opacity:.85}',
      '.dshMkt-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:56px 16px;text-align:center;font-size:13.5px;line-height:20px;color:var(--dsw-alias-label-secondary)}',
      '.dshMkt-error{color:var(--dsw-alias-state-error-primary);max-width:560px;word-break:break-word}',
      '.dshMkt-spinner{width:15px;height:15px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:dshMktSpin .7s linear infinite;flex:none}',
      '.dshMkt-spinner[data-big=true]{width:22px;height:22px;border-width:2.5px}',
      '@keyframes dshMktSpin{to{transform:rotate(360deg)}}',
      '.dshMkt-skeleton{height:132px;border-radius:14px;background:linear-gradient(100deg,var(--dsw-alias-bg-layer-1) 30%,var(--dsw-alias-bg-layer-2) 46%,var(--dsw-alias-bg-layer-1) 62%);background-size:220% 100%;animation:dshMktShimmer 1.4s ease-in-out infinite}',
      '@keyframes dshMktShimmer{from{background-position:120% 0}to{background-position:-40% 0}}',
      '.dshMkt-overlay{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,18,24,.42);animation:dshMktFade .14s ease-out}',
      '@keyframes dshMktFade{from{opacity:0}to{opacity:1}}',
      '.dshMkt-modal{width:100%;max-width:580px;max-height:82vh;overflow:auto;box-sizing:border-box;border-radius:16px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);box-shadow:0 24px 64px rgba(0,0,0,.28);padding:22px 24px 20px;animation:dshMktRise .16s ease-out}',
      '@keyframes dshMktRise{from{opacity:0;transform:translateY(6px) scale(.99)}to{opacity:1;transform:none}}',
      '.dshMkt-modalHead{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}',
      '.dshMkt-modalTitle{font-size:17px;line-height:24px;font-weight:600;margin:0;min-width:0;word-break:break-word}',
      '.dshMkt-modalSub{font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary);margin-top:2px}',
      '.dshMkt-close{appearance:none;flex:none;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.dshMkt-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.dshMkt-body{font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word}',
      '.dshMkt-modalDesc{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);margin:0 0 14px;white-space:pre-wrap}',
      '.dshMkt-sectionTitle{font-size:12px;line-height:17px;font-weight:600;color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:.04em;margin:16px 0 6px}',
      '.dshMkt-tags{display:flex;gap:6px;flex-wrap:wrap}',
      '.dshMkt-tag{font-size:11.5px;line-height:17px;padding:2px 8px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}',
      '.dshMkt-code{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l1);min-width:0}',
      '.dshMkt-code code{flex:1;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;line-height:17px;white-space:nowrap;overflow:auto;color:var(--dsw-alias-label-primary)}',
      '.dshMkt-output{margin:10px 0 0;padding:10px;max-height:180px;overflow:auto;border-radius:8px;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l1);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word}',
      '.dshMkt-modalFoot{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:18px;flex-wrap:wrap}',
      '.dshMkt-askList{display:flex;flex-direction:column;gap:6px;margin-top:14px}',
      '.dshMkt-askItem{display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:10px 12px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:19px;cursor:pointer}',
      '.dshMkt-askItem:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}',
      '.dshMkt-askItem svg{flex:none;color:var(--dsw-alias-label-secondary)}',
      '.dshMkt-askNote{font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-secondary);margin-top:10px}',
      '.dshMkt-modalFoot .dshMkt-grow{flex:1}',
      '.dshMkt-warn{display:flex;gap:8px;align-items:flex-start;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1);border-radius:9px;padding:9px 11px;margin-top:14px}',
      '.dshMkt-warn b{color:var(--dsw-alias-label-primary)}',
      '.dshMkt-toasts{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:80;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}',
      '.dshMkt-toast{pointer-events:auto;max-width:min(480px,calc(100vw - 48px));padding:9px 14px;border-radius:9px;background:var(--dsw-alias-bg-overlay);border:.5px solid var(--dsw-alias-border-l1);box-shadow:0 8px 24px rgba(0,0,0,.18);font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-primary);animation:dshMktRise .16s ease-out;word-break:break-word}',
      '.dshMkt-toast[data-tone=error]{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}',
      '.dshMkt-toast[data-tone=success]{border-color:var(--dsw-alias-state-success-primary)}',
      '.dshMkt-cardProgress{display:flex;flex-direction:column;gap:6px;padding:9px 10px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l1)}',
      '.dshMkt-progressHead{display:flex;align-items:center;gap:7px;min-width:0;font-size:12px;line-height:16px}',
      '.dshMkt-progressPhase{flex:1;min-width:0;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dshMkt-pct{font-variant-numeric:tabular-nums;font-weight:600;font-size:12px}',
      '.dshMkt-bar{height:5px;border-radius:999px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;box-shadow:inset 0 0 0 .5px var(--dsw-alias-border-l1)}',
      '.dshMkt-barFill{position:relative;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--dsw-alias-brand-primary),#f97316);transition:width .5s ease;overflow:hidden}',
      '.dshMkt-barFill::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent);animation:dshMktSweep 1.3s ease-in-out infinite;transform:translateX(-100%)}',
      '@keyframes dshMktSweep{to{transform:translateX(100%)}}',
      '.dshMkt-progressFoot{display:flex;justify-content:space-between;gap:8px;font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary)}',
      '.dshMkt-job{position:fixed;right:24px;bottom:82px;z-index:70;width:min(340px,calc(100vw - 32px));box-sizing:border-box;padding:12px 14px;border-radius:12px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);box-shadow:0 16px 44px rgba(0,0,0,.24);display:flex;flex-direction:column;gap:8px;animation:dshMktRise .18s ease-out}',
      '.dshMkt-jobHead{display:flex;align-items:center;gap:9px}',
      '.dshMkt-jobCopy{flex:1;min-width:0}',
      '.dshMkt-jobTitle{font-size:13px;line-height:18px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dshMkt-jobPhase{font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);margin-top:1px}',
      '.dshMkt-jobFoot{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary)}',
      '.dshMkt-hint{min-width:0}',
      '@media (max-width:760px){',
      '.dshMkt-inner{padding:20px 16px 40px}',
      '.dshMkt-tagline{white-space:normal}',
      '.dshMkt-grid{grid-template-columns:minmax(0,1fr)}',
      '.dshMkt-siteLink{display:none}',
      '.dshMkt-cardFoot .dshMkt-btn[data-kind=ghost]{display:none}',
      '.dshMkt-job{right:12px;bottom:76px}',
      '.dshMkt-progressFoot{font-size:10.5px}',
      '}',
      '@media (prefers-reduced-motion:reduce){.dshMkt-spinner{animation-duration:1.6s}.dshMkt-skeleton{animation:none}.dshMkt-overlay,.dshMkt-modal,.dshMkt-toast{animation:none}}',
    ].join('\n');

    /** Stable stand-in when the locale face is not injected (tests, older shell). */
    const FALLBACK_LOCALE = {
      subscribe: () => () => {},
      getLocale: () => ({ active: 'zh' }),
    };

    /** Build the "install spec" label for the detail sheet. */
    function specLabel(entry) {
      if (entry.spec) return entry.spec;
      return entry.install ?? '';
    }

    /** Main market page. */
    function MarketPanel(props) {
      const localeFace = props.locale ?? FALLBACK_LOCALE;
      const t = useMemo(() => translate(props?.t, en), [props?.t]);
      const active = React.useSyncExternalStore(
        (listener) => localeFace.subscribe(listener),
        () => localeFace.getLocale().active,
        () => 'zh',
      );

      const [boot, setBoot] = useState(null);
      const [bootError, setBootError] = useState(null);
      const [view, setView] = useState(() => {
        try {
          return window.sessionStorage.getItem(`${NS}.view`) === 'installed' ? 'installed' : 'discover';
        } catch {
          return 'discover';
        }
      });
      const [text, setText] = useState('');
      const [category, setCategory] = useState('');
      const [sort, setSort] = useState('recommended');
      const [offset, setOffset] = useState(0);
      const [page, setPage] = useState(null);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);
      const [installedText, setInstalledText] = useState('');
      const [installed, setInstalled] = useState({ loading: true, data: null, error: null });
      const [reload, setReload] = useState(0);
      const [job, setJob] = useState(null);
      const [batch, setBatch] = useState(readStoredBatch);
      const [toggling, setToggling] = useState(null);
      const [now, setNow] = useState(Date.now());
      const [dialog, setDialog] = useState(null);
      const [startingChat, setStartingChat] = useState(false);
      const [toasts, setToasts] = useState([]);
      const seq = useRef(0);
      const jobRef = useRef(null);
      const batchRef = useRef(batch);

      const toast = useCallback((message, tone) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setToasts((current) => [...current, { id, message, tone: tone ?? 'info' }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== id));
        }, 5200);
      }, []);

      useEffect(() => {
        let alive = true;
        setBootError(null);
        call('bootstrap').then((value) => {
          if (alive) setBoot(value);
        }).catch((failure) => {
          if (alive) setBootError(failure.message);
        });
        return () => { alive = false; };
      }, [reload]);

      useEffect(() => {
        saveStoredBatch(batch);
      }, [batch]);

      useEffect(() => {
        try {
          window.sessionStorage.setItem(`${NS}.view`, view);
        } catch {
          /* continuity only; a blocked storage falls back to Discover */
        }
      }, [view]);

      useEffect(() => {
        if (view !== 'discover') return undefined;
        const timer = window.setTimeout(() => {
          const ticket = seq.current + 1;
          seq.current = ticket;
          setLoading(true);
          setError(null);
          call('search', {
            text, category, sort, offset, limit: PAGE_SIZE,
          }).then((value) => {
            if (seq.current !== ticket) return;
            setPage(value);
            setLoading(false);
          }).catch((failure) => {
            if (seq.current !== ticket) return;
            setError(failure.message);
            setLoading(false);
          });
        }, text === '' ? 0 : 240);
        return () => window.clearTimeout(timer);
      }, [view, text, category, sort, offset, reload]);

      useEffect(() => {
        if (view !== 'installed') return undefined;
        let alive = true;
        setInstalled((current) => ({ ...current, loading: true, error: null }));
        call('installed').then((value) => {
          if (!alive) return;
          setInstalled({ loading: false, data: { available: value.available, bundles: value.bundles }, error: null });
        }).catch((failure) => {
          if (!alive) return;
          setInstalled((current) => ({ ...current, loading: false, error: failure.message }));
        });
        return () => { alive = false; };
      }, [view, reload]);

      useEffect(() => {
        jobRef.current = job;
        if (job === null) return undefined;
        setNow(Date.now());
        const timer = window.setInterval(() => setNow(Date.now()), 500);
        return () => window.clearInterval(timer);
      }, [job]);

      const refresh = useCallback(() => {
        setReload((value) => value + 1);
      }, []);

      const beginInstall = useCallback(async (entry, approvedBuilds) => {
        try {
          const value = await call('install', {
            spec: entry.spec,
            name: entry.name,
            ...(typeof entry.enabled === 'boolean' ? { enabled: entry.enabled } : {}),
            approvedBuilds: approvedBuilds ?? [],
          });
          setJob({ requestId: value.requestId, entry, startedAt: Date.now() });
          setDialog(null);
        } catch (failure) {
          toast(t('installFailed', { message: failure.message }), 'error');
        }
      }, [t, toast]);

      const cancelInstall = useCallback(async () => {
        if (job === null) return;
        const wasBatch = batchRef.current !== null;
        try {
          await call('cancel', { requestId: job.requestId });
          toast(wasBatch ? t('batchCancelled') : t('cancelled'));
        } catch (failure) {
          toast(failure.message, 'error');
        } finally {
          if (wasBatch) {
            batchRef.current = null;
            setBatch(null);
          }
          setJob(null);
          refresh();
        }
      }, [job, t, toast, refresh]);

      /** Stop a batch when one of its items needs build approval. */
      const pauseBatch = useCallback(() => {
        if (batchRef.current === null) return;
        batchRef.current = null;
        setBatch(null);
        toast(t('batchPaused'), 'error');
      }, [t, toast]);

      /** Start the next plugin in the update-all queue after one settles. */
      const advanceBatch = useCallback((finishedName, failed) => {
        const current = batchRef.current;
        if (current === null) return;
        const item = current.items[current.index];
        if (item === undefined || item.name !== finishedName) return;
        const failedCount = (current.failed ?? 0) + (failed === true ? 1 : 0);
        const nextIndex = current.index + 1;
        if (nextIndex >= current.items.length) {
          batchRef.current = null;
          setBatch(null);
          if (failedCount === 0) {
            toast(t('batchDone', { n: current.items.length }), 'success');
          } else {
            toast(t('batchDonePartial', {
              n: current.items.length - failedCount,
              failed: failedCount,
            }), 'error');
          }
          refresh();
          return;
        }
        const next = { ...current, index: nextIndex, failed: failedCount };
        batchRef.current = next;
        setBatch(next);
        void beginInstall(next.items[nextIndex]);
      }, [beginInstall, t, toast, refresh]);

      /** Closing the build-approval sheet also pauses the update-all queue. */
      const closeDialog = useCallback(() => {
        if (dialog !== null && dialog.kind === 'builds' && batchRef.current !== null) pauseBatch();
        setDialog(null);
      }, [dialog, pauseBatch]);

      const remove = useCallback(async (entry) => {
        try {
          const result = await call('remove', { name: entry.npm ?? entry.name });
          setDialog(null);
          if (result.application === 'failed' || result.error) {
            toast(t('uninstallFailed', { message: result.error?.code ?? 'failed' }), 'error');
            return;
          }
          toast(t('uninstallDone', { name: entry.name }), 'success');
          refresh();
        } catch (failure) {
          toast(t('uninstallFailed', { message: failure.message }), 'error');
        }
      }, [t, toast, refresh]);

      /** Flip one installed bundle's enabled state through the Host. */
      const setEnabled = useCallback(async (bundle, enabled) => {
        setToggling(bundle.name);
        try {
          const result = await call('set-enabled', { name: bundle.name, enabled });
          if (result.application === 'failed' || result.error) {
            toast(t('toggleFailed', {
              message: result.error?.diagnostic ?? result.error?.code ?? 'failed',
            }), 'error');
          } else if (result.application === 'overridden') {
            toast(t('toggleOverridden'), 'error');
          } else if (result.application === 'restart-required') {
            toast(t(enabled ? 'enableRestart' : 'disableRestart', { name: bundle.name }), 'success');
          } else {
            toast(t(enabled ? 'enableDone' : 'disableDone', { name: bundle.name }), 'success');
          }
          refresh();
        } catch (failure) {
          toast(t('toggleFailed', { message: failure.message }), 'error');
        } finally {
          setToggling(null);
        }
      }, [t, toast, refresh]);

      /** Start an update from the "why disabled" analysis sheet. */
      const updateBundle = useCallback((bundle) => {
        void beginInstall({
          spec: bundle.spec,
          name: bundle.name,
          enabled: bundle.enabled === true || bundle.errorCode === 'incompatible-version',
        });
      }, [beginInstall]);

      /** Announce one terminal job once, then refresh installation facts. */
      const consumeFinished = useCallback((view) => {
        if (view === null || typeof view !== 'object') return;
        const id = view.requestId;
        if (wasNotified(id)) return;
        if (view.state === 'done') {
          const result = view.result ?? {};
          if (result.error || result.application === 'failed') {
            toast(t('installFailed', {
              message: result.error?.diagnostic ?? result.error?.code ?? 'failed',
            }), 'error');
          } else if (result.application === 'overridden') {
            toast(t('installOverridden', { name: view.name }), 'error');
          } else if (result.application === 'restart-required') {
            toast(t('installRestart', { name: view.name }), 'success');
          } else {
            toast(t('installDone', { name: view.name }), 'success');
          }
          markNotified(id);
          refresh();
          return;
        }
        if (view.state === 'error') {
          toast(t('installFailed', { message: view.error ?? 'failed' }), 'error');
          markNotified(id);
        }
      }, [t, toast, refresh]);

      /**
       * App-store behavior: a job started before leaving the panel is adopted
       * on re-entry (running → progress resumes; finished → one toast and a
       * refresh; awaiting approval → the approval sheet reopens).
       */
      useEffect(() => {
        let alive = true;
        call('jobs').then((value) => {
          if (!alive) return;
          if (jobRef.current !== null) return;
          const list = Array.isArray(value.jobs) ? value.jobs : [];
          const newest = [...list].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))[0];
          if (newest === undefined) {
            // No Host job means the queue cannot continue; drop the stale copy.
            if (batchRef.current !== null) {
              batchRef.current = null;
              setBatch(null);
            }
            return;
          }
          if (newest.state === 'running') {
            setJob({
              requestId: newest.requestId,
              entry: { name: newest.name, spec: newest.spec, enabled: newest.enabled },
              startedAt: newest.startedAt,
            });
            return;
          }
          if (newest.state === 'approval-required') {
            setDialog({
              kind: 'builds',
              entry: { name: newest.name, spec: newest.spec, enabled: newest.enabled },
              builds: newest.result?.pendingBuilds ?? [],
            });
            return;
          }
          consumeFinished(newest);
          const current = batchRef.current;
          if (current !== null) {
            if (current.items[current.index]?.name === newest.name) {
              advanceBatch(newest.name, !!(newest.result?.error || newest.result?.application === 'failed'));
            } else {
              batchRef.current = null;
              setBatch(null);
            }
          }
        }).catch(() => {});
        return () => { alive = false; };
      }, [consumeFinished, advanceBatch]);

      useEffect(() => {
        if (job === null) return;
        let alive = true;
        let timer;
        const tick = async () => {
          try {
            const value = await call('poll', { requestId: job.requestId });
            if (!alive) return;
            if (value.state === 'done') {
              const result = value.result ?? {};
              const builds = Array.isArray(result.pendingBuilds) ? result.pendingBuilds : [];
              if (builds.length > 0) {
                pauseBatch();
                setJob(null);
                setDialog({ kind: 'builds', entry: job.entry, builds });
                return;
              }
              setJob(null);
              consumeFinished(value);
              advanceBatch(value.name, !!(result.error || result.application === 'failed'));
              return;
            }
            if (value.state === 'approval-required') {
              pauseBatch();
              setJob(null);
              setDialog({ kind: 'builds', entry: job.entry, builds: value.result?.pendingBuilds ?? [] });
              return;
            }
            if (value.state === 'error') {
              setJob(null);
              consumeFinished(value);
              advanceBatch(value.name, true);
              return;
            }
            if (value.state === 'cancelled') {
              if (batchRef.current !== null) {
                batchRef.current = null;
                setBatch(null);
              }
              setJob(null);
              return;
            }
            if (value.state === 'unknown') {
              setJob(null);
              toast(t('installFailed', { message: 'install job was lost' }), 'error');
              advanceBatch(job.entry.name, true);
              return;
            }
            timer = window.setTimeout(tick, 1200);
          } catch (failure) {
            if (!alive) return;
            timer = window.setTimeout(tick, 2500);
          }
        };
        void tick();
        return () => {
          alive = false;
          window.clearTimeout(timer);
        };
      }, [job, consumeFinished, advanceBatch, pauseBatch, t, toast]);

      useEffect(() => {
        if (dialog === null) return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') setDialog(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [dialog]);

      const categories = useMemo(() => {
        if (boot === null) return [];
        return Object.entries(boot.categories ?? {}).map(([id, title]) => ({
          id,
          label: pick(title, active),
        }));
      }, [boot, active]);

      const total = page?.total ?? 0;
      const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
      const entries = page?.entries ?? [];
      const busyName = job?.entry?.name;
      const elapsed = job === null ? 0 : Math.max(0, now - job.startedAt);
      const percent = job === null ? 0 : progressOf(elapsed);
      const phaseKey = job === null ? 'phaseStarting' : phaseOf(elapsed);
      const installedBundles = installed.data?.bundles ?? [];
      const installedCount = installed.data?.bundles?.length ?? boot?.installed ?? 0;
      const installedQuery = installedText.trim().toLowerCase();
      const installedRows = installedQuery === ''
        ? installedBundles
        : installedBundles.filter((bundle) => {
          const title = pick(bundle.title, active);
          const description = pick(bundle.description, active);
          return `${bundle.name} ${title} ${description}`.toLowerCase().includes(installedQuery);
        });
      const enabledCount = installedBundles.filter((bundle) => bundle.enabled === true).length;
      const updates = installedBundles.filter((bundle) => (
        bundle.updateAvailable === true
        && bundle.installable === true
        && typeof bundle.spec === 'string'
        && bundle.spec !== ''
      ));

      /** Queue every available update and install them one after another. */
      const startBatch = useCallback(() => {
        const items = installedBundles
          .filter((bundle) => (
            bundle.updateAvailable === true
            && bundle.installable === true
            && typeof bundle.spec === 'string'
            && bundle.spec !== ''
          ))
          .map((bundle) => ({
            spec: bundle.spec,
            name: bundle.name,
            enabled: bundle.enabled === true || bundle.errorCode === 'incompatible-version',
          }));
        if (items.length === 0) return;
        const next = { items, index: 0, failed: 0 };
        batchRef.current = next;
        setBatch(next);
        void beginInstall(items[0]);
      }, [installedBundles, beginInstall]);

      /** Live install progress shown inside the card being installed. */
      const progressBlock = () => h('div', { className: 'dshMkt-cardProgress' },
        h('div', { className: 'dshMkt-progressHead' },
          h('span', { className: 'dshMkt-spinner' }),
          h('span', { className: 'dshMkt-progressPhase' }, t(phaseKey)),
          h('span', { className: 'dshMkt-pct' }, `${percent}%`)),
        h('div', {
          className: 'dshMkt-bar', role: 'progressbar',
          'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': percent,
        },
        h('div', { className: 'dshMkt-barFill', style: { width: `${percent}%` } })),
        h('div', { className: 'dshMkt-progressFoot' },
          h('span', null, t('elapsed', { time: formatElapsed(elapsed) })),
          t('progressHint')));

      /** Open the question sheet for one plugin. */
      const openChat = (brief, title) => setDialog({ kind: 'ask', brief, title });

      /** The host primes a hidden brief, sends the question, then we show it. */
      const openPluginChat = async (brief, question) => {
        if (startingChat) return;
        if (typeof props.startPluginChat !== 'function') {
          toast(t('chatUnavailable'), 'error');
          return;
        }
        setStartingChat(true);
        toast(t('askOpening'));
        try {
          await props.startPluginChat(brief, question);
        } catch (failure) {
          toast(t('askFailed', { message: failure?.message ?? 'failed' }), 'error');
        } finally {
          setStartingChat(false);
        }
      };

      /** Brief for one entry in the Discover tab. */
      const chatForEntry = (entry) => buildPluginBrief({
        title: entry.name,
        name: entry.npm ?? entry.name,
        version: entry.installedVersion ?? entry.version,
        installed: entry.status !== 'not-installed',
        enabled: entry.enabled === true,
        category: pick(boot?.categories?.[entry.category], 'zh') || entry.category,
        source: entry.npm ?? entry.spec ?? entry.install,
        repo: entry.repo,
        page: entry.page,
        latestVersion: entry.version,
        updateAvailable: entry.status === 'different-version',
        install: entry.install,
        description: pick(entry.description, 'zh'),
      });

      /** Brief for one bundle in the Installed tab. */
      const chatForBundle = (bundle) => buildPluginBrief({
        title: pick(bundle.title, 'zh') || bundle.name,
        name: bundle.name,
        version: bundle.version,
        installed: true,
        enabled: bundle.enabled === true,
        category: pick(boot?.categories?.[bundle.category], 'zh') || bundle.category,
        source: bundle.source ?? bundle.installTarget?.spec ?? bundle.install,
        repo: bundle.repo,
        page: bundle.page,
        latestVersion: bundle.latestVersion,
        updateAvailable: bundle.updateAvailable === true,
        disableReason: bundle.enabled === true ? null : disabledReasonText(bundle),
        install: bundle.install,
        description: pick(bundle.description, 'zh'),
      });

      const row = (entry) => {
        const hue = hueOf(entry.name);
        const busy = busyName === entry.name;
        const installed = entry.status === 'installed';
        const different = entry.status === 'different-version';
        const canInstall = entry.installable === true;
        return h('article', { className: 'dshMkt-card', key: `${entry.owner}/${entry.name}` },
          h('div', { className: 'dshMkt-cardTop' },
            h('span', {
              className: 'dshMkt-logo',
              style: {
                background: `linear-gradient(135deg, hsla(${hue},78%,55%,.22), hsla(${hue + 42},78%,55%,.10))`,
                borderColor: `hsla(${hue},60%,50%,.22)`,
              },
            }, entry.icon
              ? h('img', {
                src: entry.icon, alt: '', loading: 'lazy', draggable: false,
                onError: (event) => { event.currentTarget.style.display = 'none'; },
              })
              : h('span', { style: { color: `hsl(${hue} 55% 45%)` } }, entry.name.replace(/^@/, '').charAt(0).toUpperCase())),
            h('div', { className: 'dshMkt-cardHead' },
              h('h3', { className: 'dshMkt-cardTitle', title: entry.name }, entry.name),
              h('span', { className: 'dshMkt-cardOwner' }, entry.owner ?? '')),
            h('span', { className: 'dshMkt-cat' }, pick(boot?.categories?.[entry.category], active) || entry.category)),
          h('p', { className: 'dshMkt-desc', title: entry.description?.zh ?? '' },
            pick(entry.description, active) || '—'),
          h('div', { className: 'dshMkt-meta' },
            h('span', { className: 'dshMkt-metaItem', title: t('stars') }, h(Icon, { name: 'star', size: 13 }), compact(entry.stars)),
            entry.downloads === null ? null : h('span', { className: 'dshMkt-metaItem', title: t('downloads') }, h(Icon, { name: 'download', size: 13 }), compact(entry.downloads)),
            entry.version === null ? null : h('span', { className: 'dshMkt-metaItem' }, t('version', { version: entry.version })),
            different ? h('span', { className: 'dshMkt-metaItem' }, `· ${entry.installedVersion}`) : null),
          busy ? progressBlock() : null,
          h('div', { className: 'dshMkt-cardFoot' },
            installed
              ? h('span', { className: 'dshMkt-done' }, h(Icon, { name: 'check', size: 14 }), t('installed'))
              : busy
                ? h('button', {
                  type: 'button', className: 'dshMkt-btn', 'data-kind': 'ghost',
                  onClick: cancelInstall, title: t('cancelInstall'),
                }, t('cancelInstall'))
                : h('button', {
                  type: 'button', className: 'dshMkt-btn', 'data-kind': 'primary',
                  disabled: !canInstall || job !== null || batch !== null,
                  title: job !== null && !busy ? t('installing') : undefined,
                  onClick: () => (canInstall ? beginInstall(entry) : setDialog({ kind: 'detail', entry })),
                }, canInstall ? (different ? t('update', { version: entry.version }) : t('install')) : t('notOneClick')),
            installed
              ? h('button', {
                type: 'button', className: 'dshMkt-btn', 'data-kind': 'danger',
                disabled: entry.removable !== true,
                title: entry.removable === true ? undefined : t('removeUnavailable'),
                onClick: () => setDialog({ kind: 'uninstall', entry }),
              }, t('uninstall'))
              : null,
            h('button', {
              type: 'button', className: 'dshMkt-btn', 'data-kind': 'ghost',
              onClick: () => setDialog({ kind: 'detail', entry }),
            }, t('details')),
            h('span', { style: { flex: 1 } }),
            h('button', {
              type: 'button', className: 'dshMkt-btn', 'data-kind': 'quiet',
              title: t('chat'), 'aria-label': t('chat'),
              onClick: () => openChat(chatForEntry(entry), entry.npm ?? entry.name),
            }, h(Icon, { name: 'chat' })),
            entry.repo
              ? h('a', {
                className: 'dshMkt-btn', 'data-kind': 'quiet', href: entry.repo,
                target: '_blank', rel: 'noopener noreferrer', title: t('repo'),
              }, h(Icon, { name: 'external' }))
              : null));
      };

      /** One installed bundle, including rows the catalog does not list. */
      const installedRow = (bundle) => {
        const hue = hueOf(bundle.name);
        const busy = busyName === bundle.name;
        const isSelf = bundle.name === SELF;
        const title = pick(bundle.title, active) || bundle.name;
        const description = pick(bundle.description, active) || '—';
        const category = bundle.category === null || bundle.category === undefined
          ? null
          : (pick(boot?.categories?.[bundle.category], active) || bundle.category);
        const reason = disabledReason(bundle, t);
        const switchDisabled = job !== null || batch !== null
          || isSelf
          || (typeof bundle.readOnlyReason === 'string' && bundle.readOnlyReason !== '')
          || reason?.kind === 'incompatible';
        const detailEntry = {
          name: bundle.name,
          owner: bundle.owner ?? null,
          description: bundle.description ?? { zh: '', en: '' },
          category: bundle.category,
          version: bundle.latestVersion ?? bundle.version,
          stars: bundle.stars ?? 0,
          downloads: bundle.downloads ?? null,
          capabilities: bundle.capabilities ?? [],
          repo: bundle.repo,
          page: bundle.page,
          install: bundle.install,
          spec: bundle.spec,
          added: bundle.added,
          icon: bundle.icon,
          installable: bundle.installable === true,
          status: 'installed',
          installedVersion: bundle.version,
          removable: bundle.removable === true,
          enabled: bundle.enabled === true,
          buildScripts: [],
        };
        return h('article', { className: 'dshMkt-card', key: bundle.name },
          h('div', { className: 'dshMkt-cardTop' },
            h('span', {
              className: 'dshMkt-logo',
              style: {
                background: `linear-gradient(135deg, hsla(${hue},78%,55%,.22), hsla(${hue + 42},78%,55%,.10))`,
                borderColor: `hsla(${hue},60%,50%,.22)`,
              },
            }, bundle.icon
              ? h('img', {
                src: bundle.icon, alt: '', loading: 'lazy', draggable: false,
                onError: (event) => { event.currentTarget.style.display = 'none'; },
              })
              : h('span', { style: { color: `hsl(${hue} 55% 45%)` } }, bundle.name.replace(/^@/, '').charAt(0).toUpperCase())),
            h('div', { className: 'dshMkt-cardHead' },
              h('h3', { className: 'dshMkt-cardTitle', title: bundle.name }, title),
              h('span', { className: 'dshMkt-cardOwner' }, bundle.name)),
            h('div', { className: 'dshMkt-cardSide' },
              category === null ? null : h('span', { className: 'dshMkt-cat' }, category),
              h(Switch, {
                checked: bundle.enabled === true,
                disabled: switchDisabled,
                busy: toggling === bundle.name,
                onLabel: t('enable'),
                offLabel: t('disable'),
                onChange: (next) => setEnabled(bundle, next),
              }))),
          h('p', { className: 'dshMkt-desc' }, description),
          h('div', { className: 'dshMkt-meta' },
            h('span', { className: 'dshMkt-metaItem' }, bundle.version === null ? '—' : t('version', { version: bundle.version })),
            h('span', {
              className: 'dshMkt-statePill',
              'data-on': String(bundle.enabled === true),
            }, h('span', { className: 'dshMkt-dot' }), bundle.enabled === true ? t('enabled') : t('disabled')),
            reason === null
              ? null
              : h('button', {
                type: 'button', className: 'dshMkt-whyBtn',
                onClick: () => setDialog({ kind: 'why', entry: detailEntry, bundle }),
              }, t('whyDisabled')),
            reason !== null && reason.kind !== 'incompatible'
              ? h('span', { className: 'dshMkt-tag' }, reason.title)
              : null,
            bundle.removable !== true ? h('span', { className: 'dshMkt-tag' }, t('builtIn')) : null,
            isSelf ? h('span', { className: 'dshMkt-tag' }, t('selfMarket')) : null,
            bundle.errorCode ? h('span', { className: 'dshMkt-tag' }, t('incompatible')) : null,
            bundle.updateAvailable && bundle.latestVersion
              ? h('span', { className: 'dshMkt-metaItem' }, t('latest', { version: bundle.latestVersion }))
              : null),
          busy ? progressBlock() : null,
          h('div', { className: 'dshMkt-cardFoot' },
            busy
              ? h('button', {
                type: 'button', className: 'dshMkt-btn', 'data-kind': 'ghost',
                onClick: cancelInstall,
              }, t('cancelInstall'))
              : bundle.updateAvailable && bundle.installable === true
                ? h('button', {
                  type: 'button', className: 'dshMkt-btn', 'data-kind': 'primary',
                  disabled: job !== null || batch !== null,
                  onClick: () => beginInstall({
                    spec: bundle.spec,
                    name: bundle.name,
                    enabled: bundle.enabled === true || bundle.errorCode === 'incompatible-version',
                  }),
                }, t('update', { version: bundle.latestVersion }))
                : null,
            bundle.removable === true && !isSelf
              ? h('button', {
                type: 'button', className: 'dshMkt-btn', 'data-kind': 'danger',
                disabled: job !== null || batch !== null,
                onClick: () => setDialog({ kind: 'uninstall', entry: detailEntry }),
              }, t('uninstall'))
              : null,
            bundle.inCatalog === true
              ? h('button', {
                type: 'button', className: 'dshMkt-btn', 'data-kind': 'ghost',
                onClick: () => setDialog({ kind: 'detail', entry: detailEntry }),
              }, t('details'))
              : null,
            h('span', { style: { flex: 1 } }),
            h('button', {
              type: 'button', className: 'dshMkt-btn', 'data-kind': 'quiet',
              title: t('chat'), 'aria-label': t('chat'),
              onClick: () => openChat(chatForBundle(bundle), title),
            }, h(Icon, { name: 'chat' })),
            bundle.repo
              ? h('a', {
                className: 'dshMkt-btn', 'data-kind': 'quiet', href: bundle.repo,
                target: '_blank', rel: 'noopener noreferrer', title: t('repo'),
              }, h(Icon, { name: 'external' }))
              : null));
      };

      /** A running install that has not produced an installed bundle row yet. */
      const activeInstallCard = job === null || installedBundles.some((bundle) => bundle.name === job.entry.name)
        ? null
        : h('article', { className: 'dshMkt-card', key: '__active-install__' },
          h('div', { className: 'dshMkt-cardTop' },
            h('span', { className: 'dshMkt-logo' },
              h('span', { className: 'dshMkt-spinner', 'data-big': 'false' })),
            h('div', { className: 'dshMkt-cardHead' },
              h('h3', { className: 'dshMkt-cardTitle', title: job.entry.name }, job.entry.name),
              h('span', { className: 'dshMkt-cardOwner' }, t('installing')))),
          progressBlock(),
          h('div', { className: 'dshMkt-cardFoot' },
            h('button', {
              type: 'button', className: 'dshMkt-btn', 'data-kind': 'ghost',
              onClick: cancelInstall,
            }, t('cancelInstall'))));

      const installedCards = activeInstallCard === null
        ? installedRows
        : [activeInstallCard, ...installedRows];

      const discoverBody = loading && page === null
        ? h('div', { className: 'dshMkt-grid' },
          Array.from({ length: 6 }, (_, index) => h('div', { className: 'dshMkt-skeleton', key: index })))
        : error !== null
          ? h('div', { className: 'dshMkt-state' },
            h('div', { className: 'dshMkt-error' }, t('loadFailed', { message: error })),
            h('button', {
              type: 'button', className: 'dshMkt-btn', 'data-kind': 'ghost',
              onClick: refresh,
            }, t('retry')))
          : entries.length === 0
            ? h('div', { className: 'dshMkt-state' }, t('empty'))
            : h('div', { className: 'dshMkt-grid' }, entries.map(row));

      const installedBody = installed.loading && installed.data === null
        ? h('div', { className: 'dshMkt-grid' },
          Array.from({ length: 3 }, (_, index) => h('div', { className: 'dshMkt-skeleton', key: index })))
        : installed.error !== null
          ? h('div', { className: 'dshMkt-state' },
            h('div', { className: 'dshMkt-error' }, t('loadFailed', { message: installed.error })),
            h('button', {
              type: 'button', className: 'dshMkt-btn', 'data-kind': 'ghost',
              onClick: refresh,
            }, t('retry')))
          : installedCards.length === 0
            ? h('div', { className: 'dshMkt-state' },
              installedQuery === '' ? t('emptyInstalled') : t('empty'))
            : h('div', { className: 'dshMkt-grid' },
              activeInstallCard,
              installedRows.map(installedRow))

      const body = view === 'discover' ? discoverBody : installedBody;

      return h('div', { className: 'dshMkt-root' },
        h('style', null, CSS),
        h('div', { className: 'dshMkt-inner' },
          h('header', { className: 'dshMkt-hero' },
            h('div', { className: 'dshMkt-heroTop' },
              h('span', { className: 'dshMkt-mark' }, h(PanelIcon, { size: 24 })),
              h('div', { className: 'dshMkt-headings' },
                h('h1', { className: 'dshMkt-title' }, t('title')),
                h('p', { className: 'dshMkt-tagline' }, t('tagline'))),
              boot === null ? null : h('a', {
                className: 'dshMkt-siteLink', href: `${boot.site}/plugins`,
                target: '_blank', rel: 'noopener noreferrer',
              }, t('siteLink'), h(Icon, { name: 'external', size: 14 }))),
            boot === null
              ? null
              : h('div', { className: 'dshMkt-stats' },
                h('span', { className: 'dshMkt-stat' }, h('b', null, (boot.count ?? 0).toLocaleString()), t('statPlugins')),
                h('span', { className: 'dshMkt-stat' }, h('b', null, (boot.installable ?? 0).toLocaleString()), t('statInstallable')),
                h('span', { className: 'dshMkt-stat' }, h('b', null, Object.keys(boot.categories ?? {}).length), t('statCategories')),
                h('span', { className: 'dshMkt-stat' }, t('statSnapshot'), h('b', null, boot.updated ?? '—')))),
          bootError === null
            ? null
            : h('div', { className: 'dshMkt-warn', style: { marginTop: 0, marginBottom: 14 } },
              h(Icon, { name: 'spark', size: 15 }),
              h('span', { style: { flex: 1 } }, t('loadFailed', { message: bootError })),
              h('button', {
                type: 'button', className: 'dshMkt-btn', 'data-kind': 'ghost',
                onClick: refresh,
              }, t('retry'))),
          h('div', { className: 'dshMkt-tabs' },
            h('button', {
              type: 'button', className: 'dshMkt-tab', 'data-active': String(view === 'discover'),
              onClick: () => setView('discover'),
            }, t('tabDiscover'), h('span', { className: 'dshMkt-tabCount' }, (boot?.count ?? 0).toLocaleString())),
            h('button', {
              type: 'button', className: 'dshMkt-tab', 'data-active': String(view === 'installed'),
              onClick: () => setView('installed'),
            }, t('tabInstalled'), h('span', { className: 'dshMkt-tabCount' }, String(installedCount)))),
          h('div', { className: 'dshMkt-toolbar' },
            h('div', { className: 'dshMkt-search' },
              h('span', { className: 'dshMkt-searchIcon' }, h(Icon, { name: 'search', size: 15 })),
              h('input', {
                className: 'dshMkt-input', type: 'text',
                value: view === 'discover' ? text : installedText,
                placeholder: view === 'discover' ? t('searchPlaceholder') : t('installedSearch'),
                'aria-label': view === 'discover' ? t('searchPlaceholder') : t('installedSearch'),
                onChange: (event) => {
                  if (view === 'discover') {
                    setText(event.target.value);
                    setOffset(0);
                  } else {
                    setInstalledText(event.target.value);
                  }
                },
              }),
              (view === 'discover' ? text : installedText) === ''
                ? null
                : h('button', {
                  type: 'button', className: 'dshMkt-clear', title: t('cancel'),
                  onClick: () => {
                    if (view === 'discover') {
                      setText('');
                      setOffset(0);
                    } else {
                      setInstalledText('');
                    }
                  },
                }, h(Icon, { name: 'x', size: 14 }))),
            view === 'discover'
              ? h('select', {
                className: 'dshMkt-select', value: sort, 'aria-label': t('sortRecommended'),
                onChange: (event) => { setSort(event.target.value); setOffset(0); },
              },
              h('option', { value: 'recommended' }, t('sortRecommended')),
              h('option', { value: 'downloads' }, t('sortDownloads')),
              h('option', { value: 'latest' }, t('sortLatest')),
              h('option', { value: 'name' }, t('sortName')))
              : null,
            view === 'installed' && (updates.length > 0 || batch !== null)
              ? h('button', {
                type: 'button', className: 'dshMkt-btn dshMkt-batchBtn', 'data-kind': 'primary',
                disabled: job !== null || batch !== null,
                onClick: startBatch,
              }, batch === null
                ? t('updateAll', { n: updates.length })
                : t('batchProgress', { index: batch.index + 1, total: batch.items.length }))
              : null,
            h('button', {
              type: 'button', className: 'dshMkt-toggle', title: t('retry'),
              'aria-label': t('retry'), onClick: refresh,
            }, h(Icon, { name: 'refresh', size: 15 }))),
          view === 'discover'
            ? h('div', { className: 'dshMkt-cats' },
              h('button', {
                type: 'button', className: 'dshMkt-chip', 'data-active': String(category === ''),
                onClick: () => { setCategory(''); setOffset(0); },
              }, t('all')),
              categories.map((item) => h('button', {
                type: 'button', className: 'dshMkt-chip', key: item.id,
                'data-active': String(category === item.id),
                onClick: () => { setCategory(item.id); setOffset(0); },
              }, item.label)))
            : null,
          h('div', { className: 'dshMkt-resultsHead' },
            h('span', null, view === 'discover'
              ? (loading ? t('searching') : t('results', { n: total.toLocaleString() }))
              : (installed.loading ? t('loadingInstalled') : t('installedResults', { n: installedCards.length }))),
            h('span', null, view === 'discover'
              ? (total === 0 ? '' : t('pageOf', { page: currentPage, pages }))
              : (enabledCount === 0 ? '' : t('enabledCount', { n: enabledCount })))),
          body,
          view === 'discover' && total !== 0
            ? h('div', { className: 'dshMkt-pager' },
              h('button', {
                type: 'button', className: 'dshMkt-pageBtn', disabled: offset === 0,
                'aria-label': 'previous', onClick: () => setOffset(Math.max(0, offset - PAGE_SIZE)),
              }, h('span', { style: { transform: 'rotate(180deg)' } }, h(Icon, { name: 'arrow' }))),
              h('button', {
                type: 'button', className: 'dshMkt-pageBtn',
                disabled: page?.nextOffset === null || page?.nextOffset === undefined,
                'aria-label': 'next', onClick: () => setOffset(page?.nextOffset ?? offset),
              }, h(Icon, { name: 'arrow' })))
            : null,
          h('p', { className: 'dshMkt-footNote' }, t('footer', {
            date: boot?.updated ?? '—',
            count: (boot?.count ?? 0).toLocaleString(),
          })),
          h('p', { className: 'dshMkt-thanks' }, t('thanks'))),
        dialog === null ? null : h(Dialog, {
          dialog, t, active, job,
          onClose: closeDialog,
          onInstall: beginInstall,
          onToggle: (bundle, enabled) => { void setEnabled(bundle, enabled); },
          onUpdate: (bundle) => { updateBundle(bundle); },
          onAskUninstall: (value) => setDialog({ kind: 'uninstall', entry: value }),
          onAsk: (brief, question) => {
            setDialog(null);
            void openPluginChat(brief, question);
          },
          onRemove: remove,
          onCopy: async (value) => {
            try {
              await navigator.clipboard.writeText(value);
              toast(t('copied'));
            } catch {
              toast(value);
            }
          },
        }),
        job === null ? null : h('div', {
          className: 'dshMkt-job', role: 'region',
          'aria-label': t('installProgressLabel', { name: job.entry.name }),
        },
        h('div', { className: 'dshMkt-jobHead' },
          h('span', { className: 'dshMkt-spinner' }),
          h('div', { className: 'dshMkt-jobCopy' },
            h('div', { className: 'dshMkt-jobTitle' },
              batch === null
                ? t('installProgressLabel', { name: job.entry.name })
                : t('updatingName', { name: job.entry.name })),
            h('div', { className: 'dshMkt-jobPhase' },
              `${batch === null ? '' : `${batch.index + 1}/${batch.items.length} · `}${t(phaseKey)} · ${t('elapsed', { time: formatElapsed(elapsed) })}`)),
          h('span', { className: 'dshMkt-pct' }, `${percent}%`)),
        h('div', {
          className: 'dshMkt-bar', role: 'progressbar',
          'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': percent,
        },
        h('div', { className: 'dshMkt-barFill', style: { width: `${percent}%` } })),
        h('div', { className: 'dshMkt-jobFoot' },
          h('span', { className: 'dshMkt-hint' }, elapsed > 60000 ? t('slowHint') : t('progressHint')),
          h('button', {
            type: 'button', className: 'dshMkt-btn', 'data-kind': 'quiet',
            onClick: cancelInstall,
          }, t('cancelInstall')))),
        h('div', { className: 'dshMkt-toasts' },
          toasts.map((item) => h('div', {
            className: 'dshMkt-toast', 'data-tone': item.tone, key: item.id,
          }, item.message))));
    }

    /** One modal for details, uninstall confirmation, and build approval. */
    function Dialog(props) {
      const { dialog, t, active } = props;
      const entry = dialog.entry;
      const close = props.onClose;
      if (dialog.kind === 'ask') {
        const title = typeof dialog.title === 'string' && dialog.title !== '' ? dialog.title : t('askTitle');
        return h('div', {
          className: 'dshMkt-overlay', role: 'presentation',
          onMouseDown: (event) => { if (event.target === event.currentTarget) close(); },
        },
        h('div', { className: 'dshMkt-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('askTitle') },
          h('div', { className: 'dshMkt-modalHead' },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('h2', { className: 'dshMkt-modalTitle' }, t('askTitle')),
              h('div', { className: 'dshMkt-modalSub' }, title)),
            h('button', { type: 'button', className: 'dshMkt-close', onClick: close, 'aria-label': t('cancel') }, h(Icon, { name: 'x' }))),
          h('p', { className: 'dshMkt-modalDesc' }, t('askIntro')),
          h('div', { className: 'dshMkt-askList' },
            ASK_QUESTIONS.map((key) => h('button', {
              type: 'button', className: 'dshMkt-askItem', key,
              onClick: () => { close(); props.onAsk(dialog.brief, t(key)); },
            },
            h(Icon, { name: 'chat', size: 15 }),
            h('span', { style: { flex: 1 } }, t(key)),
            h(Icon, { name: 'arrow', size: 14 })))),
          h('div', { className: 'dshMkt-askNote' }, t('askNote')),
          h('div', { className: 'dshMkt-modalFoot' },
            h('button', { type: 'button', className: 'dshMkt-btn', 'data-kind': 'ghost', onClick: close }, t('cancel')),
            h('button', {
              type: 'button', className: 'dshMkt-btn', 'data-kind': 'primary',
              onClick: () => { close(); props.onAsk(dialog.brief, ''); },
            }, t('askOwn')))));
      }
      if (dialog.kind === 'why') {
        const bundle = dialog.bundle;
        const reason = disabledReason(bundle, t) ?? {
          kind: 'manual', title: t('reasonManual'), body: t('reasonManualBody'), details: [],
        };
        const canToggle = reason.kind !== 'readonly' && reason.kind !== 'incompatible';
        return h('div', {
          className: 'dshMkt-overlay', role: 'presentation',
          onMouseDown: (event) => { if (event.target === event.currentTarget) close(); },
        },
        h('div', { className: 'dshMkt-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('reasonTitle') },
          h('div', { className: 'dshMkt-modalHead' },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('h2', { className: 'dshMkt-modalTitle' }, t('reasonTitle')),
              h('div', { className: 'dshMkt-modalSub' },
                `${bundle.name}${bundle.version === null ? '' : ` · ${t('version', { version: bundle.version })}`}`)),
            h('button', { type: 'button', className: 'dshMkt-close', onClick: close, 'aria-label': t('cancel') }, h(Icon, { name: 'x' }))),
          h('div', { className: 'dshMkt-reasonTitle' }, reason.title),
          h('p', { className: 'dshMkt-modalDesc' }, reason.body),
          reason.details.length === 0
            ? null
            : h('div', { className: 'dshMkt-reasonList' },
              reason.details.map((line, index) => h('div', {
                className: 'dshMkt-reasonLine', key: `${index}-${line}`,
              }, line))),
          bundle.updateAvailable && bundle.latestVersion
            ? h('div', { className: 'dshMkt-warn' },
              h(Icon, { name: 'spark', size: 15 }),
              h('span', null, t('reasonFixUpdate', { version: bundle.latestVersion })))
            : null,
          h('div', { className: 'dshMkt-reasonAction' },
            canToggle
              ? h('button', {
                type: 'button', className: 'dshMkt-btn', 'data-kind': 'primary',
                onClick: () => { props.onToggle(bundle, true); close(); },
              }, t('enable'))
              : null,
            bundle.updateAvailable && bundle.installable === true
              ? h('button', {
                type: 'button', className: 'dshMkt-btn',
                'data-kind': canToggle ? 'ghost' : 'primary',
                onClick: () => { props.onUpdate(bundle); close(); },
              }, t('update', { version: bundle.latestVersion }))
              : null,
            bundle.removable === true && bundle.name !== SELF
              ? h('button', {
                type: 'button', className: 'dshMkt-btn', 'data-kind': 'danger',
                onClick: () => { close(); props.onAskUninstall(entry); },
              }, t('uninstall'))
              : null,
            h('span', { style: { flex: 1 } }),
            h('button', { type: 'button', className: 'dshMkt-btn', 'data-kind': 'ghost', onClick: close }, t('cancel')))));
      }
      if (dialog.kind === 'builds') {
        return h('div', {
          className: 'dshMkt-overlay', role: 'presentation',
          onMouseDown: (event) => { if (event.target === event.currentTarget) close(); },
        },
        h('div', { className: 'dshMkt-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('buildsTitle') },
          h('div', { className: 'dshMkt-modalHead' },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('h2', { className: 'dshMkt-modalTitle' }, t('buildsTitle')),
              h('div', { className: 'dshMkt-modalSub' }, entry.name)),
            h('button', { type: 'button', className: 'dshMkt-close', onClick: close, 'aria-label': t('cancel') }, h(Icon, { name: 'x' }))),
          h('p', { className: 'dshMkt-modalDesc' }, t('buildsBody', {
            name: entry.name,
            builds: (dialog.builds ?? []).join(', '),
          })),
          h('div', { className: 'dshMkt-tags' },
            (dialog.builds ?? []).map((name) => h('span', { className: 'dshMkt-tag', key: name }, name))),
          h('div', { className: 'dshMkt-warn' }, h(Icon, { name: 'spark', size: 15 }), h('span', null, t('security'))),
          h('div', { className: 'dshMkt-modalFoot' },
            h('button', { type: 'button', className: 'dshMkt-btn', 'data-kind': 'ghost', onClick: close }, t('cancel')),
            h('button', {
              type: 'button', className: 'dshMkt-btn', 'data-kind': 'primary',
              onClick: () => props.onInstall(entry, dialog.builds ?? []),
            }, t('approveBuilds')))));
      }
      if (dialog.kind === 'uninstall') {
        return h('div', {
          className: 'dshMkt-overlay', role: 'presentation',
          onMouseDown: (event) => { if (event.target === event.currentTarget) close(); },
        },
        h('div', { className: 'dshMkt-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('uninstallTitle', { name: entry.name }) },
          h('div', { className: 'dshMkt-modalHead' },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('h2', { className: 'dshMkt-modalTitle' }, t('uninstallTitle', { name: entry.name })),
              h('div', { className: 'dshMkt-modalSub' }, entry.npm ?? entry.name)),
            h('button', { type: 'button', className: 'dshMkt-close', onClick: close, 'aria-label': t('cancel') }, h(Icon, { name: 'x' }))),
          h('p', { className: 'dshMkt-modalDesc' }, t('uninstallBody')),
          h('div', { className: 'dshMkt-modalFoot' },
            h('button', { type: 'button', className: 'dshMkt-btn', 'data-kind': 'ghost', onClick: close }, t('cancel')),
            h('button', {
              type: 'button', className: 'dshMkt-btn', 'data-kind': 'danger',
              onClick: () => props.onRemove(entry),
            }, t('confirmUninstall')))));
      }
      return h('div', {
        className: 'dshMkt-overlay', role: 'presentation',
        onMouseDown: (event) => { if (event.target === event.currentTarget) close(); },
      },
      h('div', { className: 'dshMkt-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': entry.name },
        h('div', { className: 'dshMkt-modalHead' },
          h('span', {
            className: 'dshMkt-logo',
            style: {
              background: `linear-gradient(135deg, hsla(${hueOf(entry.name)},78%,55%,.22), hsla(${hueOf(entry.name) + 42},78%,55%,.10))`,
            },
          }, entry.name.replace(/^@/, '').charAt(0).toUpperCase()),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('h2', { className: 'dshMkt-modalTitle' }, entry.name),
            h('div', { className: 'dshMkt-modalSub' },
              [entry.owner ? t('by', { owner: entry.owner }) : '',
                entry.version ? t('version', { version: entry.version }) : '',
                entry.stars ? `★ ${compact(entry.stars)}` : '',
                entry.added ? t('added', { date: entry.added }) : '']
                .filter((part) => part !== '').join(' · '))),
          h('button', { type: 'button', className: 'dshMkt-close', onClick: close, 'aria-label': t('cancel') }, h(Icon, { name: 'x' }))),
        h('p', { className: 'dshMkt-modalDesc' }, pick(entry.description, active) || '—'),
        entry.capabilities?.length
          ? h(React.Fragment, null,
            h('div', { className: 'dshMkt-sectionTitle' }, t('capabilities')),
            h('div', { className: 'dshMkt-tags' },
              entry.capabilities.map((name) => h('span', { className: 'dshMkt-tag', key: name }, name))))
          : null,
        entry.buildScripts?.length
          ? h(React.Fragment, null,
            h('div', { className: 'dshMkt-sectionTitle' }, t('buildScriptsTitle')),
            h('div', { className: 'dshMkt-tags' },
              entry.buildScripts.map((name) => h('span', { className: 'dshMkt-tag', key: name }, name))))
          : null,
        h('div', { className: 'dshMkt-sectionTitle' }, t('installCommand')),
        h('div', { className: 'dshMkt-code' },
          h('code', null, entry.install ?? specLabel(entry) ?? '—'),
          entry.install
            ? h('button', {
              type: 'button', className: 'dshMkt-btn', 'data-kind': 'quiet',
              onClick: () => props.onCopy(entry.install),
            }, h(Icon, { name: 'copy', size: 14 }), t('copyCommand'))
            : null),
        h('div', { className: 'dshMkt-sectionTitle' }, t('links')),
        h('div', { className: 'dshMkt-tags' },
          entry.repo
            ? h('a', { className: 'dshMkt-btn', 'data-kind': 'ghost', href: entry.repo, target: '_blank', rel: 'noopener noreferrer' }, t('repo'), h(Icon, { name: 'external', size: 13 }))
            : null,
          entry.page
            ? h('a', { className: 'dshMkt-btn', 'data-kind': 'ghost', href: entry.page, target: '_blank', rel: 'noopener noreferrer' }, t('page'), h(Icon, { name: 'external', size: 13 }))
            : null),
        h('div', { className: 'dshMkt-warn' }, h(Icon, { name: 'spark', size: 15 }), h('span', null, t('security'))),
        h('div', { className: 'dshMkt-modalFoot' },
          entry.status === 'installed'
            ? h('button', {
              type: 'button', className: 'dshMkt-btn', 'data-kind': 'danger',
              disabled: entry.removable !== true,
              title: entry.removable === true ? undefined : t('removeUnavailable'),
              onClick: () => props.onAskUninstall(entry),
            }, t('uninstall'))
            : h('button', {
              type: 'button', className: 'dshMkt-btn', 'data-kind': 'primary',
              disabled: entry.installable !== true,
              onClick: () => props.onInstall(entry),
            }, entry.installable !== true
              ? t('notOneClick')
              : (entry.status === 'different-version'
                ? t('update', { version: entry.version })
                : t('install'))))));
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'plugin-market: dictionaries');
        const t = ctx.locale.bind(NS);
        /** Locale face passed into the panel so it re-renders on language changes. */
        const localeFace = {
          subscribe: (listener) => ctx.locale.subscribe(listener),
          getLocale: () => ctx.locale.getLocale(),
        };
        /**
         * Ask the host to open a session whose system prompt already carries
         * the plugin profile, send the chosen question, then display it.
         */
        const startPluginChat = async (brief, question) => {
          const value = await call('chat', { brief, question });
          const sessionId = value?.sessionId;
          if (typeof sessionId !== 'string' || sessionId === '') throw new Error('会话创建失败');
          // Access through get(): a bare ctx.sessions read requires an inject
          // declaration this client half does not have and throws in Cordis.
          const sessions = ctx.get('sessions');
          if (sessions !== undefined && typeof sessions.refresh === 'function') {
            try {
              await sessions.refresh();
            } catch {
              /* opening by id still works when the list refresh fails */
            }
          }
          const uiWorkspace = ctx.get('uiWorkspace');
          if (uiWorkspace === undefined) throw new Error('无法打开会话界面');
          uiWorkspace.openSession(sessionId);
        };

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'plugin-market',
          order: 5,
          label: () => t('nav'),
          locale: NS,
        }, PanelIcon));

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'plugin-market',
          locale: NS,
          inject: () => ({ locale: localeFace, startPluginChat }),
        }, MarketPanel));
      },
    };
  },
});
