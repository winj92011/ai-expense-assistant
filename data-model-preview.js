(() => {
  if (window.__dataModelPreviewInstalled) return;
  window.__dataModelPreviewInstalled = true;

  const integrationStrip = document.querySelector(".integration-strip");
  if (!integrationStrip) return;

  function buildModel() {
    return window.prototypeStore?.buildDataModel ? window.prototypeStore.buildDataModel() : { expense_claims: [], expense_items: [], receipts: [], approval_tasks: [], audit_logs: [], finance_archives: [] };
  }

  window.buildExpenseDataModelPreview = buildModel;

  function installStyle() {
    if (document.querySelector("#data-model-preview-style")) return;
    const style = document.createElement("style");
    style.id = "data-model-preview-style";
    style.textContent = `
      .data-model-panel {
        display: grid;
        gap: 12px;
        margin-top: 10px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #ffffff;
        box-shadow: var(--shadow);
      }

      .data-model-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
      }

      .data-model-counts {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .data-model-counts span {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 5px 8px;
        border-radius: 999px;
        background: #effaf5;
        color: var(--green);
        font-size: 12px;
        font-weight: 800;
      }

      .data-model-panel pre {
        margin: 0;
        max-height: 260px;
        overflow: auto;
        border-radius: 8px;
        background: #101828;
        color: #e8eefb;
        padding: 12px;
        font-size: 12px;
        line-height: 1.5;
      }

      @media (max-width: 920px) {
        .data-model-head {
          display: grid;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function summary(model) {
    return [
      ["报销单", model.expense_claims.length],
      ["明细", model.expense_items.length],
      ["票据", model.receipts.length],
      ["审批任务", model.approval_tasks.length],
      ["归档", model.finance_archives.length],
    ];
  }

  function render() {
    const model = buildModel();
    let panel = document.querySelector("#dataModelPreview");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "dataModelPreview";
      panel.className = "data-model-panel";
      panel.setAttribute("aria-label", "数据对象预览");
      integrationStrip.insertAdjacentElement("afterend", panel);
    }

    panel.innerHTML = `
      <div class="data-model-head">
        <div>
          <span class="label">数据对象预览</span>
          <h2>后端数据模型草案</h2>
          <p>用于对齐后续数据库、附件存储、审批任务和财务归档字段。</p>
        </div>
        <button class="secondary-button" type="button" data-export-data-model>导出 JSON</button>
      </div>
      <div class="data-model-counts">
        ${summary(model).map(([label, count]) => `<span>${label} ${count}</span>`).join("")}
      </div>
      <pre>${JSON.stringify(model, null, 2)}</pre>
    `;
  }

  function downloadModel() {
    const model = buildModel();
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expense-data-model-preview.json";
    link.click();
    URL.revokeObjectURL(url);
    showToast("已导出数据对象 JSON");
  }

  function refreshSoon() {
    window.clearTimeout(window.__dataModelPreviewTimer);
    window.__dataModelPreviewTimer = window.setTimeout(render, 0);
  }

  function patchRenderers() {
    if (window.__dataModelPreviewRenderersPatched) return;
    window.__dataModelPreviewRenderersPatched = true;
    ["renderDraft", "renderDraftsView", "renderApprovalsView", "renderFinanceView"].forEach((name) => {
      const original = window[name];
      if (typeof original !== "function") return;
      window[name] = function renderAndRefreshDataModel(...args) {
        const result = original.apply(this, args);
        refreshSoon();
        return result;
      };
    });
  }

  installStyle();
  render();
  patchRenderers();

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-export-data-model]")) downloadModel();
    if (event.target.closest("#submitDraftBtn, [data-approve-claim], [data-review-claim], [data-pay-claim]")) refreshSoon();
  });

  document.addEventListener("change", (event) => {
    if (event.target.closest("#enterprisePlatform, #interfaceLanguage, #roleSelector, #expenseRows")) refreshSoon();
  });
})();
