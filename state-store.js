(() => {
  if (window.__stateStoreInstalled) return;
  window.__stateStoreInstalled = true;

  const STATUS_MAP = {
    idle: "draft",
    uploaded: "draft",
    analyzing: "draft",
    ready: "draft",
    submitted: "submitted",
    草稿: "draft",
    待主管审批: "submitted",
    待财务复核: "manager_approved",
    待出纳付款: "finance_reviewed",
    已复核待付款: "finance_reviewed",
    已付款: "paid",
  };

  const LEDGER_STATUS_MAP = {
    未入账: "not_posted",
    待入账: "ready_to_post",
    已入账: "posted",
    not_posted: "not_posted",
    ready_to_post: "ready_to_post",
    posted: "posted",
  };

  const ROLE_USERS = {
    employee: {
      id: "mock-user-employee",
      name: "吴经理",
      title: "员工 / 产品负责人",
      role: "employee",
      department_id: "dept-product",
    },
    manager: {
      id: "mock-user-manager",
      name: "周主管",
      title: "直属主管",
      role: "manager",
      department_id: "dept-product",
    },
    finance: {
      id: "mock-user-finance",
      name: "林会计",
      title: "财务复核",
      role: "finance",
      department_id: "dept-finance",
    },
    cashier: {
      id: "mock-user-cashier",
      name: "陈出纳",
      title: "出纳付款",
      role: "cashier",
      department_id: "dept-finance",
    },
    admin: {
      id: "mock-user-admin",
      name: "系统管理员",
      title: "管理员",
      role: "admin",
      department_id: "dept-it",
    },
  };

  function appState() {
    try {
      return state;
    } catch {
      return { files: [], draftItems: [], submittedClaims: [], claimStatus: "idle" };
    }
  }

  function selectedPlatform() {
    const select = document.querySelector("#enterprisePlatform");
    return {
      value: select?.value || "browser",
      label: select?.selectedOptions?.[0]?.textContent || "浏览器测试",
    };
  }

  function currentRole() {
    return document.body.dataset.role || "employee";
  }

  function currentUser() {
    const role = currentRole();
    const base = ROLE_USERS[role] || ROLE_USERS.employee;
    const account = document.querySelector(".account-card");
    const platform = selectedPlatform();
    return {
      ...base,
      name: account?.querySelector("strong")?.textContent || base.name,
      title: account?.querySelector("span:not(.avatar)")?.textContent || base.title,
      platform: platform.value,
      platform_label: platform.label,
      platform_user_id: platform.value === "browser" ? `${platform.value}-${base.id}` : "",
    };
  }

  function departments() {
    return [
      {
        id: "dept-product",
        name: "产品部",
        manager_id: "mock-user-manager",
      },
      {
        id: "dept-finance",
        name: "财务部",
        manager_id: "mock-user-finance",
      },
      {
        id: "dept-it",
        name: "信息化",
        manager_id: "mock-user-admin",
      },
    ];
  }

  function normalizeClaimStatus(status) {
    return STATUS_MAP[status] || status || "draft";
  }

  function normalizeLedgerStatus(status) {
    return LEDGER_STATUS_MAP[status] || status || "";
  }

  function draftClaimId() {
    return "draft-current";
  }

  function draftTitle() {
    return document.querySelector("#tripTitle")?.textContent || "当前报销草稿";
  }

  function routeSummary() {
    return document.querySelector("#routeInsight")?.textContent || "";
  }

  function riskCount(items) {
    return (items || []).filter((item) => String(item.status || "").includes("需")).length;
  }

  function itemToRecord(item, claimId, index) {
    return {
      id: item.id || `${claimId}-item-${index + 1}`,
      claim_id: claimId,
      expense_date: item.date || "",
      invoice_date: item.invoice_date || item.date || "",
      category: item.category || "其他",
      vendor: item.vendor || "",
      amount: Number(item.amount || 0),
      currency: item.currency || "CNY",
      status: item.status || "待识别",
      employee_note: item.employee_note || "",
      policy_warning: item.policy_warning || "",
      confidence: Number(item.confidence || 0),
    };
  }

  function claimToRecord(claim, user) {
    return {
      id: claim.id,
      employee_id: claim.employee_id || user.id,
      title: claim.title,
      status: normalizeClaimStatus(claim.status),
      total: Number(claim.total || 0),
      currency: claim.currency || "CNY",
      receipt_count: claim.count || claim.items?.length || 0,
      risk_count: riskCount(claim.items),
      route_summary: claim.route_summary || routeSummary(),
      archive_no: claim.archiveNo || claim.archive_no || "",
      voucher_no: claim.voucherNo || claim.voucher_no || "",
      ledger_status: normalizeLedgerStatus(claim.ledgerStatus || claim.ledger_status),
      audit_note: claim.auditNote || claim.audit_note || "",
      source: claim.source || "prototype",
    };
  }

  function draftClaimRecord(app, user) {
    const items = Array.isArray(app.draftItems) ? app.draftItems : [];
    const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return {
      id: draftClaimId(),
      employee_id: user.id,
      title: draftTitle(),
      status: normalizeClaimStatus(app.claimStatus),
      total,
      currency: "CNY",
      receipt_count: items.length,
      risk_count: riskCount(items),
      route_summary: routeSummary(),
      archive_no: "",
      voucher_no: "",
      ledger_status: "",
      audit_note: "",
      source: "prototype",
    };
  }

  function receiptRecord(item, file, index) {
    return {
      id: `${item.id}-receipt`,
      item_id: item.id,
      file_name: file?.name || (item.vendor ? `${item.vendor}.pdf` : `receipt-${index + 1}.pdf`),
      mime_type: file?.type || "application/pdf",
      storage_key: "",
      storage_status: "prototype-local",
      ocr_text: "",
      ai_result_json: null,
    };
  }

  function approvalTasks(claims) {
    return claims.flatMap((claim) =>
      (claim.timeline || []).map((step, index) => ({
        id: `${claim.id}-task-${index + 1}`,
        claim_id: claim.id,
        step: step.step,
        actor: step.actor,
        status: step.status,
        handled_at: step.at,
        comment: step.comment || "",
        platform_message_id: step.platform_message_id || "",
      })),
    );
  }

  function auditLogs(claims) {
    return claims.flatMap((claim) =>
      (claim.timeline || []).map((step, index) => ({
        id: `${claim.id}-audit-${index + 1}`,
        claim_id: claim.id,
        event: `${step.step}/${step.status}`,
        actor: step.actor,
        payload_json: {
          step: step.step,
          status: step.status,
        },
        created_at: step.at,
      })),
    );
  }

  function financeArchives(claims) {
    return claims
      .filter((claim) => claim.archiveNo || claim.voucherNo || claim.ledgerStatus)
      .map((claim) => ({
        claim_id: claim.id,
        archive_no: claim.archiveNo || "",
        voucher_no: claim.voucherNo || "",
        ledger_status: normalizeLedgerStatus(claim.ledgerStatus),
        audit_note: claim.auditNote || "",
        voucher_files: claim.voucherFiles || [],
        exported_at: "",
        posted_at: normalizeLedgerStatus(claim.ledgerStatus) === "posted" ? new Date().toISOString() : "",
      }));
  }

  function buildDataModel() {
    const app = appState();
    const user = currentUser();
    const submittedClaims = Array.isArray(app.submittedClaims) ? app.submittedClaims : [];
    const draftItems = Array.isArray(app.draftItems) ? app.draftItems : [];
    const files = Array.isArray(app.files) ? app.files : [];
    const draftItemsRecords = draftItems.map((item, index) => itemToRecord(item, draftClaimId(), index));
    const submittedItemsRecords = submittedClaims.flatMap((claim) =>
      (claim.items || []).map((item, index) => itemToRecord(item, claim.id, index)),
    );
    const claimRecords = [
      ...(draftItems.length ? [draftClaimRecord(app, user)] : []),
      ...submittedClaims.map((claim) => claimToRecord(claim, user)),
    ];
    const itemRecords = [...draftItemsRecords, ...submittedItemsRecords];

    return {
      meta: {
        generated_at: new Date().toISOString(),
        prototype_version: "0.2",
        platform: user.platform,
        platform_label: user.platform_label,
        locale: document.querySelector("#interfaceLanguage")?.value || "zh-CN",
      },
      users: [currentUser()],
      departments: departments(),
      expense_claims: claimRecords,
      expense_items: itemRecords,
      receipts: itemRecords.map((item, index) => receiptRecord(item, files[index], index)),
      approval_tasks: approvalTasks(submittedClaims),
      audit_logs: auditLogs(submittedClaims),
      finance_archives: financeArchives(submittedClaims),
    };
  }

  window.prototypeStore = {
    buildDataModel,
    currentUser,
    departments,
    normalizeClaimStatus,
    normalizeLedgerStatus,
  };
})();
