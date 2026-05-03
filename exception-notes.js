(() => {
  if (window.__exceptionNotesInstalled) return;
  window.__exceptionNotesInstalled = true;

  const expenseRows = document.querySelector("#expenseRows");
  const submitButton = document.querySelector("#submitDraftBtn");

  if (!expenseRows || !submitButton) return;

  function installStyle() {
    if (document.querySelector("#exception-notes-style")) return;
    const style = document.createElement("style");
    style.id = "exception-notes-style";
    style.textContent = `
      .exception-note-row td {
        padding-top: 0;
        background: #fff8ef;
      }

      .exception-note {
        display: grid;
        gap: 6px;
        padding: 10px;
        border: 1px solid #f0d3b0;
        border-radius: 8px;
        background: #ffffff;
      }

      .exception-note label,
      .claim-note-list span {
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
      }

      .exception-note textarea {
        width: 100%;
        min-height: 62px;
        resize: vertical;
        border: 1px solid var(--line);
        border-radius: 8px;
        color: var(--ink);
        padding: 9px 10px;
        line-height: 1.5;
      }

      .claim-note-list {
        display: grid;
        gap: 8px;
        margin-top: 10px;
        padding: 10px;
        border: 1px solid #f0d3b0;
        border-radius: 8px;
        background: #fff8ef;
      }

      .claim-note-list p {
        margin: 0;
        color: var(--ink);
        font-size: 13px;
      }
    `;
    document.head.appendChild(style);
  }

  function needsNote(item) {
    return String(item.status || "").includes("需");
  }

  function syncNotesFromDom() {
    document.querySelectorAll("[data-exception-note]").forEach((textarea) => {
      const index = Number(textarea.dataset.exceptionNote);
      if (Number.isNaN(index) || !state.draftItems[index]) return;
      state.draftItems[index].employee_note = textarea.value.trim();
    });
  }

  function enhanceDraftRows() {
    if (!Array.isArray(state.draftItems) || !state.draftItems.length) return;
    if (expenseRows.querySelector("[data-exception-note]")) return;

    Array.from(expenseRows.querySelectorAll("tr")).forEach((row, index) => {
      const item = state.draftItems[index];
      if (!item || !needsNote(item)) return;

      const noteRow = document.createElement("tr");
      noteRow.className = "exception-note-row";
      noteRow.innerHTML = `
        <td colspan="5">
          <div class="exception-note">
            <label for="exception-note-${index}">员工补充说明</label>
            <textarea id="exception-note-${index}" data-exception-note="${index}" placeholder="例如：客户晚餐，参与人 4 人，项目复盘。">${item.employee_note || ""}</textarea>
          </div>
        </td>
      `;
      row.insertAdjacentElement("afterend", noteRow);
    });
  }

  function claimNotes(claim) {
    return (claim.items || [])
      .filter((item) => item.employee_note)
      .map((item) => ({
        category: item.category,
        vendor: item.vendor,
        note: item.employee_note,
      }));
  }

  function notesHtml(claim) {
    const notes = claimNotes(claim);
    if (!notes.length) return "";

    return `
      <div class="claim-note-list">
        <span>员工补充说明</span>
        ${notes.map((item) => `<p><strong>${item.category}</strong> · ${item.vendor}：${item.note}</p>`).join("")}
      </div>
    `;
  }

  function patchRenderers() {
    if (window.__exceptionNotesRenderersPatched) return;
    window.__exceptionNotesRenderersPatched = true;

    const originalApprovals = window.renderApprovalsView;
    if (typeof originalApprovals === "function") {
      window.renderApprovalsView = function renderApprovalsViewWithNotes() {
        originalApprovals();
        document.querySelectorAll("[data-approve-claim]").forEach((button) => {
          const claim = state.submittedClaims.find((item) => item.id === button.dataset.approveClaim);
          if (!claim || button.closest(".queue-card").querySelector(".claim-note-list")) return;
          button.closest(".queue-card").querySelector("div")?.insertAdjacentHTML("beforeend", notesHtml(claim));
        });
      };
    }

    const originalFinance = window.renderFinanceView;
    if (typeof originalFinance === "function") {
      window.renderFinanceView = function renderFinanceViewWithNotes() {
        originalFinance();
        document.querySelectorAll("[data-review-claim], [data-pay-claim]").forEach((button) => {
          const claimId = button.dataset.reviewClaim || button.dataset.payClaim;
          const claim = state.submittedClaims.find((item) => item.id === claimId);
          if (!claim || button.closest(".queue-card, .finance-card").querySelector(".claim-note-list")) return;
          button.closest(".queue-card, .finance-card").querySelector("div")?.insertAdjacentHTML("beforeend", notesHtml(claim));
        });
      };
    }
  }

  function scheduleEnhance() {
    window.setTimeout(enhanceDraftRows, 0);
  }

  installStyle();
  patchRenderers();
  scheduleEnhance();

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(expenseRows, { childList: true });

  expenseRows.addEventListener("input", (event) => {
    if (event.target.matches("[data-exception-note]")) syncNotesFromDom();
  });

  submitButton.addEventListener(
    "click",
    () => {
      syncNotesFromDom();
    },
    true,
  );
})();
