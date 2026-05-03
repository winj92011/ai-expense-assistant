(() => {
  if (window.__financePackInstalled) return;
  window.__financePackInstalled = true;

  const STYLE_ID = "finance-pack-style";
  const STATUS = {
    manager: "待主管审批",
    finance: "待财务复核",
    payment: "待出纳付款",
    paid: "已付款",
  };

  const COPY = {
    pending: "待复核",
    payment: "待付款",
    paid: "已付款",
    archived: "已生成归档号",
    notPosted: "未入账",
    readyToPost: "待入账",
    posted: "已入账",
  };

  const financeFilters = {
    status: "all",
    query: "",
  };

  function installStyle() {
    if (document.querySelector(`#${STYLE_ID}`)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .finance-toolbar {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin: 0 0 14px;
      }

      .finance-toolbar p {
        margin: 3px 0 0;
        font-size: 13px;
      }

      .finance-filter-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: end;
        gap: 10px;
      }

      .finance-filter-bar label {
        display: grid;
        gap: 5px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }

      .finance-filter-bar input,
      .finance-filter-bar select {
        min-height: 38px;
        min-width: 150px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #ffffff;
        color: var(--ink);
        padding: 0 10px;
      }

      .finance-filter-bar input {
        min-width: min(300px, 60vw);
      }

      .finance-filter-summary {
        align-self: center;
        margin-top: 18px;
        color: var(--muted);
        font-size: 13px;
        font-weight: 700;
      }

      .finance-card {
        display: grid;
        gap: 14px;
        padding: 18px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--surface);
        box-shadow: var(--shadow);
      }

      .finance-card-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
      }

      .archive-line,
      .finance-badges,
      .voucher-files,
      .review-checklist {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .archive-line span,
      .finance-badges span,
      .voucher-files span,
      .review-checklist span {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 5px 8px;
        border-radius: 999px;
        background: #f4f8ff;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }

      .finance-badges .risk {
        background: #fff8ef;
        color: var(--amber);
      }

      .finance-badges .ok,
      .review-checklist .ok {
        background: #effaf5;
        color: var(--green);
      }

      .voucher-package {
        display: grid;
        gap: 10px;
        padding: 12px;
        border: 1px solid #d7e6ff;
        border-radius: 8px;
        background: #f8fbff;
      }

      .voucher-package strong {
        font-size: 14px;
      }

      .finance-review-note {
        display: grid;
        gap: 6px;
      }

      .finance-review-note label {
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }

      .finance-review-note textarea {
        width: 100%;
        min-height: 72px;
        resize: vertical;
        border: 1px solid var(--line);
        border-radius: 8px;
        color: var(--ink);
        padding: 10px;
        line-height: 1.5;
      }

      .finance-item-table {
        width: 100%;
        min-width: 0;
      }

      .finance-item-table td,
      .finance-item-table th {
        padding: 8px 10px;
        font-size: 13px;
      }

      .finance-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 30;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(16, 24, 40, 0.48);
      }

      .finance-modal {
        width: min(860px, 100%);
        max-height: min(720px, calc(100vh - 36px));
        overflow: auto;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 24px 60px rgba(16, 24, 40, 0.24);
      }

      .finance-modal-head,
      .finance-modal-body {
        padding: 18px;
      }

      .finance-modal-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px solid var(--line);
      }

      .finance-modal-body {
        display: grid;
        gap: 14px;
      }

      @media (max-width: 720px) {
        .finance-card-head,
        .finance-modal-head {
          display: grid;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function claimNumber(claim, index) {
    if (claim.archiveNo) return claim.archiveNo;
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const n = String(index + 1).padStart(4, "0");
    claim.archiveNo = `FIN-${y}${m}-${n}`;
    return claim.archiveNo;
  }

  function claimStage(claim) {
    if (claim.status === STATUS.paid) return "paid";
    if (claim.status === STATUS.payment || claim.status === "已复核待付款") return "payment";
    if (claim.status === STATUS.finance) return "finance";
    return "other";
  }

  function hydrateFinanceMeta(claim, index) {
    const stage = claimStage(claim);
    claimNumber(claim, index);
    claim.ledgerStatus = stage === "paid" ? COPY.posted : stage === "payment" ? COPY.readyToPost : COPY.notPosted;
    claim.auditNote =
      claim.auditNote ||
      (riskCount(claim)
        ? "存在需确认明细，财务复核时保留审计说明。"
        : "票据、金额、行程与审批链路匹配。");
    claim.voucherFiles = [
      `${claim.archiveNo}-cover.pdf`,
      `${claim.archiveNo}-receipts.zip`,
      `${claim.archiveNo}-ledger.csv`,
      `${claim.archiveNo}-audit.txt`,
    ];
    if (stage === "payment" || stage === "paid") {
      claim.voucherNo = claim.voucherNo || `V-${claim.archiveNo.replace("FIN-", "")}`;
    }
  }

  function hydrateAll() {
    state.submittedClaims.forEach(hydrateFinanceMeta);
  }

  function riskCount(claim) {
    return claim.items.filter((item) => item.status.includes("需")).length;
  }

  function checklist(claim) {
    const categories = new Set(claim.items.map((item) => item.category));
    const hasTravel = ["机票", "火车票", "本地交通"].some((category) => categories.has(category));
    const hasStay = categories.has("住宿");
    const hasAudit = Boolean(claim.timeline && claim.timeline.length);
    return [
      { label: "审批链完整", ok: hasAudit },
      { label: "交通票据", ok: hasTravel },
      { label: "住宿核验", ok: hasStay },
      { label: riskCount(claim) ? "异常已标记" : "无异常明细", ok: true },
    ];
  }

  function searchableText(claim) {
    return [
      claim.archiveNo,
      claim.voucherNo,
      claim.title,
      claim.status,
      claim.ledgerStatus,
      claim.auditNote,
      ...claim.items.flatMap((item) => [item.vendor, item.category, item.status]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function escapeAttribute(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  }

  function matchesFinanceFilters(claim) {
    const stage = claimStage(claim);
    if (financeFilters.status !== "all" && stage !== financeFilters.status) return false;
    const query = financeFilters.query.trim().toLowerCase();
    if (!query) return true;
    return searchableText(claim).includes(query);
  }

  function packageHtml(claim) {
    return `
      <div class="voucher-package">
        <div>
          <strong>凭证包</strong>
          <p>${claim.voucherNo ? `凭证号 ${claim.voucherNo}` : "复核后自动生成凭证号，付款前可下载留档。"}</p>
        </div>
        <div class="voucher-files">
          ${claim.voucherFiles.map((file) => `<span>${file}</span>`).join("")}
        </div>
      </div>
    `;
  }

  function itemPreview(claim) {
    const rows = claim.items
      .slice(0, 4)
      .map(
        (item) => `
          <tr>
            <td>${item.date}</td>
            <td>${item.category}</td>
            <td>${item.vendor}</td>
            <td>${formatCurrency(item.amount)}</td>
            <td>${item.status}</td>
          </tr>
        `,
      )
      .join("");

    return `
      <div class="table-wrap">
        <table class="finance-item-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>类型</th>
              <th>商户</th>
              <th>金额</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function financeCard(claim, index) {
    hydrateFinanceMeta(claim, index);
    const stage = claimStage(claim);
    const risks = riskCount(claim);
    const checks = checklist(claim);
    const action =
      stage === "finance"
        ? `<button class="primary-button" type="button" data-review-claim="${claim.id}">标记已复核</button>`
        : stage === "payment"
          ? `<button class="primary-button" type="button" data-pay-claim="${claim.id}">确认付款</button>`
          : `<button class="secondary-button" type="button" data-open-package="${claim.id}">查看凭证包</button>`;

    return `
      <article class="finance-card">
        <div class="finance-card-head">
          <div>
            <span class="label">${stage === "finance" ? COPY.pending : stage === "payment" ? COPY.payment : COPY.paid}</span>
            <h2>${claim.title}</h2>
            <p>${claim.count} 张票据，合计 ${formatCurrency(claim.total)}</p>
          </div>
          <div class="action-group">
            <button class="secondary-button" type="button" data-open-package="${claim.id}">查看明细</button>
            <button class="secondary-button" type="button" data-download-package="${claim.id}">下载凭证包</button>
            ${action}
          </div>
        </div>

        <div class="archive-line">
          <span>${COPY.archived}: ${claim.archiveNo}</span>
          <span>入账状态: ${claim.ledgerStatus}</span>
          ${claim.voucherNo ? `<span>凭证号: ${claim.voucherNo}</span>` : ""}
        </div>

        <div class="finance-badges">
          <span class="${risks ? "risk" : "ok"}">${risks ? `${risks} 项需确认` : "无异常明细"}</span>
          <span>审计说明: ${claim.auditNote}</span>
        </div>

        ${
          stage === "finance"
            ? `
              <div class="finance-review-note">
                <label for="audit-note-${claim.id}">复核说明</label>
                <textarea id="audit-note-${claim.id}" data-audit-note="${claim.id}">${claim.auditNote}</textarea>
              </div>
            `
            : ""
        }

        <div class="review-checklist">
          ${checks.map((item) => `<span class="${item.ok ? "ok" : ""}">${item.ok ? "✓" : "!"} ${item.label}</span>`).join("")}
        </div>

        ${itemPreview(claim)}
        ${packageHtml(claim)}
        ${typeof renderTimeline === "function" ? renderTimeline(claim) : ""}
      </article>
    `;
  }

  window.renderFinanceView = function renderFinanceViewWithPackage() {
    hydrateAll();
    const visibleClaims = state.submittedClaims.filter((claim) => ["finance", "payment", "paid"].includes(claimStage(claim)));
    const filteredClaims = visibleClaims.filter(matchesFinanceFilters);
    const pendingClaims = visibleClaims.filter((claim) => claimStage(claim) === "finance");
    const total = visibleClaims.reduce((sum, claim) => sum + claim.total, 0);
    const totalItems = visibleClaims.reduce((sum, claim) => sum + claim.items.length, 0);
    const riskyItems = visibleClaims.reduce((sum, claim) => sum + riskCount(claim), 0);

    document.querySelector("#financePendingCount").textContent = String(pendingClaims.length);
    document.querySelector("#financeTotalAmount").textContent = formatCurrency(total);
    document.querySelector("#financeRiskRate").textContent = totalItems ? `${Math.round((riskyItems / totalItems) * 100)}%` : "0%";

    if (!visibleClaims.length) {
      financeList.innerHTML = `
        <div class="empty-state compact">
          <h2>暂无待复核报销</h2>
          <p>主管同意后会出现在这里，财务可生成归档号和凭证包。</p>
        </div>
      `;
      return;
    }

    financeList.innerHTML = `
      <div class="finance-toolbar">
        <div>
          <h2>财务复核工作台</h2>
          <p>按归档号管理单据，复核后生成凭证号，付款后更新入账状态。</p>
        </div>
        <div class="finance-filter-bar" aria-label="财务筛选">
          <label>
            状态
            <select data-finance-status-filter>
              <option value="all" ${financeFilters.status === "all" ? "selected" : ""}>全部</option>
              <option value="finance" ${financeFilters.status === "finance" ? "selected" : ""}>待复核</option>
              <option value="payment" ${financeFilters.status === "payment" ? "selected" : ""}>待付款</option>
              <option value="paid" ${financeFilters.status === "paid" ? "selected" : ""}>已付款</option>
            </select>
          </label>
          <label>
            查找
            <input data-finance-search value="${escapeAttribute(financeFilters.query)}" placeholder="归档号、标题、商户" />
          </label>
          <span class="finance-filter-summary">显示 ${filteredClaims.length} / ${visibleClaims.length} 单</span>
        </div>
      </div>
      ${
        filteredClaims.length
          ? filteredClaims.map(financeCard).join("")
          : `
            <div class="empty-state compact">
              <h2>没有匹配的财务单据</h2>
              <p>可以调整状态筛选或查找关键词。</p>
            </div>
          `
      }
    `;
  };

  function findClaim(id) {
    return state.submittedClaims.find((claim) => claim.id === id);
  }

  function openPackage(claim) {
    hydrateFinanceMeta(claim, state.submittedClaims.indexOf(claim));
    const modal = document.createElement("div");
    modal.className = "finance-modal-backdrop";
    modal.innerHTML = `
      <section class="finance-modal" role="dialog" aria-modal="true">
        <div class="finance-modal-head">
          <div>
            <span class="label">${claim.archiveNo}</span>
            <h2>${claim.title}</h2>
            <p>${claim.status} · ${claim.ledgerStatus}</p>
          </div>
          <button class="secondary-button" type="button" data-close-finance-modal>关闭</button>
        </div>
        <div class="finance-modal-body">
          ${packageHtml(claim)}
          ${itemPreview(claim)}
          <div class="soft-note">${claim.auditNote}</div>
          ${typeof renderTimeline === "function" ? renderTimeline(claim) : ""}
        </div>
      </section>
    `;
    document.body.appendChild(modal);
  }

  function downloadPackage(claim) {
    hydrateFinanceMeta(claim, state.submittedClaims.indexOf(claim));
    const manifest = {
      archiveNo: claim.archiveNo,
      voucherNo: claim.voucherNo || "",
      title: claim.title,
      status: claim.status,
      ledgerStatus: claim.ledgerStatus,
      total: claim.total,
      auditNote: claim.auditNote,
      files: claim.voucherFiles,
      items: claim.items,
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${claim.archiveNo}-voucher-package.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("已生成凭证包清单");
  }

  function replaceExportButton() {
    const oldButton = document.querySelector("#exportBtn");
    if (!oldButton) return;
    const button = oldButton.cloneNode(true);
    oldButton.replaceWith(button);
    button.addEventListener("click", () => {
      hydrateAll();
      const rows = [
        ["报销单", "归档号", "凭证号", "标题", "单据状态", "入账状态", "审计说明", "费用日期", "开票日期", "费用类型", "商户", "金额", "明细状态", "凭证包"],
        ...state.submittedClaims.flatMap((claim, index) => {
          hydrateFinanceMeta(claim, index);
          return claim.items.map((item) => [
            claim.id,
            claim.archiveNo,
            claim.voucherNo || "",
            claim.title,
            claim.status,
            claim.ledgerStatus,
            claim.auditNote,
            item.date,
            item.invoice_date || "",
            item.category,
            item.vendor,
            item.amount,
            item.status,
            claim.voucherFiles.join(" | "),
          ]);
        }),
      ];
      const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "expense-finance-ledger.csv";
      link.click();
      URL.revokeObjectURL(url);
      showToast("已导出财务台账");
    });
  }

  financeList.addEventListener(
    "click",
    (event) => {
      const closeButton = event.target.closest("[data-close-finance-modal]");
      if (closeButton) {
        closeButton.closest(".finance-modal-backdrop")?.remove();
        return;
      }

      const openButton = event.target.closest("[data-open-package]");
      if (openButton) {
        const claim = findClaim(openButton.dataset.openPackage);
        if (claim) openPackage(claim);
        return;
      }

      const downloadButton = event.target.closest("[data-download-package]");
      if (downloadButton) {
        const claim = findClaim(downloadButton.dataset.downloadPackage);
        if (claim) downloadPackage(claim);
      }

      const reviewButton = event.target.closest("[data-review-claim]");
      if (reviewButton) {
        const claim = findClaim(reviewButton.dataset.reviewClaim);
        const noteInput = financeList.querySelector(`[data-audit-note="${reviewButton.dataset.reviewClaim}"]`);
        if (claim && noteInput) {
          claim.auditNote = noteInput.value.trim() || claim.auditNote;
        }
      }
    },
    true,
  );

  financeList.addEventListener("input", (event) => {
    const searchInput = event.target.closest("[data-finance-search]");
    if (!searchInput) return;
    financeFilters.query = searchInput.value;
    window.setTimeout(renderFinanceView, 0);
  });

  financeList.addEventListener("change", (event) => {
    const statusFilter = event.target.closest("[data-finance-status-filter]");
    if (!statusFilter) return;
    financeFilters.status = statusFilter.value;
    renderFinanceView();
  });

  document.body.addEventListener("click", (event) => {
    if (event.target.matches(".finance-modal-backdrop")) {
      event.target.remove();
    }
    const closeButton = event.target.closest("[data-close-finance-modal]");
    if (closeButton) {
      closeButton.closest(".finance-modal-backdrop")?.remove();
    }
  });

  installStyle();
  replaceExportButton();
  renderFinanceView();
})();
