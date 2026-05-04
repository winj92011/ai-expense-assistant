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

      @media (max-width: 920px) {
        .persistence-strip {
          display: grid;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function formatSavedAt(data) {
    if (!data?.savedAt) return "尚未保存";
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(data.savedAt));
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
    const modeLabel =
      data?.persistenceMode === "api-fallback"
        ? "API 回退本地"
        : adapterInfo.mode === "api"
          ? "API 模式"
          : "本地模式";
    panel.innerHTML = `
      <div>
        <strong>浏览器本地暂存</strong>
        <span>仅用于原型演示；正式版本会接入数据库。上次保存：${formatSavedAt(data)} · 草稿 ${draftCount} 条 · 单据 ${claimCount} 条 · ${modeLabel}</span>
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
