(() => {
  if (window.__platformCallbackSimulatorInstalled) return;
  window.__platformCallbackSimulatorInstalled = true;

  const platformSelect = document.querySelector("#enterprisePlatform");
  const integrationStrip = document.querySelector(".integration-strip");

  if (!platformSelect || !integrationStrip) return;

  const STATUS_MANAGER = "待主管审批";
  const STATUS_FINANCE = "待财务复核";
  const STATUS_RETURNED = "退回补充说明";

  const PLATFORM_COPY = {
    feishu: {
      name: "飞书",
      actor: "飞书主管",
      messageIdPrefix: "om_mock_",
      callbackPath: "/mock/feishu/card-action",
    },
    dingtalk: {
      name: "钉钉",
      actor: "钉钉主管",
      messageIdPrefix: "dt_mock_",
      callbackPath: "/mock/dingtalk/card-action",
    },
    browser: {
      name: "浏览器测试",
      actor: "浏览器主管",
      messageIdPrefix: "browser_mock_",
      callbackPath: "page://mock-card-action",
    },
  };
  let lastResultText = "等待卡片动作...";

  function appState() {
    try {
      return state;
    } catch {
      return { submittedClaims: [] };
    }
  }

  function currentPlatform() {
    return PLATFORM_COPY[platformSelect.value] || PLATFORM_COPY.feishu;
  }

  function getPendingClaim() {
    const claims = appState().submittedClaims || [];
    return claims.find((claim) => claim.status === STATUS_MANAGER) || claims[0] || null;
  }

  function buildPayload(action = "view_detail") {
    const platform = currentPlatform();
    const claim = getPendingClaim();

    return {
      platform: platform.name,
      callback_path: platform.callbackPath,
      message_id: `${platform.messageIdPrefix}${claim?.id || "empty"}`,
      action,
      actor: {
        name: platform.actor,
        role: "manager",
      },
      claim: claim
        ? {
            id: claim.id,
            title: claim.title,
            status: claim.status,
            amount: claim.total,
            receipt_count: claim.count,
            risk_count: (claim.items || []).filter((item) => String(item.status || "").includes("需")).length,
            return_reason: claim.returnReason || "",
          }
        : null,
    };
  }

  function refreshCoreViews() {
    ["renderDraftsView", "renderApprovalsView", "renderFinanceView"].forEach((name) => {
      if (typeof window[name] === "function") window[name]();
    });
  }

  function addPlatformTimeline(claim, action, comment) {
    if (!claim) return;
    const platform = currentPlatform();
    const status = action === "approve" ? "同意" : "退回";
    if (typeof window.addTimeline === "function") {
      window.addTimeline(claim, `${platform.name}卡片回调`, platform.actor, status);
      const latest = claim.timeline?.[claim.timeline.length - 1];
      if (latest) {
        latest.comment = comment;
        latest.platform_message_id = `${platform.messageIdPrefix}${claim.id}`;
      }
    } else {
      claim.timeline = claim.timeline || [];
      claim.timeline.push({
        step: `${platform.name}卡片回调`,
        actor: platform.actor,
        status,
        at: new Date().toLocaleString("zh-CN"),
        comment,
        platform_message_id: `${platform.messageIdPrefix}${claim.id}`,
      });
    }
  }

  function writeResult(action, message) {
    lastResultText = JSON.stringify(
      {
        accepted: true,
        handled_at: new Date().toISOString(),
        message,
        callback: buildPayload(action),
      },
      null,
      2,
    );
    const output = document.querySelector("#platformCallbackResult");
    if (output) output.textContent = lastResultText;
  }

  function handleAction(action) {
    const claim = getPendingClaim();
    if (!claim) {
      writeResult(action, "暂无可处理的审批卡片。");
      return;
    }

    if (action === "view_detail") {
      writeResult(action, "已打开报销详情预览。");
      document.querySelector('.nav-item[data-view="approvals"]')?.click();
      return;
    }

    if (action === "approve") {
      claim.status = STATUS_FINANCE;
      addPlatformTimeline(claim, action, "主管从企业 IM 卡片点击同意。");
      refreshCoreViews();
      writeResult(action, "审批已通过，并流转到财务复核。");
      if (typeof window.showToast === "function") window.showToast("平台回调已同意，单据进入财务复核");
      return;
    }

    if (action === "return") {
      claim.status = STATUS_RETURNED;
      claim.returnReason = "请补充异常票据说明或上传缺失票据。";
      addPlatformTimeline(claim, action, claim.returnReason);
      refreshCoreViews();
      writeResult(action, `审批已退回员工补充说明。${claim.returnReason}`);
      if (typeof window.showToast === "function") window.showToast("平台回调已退回，等待员工补充说明");
    }
  }

  function installStyle() {
    if (document.querySelector("#platform-callback-style")) return;
    const style = document.createElement("style");
    style.id = "platform-callback-style";
    style.textContent = `
      .platform-callback {
        display: grid;
        gap: 12px;
        margin-top: 10px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #ffffff;
        box-shadow: var(--shadow);
      }

      .platform-callback-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: start;
      }

      .platform-callback-card {
        display: grid;
        gap: 10px;
        padding: 12px;
        border: 1px solid #dbe3ee;
        border-radius: 8px;
        background: #f8fbff;
      }

      .platform-callback-card pre {
        margin: 0;
        max-height: 220px;
        overflow: auto;
        border-radius: 8px;
        background: #101828;
        color: #e8eefb;
        padding: 12px;
        font-size: 12px;
        line-height: 1.5;
      }

      .platform-callback-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      @media (max-width: 920px) {
        .platform-callback-head {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function render() {
    let panel = document.querySelector("#platformCallbackSimulator");
    const platform = currentPlatform();
    const claim = getPendingClaim();
    const payload = buildPayload();

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "platformCallbackSimulator";
      panel.className = "platform-callback";
      panel.setAttribute("aria-label", "平台回调模拟器");
      const adapter = document.querySelector("#platformAdapter");
      (adapter || integrationStrip).insertAdjacentElement("afterend", panel);
    }

    panel.innerHTML = `
      <div class="platform-callback-head">
        <div>
          <span class="label">消息卡片回调</span>
          <h2>${platform.name} 回调模拟</h2>
          <p>${claim ? `${claim.title} · ${claim.status}` : "提交报销后会生成可操作的企业 IM 卡片。"}</p>
        </div>
        <span class="status-pill">${claim ? "可模拟" : "等待报销单"}</span>
      </div>

      <div class="platform-callback-card">
        <strong>${claim ? claim.title : "暂无待审批卡片"}</strong>
        <div class="platform-callback-actions">
          <button class="secondary-button" type="button" data-platform-callback="view_detail" ${claim ? "" : "disabled"}>查看详情</button>
          <button class="primary-button" type="button" data-platform-callback="approve" ${claim?.status === STATUS_MANAGER ? "" : "disabled"}>模拟同意</button>
          <button class="secondary-button" type="button" data-platform-callback="return" ${claim?.status === STATUS_MANAGER ? "" : "disabled"}>模拟退回</button>
        </div>
        <pre>${JSON.stringify(payload, null, 2)}</pre>
        <pre id="platformCallbackResult">${lastResultText}</pre>
      </div>
    `;
  }

  installStyle();
  render();

  platformSelect.addEventListener("change", render);
  document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-platform-callback]");
    if (actionButton) {
      handleAction(actionButton.dataset.platformCallback);
      render();
      return;
    }

    if (
      event.target.closest("#submitDraftBtn") ||
      event.target.closest("[data-approve-claim]") ||
      event.target.closest("[data-review-claim]") ||
      event.target.closest("[data-pay-claim]")
    ) {
      window.setTimeout(render, 0);
    }
  });

  window.platformCallbackSimulator = {
    render,
    buildPayload,
    handleAction,
  };
})();
