(() => {
  if (window.__dataModelPreviewInstalled) return;
  window.__dataModelPreviewInstalled = true;

  const integrationStrip = document.querySelector(".integration-strip");
  if (!integrationStrip) return;

  function appState() {
    try {
      return state;
    } catch {
      return { draftItems: [], submittedClaims: [], files: [] };
    }
  }

  function platformValue() {
    return document.querySelector("#enterprisePlatform")?.value || "feishu";
  }

  function platformLabel() {
    const select = document.querySelector("#enterprisePlatform");
    return select?.selectedOptions?.[0]?.textContent || "飞书";
  }

  function roleValue() {
    return document.body.dataset.role || "employee";
  }

  function currentUser() {
    const account = document.querySelector(".account-card");
    return {
      id: `mock-user-${roleValue()}`,
      name: account?.querySelector("strong")?.textContent || "吴经理",
      title: account?.querySelector("span:not(.avatar)")?.textContent || "员工",
      role: roleValue(),
      department_id: "dept-product",
    };
  }

  function normalizeItem(item, claimId, index) {
    return {
      id: `${claimId}-item-${index + 1}`,
      claim_id: claimId,
      expense_date: item.date || "",
      invoice_date: item.invoice_date || item.date || "",
      category: item.category || "其他",
      vendor: item.vendor || "",
      amount: Number(item.amount || 0),
      currency: "CNY",
      status: item.status || "待识别",
      employee_note: item.employee_note || "",
    };
  }

  function buildDraftClaim(app, user) {
    const total = app.draftItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return {
      id: "draft-current",
      employee_id: user.id,
      title: document.querySelector("#tripTitle")?.textContent || "当前报销草稿",
      status: app.claimStatus || "draft",
      total,
      currency: "CNY",
      receipt_count: app.draftItems.length,
      risk_count: app.draftItems.filter((item) => String(item.status || "").includes("需")).length,
      route_summary: document.querySelector("#routeInsight")?.textContent || "",
      source: "prototype",
    };
  }

  function buildSubmittedClaim(claim, user) {
    return {
      id: claim.id,
      employee_id: user.id,
      title: claim.title,
      status: claim.status,
      total: Number(claim.total || 0),
      currency: "CNY",
      receipt_count: claim.count || claim.items?.length || 0,
      risk_count: (claim.items || []).filter((item) => String(item.status || "").includes("需")).length,
      archive_no: claim.archiveNo || "",
      voucher_no: claim.voucherNo || "",
      ledger_status: claim.ledgerStatus || "",
      audit_note: claim.auditNote || "",
      source: "prototype",
    };
  }

  function buildModel() {
    const app = appState();
    const user = currentUser();
    const draftClaim = app.draftItems.length ? buildDraftClaim(app, user) : null;
    const submittedClaims = (app.submittedClaims || []).map((claim) => buildSubmittedClaim(claim, user));
    const claims = [...(draftClaim ? [draftClaim] : []), ...submittedClaims];

    const draftItems = app.draftItems.flatMap((item, index) => normalizeItem(item, "draft-current", index));
    const submittedItems = (app.submittedClaims || []).flatMap((claim) =>
      (claim.items || []).map((item, index) => normalizeItem(item, claim.id, index)),
    );

    return {
      meta: {
        generated_at: new Date().toISOString(),
        prototype_version: "0.2",
        platform: platformValue(),
        platform_label: platformLabel(),
        locale: document.querySelector("#interfaceLanguage")?.value || "zh-CN",
      },
      users: [user],
      departments: [
        {
          id: "dept-product",
          name: "产品部",
          manager_id: "mock-user-manager",
        },
      ],
      expense_claims: claims,
      expense_items: [...draftItems, ...submittedItems],
      receipts: [...draftItems, ...submittedItems].map((item) => ({
        id: `${item.id}-receipt`,
        item_id: item.id,
        file_name: item.vendor ? `${item.vendor}.pdf` : "receipt.pdf",
        mime_type: "application/pdf",
        storage_status: "prototype-local",
      })),
      approval_tasks: (app.submittedClaims || []).flatMap((claim) =>
        (claim.timeline || []).map((step, index) => ({
          id: `${claim.id}-task-${index + 1}`,
          claim_id: claim.id,
          step: step.step,
          actor: step.actor,
          status: step.status,
          handled_at: step.at,
        })),
      ),
      audit_logs: (app.submittedClaims || []).flatMap((claim) =>
        (claim.timeline || []).map((step, index) => ({
          id: `${claim.id}-audit-${index + 1}`,
          claim_id: claim.id,
          event: `${step.step}/${step.status}`,
          actor: step.actor,
          created_at: step.at,
        })),
      ),
      finance_archives: (app.submittedClaims || [])
        .filter((claim) => claim.archiveNo || claim.voucherNo || claim.ledgerStatus)
        .map((claim) => ({
          claim_id: claim.id,
          archive_no: claim.archiveNo || "",
          voucher_no: claim.voucherNo || "",
          ledger_status: claim.ledgerStatus || "",
          audit_note: claim.auditNote || "",
          voucher_files: claim.voucherFiles || [],
        })),
    };
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
