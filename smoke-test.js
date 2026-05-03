(() => {
  const PARAM_NAME = "smoke";

  function shouldRun() {
    const params = new URLSearchParams(window.location.search);
    return params.get(PARAM_NAME) === "1" || window.location.hash === "#smoke";
  }

  function assertStep(results, name, check, detail = "") {
    const ok = Boolean(check);
    results.push({ name, ok, detail });
    if (!ok) {
      throw new Error(`${name}${detail ? `: ${detail}` : ""}`);
    }
  }

  function click(selector, root = document) {
    const element = root.querySelector(selector);
    if (!element) return false;
    element.click();
    return true;
  }

  function selectValue(selector, value) {
    const element = document.querySelector(selector);
    if (!element) return false;
    element.value = value;
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function currentDataModel() {
    return typeof window.buildExpenseDataModelPreview === "function" ? window.buildExpenseDataModelPreview() : null;
  }

  function seedClaim() {
    state.draftItems = [
      {
        date: "2026-04-08",
        invoice_date: "2026-04-08",
        category: "机票",
        vendor: "航空行程单",
        amount: 1280,
        status: "AI 已识别",
      },
      {
        date: "2026-04-09",
        invoice_date: "2026-04-09",
        category: "住宿",
        vendor: "上海酒店",
        amount: 960,
        status: "已匹配审批",
      },
      {
        date: "2026-04-10",
        invoice_date: "2026-04-10",
        category: "餐饮",
        vendor: "客户餐叙",
        amount: 286,
        status: "需补充说明",
      },
      {
        date: "2026-04-11",
        invoice_date: "2026-04-11",
        category: "本地交通",
        vendor: "出行平台",
        amount: 146,
        status: "自动分类",
      },
    ];
    state.files = state.draftItems.map((item, index) => ({
      name: `${index + 1}-${item.category}.jpg`,
      size: 128 * 1024,
      type: "image/jpeg",
    }));
    state.submittedClaims = [];
    state.claimStatus = "ready";
    state.analyzed = true;

    document.querySelector("#tripTitle").textContent = "北京 → 上海 → 深圳 → 香港 → 北京差旅报销";
    document.querySelector("#tripSummary").textContent = "2026-04-08 至 2026-04-11，自动验证闭环行程。";
    document.querySelector("#routeInsight").textContent = "闭环行程 · 北京 → 上海 → 深圳 → 香港 → 北京";

    renderFiles();
    renderDraft();
    renderDraftsView();
    renderApprovalsView();
    renderFinanceView();
  }

  function showPanel(results, error) {
    document.querySelector(".smoke-panel")?.remove();
    const panel = document.createElement("section");
    panel.className = "smoke-panel";
    panel.innerHTML = `
      <div class="smoke-panel-card">
        <div>
          <span class="label">自动验证</span>
          <h2>${error ? "原型流程验证失败" : "原型流程验证通过"}</h2>
          <p>${error ? error.message : "员工提交、主管审批、财务复核、凭证包、付款闭环和数据对象已跑通。"}</p>
        </div>
        <ol>
          ${results
            .map(
              (item) => `
                <li class="${item.ok ? "ok" : "fail"}">
                  <strong>${item.ok ? "通过" : "失败"}</strong>
                  ${item.name}${item.detail ? ` · ${item.detail}` : ""}
                </li>
              `,
            )
            .join("")}
        </ol>
      </div>
    `;
    document.body.appendChild(panel);
  }

  function installStyle() {
    if (document.querySelector("#smoke-test-style")) return;
    const style = document.createElement("style");
    style.id = "smoke-test-style";
    style.textContent = `
      .smoke-panel {
        position: fixed;
        left: 18px;
        right: 18px;
        bottom: 18px;
        z-index: 50;
        display: grid;
        justify-items: center;
        pointer-events: none;
      }

      .smoke-panel-card {
        width: min(720px, 100%);
        max-height: min(520px, calc(100vh - 36px));
        overflow: auto;
        padding: 18px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 24px 60px rgba(16, 24, 40, 0.22);
        pointer-events: auto;
      }

      .smoke-panel ol {
        display: grid;
        gap: 8px;
        margin: 14px 0 0;
        padding: 0;
        list-style: none;
      }

      .smoke-panel li {
        padding: 9px 10px;
        border-radius: 8px;
        background: #fff8ef;
        color: var(--muted);
      }

      .smoke-panel li.ok {
        background: #effaf5;
      }

      .smoke-panel li.fail {
        color: var(--red);
      }

      .smoke-panel strong {
        margin-right: 8px;
        color: var(--ink);
      }

      .smoke-trigger {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 49;
        min-height: 40px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #ffffff;
        color: var(--ink);
        padding: 0 14px;
        font-weight: 800;
        box-shadow: 0 14px 36px rgba(16, 24, 40, 0.18);
      }

      .smoke-trigger:hover {
        border-color: #b7c4d8;
        background: #f8fafc;
      }
    `;
    document.head.appendChild(style);
  }

  function showTrigger() {
    if (document.querySelector("[data-run-smoke]")) return;
    const button = document.createElement("button");
    button.className = "smoke-trigger";
    button.type = "button";
    button.dataset.runSmoke = "true";
    button.textContent = "运行自动验证";
    button.addEventListener("click", () => window.runPrototypeSmokeTest());
    document.body.appendChild(button);
  }

  window.runPrototypeSmokeTest = function runPrototypeSmokeTest() {
    const results = [];
    let error = null;
    installStyle();

    try {
      assertStep(results, "切换浏览器测试平台", selectValue("#enterprisePlatform", "browser"));
      assertStep(results, "平台适配载荷出现", document.querySelector("#platformAdapter pre")?.textContent.includes("浏览器测试"));

      seedClaim();
      assertStep(results, "生成测试报销草稿", state.draftItems.length === 4);
      assertStep(results, "数据对象草稿生成", currentDataModel()?.expense_claims.length === 1);

      click("#submitDraftBtn");
      assertStep(results, "员工提交", state.submittedClaims.length === 1 && state.submittedClaims[0].status === "待主管审批");
      assertStep(results, "数据对象含票据明细", currentDataModel()?.expense_items.length >= 4);

      renderApprovalsView();
      assertStep(results, "主管审批入口出现", document.querySelector("[data-approve-claim]"));
      click("[data-approve-claim]");
      assertStep(results, "主管同意后进入财务复核", state.submittedClaims[0].status === "待财务复核");

      renderFinanceView();
      assertStep(results, "财务复核工作台出现", document.querySelector(".finance-card"));
      assertStep(results, "归档号生成", /^FIN-\d{6}-\d{4}$/.test(state.submittedClaims[0].archiveNo || ""));
      assertStep(results, "凭证包入口出现", document.querySelector("[data-open-package]"));

      click("[data-open-package]");
      assertStep(results, "凭证包弹窗可打开", document.querySelector(".finance-modal"));
      click("[data-close-finance-modal]");

      click("[data-review-claim]");
      assertStep(results, "财务复核后进入付款", state.submittedClaims[0].status === "待出纳付款");

      renderFinanceView();
      assertStep(results, "凭证号生成", Boolean(state.submittedClaims[0].voucherNo));
      click("[data-pay-claim]");
      assertStep(results, "出纳付款闭环", state.submittedClaims[0].status === "已付款");

      renderFinanceView();
      assertStep(results, "入账状态更新", state.submittedClaims[0].ledgerStatus === "已入账");
      const model = currentDataModel();
      assertStep(results, "财务归档对象生成", model?.finance_archives.length === 1);
      assertStep(results, "数据模型可导出", Boolean(document.querySelector("[data-export-data-model]")));
    } catch (caught) {
      error = caught;
      if (!results.some((item) => !item.ok)) {
        results.push({ name: "未捕获异常", ok: false, detail: caught.message });
      }
    }

    showPanel(results, error);
    return { ok: !error, results, error };
  };

  if (shouldRun()) {
    installStyle();
    showTrigger();
    window.setTimeout(() => window.runPrototypeSmokeTest(), 0);
  }
})();
