(() => {
  if (window.__platformAdapterInstalled) return;
  window.__platformAdapterInstalled = true;

  const platformSelect = document.querySelector("#enterprisePlatform");
  const integrationStrip = document.querySelector(".integration-strip");

  if (!platformSelect || !integrationStrip) return;

  const adapters = {
    feishu: {
      label: "飞书",
      identity: "JSAPI 免登录 code -> 后端换取 user_access_token",
      approval: "出差审批、部门、直属主管通过飞书开放平台同步",
      card: "交互式消息卡片，支持同意、驳回、补充说明",
      callback: "审批动作回调到 /api/feishu-card-action",
      ownerField: "open_id / union_id",
      status: "已接入免登录配置，审批和卡片为原型模拟",
      accent: "飞书内测",
    },
    dingtalk: {
      label: "钉钉",
      identity: "免登 authCode -> 后端换取 userid",
      approval: "审批实例、部门、主管关系通过钉钉工作流同步",
      card: "机器人互动卡片，映射同意、退回、查看明细",
      callback: "审批动作回调到 /api/dingtalk-card-action",
      ownerField: "userid / unionid",
      status: "能力已预留，等待企业应用凭证",
      accent: "钉钉预留",
    },
    browser: {
      label: "浏览器测试",
      identity: "本地测试身份，不读取真实企业账号",
      approval: "使用内置主管、财务、出纳角色模拟审批流",
      card: "浏览器内队列卡片，用于 E2E 和人工 smoke",
      callback: "页面内事件直接更新本地 state",
      ownerField: "mock_user_id",
      status: "用于演示、回归验证和离线测试",
      accent: "测试模式",
    },
  };

  function currentAdapter() {
    return adapters[platformSelect.value] || adapters.feishu;
  }

  function currentState() {
    try {
      return state;
    } catch {
      return { draftItems: [] };
    }
  }

  function claimSnapshot() {
    const appState = currentState();
    const draftItems = Array.isArray(appState.draftItems) ? appState.draftItems : [];
    const total = draftItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const count = draftItems.length;
    const riskCount = draftItems.filter((item) => String(item.status || "").includes("需")).length;

    return {
      title: document.querySelector("#tripTitle")?.textContent || "北京至上海客户拜访",
      total,
      count,
      riskCount,
      route: document.querySelector("#routeInsight")?.textContent || "等待识别路线闭环",
    };
  }

  function buildPayload(adapter) {
    const claim = claimSnapshot();
    return {
      platform: adapter.label,
      identityField: adapter.ownerField,
      cardType: adapter.card,
      callback: adapter.callback,
      claim: {
        title: claim.title,
        amount: claim.total,
        receiptCount: claim.count,
        riskCount: claim.riskCount,
        route: claim.route,
      },
      actions: ["查看明细", "同意", "退回补充说明"],
    };
  }

  function installStyle() {
    if (document.querySelector("#platform-adapter-style")) return;
    const style = document.createElement("style");
    style.id = "platform-adapter-style";
    style.textContent = `
      .platform-adapter {
        display: grid;
        gap: 12px;
        margin-top: 10px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #ffffff;
        box-shadow: var(--shadow);
      }

      .platform-adapter-head,
      .platform-adapter-grid {
        display: grid;
        gap: 10px;
      }

      .platform-adapter-head {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: start;
      }

      .platform-adapter-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .adapter-cell {
        min-height: 96px;
        padding: 11px;
        border: 1px solid #dbe3ee;
        border-radius: 8px;
        background: #f8fbff;
      }

      .adapter-cell span,
      .adapter-payload span {
        display: block;
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
      }

      .adapter-cell strong {
        display: block;
        margin-top: 6px;
        font-size: 14px;
        line-height: 1.45;
      }

      .adapter-payload {
        display: grid;
        gap: 8px;
        padding: 12px;
        border: 1px solid #d7e6ff;
        border-radius: 8px;
        background: #f4f8ff;
      }

      .adapter-payload pre {
        margin: 0;
        overflow: auto;
        max-height: 220px;
        border-radius: 8px;
        background: #101828;
        color: #e8eefb;
        padding: 12px;
        line-height: 1.5;
        font-size: 12px;
      }

      @media (max-width: 920px) {
        .platform-adapter-head,
        .platform-adapter-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function render() {
    const adapter = currentAdapter();
    const payload = buildPayload(adapter);
    let panel = document.querySelector("#platformAdapter");

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "platformAdapter";
      panel.className = "platform-adapter";
      panel.setAttribute("aria-label", "企业平台适配预览");
      integrationStrip.insertAdjacentElement("afterend", panel);
    }

    panel.innerHTML = `
      <div class="platform-adapter-head">
        <div>
          <span class="label">平台适配架构</span>
          <h2>${adapter.label} 接入预览</h2>
          <p>${adapter.status}</p>
        </div>
        <span class="status-pill">${adapter.accent}</span>
      </div>

      <div class="platform-adapter-grid">
        <div class="adapter-cell">
          <span>身份</span>
          <strong>${adapter.identity}</strong>
        </div>
        <div class="adapter-cell">
          <span>审批数据</span>
          <strong>${adapter.approval}</strong>
        </div>
        <div class="adapter-cell">
          <span>消息卡片</span>
          <strong>${adapter.card}</strong>
        </div>
        <div class="adapter-cell">
          <span>回调</span>
          <strong>${adapter.callback}</strong>
        </div>
      </div>

      <div class="adapter-payload">
        <span>模拟平台载荷</span>
        <pre>${JSON.stringify(payload, null, 2)}</pre>
      </div>
    `;
  }

  installStyle();
  render();

  platformSelect.addEventListener("change", render);
  ["renderDraft", "renderDraftsView"].forEach((name) => {
    const original = window[name];
    if (typeof original !== "function") return;
    window[name] = function renderAndRefreshAdapter(...args) {
      const result = original.apply(this, args);
      render();
      return result;
    };
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("#submitDraftBtn") || event.target.closest("[data-approve-claim]")) {
      window.setTimeout(render, 0);
    }
  });
})();
