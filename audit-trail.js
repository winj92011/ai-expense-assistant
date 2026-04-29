(() => {
  const STYLE_ID = "audit-trail-style";

  function installStyle() {
    if (document.querySelector(`#${STYLE_ID}`)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .audit-trail {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

      .audit-trail span {
        display: inline-flex;
        gap: 6px;
        align-items: center;
        padding: 6px 8px;
        border-radius: 999px;
        background: #eef5ff;
        color: var(--muted);
        font-size: 12px;
      }

      .audit-trail strong {
        color: var(--ink);
      }
    `;
    document.head.appendChild(style);
  }

  function timeLabel() {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  }

  function ensureStep(claim, step, actor, status) {
    claim.timeline = claim.timeline || [];
    if (!claim.timeline.some((item) => item.step === step)) {
      claim.timeline.push({ step, actor, status, at: timeLabel() });
    }
  }

  function hydrateTimeline(claim) {
    ensureStep(claim, "员工提交", "吴经理", "已提交");
    if (["待财务复核", "待出纳付款", "已复核待付款", "已付款"].includes(claim.status)) {
      ensureStep(claim, "主管审批", "主管", "同意");
    }
    if (["待出纳付款", "已复核待付款", "已付款"].includes(claim.status)) {
      ensureStep(claim, "财务复核", "财务", "已复核");
    }
    if (claim.status === "已付款") {
      ensureStep(claim, "出纳付款", "出纳", "已付款");
    }
  }

  function hydrateAll() {
    state.submittedClaims.forEach(hydrateTimeline);
  }

  function auditTrail(claim) {
    hydrateTimeline(claim);
    return `
      <div class="audit-trail">
        ${(claim.timeline || [])
          .map((item) => `<span><strong>${item.step}</strong>${item.actor} · ${item.status} · ${item.at}</span>`)
          .join("")}
      </div>
    `;
  }

  function timelineText(claim) {
    hydrateTimeline(claim);
    return (claim.timeline || []).map((item) => `${item.step}/${item.actor}/${item.status}/${item.at}`).join(" | ");
  }

  window.renderDraftsView = function renderDraftsViewWithAudit() {
    hydrateAll();
    if (!state.draftItems.length && !state.submittedClaims.length) {
      draftsView.innerHTML = `
        <div class="empty-state">
          <h2>暂无草稿</h2>
          <p>上传票据后，AI 会在这里生成可编辑的报销单。</p>
        </div>
      `;
      return;
    }

    const currentDraft = state.draftItems.length
      ? `
        <article class="queue-card">
          <div>
            <span class="label">待确认草稿</span>
            <h2>${document.querySelector("#tripTitle").textContent}</h2>
            <p>${state.draftItems.length} 张票据，合计 ${formatCurrency(state.draftItems.reduce((sum, item) => sum + item.amount, 0))}</p>
          </div>
          <button class="secondary-button" type="button" data-view-draft>查看草稿</button>
        </article>
      `
      : "";

    const submitted = state.submittedClaims
      .map(
        (claim) => `
          <article class="queue-card">
            <div>
              <span class="label">${claim.status}</span>
              <h2>${claim.title}</h2>
              <p>${claim.count} 张票据，合计 ${formatCurrency(claim.total)}</p>
              ${auditTrail(claim)}
            </div>
          </article>
        `,
      )
      .join("");

    draftsView.innerHTML = `<div class="queue-list">${currentDraft}${submitted}</div>`;
  };

  window.renderApprovalsView = function renderApprovalsViewWithAudit() {
    hydrateAll();
    const pendingClaims = state.submittedClaims.filter((claim) => claim.status === "待主管审批");
    if (!pendingClaims.length) {
      approvalsView.innerHTML = `
        <div class="empty-state">
          <h2>暂无待处理审批</h2>
          <p>主管同意后，单据会流转到财务复核。</p>
        </div>
      `;
      return;
    }

    approvalsView.innerHTML = `
      <div class="queue-list">
        ${pendingClaims
          .map(
            (claim) => `
              <article class="queue-card">
                <div>
                  <span class="label">飞书卡片预览</span>
                  <h2>吴经理提交了 ${formatCurrency(claim.total)} 差旅报销</h2>
                  <p>${claim.title}，${claim.count} 张票据，${claim.items.filter((item) => item.status.includes("需")).length} 项需要确认。</p>
                  ${auditTrail(claim)}
                </div>
                <div class="action-group">
                  <button class="secondary-button" type="button">查看详情</button>
                  <button class="primary-button" type="button" data-approve-claim="${claim.id}">同意</button>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  };

  document.querySelector("#exportBtn").addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      hydrateAll();
      const claimRows = state.submittedClaims.flatMap((claim) =>
        claim.items.map((item) => [
          claim.id,
          claim.title,
          claim.status,
          timelineText(claim),
          item.date,
          item.invoice_date || "",
          item.category,
          item.vendor,
          item.amount,
          item.status,
        ]),
      );
      const draftRows = state.draftItems.map((item) => [
        "draft",
        document.querySelector("#tripTitle").textContent,
        "草稿",
        "",
        item.date,
        item.invoice_date || "",
        item.category,
        item.vendor,
        item.amount,
        item.status,
      ]);
      const rows = [
        ["报销单", "标题", "单据状态", "处理记录", "费用/行程日期", "开票日期", "费用类型", "商户", "金额", "明细状态"],
        ...claimRows,
        ...draftRows,
      ];
      const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "expense-ledger.csv";
      link.click();
      URL.revokeObjectURL(url);
    },
    true,
  );

  function loadFinancePack() {
    if (document.querySelector('script[src="./finance-pack.js"]')) return;
    const script = document.createElement("script");
    script.src = "./finance-pack.js";
    document.body.appendChild(script);
  }

  installStyle();
  hydrateAll();
  renderDraftsView();
  renderApprovalsView();
  loadFinancePack();
})();
