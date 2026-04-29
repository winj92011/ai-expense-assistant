(() => {
  const STYLE_ID = "finance-pack-style";
  const MODAL_ID = "financePackModal";

  function installStyle() {
    if (document.querySelector(`#${STYLE_ID}`)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .finance-pack-modal {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(8, 18, 36, 0.46);
      }

      .finance-pack-modal.open {
        display: flex;
      }

      .finance-pack-dialog {
        width: min(1040px, 100%);
        max-height: min(780px, 92vh);
        overflow: auto;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
      }

      .finance-pack-head {
        position: sticky;
        top: 0;
        z-index: 1;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 20px 22px;
        border-bottom: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.96);
      }

      .finance-pack-actions {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .finance-pack-head h2,
      .finance-pack-section h3 {
        margin: 0;
      }

      .finance-pack-head p {
        margin: 6px 0 0;
        color: var(--muted);
      }

      .finance-pack-body {
        display: grid;
        grid-template-columns: minmax(260px, 0.9fr) minmax(420px, 1.4fr);
        gap: 18px;
        padding: 20px 22px 24px;
      }

      .finance-pack-section {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 16px;
        background: #fbfdff;
      }

      .finance-pack-metrics {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-top: 14px;
      }

      .finance-pack-metrics div {
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: #fff;
      }

      .finance-pack-metrics span,
      .voucher-pack-table small,
      .process-line small {
        display: block;
        color: var(--muted);
        font-size: 12px;
      }

      .finance-pack-metrics strong {
        display: block;
        margin-top: 4px;
        font-size: 20px;
      }

      .archive-strip {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 12px;
      }

      .archive-strip span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 9px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: #f8fbff;
        color: var(--ink);
        font-size: 12px;
      }

      .archive-strip strong {
        color: var(--muted);
        font-size: 12px;
      }

      .archive-strip .ready {
        border-color: #bbf7d0;
        background: #f0fdf4;
        color: #047857;
        font-weight: 700;
      }

      .process-line {
        display: grid;
        grid-template-columns: 92px 1fr;
        gap: 10px;
        padding: 12px 0;
        border-bottom: 1px solid var(--border);
      }

      .process-line:last-child {
        border-bottom: 0;
      }

      .process-line strong {
        color: var(--ink);
      }

      .voucher-pack-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
      }

      .voucher-pack-table th,
      .voucher-pack-table td {
        padding: 10px 8px;
        border-bottom: 1px solid var(--border);
        text-align: left;
        vertical-align: top;
      }

      .voucher-pack-table th {
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }

      .pack-status-line {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        background: #ecfdf5;
        color: #047857;
        font-weight: 700;
      }

      @media (max-width: 920px) {
        .finance-pack-body,
        .finance-pack-metrics {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function money(value) {
    if (typeof formatCurrency === "function") return formatCurrency(value || 0);
    return `¥${Number(value || 0).toLocaleString("zh-CN")}`;
  }

  function formatTime(date) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function stagedTime(minutesAgo) {
    return formatTime(new Date(Date.now() - minutesAgo * 60 * 1000));
  }

  function ensureArchiveInfo(claim) {
    const index = state.submittedClaims.findIndex((item) => item.id === claim.id);
    const serial = String(Math.max(1, index + 1)).padStart(4, "0");
    claim.archiveNo = claim.archiveNo || `EXP-202604-${serial}`;
    claim.accountingStatus = claim.status === "已付款" ? "已入账" : claim.accountingStatus || "未入账";
    return {
      archiveNo: claim.archiveNo,
      accountingStatus: claim.accountingStatus,
    };
  }

  function ensureTimeline(claim) {
    const desired = [
      { step: "员工提交", actor: "吴经理", status: "已提交", minutesAgo: 76 },
    ];

    if (["待财务复核", "待出纳付款", "已复核待付款", "已付款"].includes(claim.status)) {
      desired.push({ step: "主管审批", actor: "主管", status: "同意", minutesAgo: 49 });
    }
    if (["待出纳付款", "已复核待付款", "已付款"].includes(claim.status)) {
      desired.push({ step: "财务复核", actor: "财务", status: "已复核", minutesAgo: 21 });
    }
    if (claim.status === "已付款") {
      desired.push({ step: "出纳付款", actor: "出纳", status: "已付款", minutesAgo: 4 });
    }

    claim.timeline = desired.map((item) => ({
      step: item.step,
      actor: item.actor,
      status: item.status,
      at: stagedTime(item.minutesAgo),
    }));
    return claim.timeline;
  }

  function claimRoute(claim) {
    const routeItems = claim.items.filter((item) => item.route);
    if (!routeItems.length) return claim.title || "差旅报销";
    const cities = [];
    routeItems.forEach((item) => {
      const parts = String(item.route).split(/[-→>]/).map((part) => part.trim()).filter(Boolean);
      parts.forEach((city) => {
        if (!cities.length || cities[cities.length - 1] !== city) cities.push(city);
      });
    });
    return cities.length ? cities.join(" → ") : claim.title;
  }

  function routeCoverage(claim) {
    const intercity = claim.items.filter((item) => ["机票", "火车票"].includes(item.category));
    const local = new Set(claim.items.filter((item) => ["住宿", "本地交通", "餐饮"].includes(item.category)).map((item) => item.category));
    const route = claimRoute(claim);
    const parts = route.split(" → ");
    const closed = parts.length > 1 && parts[0] === parts[parts.length - 1];
    const expectedSegments = Math.max(parts.length - 1, 0);
    return {
      route,
      closed,
      covered: intercity.length,
      expected: expectedSegments || intercity.length,
      local: ["住宿", "本地交通", "餐饮"].filter((item) => local.has(item)),
    };
  }

  function riskCount(claim) {
    return claim.items.filter((item) => String(item.status || "").includes("需")).length;
  }

  function renderTimelineRows(claim) {
    return ensureTimeline(claim)
      .map(
        (item) => `
          <div class="process-line">
            <strong>${item.step}</strong>
            <div>${item.actor} · ${item.status}<small>${item.at}</small></div>
          </div>
        `,
      )
      .join("");
  }

  function renderVoucherRows(claim) {
    return claim.items
      .map(
        (item) => `
          <tr>
            <td>${item.date || "-"}<small>${item.invoice_date ? `开票 ${item.invoice_date}` : ""}</small></td>
            <td>${item.category || "其他"}</td>
            <td>${item.vendor || "-"}<small>${[item.route, item.flight_or_train_no].filter(Boolean).join(" · ")}</small></td>
            <td>${money(item.amount)}</td>
            <td>${item.status || "已识别"}</td>
          </tr>
        `,
      )
      .join("");
  }

  function csvEscape(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function exportVoucherPack(claim) {
    const coverage = routeCoverage(claim);
    const archive = ensureArchiveInfo(claim);
    const rows = [
      ["归档编号", archive.archiveNo],
      ["凭证包", claim.title],
      ["单据状态", claim.status],
      ["会计入账", archive.accountingStatus],
      ["行程路线", coverage.route],
      ["票据数量", claim.count],
      ["合计金额", claim.total],
      ["行程闭环", coverage.closed ? "已闭环" : "未闭环"],
      ["路段覆盖", `${coverage.covered}/${coverage.expected}`],
      ["本地凭证", coverage.local.join("、") || "暂无"],
      [],
      ["处理节点", "处理人", "状态", "时间"],
      ...ensureTimeline(claim).map((item) => [item.step, item.actor, item.status, item.at]),
      [],
      ["日期", "类型", "商户/承运方", "路线", "班次", "金额", "状态"],
      ...claim.items.map((item) => [
        item.date || "",
        item.category || "其他",
        item.vendor || "",
        item.route || "",
        item.flight_or_train_no || "",
        item.amount || 0,
        item.status || "已识别",
      ]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${archive.archiveNo}-${claim.title || "凭证包"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function openPack(claimId) {
    const claim = state.submittedClaims.find((item) => item.id === claimId);
    if (!claim) return;
    const modal = document.querySelector(`#${MODAL_ID}`);
    const coverage = routeCoverage(claim);
    const archive = ensureArchiveInfo(claim);
    const paid = claim.status === "已付款";

    modal.innerHTML = `
      <div class="finance-pack-dialog" role="dialog" aria-modal="true" aria-label="凭证包详情">
        <div class="finance-pack-head">
          <div>
            <span class="label">${paid ? "已付款凭证包" : "财务复核凭证包"}</span>
            <h2>${claim.title}</h2>
            <p>${archive.archiveNo} · ${coverage.route} · ${claim.count} 张票据 · ${money(claim.total)}</p>
            ${paid ? '<span class="pack-status-line">报销闭环已完成 · 已入账 · 可归档</span>' : ""}
          </div>
          <div class="finance-pack-actions">
            <button class="secondary-button" type="button" data-export-pack="${claim.id}">导出凭证包</button>
            <button class="secondary-button" type="button" data-close-pack>关闭</button>
          </div>
        </div>
        <div class="finance-pack-body">
          <section class="finance-pack-section">
            <h3>财务摘要</h3>
            <div class="finance-pack-metrics">
              <div><span>行程闭环</span><strong>${coverage.closed ? "已闭环" : "未闭环"}</strong></div>
              <div><span>路段覆盖</span><strong>${coverage.covered}/${coverage.expected}</strong></div>
              <div><span>风险项</span><strong>${riskCount(claim)}</strong></div>
              <div><span>会计入账</span><strong>${archive.accountingStatus}</strong></div>
            </div>
            <div class="soft-note" style="margin-top: 14px;">本地凭证：${coverage.local.length ? coverage.local.join("、") : "暂无"}</div>
          </section>
          <section class="finance-pack-section">
            <h3>处理记录</h3>
            ${renderTimelineRows(claim)}
          </section>
          <section class="finance-pack-section" style="grid-column: 1 / -1;">
            <h3>票据明细</h3>
            <table class="voucher-pack-table">
              <thead><tr><th>日期</th><th>类型</th><th>商户/路线</th><th>金额</th><th>状态</th></tr></thead>
              <tbody>${renderVoucherRows(claim)}</tbody>
            </table>
          </section>
        </div>
      </div>
    `;
    modal.classList.add("open");
  }

  function installModal() {
    if (document.querySelector(`#${MODAL_ID}`)) return;
    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "finance-pack-modal";
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-close-pack]")) {
        modal.classList.remove("open");
      }
    });
  }

  function renderClaimCard(claim, label, primaryAction) {
    ensureTimeline(claim);
    const archive = ensureArchiveInfo(claim);
    const isPaid = claim.status === "已付款";
    const action = primaryAction
      ? `<button class="primary-button" type="button" ${primaryAction.attr}>${primaryAction.text}</button>`
      : "";
    const detailText = isPaid ? "查看凭证包" : "查看明细";
    return `
      <article class="queue-card">
        <div>
          <span class="label">${label}</span>
          <h2>${claim.title}</h2>
          <p>${claim.count} 张票据，合计 ${money(claim.total)}</p>
          <div class="archive-strip">
            <span><strong>归档号</strong>${archive.archiveNo}</span>
            <span><strong>入账</strong>${archive.accountingStatus}</span>
            <span class="${isPaid ? "ready" : ""}"><strong>凭证包</strong>${isPaid ? "可归档" : "处理中"}</span>
          </div>
          <div class="audit-trail">
            ${ensureTimeline(claim)
              .map((item) => `<span><strong>${item.step}</strong>${item.actor} · ${item.status} · ${item.at}</span>`)
              .join("")}
          </div>
        </div>
        <div class="action-group">
          <button class="secondary-button" type="button" data-detail-claim="${claim.id}">${detailText}</button>
          ${action}
        </div>
      </article>
    `;
  }

  window.renderFinanceView = function renderFinanceViewWithPack() {
    const reviewClaims = state.submittedClaims.filter((claim) => claim.status === "待财务复核");
    const paymentClaims = state.submittedClaims.filter((claim) => claim.status === "待出纳付款" || claim.status === "已复核待付款");
    const paidClaims = state.submittedClaims.filter((claim) => claim.status === "已付款");
    const activeClaims = [...reviewClaims, ...paymentClaims];
    const monthTotal = [...activeClaims, ...paidClaims].reduce((sum, claim) => sum + claim.total, 0);
    const itemCount = activeClaims.reduce((sum, claim) => sum + claim.items.length, 0);
    const risky = activeClaims.reduce((sum, claim) => sum + riskCount(claim), 0);

    document.querySelector("#financePendingCount").textContent = String(activeClaims.length);
    document.querySelector("#financeTotalAmount").textContent = money(monthTotal);
    document.querySelector("#financeRiskRate").textContent = itemCount ? `${Math.round((risky / itemCount) * 100)}%` : "0%";

    if (!activeClaims.length && !paidClaims.length) {
      financeList.innerHTML = `
        <div class="empty-state compact">
          <h2>暂无待复核报销</h2>
          <p>主管同意后会出现在这里。</p>
        </div>
      `;
      return;
    }

    financeList.innerHTML = [
      ...reviewClaims.map((claim) => renderClaimCard(claim, "待财务复核", { text: "标记已复核", attr: `data-review-claim="${claim.id}"` })),
      ...paymentClaims.map((claim) => renderClaimCard(claim, "待出纳付款", { text: "确认付款", attr: `data-pay-claim="${claim.id}"` })),
      ...paidClaims.map((claim) => renderClaimCard(claim, "已付款", null)),
    ].join("");
  };

  document.addEventListener("click", (event) => {
    const detailButton = event.target.closest("[data-detail-claim]");
    if (detailButton) {
      openPack(detailButton.dataset.detailClaim);
      return;
    }

    const exportButton = event.target.closest("[data-export-pack]");
    if (exportButton) {
      const claim = state.submittedClaims.find((item) => item.id === exportButton.dataset.exportPack);
      if (claim) exportVoucherPack(claim);
    }
  });

  installStyle();
  installModal();
  if (typeof renderFinanceView === "function") renderFinanceView();
})();
