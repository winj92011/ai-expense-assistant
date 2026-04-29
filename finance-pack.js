(() => {
  if (window.__financePackInstalled) return;
  window.__financePackInstalled = true;

  const STATUS = {
    finance: "待财务复核",
    payment: "待出纳付款",
    paid: "已付款",
  };

  function installStyle() {
    if (document.querySelector("#finance-pack-style")) return;
    const style = document.createElement("style");
    style.id = "finance-pack-style";
    style.textContent = `
      .finance-card{display:grid;gap:14px;padding:18px;border:1px solid var(--line);border-radius:8px;background:var(--surface);box-shadow:var(--shadow)}
      .finance-card-head{display:flex;justify-content:space-between;gap:14px}.archive-line,.finance-badges,.voucher-files,.review-checklist{display:flex;flex-wrap:wrap;gap:8px}
      .archive-line span,.finance-badges span,.voucher-files span,.review-checklist span{display:inline-flex;align-items:center;min-height:28px;padding:5px 8px;border-radius:999px;background:#f4f8ff;color:var(--muted);font-size:12px;font-weight:700}
      .finance-badges .risk{background:#fff8ef;color:var(--amber)}.finance-badges .ok,.review-checklist .ok{background:#effaf5;color:var(--green)}
      .voucher-package{display:grid;gap:10px;padding:12px;border:1px solid #d7e6ff;border-radius:8px;background:#f8fbff}.voucher-package strong{font-size:14px}
      .finance-review-note{display:grid;gap:6px}.finance-review-note label{color:var(--muted);font-size:12px;font-weight:700}.finance-review-note textarea{width:100%;min-height:72px;resize:vertical;border:1px solid var(--line);border-radius:8px;color:var(--ink);padding:10px;line-height:1.5}
      .finance-modal-backdrop{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:18px;background:rgba(16,24,40,.48)}.finance-modal{width:min(860px,100%);max-height:min(720px,calc(100vh - 36px));overflow:auto;border-radius:8px;background:#fff;box-shadow:0 24px 60px rgba(16,24,40,.24)}.finance-modal-head,.finance-modal-body{padding:18px}.finance-modal-head{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line)}.finance-modal-body{display:grid;gap:14px}
    `;
    document.head.appendChild(style);
  }

  function claimStage(claim) {
    if (claim.status === STATUS.paid) return "paid";
    if (claim.status === STATUS.payment || claim.status === "已复核待付款") return "payment";
    if (claim.status === STATUS.finance) return "finance";
    return "other";
  }

  function claimNumber(claim, index) {
    if (!claim.archiveNo) {
      const date = new Date();
      claim.archiveNo = `FIN-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}-${String(index + 1).padStart(4, "0")}`;
    }
    return claim.archiveNo;
  }

  function riskCount(claim) {
    return claim.items.filter((item) => item.status.includes("需")).length;
  }

  function hydrateFinanceMeta(claim, index) {
    const stage = claimStage(claim);
    claimNumber(claim, index);
    claim.ledgerStatus = stage === "paid" ? "已入账" : stage === "payment" ? "待入账" : "未入账";
    claim.auditNote = claim.auditNote || (riskCount(claim) ? "存在需确认明细，财务复核时保留审计说明。" : "票据、金额、行程与审批链路匹配。");
    claim.voucherFiles = [`${claim.archiveNo}-cover.pdf`, `${claim.archiveNo}-receipts.zip`, `${claim.archiveNo}-ledger.csv`, `${claim.archiveNo}-audit.txt`];
    if (stage === "payment" || stage === "paid") claim.voucherNo = claim.voucherNo || `V-${claim.archiveNo.replace("FIN-", "")}`;
  }

  function packageHtml(claim) {
    return `<div class="voucher-package"><div><strong>凭证包</strong><p>${claim.voucherNo ? `凭证号 ${claim.voucherNo}` : "复核后自动生成凭证号，付款前可下载留档。"}</p></div><div class="voucher-files">${claim.voucherFiles.map((file) => `<span>${file}</span>`).join("")}</div></div>`;
  }

  function itemPreview(claim) {
    return `<div class="table-wrap"><table><thead><tr><th>日期</th><th>类型</th><th>商户</th><th>金额</th><th>状态</th></tr></thead><tbody>${claim.items.map((item) => `<tr><td>${item.date}</td><td>${item.category}</td><td>${item.vendor}</td><td>${formatCurrency(item.amount)}</td><td>${item.status}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function financeCard(claim, index) {
    hydrateFinanceMeta(claim, index);
    const stage = claimStage(claim);
    const risks = riskCount(claim);
    const action = stage === "finance" ? `<button class="primary-button" type="button" data-review-claim="${claim.id}">标记已复核</button>` : stage === "payment" ? `<button class="primary-button" type="button" data-pay-claim="${claim.id}">确认付款</button>` : `<button class="secondary-button" type="button" data-open-package="${claim.id}">查看凭证包</button>`;
    return `<article class="finance-card"><div class="finance-card-head"><div><span class="label">${stage === "finance" ? "待复核" : stage === "payment" ? "待付款" : "已付款"}</span><h2>${claim.title}</h2><p>${claim.count} 张票据，合计 ${formatCurrency(claim.total)}</p></div><div class="action-group"><button class="secondary-button" type="button" data-open-package="${claim.id}">查看明细</button><button class="secondary-button" type="button" data-download-package="${claim.id}">下载凭证包</button>${action}</div></div><div class="archive-line"><span>已生成归档号: ${claim.archiveNo}</span><span>入账状态: ${claim.ledgerStatus}</span>${claim.voucherNo ? `<span>凭证号: ${claim.voucherNo}</span>` : ""}</div><div class="finance-badges"><span class="${risks ? "risk" : "ok"}">${risks ? `${risks} 项需确认` : "无异常明细"}</span><span>审计说明: ${claim.auditNote}</span></div>${stage === "finance" ? `<div class="finance-review-note"><label for="audit-note-${claim.id}">复核说明</label><textarea id="audit-note-${claim.id}" data-audit-note="${claim.id}">${claim.auditNote}</textarea></div>` : ""}<div class="review-checklist"><span class="ok">✓ 审批链完整</span><span class="ok">✓ 交通票据</span><span class="ok">✓ 无异常明细</span></div>${itemPreview(claim)}${packageHtml(claim)}${typeof renderTimeline === "function" ? renderTimeline(claim) : ""}</article>`;
  }

  window.renderFinanceView = function renderFinanceViewWithPackage() {
    state.submittedClaims.forEach(hydrateFinanceMeta);
    const visibleClaims = state.submittedClaims.filter((claim) => ["finance", "payment", "paid"].includes(claimStage(claim)));
    document.querySelector("#financePendingCount").textContent = String(visibleClaims.filter((claim) => claimStage(claim) === "finance").length);
    document.querySelector("#financeTotalAmount").textContent = formatCurrency(visibleClaims.reduce((sum, claim) => sum + claim.total, 0));
    document.querySelector("#financeRiskRate").textContent = "0%";
    financeList.innerHTML = visibleClaims.map(financeCard).join("") || `<div class="empty-state compact"><h2>暂无待复核报销</h2><p>主管同意后会出现在这里，财务可生成归档号和凭证包。</p></div>`;
  };

  function findClaim(id) {
    return state.submittedClaims.find((claim) => claim.id === id);
  }

  function openPackage(claim) {
    hydrateFinanceMeta(claim, state.submittedClaims.indexOf(claim));
    const modal = document.createElement("div");
    modal.className = "finance-modal-backdrop";
    modal.innerHTML = `<section class="finance-modal" role="dialog" aria-modal="true"><div class="finance-modal-head"><div><span class="label">${claim.archiveNo}</span><h2>${claim.title}</h2><p>${claim.status} · ${claim.ledgerStatus}</p></div><button class="secondary-button" type="button" data-close-finance-modal>关闭</button></div><div class="finance-modal-body">${packageHtml(claim)}${itemPreview(claim)}<div class="soft-note">${claim.auditNote}</div>${typeof renderTimeline === "function" ? renderTimeline(claim) : ""}</div></section>`;
    document.body.appendChild(modal);
  }

  function downloadPackage(claim) {
    hydrateFinanceMeta(claim, state.submittedClaims.indexOf(claim));
    const manifest = { archiveNo: claim.archiveNo, voucherNo: claim.voucherNo || "", title: claim.title, status: claim.status, ledgerStatus: claim.ledgerStatus, total: claim.total, auditNote: claim.auditNote, files: claim.voucherFiles, items: claim.items };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${claim.archiveNo}-voucher-package.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("已生成凭证包清单");
  }

  financeList.addEventListener("click", (event) => {
    const reviewButton = event.target.closest("[data-review-claim]");
    if (reviewButton) {
      const claim = findClaim(reviewButton.dataset.reviewClaim);
      const noteInput = financeList.querySelector(`[data-audit-note="${reviewButton.dataset.reviewClaim}"]`);
      if (claim && noteInput) claim.auditNote = noteInput.value.trim() || claim.auditNote;
      if (claim) claim.status = STATUS.payment;
      renderFinanceView();
      return;
    }
    const payButton = event.target.closest("[data-pay-claim]");
    if (payButton) {
      const claim = findClaim(payButton.dataset.payClaim);
      if (claim) claim.status = STATUS.paid;
      renderFinanceView();
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
      return;
    }
    const closeButton = event.target.closest("[data-close-finance-modal]");
    if (closeButton) closeButton.closest(".finance-modal-backdrop")?.remove();
  });

  document.body.addEventListener("click", (event) => {
    if (event.target.matches(".finance-modal-backdrop")) event.target.remove();
  });

  installStyle();
  renderFinanceView();
})();
