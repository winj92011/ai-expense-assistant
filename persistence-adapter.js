(() => {
  if (window.__persistenceAdapterInstalled) return;
  window.__persistenceAdapterInstalled = true;

  const DEFAULT_KEY = "ai-expense-assistant:persistence:v1";

  function parseJson(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function createLocalAdapter(options = {}) {
    const key = options.key || DEFAULT_KEY;
    const storage = options.storage || window.localStorage;

    return {
      mode: "local",
      key,
      save(data) {
        const payload = {
          ...data,
          persistedAt: data?.persistedAt || new Date().toISOString(),
          persistenceMode: data?.persistenceMode || "local",
        };
        storage.setItem(key, JSON.stringify(payload));
        return payload;
      },
      read() {
        return parseJson(storage.getItem(key));
      },
      clear() {
        storage.removeItem(key);
        return true;
      },
      describe() {
        return {
          mode: "local",
          key,
          databaseConnected: false,
          apiReady: false,
        };
      },
    };
  }

  const CLAIM_STATUS_LABELS = {
    draft: "草稿",
    submitted: "待主管审批",
    manager_approved: "待财务复核",
    finance_reviewed: "待出纳付款",
    paid: "已付款",
    returned: "退回补充说明",
  };

  function itemFromRecord(record = {}) {
    return {
      id: record.id,
      date: record.expense_date || record.invoice_date || "",
      invoice_date: record.invoice_date || record.expense_date || "",
      category: record.category || "其他",
      vendor: record.vendor || "",
      amount: Number(record.amount || 0),
      currency: record.currency || "CNY",
      status: record.status || "待识别",
      employee_note: record.employee_note || "",
      policy_warning: record.policy_warning || "",
      confidence: Number(record.confidence || 0),
    };
  }

  function timelineForClaim(model, claimId) {
    return (model.approval_tasks || [])
      .filter((task) => task.claim_id === claimId)
      .map((task) => ({
        step: task.step || "流程记录",
        actor: task.actor || "",
        status: task.status || "",
        at: task.handled_at || task.created_at || "",
        comment: task.comment || "",
        platform_message_id: task.platform_message_id || "",
      }));
  }

  function snapshotFromModel(model = {}) {
    const claims = Array.isArray(model.expense_claims) ? model.expense_claims : [];
    const items = Array.isArray(model.expense_items) ? model.expense_items : [];
    const byClaim = items.reduce((grouped, item) => {
      const key = item.claim_id || "draft-current";
      grouped[key] = grouped[key] || [];
      grouped[key].push(itemFromRecord(item));
      return grouped;
    }, {});
    const draftClaim =
      claims.find((claim) => claim.id === "draft-current") ||
      claims.find((claim) => claim.status === "draft");
    const submittedClaims = claims
      .filter((claim) => claim.id !== draftClaim?.id)
      .map((claim) => ({
        id: claim.id,
        employee_id: claim.employee_id,
        title: claim.title || "数据库报销单",
        total: Number(claim.total || 0),
        count: Number(claim.receipt_count || byClaim[claim.id]?.length || 0),
        items: byClaim[claim.id] || [],
        status: CLAIM_STATUS_LABELS[claim.status] || claim.status || "待主管审批",
        archiveNo: claim.archive_no || "",
        voucherNo: claim.voucher_no || "",
        ledgerStatus: claim.ledger_status || "",
        auditNote: claim.audit_note || "",
        timeline: timelineForClaim(model, claim.id),
      }));

    return {
      savedAt: model.meta?.generated_at || new Date().toISOString(),
      persistedAt: model.meta?.generated_at || new Date().toISOString(),
      persistenceMode: model.meta?.persistence?.databaseConnected ? "api-database" : "api",
      databaseConnected: Boolean(model.meta?.persistence?.databaseConnected),
      draftItems: draftClaim ? byClaim[draftClaim.id] || [] : [],
      submittedClaims,
      claimStatus: submittedClaims.length ? "submitted" : draftClaim ? "ready" : "idle",
      analyzed: Boolean(draftClaim || submittedClaims.length),
      tripTitle: draftClaim?.title || submittedClaims[0]?.title || "",
      tripSummary: draftClaim?.route_summary || submittedClaims[0]?.route_summary || "",
      routeInsight: draftClaim?.route_summary || submittedClaims[0]?.route_summary || "",
      model,
      expense_claims: model.expense_claims || [],
      expense_items: model.expense_items || [],
      receipts: model.receipts || [],
      approval_tasks: model.approval_tasks || [],
      audit_logs: model.audit_logs || [],
      finance_archives: model.finance_archives || [],
    };
  }

  function createApiAdapter(options = {}) {
    const fallback = createLocalAdapter(options);
    const endpoint = options.endpoint || "/api/prototype/data-model-preview";
    let lastRemoteInfo = {
      databaseConnected: false,
      apiReady: false,
    };

    async function requestJson(path, requestOptions = {}) {
      try {
        const response = await fetch(path, requestOptions);
        const text = await response.text();
        if (!response.ok || !text.trim()) return null;
        return JSON.parse(text);
      } catch {
        return null;
      }
    }

    return {
      mode: "api",
      key: fallback.key,
      endpoint,
      async save(data) {
        const payload = {
          ...data,
          model:
            data?.model ||
            (window.prototypeStore?.buildDataModel
              ? window.prototypeStore.buildDataModel()
              : undefined),
          persistedAt: data?.persistedAt || new Date().toISOString(),
          persistenceMode: "api",
        };
        const remote = await requestJson(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (remote?.persistence) lastRemoteInfo = remote.persistence;
        if (remote?.snapshot) {
          return {
            ...remote.snapshot,
            persistenceMode: remote.persistence?.databaseConnected ? "api-database" : payload.persistenceMode,
            databaseConnected: Boolean(remote.persistence?.databaseConnected),
          };
        }
        return fallback.save({
          ...payload,
          persistenceMode: "api-fallback",
          fallbackReason: "api_unavailable",
        });
      },
      async read() {
        const remote = await requestJson(endpoint);
        if (remote?.persistence) lastRemoteInfo = remote.persistence;
        if (remote?.snapshot) return remote.snapshot;
        if (remote?.model) {
          return snapshotFromModel({
            ...remote.model,
            meta: {
              ...(remote.model.meta || {}),
              persistence: remote.persistence || remote.model.meta?.persistence || {},
            },
          });
        }
        return fallback.read();
      },
      async clear() {
        await requestJson(endpoint, { method: "DELETE" });
        return fallback.clear();
      },
      describe() {
        return {
          mode: "api",
          key: fallback.key,
          endpoint,
          databaseConnected: Boolean(lastRemoteInfo.databaseConnected),
          apiReady: Boolean(lastRemoteInfo.apiReady),
          fallback: "local",
        };
      },
    };
  }

  function createPersistenceAdapter(options = {}) {
    return options.mode === "api" ? createApiAdapter(options) : createLocalAdapter(options);
  }

  window.createPersistenceAdapter = createPersistenceAdapter;
  window.persistenceAdapter = createPersistenceAdapter({ key: DEFAULT_KEY });
})();
