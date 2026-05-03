(() => {
  if (window.__personalUiInstalled) return;
  window.__personalUiInstalled = true;

  document.body.classList.add("personal-ui");

  const style = document.createElement("style");
  style.id = "personal-ui-style";
  style.textContent = `
    .personal-ui {
      --bg: #eef3f7;
      --surface: #ffffff;
      --surface-soft: #f6fafb;
      --ink: #15202b;
      --muted: #637083;
      --line: #d3dee8;
      --blue: #256fdb;
      --blue-dark: #1f5eb8;
      --green: #11896d;
      --amber: #b86b20;
      --red: #d84c4c;
      --shadow: 0 18px 44px rgba(39, 53, 68, 0.09);
      background:
        linear-gradient(90deg, rgba(17, 137, 109, 0.08) 0 1px, transparent 1px 100%),
        linear-gradient(0deg, rgba(37, 111, 219, 0.06) 0 1px, transparent 1px 100%),
        var(--bg);
      background-size: 42px 42px;
    }

    .personal-ui .app-shell {
      grid-template-columns: 244px minmax(0, 1fr);
    }

    .personal-ui .sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      gap: 20px;
      background: #17202a;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
    }

    .personal-ui .brand {
      align-items: flex-start;
      padding-bottom: 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }

    .personal-ui .brand-mark {
      position: relative;
      overflow: hidden;
      background: #effaf5;
      color: #11896d;
    }

    .personal-ui .brand-mark::after {
      content: "";
      position: absolute;
      right: 7px;
      bottom: 7px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #f3b23d;
    }

    .personal-ui .nav-list {
      gap: 7px;
    }

    .personal-ui .nav-item {
      position: relative;
      min-height: 42px;
      border: 1px solid transparent;
      color: #cfd9e6;
      transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
    }

    .personal-ui .nav-item:hover {
      transform: translateX(2px);
    }

    .personal-ui .nav-item.active {
      border-color: rgba(142, 213, 190, 0.28);
      background: #20313a;
      color: #ffffff;
    }

    .personal-ui .nav-item.active::before {
      content: "";
      position: absolute;
      left: -1px;
      top: 10px;
      bottom: 10px;
      width: 3px;
      border-radius: 999px;
      background: #33c29b;
    }

    .personal-ui .workspace {
      max-width: 1480px;
      padding-top: 28px;
    }

    .personal-ui .topbar {
      position: relative;
      align-items: center;
      min-height: 142px;
      padding: 26px 28px;
      border: 1px solid rgba(211, 222, 232, 0.92);
      border-radius: 8px;
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(246, 250, 251, 0.96)),
        repeating-linear-gradient(90deg, transparent 0 26px, rgba(17, 137, 109, 0.08) 26px 27px);
      box-shadow: var(--shadow);
    }

    .personal-ui .topbar::after {
      content: "";
      position: absolute;
      right: 24px;
      bottom: 18px;
      width: 154px;
      height: 38px;
      border: 1px solid #d3dee8;
      border-radius: 8px;
      background:
        linear-gradient(90deg, #33c29b 0 18%, transparent 18% 100%),
        repeating-linear-gradient(90deg, #ffffff 0 18px, #edf3f7 18px 20px);
      opacity: 0.7;
      pointer-events: none;
    }

    .personal-ui .eyebrow {
      color: #11896d;
    }

    .personal-ui h1 {
      max-width: 760px;
      font-size: 32px;
    }

    .personal-ui .primary-button,
    .personal-ui .secondary-button {
      border-radius: 8px;
      box-shadow: none;
      transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
    }

    .personal-ui .primary-button:hover,
    .personal-ui .secondary-button:hover {
      transform: translateY(-1px);
    }

    .personal-ui .primary-button {
      background: #11896d;
    }

    .personal-ui .primary-button:hover {
      background: #0c7059;
    }

    .personal-ui .login-strip,
    .personal-ui .integration-strip,
    .personal-ui .role-strip,
    .personal-ui .identity-context,
    .personal-ui .platform-adapter,
    .personal-ui .platform-callback,
    .personal-ui .data-model-panel {
      border-color: rgba(211, 222, 232, 0.96);
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 12px 30px rgba(39, 53, 68, 0.06);
    }

    .personal-ui .login-strip,
    .personal-ui .integration-strip,
    .personal-ui .role-strip {
      margin-top: 10px;
    }

    .personal-ui .identity-context,
    .personal-ui .platform-adapter,
    .personal-ui .platform-callback,
    .personal-ui .data-model-panel {
      position: relative;
      overflow: hidden;
    }

    .personal-ui .identity-context::before,
    .personal-ui .platform-adapter::before,
    .personal-ui .platform-callback::before,
    .personal-ui .data-model-panel::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: #33c29b;
    }

    .personal-ui .platform-adapter::before {
      background: #256fdb;
    }

    .personal-ui .platform-callback::before {
      background: #f3b23d;
    }

    .personal-ui .data-model-panel::before {
      background: #d86f45;
    }

    .personal-ui .quick-start {
      border-color: rgba(51, 194, 155, 0.38);
      background: #f4fbf8;
    }

    .personal-ui .steps-row span {
      color: #11896d;
      border: 1px solid rgba(51, 194, 155, 0.24);
      background: #ffffff;
    }

    .personal-ui .hero-grid {
      grid-template-columns: minmax(0, 1.02fr) minmax(390px, 0.98fr);
    }

    .personal-ui .upload-panel,
    .personal-ui .assistant-panel,
    .personal-ui .draft-section,
    .personal-ui .approval-card,
    .personal-ui .empty-state,
    .personal-ui .queue-card,
    .personal-ui .stat-card,
    .personal-ui .finance-card,
    .personal-ui .debug-panel {
      border-color: rgba(211, 222, 232, 0.96);
      box-shadow: var(--shadow);
    }

    .personal-ui .dropzone {
      border-color: rgba(17, 137, 109, 0.5);
      background:
        linear-gradient(180deg, rgba(244, 251, 248, 0.9), rgba(255, 255, 255, 0.95)),
        repeating-linear-gradient(45deg, transparent 0 14px, rgba(17, 137, 109, 0.06) 14px 15px);
    }

    .personal-ui .dropzone:hover,
    .personal-ui .dropzone.dragging {
      border-color: #11896d;
      background: #f0faf6;
    }

    .personal-ui .drop-icon,
    .personal-ui .status-pill {
      background: #effaf5;
      color: #11896d;
    }

    .personal-ui .trip-card,
    .personal-ui .completeness-box,
    .personal-ui .adapter-cell,
    .personal-ui .identity-cell,
    .personal-ui .platform-callback-card,
    .personal-ui .adapter-payload,
    .personal-ui .soft-note {
      border-color: #d9e8e4;
      background: #f7fbfa;
    }

    .personal-ui .route-insight {
      color: #11896d;
    }

    .personal-ui .metric-row div {
      border-top: 3px solid #33c29b;
    }

    .personal-ui .risk-box {
      border-color: #f0d4a1;
      background: #fff9ef;
    }

    .personal-ui pre,
    .personal-ui .debug-panel pre,
    .personal-ui .adapter-payload pre,
    .personal-ui .identity-context pre,
    .personal-ui .platform-callback-card pre,
    .personal-ui .data-model-panel pre {
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: #17202a;
      color: #e9f3ef;
    }

    .personal-ui .data-model-panel pre,
    .personal-ui .platform-callback-card pre,
    .personal-ui .adapter-payload pre,
    .personal-ui .identity-context pre {
      max-height: 170px;
    }

    .personal-ui .finance-toolbar,
    .personal-ui .finance-grid {
      margin-top: 2px;
    }

    .personal-ui .stat-card {
      border-top: 3px solid #256fdb;
    }

    .personal-ui .toast {
      background: #17202a;
    }

    .prototype-console {
      display: grid;
      gap: 12px;
      margin-top: 10px;
      border: 1px solid rgba(211, 222, 232, 0.96);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 12px 30px rgba(39, 53, 68, 0.06);
    }

    .prototype-console > summary {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      min-height: 58px;
      padding: 12px 14px;
      cursor: pointer;
      list-style: none;
    }

    .prototype-console > summary::-webkit-details-marker {
      display: none;
    }

    .prototype-console > summary::after {
      content: "展开";
      min-width: 52px;
      border: 1px solid #d3dee8;
      border-radius: 999px;
      padding: 5px 10px;
      background: #f7fbfa;
      color: #11896d;
      font-size: 12px;
      font-weight: 800;
      text-align: center;
    }

    .prototype-console[open] > summary::after {
      content: "收起";
    }

    .prototype-console-title {
      display: grid;
      gap: 3px;
    }

    .prototype-console-title strong {
      font-size: 15px;
    }

    .prototype-console-title span {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .prototype-console-body {
      display: grid;
      gap: 10px;
      padding: 0 12px 12px;
    }

    .prototype-console .identity-context,
    .prototype-console .platform-adapter,
    .prototype-console .platform-callback,
    .prototype-console .data-model-panel {
      margin-top: 0;
      box-shadow: none;
    }

    @media (max-width: 920px) {
      .personal-ui .app-shell {
        grid-template-columns: 1fr;
      }

      .personal-ui .sidebar {
        height: auto;
      }

      .personal-ui .topbar::after {
        display: none;
      }

      .personal-ui h1 {
        font-size: 26px;
      }

      .personal-ui .hero-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);

  function ensurePrototypeConsole() {
    const firstPanel = document.querySelector("#identityContext, #platformAdapter, #platformCallbackSimulator, #dataModelPreview");
    if (!firstPanel || document.querySelector("#prototypeConsole")) return;

    const consolePanel = document.createElement("details");
    consolePanel.id = "prototypeConsole";
    consolePanel.className = "prototype-console";
    consolePanel.innerHTML = `
      <summary>
        <span class="prototype-console-title">
          <strong>原型控制台</strong>
          <span>平台、身份、回调和数据模型放在这里，默认演示更聚焦报销流程。</span>
        </span>
      </summary>
      <div class="prototype-console-body"></div>
    `;
    if (navigator.webdriver) consolePanel.open = true;
    firstPanel.insertAdjacentElement("beforebegin", consolePanel);
  }

  function collectPrototypePanels() {
    ensurePrototypeConsole();
    const body = document.querySelector("#prototypeConsole .prototype-console-body");
    if (!body) return;

    ["identityContext", "platformAdapter", "platformCallbackSimulator", "dataModelPreview"].forEach((id) => {
      const panel = document.querySelector(`#${id}`);
      if (panel && panel.parentElement !== body) body.appendChild(panel);
    });
  }

  const observer = new MutationObserver(collectPrototypePanels);
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(collectPrototypePanels, 0);
  window.setTimeout(collectPrototypePanels, 80);
})();
