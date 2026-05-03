(() => {
  function shouldShowE2EPanel() {
    return new URLSearchParams(window.location.search).get("e2e") === "1";
  }

  function installStyle() {
    if (document.querySelector("#e2e-helper-style")) return;
    const style = document.createElement("style");
    style.id = "e2e-helper-style";
    style.textContent = `
      .e2e-panel {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 40;
        width: min(360px, calc(100vw - 36px));
        padding: 16px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 18px 45px rgba(16, 24, 40, 0.18);
      }

      .e2e-panel form {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }

      .e2e-panel label {
        display: grid;
        gap: 5px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }

      .e2e-panel input {
        min-height: 36px;
        border: 1px solid var(--line);
        border-radius: 8px;
        color: var(--ink);
        padding: 0 10px;
      }
    `;
    document.head.appendChild(style);
  }

  function setActiveView(view) {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
    document.querySelectorAll("[data-view-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  }

  function buildClaimFromForm(form) {
    const title = form.elements.title.value.trim() || "E2E 测试差旅报销";
    const vendor = form.elements.vendor.value.trim() || "E2E 测试商户";
    const amount = Number(form.elements.amount.value || 0) || 199;

    return {
      id: `e2e-${Date.now()}`,
      title,
      total: amount,
      count: 1,
      items: [
        {
          date: "2026-04-12",
          invoice_date: "2026-04-12",
          category: "本地交通",
          vendor,
          amount,
          status: "AI 已识别",
        },
      ],
      status: "待财务复核",
      timeline: [],
    };
  }

  function renderPanel() {
    installStyle();
    const panel = document.createElement("section");
    panel.className = "e2e-panel";
    panel.setAttribute("aria-label", "E2E 测试入口");
    panel.innerHTML = `
      <div>
        <span class="label">E2E 测试</span>
        <h2>新增测试报销</h2>
      </div>
      <form id="e2eClaimForm">
        <label>
          标题
          <input name="title" value="E2E 财务凭证包报销" />
        </label>
        <label>
          商户
          <input name="vendor" value="E2E 出行平台" />
        </label>
        <label>
          金额
          <input name="amount" type="number" min="1" value="256" />
        </label>
        <button class="primary-button" type="submit">提交测试报销</button>
      </form>
    `;
    document.body.appendChild(panel);

    panel.querySelector("#e2eClaimForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const claim = buildClaimFromForm(event.currentTarget);
      if (typeof addTimeline === "function") {
        addTimeline(claim, "员工提交", "E2E 测试员", "已提交");
        addTimeline(claim, "主管审批", "E2E 主管", "同意");
      }
      state.submittedClaims.unshift(claim);
      renderDraftsView();
      renderApprovalsView();
      renderFinanceView();
      setActiveView("finance");
      showToast("已新增测试报销");
    });
  }

  if (shouldShowE2EPanel()) {
    window.addEventListener("DOMContentLoaded", renderPanel);
  }
})();
