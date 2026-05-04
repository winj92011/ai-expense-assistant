(() => {
  if (window.__prototypePersistenceInstalled) return;
  window.__prototypePersistenceInstalled = true;

  const STORAGE_KEY = "ai-expense-assistant:prototype-state:v1";
  const loginStrip = document.querySelector("#loginStrip");

  if (!loginStrip || !window.localStorage) return;

  function preferredPersistenceMode() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("persistence") || localStorage.getItem("ai-expense-assistant:persistence-mode");
    return requested === "api" ? "api" : "local";
  }

  const persistenceAdapter = window.createPersistenceAdapter
    ? window.createPersistenceAdapter({ key: STORAGE_KEY, mode: preferredPersistenceMode() })
    : {
        save(data) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          return data;
        },
        read() {
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        },
        clear() {
          localStorage.removeItem(STORAGE_KEY);
          return true;
        },
        describe() {
          return { mode: "local", databaseConnected: false, apiReady: false };
        },
      };

  function isTestMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get("smoke") === "1" || params.get("e2e") === "1" || window.location.hash === "#smoke";
  }

  function snapshot() {
    return {
      savedAt: new Date().toISOString(),
      draftItems: state.draftItems || [],
      submittedClaims: state.submittedClaims || [],
      claimStatus: state.claimStatus,
      analyzed: state.analyzed,
      tripTitle: document.querySelector("#tripTitle")?.textContent || "",
      tripSummary: document.querySelector("#tripSummary")?.textContent || "",
      routeInsight: document.querySelector("#routeInsight")?.textContent || "",
    };
  }

  async function saveSnapshot() {
    const data = snapshot();
    const saved = await Promise.resolve(persistenceAdapter.save(data));
    renderPanel(saved);
    return saved;
  }

  function readSnapshot() {
    return Promise.resolve(persistenceAdapter.read());
  }

  async function restoreSnapshot(data) {
    data = data || (await readSnapshot());
    if (!data) {
      showToast("暂无本地暂存");
      return;
    }

    state.draftItems = Array.isArray(data.draftItems) ? data.draftItems : [];
    state.submittedClaims = Array.isArray(data.submittedClaims) ? data.submittedClaims : [];
    state.claimStatus = data.claimStatus || (state.submittedClaims.length ? "submitted" : "idle");
    state.analyzed = Boolean(data.analyzed || state.draftItems.length);

    if (data.tripTitle) document.querySelector("#tripTitle").textContent = data.tripTitle;
    if (data.tripSummary) document.querySelector("#tripSummary").textContent = data.tripSummary;
    if (data.routeInsight) document.querySelector("#routeInsight").textContent = data.routeInsight;

    if (state.draftItems.length) {
      document.querySelector("#thinkingState")?.classList.add("hidden");
      document.querySelector("#aiResult")?.classList.remove("hidden");
      document.querySelector("#draftSection")?.classList.remove("hidden");
    }

    renderDraft();
    renderDraftsView();
    renderApprovalsView();
    renderFinanceView();
    renderPanel(data);
    showToast("已恢复本地暂存");
  }

  async function clearSnapshot() {
    await Promise.resolve(persistenceAdapter.clear());
    renderPanel(null);
    showToast("已清空本地暂存");
  }

  function installStyle() {
    if (document.querySelector("#prototype-persistence-style")) return;
    const style = document.createElement("style");
    style.id = "prototype-persistence-style";
    style.textContent = `
      .persistence-strip {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 10px;
        padding: 11px 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #ffffff;
        box-shadow: var(--shadow);
      }

      .persistence-strip strong,
      .persistence-strip span {
        display: block;
      }

      .persistence-strip span {
        margin-top: 3px;
        color: var(--muted);
        font-size: 13px;
      }

      .persistence-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }

      .persistence-meta span {
        display: inline-flex;
        align-items: center;
        min-height: 26px;
        margin-top: 0;
        padding: 4px 8px;
        border-radius: 999px;
        background: #f4f7fb;
        color: var(--ink);
        font-size: 12px;
        font-weight: 800;
      }

      .persistence-meta span[data-tone="ok"] {
        background: #effaf5;
        color: var(--green);
      }

      .persistence-meta span[data-tone="warn"] {
        background: #fff7ed;
        color: #b45309;
      }

      @media (max-width: 920px) {
        .persistence-strip {
          display: grid;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function formatSavedAt(data) {
    const savedAt = data?.savedAt || data?.persistedAt || data?.meta?.generated_at;
    if (!savedAt) return "尚未保存";
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(savedAt));
  }

  function latestClaimId(data) {
    const submitted = Array.isArray(data?.submittedClaims) ? data.submittedClaims : [];
    if (submitted.length) return submitted[submitted.length - 1]?.id || "";

    const claims = Array.isArray(data?.expense_claims) ? data.expense_claims : [];
    const visibleClaims = claims.filter((claim) => claim.id !== "draft-current");
    if (visibleClaims.length) return visibleClaims[visibleClaims.length - 1]?.id || "";
    return "";
  }

  function persistenceLabel(data, adapterInfo) {
    if (data?.persistenceMode === "api-fallback") return "API 回退本地";
    if (adapterInfo.mode === "api" && adapterInfo.databaseConnected) return "数据库已连接";
    if (adapterInfo.mode === "api") return adapterInfo.apiReady ? "API 已连接" : "API 模式";
    return "本地模式";
  }

  function renderPanel(data = null) {
    let panel = document.querySelector("#persistenceStrip");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "persistenceStrip";
      panel.className = "persistence-strip";
      panel.setAttribute("aria-label", "原型本地暂存");
      loginStrip.insertAdjacentElement("afterend", panel);
    }

    const draftCount = data?.draftItems?.length || data?.expense_items?.length || 0;
    const claimCount = data?.submittedClaims?.length || data?.expense_claims?.length || 0;
    const adapterInfo = persistenceAdapter.describe();
    const modeLabel = persistenceLabel(data, adapterInfo);
    const claimId = latestClaimId(data);
    const modeTone = adapterInfo.databaseConnected ? "ok" : data?.persistenceMode === "api-fallback" ? "warn" : "neutral";
    panel.innerHTML = `
      <div>
        <strong>持久化状态</strong>
        <span>保存草稿、提交、审批和财务动作后会自动刷新这里。</span>
        <div class="persistence-meta" aria-label="持久化观测">
          <span data-tone="${modeTone}">模式：${modeLabel}</span>
          <span>最近保存：${formatSavedAt(data)}</span>
          <span>草稿 ${draftCount} 条 · 单据 ${claimCount} 条</span>
          <span>最近单据：${claimId || "暂无"}</span>
        </div>
      </div>
      <div class="action-group">
        <button class="secondary-button" type="button" data-save-prototype>保存快照</button>
        <button class="secondary-button" type="button" data-restore-prototype>恢复快照</button>
        <button class="secondary-button" type="button" data-clear-prototype>清空快照</button>
      </div>
    `;
  }

  function autoSaveSoon() {
    window.clearTimeout(window.__prototypePersistenceTimer);
    window.__prototypePersistenceTimer = window.setTimeout(() => {
      if (!isTestMode()) saveSnapshot();
    }, 120);
  }

  function patchRenderers() {
    if (window.__prototypePersistenceRenderersPatched) return;
    window.__prototypePersistenceRenderersPatched = true;

    ["renderDraft", "renderDraftsView", "renderApprovalsView", "renderFinanceView"].forEach((name) => {
      const original = window[name];
      if (typeof original !== "function") return;
      window[name] = function renderAndPersist(...args) {
        const result = original.apply(this, args);
        autoSaveSoon();
        return result;
      };
    });
  }

  installStyle();
  renderPanel();
  patchRenderers();

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-save-prototype]")) {
      saveSnapshot();
      showToast("已保存本地快照");
    }
    if (event.target.closest("[data-restore-prototype]")) restoreSnapshot();
    if (event.target.closest("[data-clear-prototype]")) clearSnapshot();
  });

  if (!isTestMode()) {
    readSnapshot().then((data) => {
      if (data && (data.draftItems?.length || data.submittedClaims?.length)) {
        window.setTimeout(() => restoreSnapshot(data), 0);
      }
      renderPanel(data);
    });
  }

  window.prototypePersistence = {
    saveSnapshot,
    readSnapshot,
    restoreSnapshot,
    clearSnapshot,
    adapter: persistenceAdapter,
  };
})();
