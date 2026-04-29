const state = {
  files: [],
  draftItems: [],
  claimStatus: "idle",
  submittedClaims: [],
  analyzed: false,
};

const fileInput = document.querySelector("#receiptInput");
const dropzone = document.querySelector("#dropzone");
const fileList = document.querySelector("#fileList");
const analyzeBtn = document.querySelector("#analyzeBtn");
const thinkingState = document.querySelector("#thinkingState");
const aiResult = document.querySelector("#aiResult");
const draftSection = document.querySelector("#draftSection");
const expenseRows = document.querySelector("#expenseRows");
const aiSourceBadge = document.querySelector("#aiSourceBadge");
const toast = document.querySelector("#toast");
const loginStrip = document.querySelector("#loginStrip");
const loginTitle = document.querySelector("#loginTitle");
const loginSubtitle = document.querySelector("#loginSubtitle");
const loginBtn = document.querySelector("#loginBtn");
const draftsView = document.querySelector("#draftsView");
const approvalsView = document.querySelector("#approvalsView");
const financeList = document.querySelector("#financeList");
const aiDebugOutput = document.querySelector("#aiDebugOutput");
const runAiDebugBtn = document.querySelector("#runAiDebugBtn");
const primaryBaseCity = document.querySelector("#primaryBaseCity");
const secondaryBaseCity = document.querySelector("#secondaryBaseCity");
let lastAiResult = null;

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function renderFiles() {
  fileList.innerHTML = "";

  state.files.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "file-item";
    const status = state.draftItems[index]?.status || "待识别";
    item.innerHTML = `
      <div>
        <strong>${file.name}</strong>
        <p>${getFileKind(file)} · ${(file.size / 1024).toFixed(1)} KB · ${status}</p>
      </div>
      <button class="secondary-button" type="button" data-remove="${index}">移除</button>
    `;
    fileList.appendChild(item);
  });

  analyzeBtn.disabled = state.files.length === 0;
}

function addFiles(files) {
  const nextFiles = Array.from(files);
  state.files = [...state.files, ...nextFiles];
  state.claimStatus = "uploaded";
  renderFiles();
  if (nextFiles.length > 0) {
    showToast(`已加入 ${nextFiles.length} 张票据`);
  }
}

function renderDraft() {
  const total = state.draftItems.reduce((sum, item) => sum + item.amount, 0);
  document.querySelector("#receiptCount").textContent = String(state.files.length);
  document.querySelector("#totalAmount").textContent = formatCurrency(total);
  document.querySelector("#riskCount").textContent = String(getRiskCount());
  document.querySelector("#completenessText").textContent = getCompletenessText();

  expenseRows.innerHTML = state.draftItems
    .map((item, index) => {
      const statusClass = item.status.includes("需") ? "warn" : "ok";
      return `
        <tr>
          <td>
            <input class="cell-input" data-field="date" data-index="${index}" value="${item.date}" />
            ${renderInvoiceDateNote(item)}
          </td>
          <td>
            <select class="cell-select" data-field="category" data-index="${index}">
              ${renderCategoryOptions(item.category)}
            </select>
          </td>
          <td>
            <input class="cell-input" data-field="vendor" data-index="${index}" value="${item.vendor}" />
            ${renderTravelNote(item)}
          </td>
          <td><input class="cell-input" data-field="amount" data-index="${index}" type="number" min="0" step="1" value="${item.amount}" /></td>
          <td>
            <span class="${statusClass}">${item.status}</span>
            <button class="text-button" type="button" data-remove-item="${index}">删除</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function analyzeReceipts() {
  state.claimStatus = "analyzing";
  state.draftItems = [];
  renderFiles();
  thinkingState.classList.add("working");
  thinkingState.classList.remove("hidden");
  aiResult.classList.add("hidden");
  draftSection.classList.add("hidden");
  thinkingState.querySelector("strong").textContent = "正在还原行程";
  thinkingState.querySelector("span").textContent = "识别票据、匹配审批、整理草稿";
  analyzeBtn.disabled = true;

  try {
    const result = await analyzeFiles(state.files);
    thinkingState.classList.add("hidden");
    aiResult.classList.remove("hidden");
    draftSection.classList.remove("hidden");
    applyAnalysisResult(result);
    state.claimStatus = "ready";
    state.analyzed = true;
    renderDraft();
    renderFiles();
    renderDraftsView();
    showToast(result.source === "mock" ? "已生成模拟草稿" : "AI 已生成报销草稿");
  } catch (error) {
    state.draftItems = createDraftItems(state.files);
    thinkingState.classList.add("hidden");
    aiResult.classList.remove("hidden");
    draftSection.classList.remove("hidden");
    state.claimStatus = "ready";
    state.analyzed = true;
    renderDraft();
    renderFiles();
    renderDraftsView();
    setAiSource("本地模拟", error.message || "AI 接口暂不可用");
    showToast("AI 接口暂不可用，已使用本地模拟结果");
  } finally {
    analyzeBtn.disabled = state.files.length === 0;
  }
}

fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files);
  fileInput.value = "";
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragging");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragging");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragging");
  addFiles(event.dataTransfer.files);
});

fileList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  const index = Number(button.dataset.remove);
  state.files.splice(index, 1);
  state.draftItems.splice(index, 1);
  renderFiles();
  renderDraft();
});

analyzeBtn.addEventListener("click", analyzeReceipts);

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll("[data-view-panel]").forEach((panel) => panel.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`[data-view-panel="${view}"]`).classList.add("active");
  });
});

document.querySelector("#syncFeishuBtn").addEventListener("click", () => {
  showToast("已模拟同步飞书出差审批");
});

loginBtn.addEventListener("click", () => {
  loginWithFeishu();
});

document.querySelector("#submitDraftBtn").addEventListener("click", () => {
  if (!state.draftItems.length) {
    showToast("请先生成报销草稿");
    return;
  }

  const total = state.draftItems.reduce((sum, item) => sum + item.amount, 0);
  const claim = {
    id: `claim-${Date.now()}`,
    title: document.querySelector("#tripTitle").textContent,
    total,
    count: state.draftItems.length,
    items: state.draftItems.map((item) => ({ ...item })),
    status: "待主管审批",
  };
  state.submittedClaims.unshift(claim);
  state.claimStatus = "submitted";
  renderDraftsView();
  renderApprovalsView();
  renderFinanceView();
  showToast("已提交审批");
});

document.querySelector("#editDraftBtn").addEventListener("click", () => {
  showToast("明细编辑会在下一版接入");
});

expenseRows.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-item]");
  if (!button) return;

  const index = Number(button.dataset.removeItem);
  state.draftItems.splice(index, 1);
  renderDraft();
  renderDraftsView();
  showToast("已删除该明细");
});

expenseRows.addEventListener("change", (event) => {
  const field = event.target.dataset.field;
  const index = Number(event.target.dataset.index);
  if (!field || Number.isNaN(index) || !state.draftItems[index]) return;

  state.draftItems[index][field] = field === "amount" ? Number(event.target.value || 0) : event.target.value;
  renderDraft();
  renderDraftsView();
});

approvalsView.addEventListener("click", (event) => {
  const approveButton = event.target.closest("[data-approve-claim]");
  if (!approveButton) return;

  const claim = state.submittedClaims.find((item) => item.id === approveButton.dataset.approveClaim);
  if (!claim) return;

  claim.status = "待财务复核";
  renderDraftsView();
  renderApprovalsView();
  renderFinanceView();
  showToast("主管已同意，已进入财务复核");
});

financeList.addEventListener("click", (event) => {
  const reviewButton = event.target.closest("[data-review-claim]");
  if (!reviewButton) return;

  const claim = state.submittedClaims.find((item) => item.id === reviewButton.dataset.reviewClaim);
  if (!claim) return;

  claim.status = "已复核待付款";
  renderDraftsView();
  renderApprovalsView();
  renderFinanceView();
  showToast("财务已复核，进入待付款");
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  const claimRows = state.submittedClaims.flatMap((claim) =>
    claim.items.map((item) => [
      claim.id,
      claim.title,
      claim.status,
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
    item.date,
    item.invoice_date || "",
    item.category,
    item.vendor,
    item.amount,
    item.status,
  ]);
  const rows = [["报销单", "标题", "单据状态", "费用/行程日期", "开票日期", "费用类型", "商户", "金额", "明细状态"], ...claimRows, ...draftRows];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "expense-ledger.csv";
  link.click();
  URL.revokeObjectURL(url);
});

runAiDebugBtn.addEventListener("click", async () => {
  aiDebugOutput.textContent = "正在测试 Kimi 文本接口...";
  try {
    const [statusRes, testRes] = await Promise.all([fetch("/api/ai-status"), fetch("/api/ai-test")]);
    const status = await statusRes.json();
    const test = await testRes.json();
    aiDebugOutput.textContent = JSON.stringify(
      {
        status,
        textTest: test,
        lastReceiptAnalysis: lastAiResult
          ? {
              source: lastAiResult.source,
              aiError: lastAiResult.aiError || "",
              itemCount: Array.isArray(lastAiResult.items) ? lastAiResult.items.length : 0,
            }
          : null,
      },
      null,
      2,
    );
  } catch (error) {
    aiDebugOutput.textContent = error.message || "AI 调试失败";
  }
});

async function loginWithFeishu() {
  try {
    setLoginState("warning", "正在连接飞书身份", "请在飞书客户端内完成授权。");

    const configRes = await fetch("/api/feishu-config");
    const config = await configRes.json();

    if (!config.enabled || !config.appId) {
      setLoginState("warning", "免登录未配置", "请先在 Vercel 配置 FEISHU_APP_ID 和 FEISHU_APP_SECRET。");
      return;
    }

    const code = await requestFeishuCode(config.appId);
    const loginRes = await fetch("/api/feishu-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await loginRes.json();

    if (!loginRes.ok) {
      throw new Error(data.error || "飞书免登录失败");
    }

    const name = data.user?.name || data.user?.enName || "当前员工";
    setLoginState("connected", `已识别：${name}`, "后续会自动带入报销人和部门信息。");
    showToast("飞书免登录成功");
  } catch (error) {
    setLoginState("warning", "免登录失败", error.message || "请确认在飞书客户端内打开。");
  }
}

function requestFeishuCode(appId) {
  return new Promise((resolve, reject) => {
    const ttApi = window.tt;

    if (!ttApi) {
      reject(new Error("未检测到飞书 JSAPI，请在飞书客户端内打开。"));
      return;
    }

    if (typeof ttApi.requestAccess === "function") {
      ttApi.requestAccess({
        appID: appId,
        scopeList: [],
        success: (res) => resolve(res.code),
        fail: (err) => reject(new Error(JSON.stringify(err))),
      });
      return;
    }

    if (typeof ttApi.requestAuthCode === "function") {
      ttApi.requestAuthCode({
        appId,
        success: (res) => resolve(res.code),
        fail: (err) => reject(new Error(JSON.stringify(err))),
      });
      return;
    }

    reject(new Error("当前飞书客户端不支持免登录 JSAPI。"));
  });
}

function setLoginState(type, title, subtitle) {
  loginStrip.classList.remove("connected", "warning");
  if (type) loginStrip.classList.add(type);
  loginTitle.textContent = title;
  loginSubtitle.textContent = subtitle;
}

async function analyzeFiles(files) {
  const payloadFiles = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      dataUrl: await readFileAsDataUrl(file),
    })),
  );

  const response = await fetch("/api/receipts/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: payloadFiles,
      travelBase: getTravelBase(),
    }),
  });
  const data = await response.json();
  lastAiResult = data;

  if (!response.ok && !data.fallback) {
    throw new Error(data.error || "AI analysis failed");
  }

  if (!response.ok && data.fallback) {
    return {
      ...data.fallback,
      source: "mock",
      aiError: data.error || "AI analysis failed",
    };
  }

  return data;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function applyAnalysisResult(result) {
  setAiSource(getSourceLabel(result.source), result.aiError || "");

  const trip = result.trip || {};
  const routeInsight = buildRouteInsight(trip);
  if (result.suggestedTitle) {
    document.querySelector("#tripTitle").textContent = result.suggestedTitle;
  } else if (trip.from_city || trip.to_city) {
    document.querySelector("#tripTitle").textContent = `${trip.from_city || "出发地"}至${trip.to_city || "目的地"}差旅报销`;
  }

  if (result.summary) {
    document.querySelector("#tripSummary").textContent = result.summary;
  }
  document.querySelector("#routeInsight").textContent = routeInsight;

  const items = Array.isArray(result.items) ? result.items : [];
  state.draftItems = items.length ? items.map(normalizeDraftItem) : createDraftItems(state.files);
}

function getTravelBase() {
  return {
    primary: primaryBaseCity.value,
    secondary: secondaryBaseCity.value,
  };
}

function buildRouteInsight(trip) {
  const base = trip.base_city || getTravelBase().primary || "常驻地";
  const routePath = Array.isArray(trip.route_path) ? trip.route_path.filter(Boolean) : [];
  const routeText = routePath.length ? routePath.join(" → ") : `${trip.from_city || base} → ${trip.to_city || "目的地"}`;

  if (trip.is_closed_loop) {
    return `闭环行程 · ${routeText}`;
  }

  if (routePath.length > 1 || trip.from_city || trip.to_city) {
    return `开放行程 · ${routeText} · 可继续补充返程票据`;
  }

  return `以 ${base} 作为出发地判断行程`;
}

function setAiSource(source, detail = "") {
  aiSourceBadge.textContent = detail ? `${source} · 已兜底` : source;
  aiSourceBadge.title = detail;
}

function getSourceLabel(source) {
  if (source === "kimi") return "Kimi";
  if (source === "volcengine") return "火山方舟";
  if (source === "mock") return "模拟兜底";
  return "AI";
}

function normalizeDraftItem(item, index) {
  return {
    date: item.date || `2026-04-${String(8 + Math.min(index, 2)).padStart(2, "0")}`,
    invoice_date: item.invoice_date || item.invoiceDate || "",
    category: item.category || "其他",
    vendor: item.vendor || "待确认商户",
    route: item.route || "",
    flight_or_train_no: item.flight_or_train_no || item.flightNo || item.trainNo || "",
    amount: Number(item.amount || 0),
    status: item.status || (item.confidence && item.confidence < 0.7 ? "需确认" : "AI 已识别"),
  };
}

function renderInvoiceDateNote(item) {
  if (!item.invoice_date || item.invoice_date === item.date) return "";
  return `<div class="date-note">开票：${item.invoice_date}</div>`;
}

function renderTravelNote(item) {
  const parts = [item.route, item.flight_or_train_no].filter(Boolean);
  if (!parts.length) return "";
  return `<div class="date-note">${parts.join(" · ")}</div>`;
}

function renderCategoryOptions(selected) {
  return ["机票", "火车票", "住宿", "本地交通", "餐饮", "办公", "其他"]
    .map((category) => `<option value="${category}" ${category === selected ? "selected" : ""}>${category}</option>`)
    .join("");
}

function createDraftItems(files) {
  const templates = [
    { category: "机票", vendor: "航空行程单", amount: 1280, status: "已匹配审批" },
    { category: "本地交通", vendor: "出行平台", amount: 146, status: "自动分类" },
    { category: "住宿", vendor: "酒店住宿", amount: 560, status: "已匹配审批" },
    { category: "餐饮", vendor: "餐饮商户", amount: 276, status: "需补充说明" },
    { category: "其他", vendor: "其他费用", amount: 88, status: "需确认" },
  ];

  return files.map((file, index) => {
    const template = templates[index % templates.length];
    return {
      date: `2026-04-${String(8 + Math.min(index, 2)).padStart(2, "0")}`,
      category: inferCategory(file.name, template.category),
      vendor: inferVendor(file.name, template.vendor),
      amount: template.amount + index * 18,
      status: template.status,
    };
  });
}

function inferCategory(fileName, fallback) {
  const name = fileName.toLowerCase();
  if (name.includes("hotel") || name.includes("酒店") || name.includes("住宿")) return "住宿";
  if (name.includes("taxi") || name.includes("didi") || name.includes("打车")) return "本地交通";
  if (name.includes("flight") || name.includes("机票") || name.includes("行程")) return "机票";
  if (name.includes("餐") || name.includes("food")) return "餐饮";
  return fallback;
}

function inferVendor(fileName, fallback) {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim();
  return base ? `${fallback} · ${base.slice(0, 18)}` : fallback;
}

function getFileKind(file) {
  if (file.type.includes("pdf")) return "PDF";
  if (file.type.includes("image")) return "图片";
  return "文件";
}

function getRiskCount() {
  return state.draftItems.filter((item) => item.status.includes("需")).length;
}

function getCompletenessText() {
  const categories = new Set(state.draftItems.map((item) => item.category));
  const missing = ["住宿", "本地交通", "餐饮"].filter((category) => !categories.has(category));
  if (!missing.length) return "行程费用较完整。如还有其他票据，也可以继续补充。";
  return `可能还缺少${missing.join("、")}票据；这只是提醒，不影响提交。`;
}

function renderDraftsView() {
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
          </div>
        </article>
      `,
    )
    .join("");

  draftsView.innerHTML = `<div class="queue-list">${currentDraft}${submitted}</div>`;
}

function renderApprovalsView() {
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
}

function renderFinanceView() {
  const claims = state.submittedClaims.filter((claim) => claim.status === "待财务复核");
  const reviewedClaims = state.submittedClaims.filter((claim) => claim.status === "已复核待付款");
  const total = claims.reduce((sum, claim) => sum + claim.total, 0);
  const totalItems = claims.reduce((sum, claim) => sum + claim.items.length, 0);
  const riskyItems = claims.reduce(
    (sum, claim) => sum + claim.items.filter((item) => item.status.includes("需")).length,
    0,
  );

  document.querySelector("#financePendingCount").textContent = String(claims.length);
  document.querySelector("#financeTotalAmount").textContent = formatCurrency(total);
  document.querySelector("#financeRiskRate").textContent = totalItems ? `${Math.round((riskyItems / totalItems) * 100)}%` : "0%";

  if (!claims.length && !reviewedClaims.length) {
    financeList.innerHTML = `
      <div class="empty-state compact">
        <h2>暂无待复核报销</h2>
        <p>主管同意后会出现在这里。</p>
      </div>
    `;
    return;
  }

  const pendingHtml = claims
    .map(
      (claim) => `
        <article class="queue-card">
          <div>
            <span class="label">待财务复核</span>
            <h2>${claim.title}</h2>
            <p>${claim.count} 张票据，合计 ${formatCurrency(claim.total)}</p>
          </div>
          <div class="action-group">
            <button class="secondary-button" type="button">查看明细</button>
            <button class="primary-button" type="button" data-review-claim="${claim.id}">标记已复核</button>
          </div>
        </article>
      `,
    )
    .join("");

  const reviewedHtml = reviewedClaims
    .map(
      (claim) => `
        <article class="queue-card">
          <div>
            <span class="label">已复核待付款</span>
            <h2>${claim.title}</h2>
            <p>${claim.count} 张票据，合计 ${formatCurrency(claim.total)}</p>
          </div>
          <div class="action-group">
            <button class="secondary-button" type="button">查看明细</button>
          </div>
        </article>
      `,
    )
    .join("");

  financeList.innerHTML = `${pendingHtml}${reviewedHtml}`;
}
