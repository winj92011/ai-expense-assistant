(function () {
  const storageKey = "ai-expense-travel-base";
  const primary = document.querySelector("#primaryBaseCity");
  const secondary = document.querySelector("#secondaryBaseCity");
  const insight = document.querySelector("#routeInsight");

  if (!primary || !secondary || !insight) return;

  const style = document.createElement("style");
  style.textContent = `
    .route-insight.closed { background: #eefbf6; color: var(--green); }
    .route-insight.open { background: #fff8ef; color: var(--amber); }
    .route-insight.base { background: #ffffff; color: var(--blue); }
    .completeness-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .compact-button { min-height: 34px; padding: 0 12px; font-size: 13px; }
    .test-trip-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      margin-top: 12px;
      padding: 10px;
      border: 1px dashed #bfd5ff;
      border-radius: 8px;
      background: #f8fbff;
    }
    .test-trip-panel select {
      min-height: 36px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #ffffff;
      color: var(--ink);
      padding: 0 10px;
    }
    .route-breakdown {
      display: grid;
      gap: 10px;
      margin-top: 14px;
      margin-bottom: 12px;
    }
    .route-segment {
      display: grid;
      gap: 8px;
      padding: 12px;
      border: 1px solid #d7e6ff;
      border-radius: 8px;
      background: #f8fbff;
    }
    .route-segment-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: var(--ink);
      font-weight: 800;
    }
    .route-segment-head span {
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }
    .route-segment-status {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
    }
    .route-segment-status.covered {
      background: #ecfdf5;
      color: var(--green);
    }
    .route-segment-status.missing {
      background: #fff7ed;
      color: var(--amber);
    }
    .route-segment-items {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .route-segment-items span {
      padding: 5px 8px;
      border-radius: 999px;
      background: #ffffff;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }
    @media (max-width: 560px) { .test-trip-panel { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);

  function optionExists(select, value) {
    return Boolean(value && select.querySelector(`option[value="${value}"]`));
  }

  function currentBase() {
    return {
      primary: primary.value || "北京",
      secondary: secondary.value || "",
    };
  }

  function setInsight(text) {
    insight.classList.remove("closed", "open", "base");
    if (text.includes("闭环行程")) {
      insight.classList.add("closed");
    } else if (text.includes("开放行程")) {
      insight.classList.add("open");
    } else {
      insight.classList.add("base");
    }
  }

  function saveBase() {
    const base = currentBase();
    if (base.secondary === base.primary) {
      secondary.value = "";
      base.secondary = "";
    }
    localStorage.setItem(storageKey, JSON.stringify(base));
    insight.textContent = base.secondary
      ? `以 ${base.primary} / ${base.secondary} 判断行程闭环`
      : `以 ${base.primary} 判断行程闭环`;
    setInsight(insight.textContent);
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    if (optionExists(primary, saved.primary)) primary.value = saved.primary;
    if (optionExists(secondary, saved.secondary)) secondary.value = saved.secondary;
  } catch {
    localStorage.removeItem(storageKey);
  }

  primary.addEventListener("change", saveBase);
  secondary.addEventListener("change", saveBase);
  new MutationObserver(() => setInsight(insight.textContent)).observe(insight, {
    childList: true,
    characterData: true,
    subtree: true,
  });
  setInsight(insight.textContent);
})();

(() => {
  let latestTrip = null;
  let latestItems = [];

  const originalApplyAnalysisResult = window.applyAnalysisResult;
  const originalRenderDraft = window.renderDraft;

  if (typeof originalApplyAnalysisResult !== "function" || typeof originalRenderDraft !== "function") return;

  function money(value) {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function getSegments(trip) {
    const path = Array.isArray(trip?.route_path) ? trip.route_path.filter(Boolean) : [];
    if (path.length < 2) return [];

    return path.slice(0, -1).map((from, index) => ({
      from,
      to: path[index + 1],
      label: `${from} → ${path[index + 1]}`,
      items: [],
    }));
  }

  function attachItems(segments, items) {
    items.forEach((item) => {
      const route = item.route || "";
      const match = segments.find((segment) => route.includes(segment.from) && route.includes(segment.to));

      if (match) {
        match.items.push(item);
        return;
      }

      if (item.category === "住宿" || item.category === "本地交通" || item.category === "餐饮") {
        const cityMatch = segments.find((segment) => item.vendor?.includes(segment.to));
        (cityMatch || segments[0])?.items.push(item);
      }
    });

    return segments;
  }

  function hasTransit(item) {
    return ["机票", "火车票", "高铁票", "交通"].includes(item.category) && Boolean(item.route);
  }

  function getSegmentStatus(segment) {
    const covered = segment.items.some(hasTransit);
    return covered
      ? { label: "已覆盖", className: "covered" }
      : { label: "建议补充交通票", className: "missing" };
  }

  function renderRouteBreakdown() {
    document.querySelector(".route-breakdown")?.remove();

    const tableWrap = document.querySelector(".table-wrap");
    const segments = attachItems(getSegments(latestTrip), latestItems);
    if (!tableWrap || !segments.length) return;

    const view = document.createElement("div");
    view.className = "route-breakdown";
    view.innerHTML = segments
      .map((segment) => {
        const total = segment.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const status = getSegmentStatus(segment);
        const itemText = segment.items.length
          ? segment.items.map((item) => `<span>${item.category} · ${item.vendor}</span>`).join("")
          : "<span>待补充票据</span>";
        return `
          <article class="route-segment">
            <div class="route-segment-head">
              <strong>${segment.label}</strong>
              <span>${segment.items.length} 项 · ${money(total)}</span>
            </div>
            <div class="route-segment-status ${status.className}">${status.label}</div>
            <div class="route-segment-items">${itemText}</div>
          </article>
        `;
      })
      .join("");

    tableWrap.insertAdjacentElement("beforebegin", view);
  }

  window.applyAnalysisResult = function patchedRouteApplyAnalysisResult(result) {
    latestTrip = result?.trip || null;
    latestItems = Array.isArray(result?.items) ? result.items : [];
    return originalApplyAnalysisResult(result);
  };

  window.renderDraft = function patchedRouteRenderDraft() {
    const output = originalRenderDraft();
    renderRouteBreakdown();
    return output;
  };
})();

(() => {
  const uploadPanel = document.querySelector(".upload-panel");
  const basePicker = document.querySelector(".base-picker");
  const thinkingState = document.querySelector("#thinkingState");
  const aiResult = document.querySelector("#aiResult");
  const draftSection = document.querySelector("#draftSection");

  if (
    !uploadPanel ||
    !basePicker ||
    typeof window.applyAnalysisResult !== "function" ||
    typeof window.renderDraft !== "function" ||
    typeof window.renderFiles !== "function" ||
    typeof window.renderDraftsView !== "function"
  ) {
    return;
  }

  const panel = document.createElement("div");
  panel.className = "test-trip-panel";
  panel.innerHTML = `
    <select aria-label="测试行程">
      <option value="closed">测试闭环：北京-上海-深圳-香港-北京</option>
      <option value="open">测试缺返程：北京-吉隆坡-重庆</option>
    </select>
    <button class="secondary-button compact-button" type="button">使用测试行程</button>
  `;
  basePicker.insertAdjacentElement("afterend", panel);

  const presetSelect = panel.querySelector("select");
  const presetButton = panel.querySelector("button");

  function buildPreset(type) {
    if (type === "closed") {
      return {
        source: "mock",
        suggestedTitle: "测试闭环：北京-上海-深圳-香港-北京",
        summary: "从北京出发，经上海、深圳、香港，最后回到北京；包含城际交通、本地交通、住宿和餐饮凭证。",
        trip: {
          from_city: "北京",
          to_city: "北京",
          base_city: "北京",
          route_path: ["北京", "上海", "深圳", "香港", "北京"],
          is_closed_loop: true,
        },
        completeness_suggestions: ["测试闭环已完整：北京出发并返回北京，城际交通、住宿、本地交通和餐饮凭证均已覆盖。"],
        items: [
          {
            date: "2026-04-08",
            category: "机票",
            vendor: "中国国际航空",
            route: "北京-上海",
            flight_or_train_no: "CA1501",
            amount: 1260,
            status: "测试行程",
          },
          {
            date: "2026-04-10",
            category: "机票",
            vendor: "东方航空",
            route: "上海-深圳",
            flight_or_train_no: "MU5331",
            amount: 1160,
            status: "测试行程",
          },
          {
            date: "2026-04-12",
            category: "火车票",
            vendor: "广深港高铁",
            route: "深圳-香港",
            flight_or_train_no: "G6511",
            amount: 75,
            status: "测试行程",
          },
          {
            date: "2026-04-14",
            category: "机票",
            vendor: "中国国际航空",
            route: "香港-北京",
            flight_or_train_no: "CA112",
            amount: 1980,
            status: "测试行程",
          },
          {
            date: "2026-04-08",
            category: "住宿",
            vendor: "上海静安商务酒店",
            amount: 680,
            status: "测试行程",
          },
          {
            date: "2026-04-11",
            category: "住宿",
            vendor: "深圳南山商务酒店",
            amount: 620,
            status: "测试行程",
          },
          {
            date: "2026-04-12",
            category: "本地交通",
            vendor: "深圳出租车",
            amount: 86,
            status: "测试行程",
          },
          {
            date: "2026-04-13",
            category: "餐饮",
            vendor: "香港客户工作餐",
            amount: 312,
            status: "测试行程",
          },
        ],
      };
    }

    return {
      source: "mock",
      suggestedTitle: "北京-吉隆坡-重庆差旅",
      summary: "当前仅识别到去程和中转段，未形成返回北京的闭环。",
      trip: {
        from_city: "北京",
        to_city: "重庆",
        base_city: "北京",
        route_path: ["北京", "吉隆坡", "重庆"],
        is_closed_loop: false,
      },
      completeness_suggestions: [
        "当前行程未形成闭环，可能缺少从重庆或后续目的地返回北京的返程交通票据；如确实无需补充，可点击已知晓后继续提交。",
      ],
      items: [
        {
          date: "2025-10-12",
          invoice_date: "2026-01-27",
          category: "机票",
          vendor: "上海华程西南国际旅行社有限公司",
          route: "吉隆坡-重庆",
          flight_or_train_no: "MF8688",
          amount: 2889,
          status: "测试行程",
        },
      ],
    };
  }

  presetButton.addEventListener("click", () => {
    thinkingState?.classList.add("hidden");
    aiResult?.classList.remove("hidden");
    draftSection?.classList.remove("hidden");

    window.applyAnalysisResult(buildPreset(presetSelect.value));
    window.renderDraft();
    window.renderFiles();
    window.renderDraftsView();
  });
})();

(() => {
  const originalApplyAnalysisResult = window.applyAnalysisResult;
  const originalGetCompletenessText = window.getCompletenessText;
  const fileInput = document.querySelector("#receiptInput");
  const submitButton = document.querySelector("#submitDraftBtn");
  const completenessBox = document.querySelector(".completeness-box");
  const completenessText = document.querySelector("#completenessText");
  const approvalNote = document.querySelector(".approval-card .soft-note");
  let suggestions = [];
  let acknowledged = false;

  if (
    typeof originalApplyAnalysisResult !== "function" ||
    typeof originalGetCompletenessText !== "function" ||
    !completenessBox ||
    !completenessText
  ) {
    return;
  }

  const actions = document.createElement("div");
  actions.className = "completeness-actions hidden";
  actions.innerHTML = `
    <button class="secondary-button compact-button" type="button" data-completeness-upload>继续上传票据</button>
    <button class="secondary-button compact-button" type="button" data-completeness-ack>已知晓</button>
  `;
  completenessBox.appendChild(actions);

  function shouldShowActions(text) {
    return /缺少|返程|补充|开放行程|未形成闭环/.test(text);
  }

  function acknowledgementText() {
    return "员工已确认：本次行程可能仍有未上传票据，仍继续提交当前报销。";
  }

  function refreshActions() {
    const text = completenessText.textContent || "";
    actions.classList.toggle("hidden", !shouldShowActions(text));
  }

  function updateApprovalNote() {
    if (!approvalNote) return;
    approvalNote.textContent = acknowledged
      ? acknowledgementText()
      : "如果本次行程还有未上传票据，可以继续补充；也可以先提交当前报销。";
  }

  function appendSubmittedAcknowledgement() {
    if (!acknowledged) return;
    const approvalCard = document.querySelector("#approvalsView .queue-card");
    if (!approvalCard || approvalCard.querySelector(".acknowledgement-note")) return;

    const note = document.createElement("p");
    note.className = "acknowledgement-note";
    note.textContent = acknowledgementText();
    approvalCard.querySelector("div")?.appendChild(note);
  }

  actions.addEventListener("click", (event) => {
    if (event.target.closest("[data-completeness-upload]")) {
      fileInput?.click();
      return;
    }

    if (event.target.closest("[data-completeness-ack]")) {
      acknowledged = true;
      completenessText.textContent = "已记录：本次行程可能仍有未上传票据，但不影响当前报销提交。";
      actions.classList.add("hidden");
      updateApprovalNote();
    }
  });

  submitButton?.addEventListener("click", () => {
    window.setTimeout(appendSubmittedAcknowledgement, 0);
  });

  window.applyAnalysisResult = function patchedApplyAnalysisResult(result) {
    acknowledged = false;
    suggestions = Array.isArray(result?.completeness_suggestions)
      ? result.completeness_suggestions.filter(Boolean)
      : [];
    updateApprovalNote();

    const output = originalApplyAnalysisResult(result);
    window.setTimeout(refreshActions, 0);
    return output;
  };

  window.getCompletenessText = function patchedGetCompletenessText() {
    if (suggestions.length) {
      return suggestions.join("；");
    }

    return originalGetCompletenessText();
  };
})();
