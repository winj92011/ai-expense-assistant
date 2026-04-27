const state = {
  files: [],
  analyzed: false,
};

const sampleItems = [
  {
    date: "2026-04-08",
    category: "机票",
    vendor: "中国东方航空",
    amount: 1280,
    status: "已匹配审批",
  },
  {
    date: "2026-04-08",
    category: "本地交通",
    vendor: "滴滴出行",
    amount: 146,
    status: "自动分类",
  },
  {
    date: "2026-04-08",
    category: "餐饮",
    vendor: "上海某餐饮管理有限公司",
    amount: 576,
    status: "需补充说明",
  },
  {
    date: "2026-04-08",
    category: "住宿",
    vendor: "上海虹桥商务酒店",
    amount: 1560,
    status: "已匹配审批",
  },
  {
    date: "2026-04-10",
    category: "机票",
    vendor: "中国国际航空",
    amount: 724,
    status: "已匹配审批",
  },
];

const fileInput = document.querySelector("#receiptInput");
const dropzone = document.querySelector("#dropzone");
const fileList = document.querySelector("#fileList");
const analyzeBtn = document.querySelector("#analyzeBtn");
const thinkingState = document.querySelector("#thinkingState");
const aiResult = document.querySelector("#aiResult");
const draftSection = document.querySelector("#draftSection");
const expenseRows = document.querySelector("#expenseRows");
const toast = document.querySelector("#toast");

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
    item.innerHTML = `
      <div>
        <strong>${file.name}</strong>
        <p>${(file.size / 1024).toFixed(1)} KB</p>
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
  renderFiles();
  if (nextFiles.length > 0) {
    showToast(`已加入 ${nextFiles.length} 张票据`);
  }
}

function renderDraft() {
  const total = sampleItems.reduce((sum, item) => sum + item.amount, 0);
  document.querySelector("#receiptCount").textContent = String(Math.max(state.files.length, 5));
  document.querySelector("#totalAmount").textContent = formatCurrency(total);
  document.querySelector("#riskCount").textContent = "1";
  document.querySelector("#completenessText").textContent =
    "已识别交通、住宿、餐饮票据。若还有本地交通、客户拜访餐饮或其他费用，可以继续补充；不补充也可以提交。";

  expenseRows.innerHTML = sampleItems
    .map((item) => {
      const statusClass = item.status.includes("需") ? "warn" : "ok";
      return `
        <tr>
          <td>${item.date}</td>
          <td>${item.category}</td>
          <td>${item.vendor}</td>
          <td>${formatCurrency(item.amount)}</td>
          <td><span class="${statusClass}">${item.status}</span></td>
        </tr>
      `;
    })
    .join("");
}

function analyzeReceipts() {
  thinkingState.classList.add("working");
  thinkingState.querySelector("strong").textContent = "正在还原行程";
  thinkingState.querySelector("span").textContent = "识别票据字段、匹配出差审批、生成报销草稿";
  analyzeBtn.disabled = true;

  window.setTimeout(() => {
    thinkingState.classList.add("hidden");
    aiResult.classList.remove("hidden");
    draftSection.classList.remove("hidden");
    state.analyzed = true;
    renderDraft();
    showToast("AI 已生成报销草稿");
  }, 1100);
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
  renderFiles();
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

document.querySelector("#submitDraftBtn").addEventListener("click", () => {
  showToast("已模拟推送飞书审批卡片");
});

document.querySelector("#editDraftBtn").addEventListener("click", () => {
  showToast("明细编辑会在下一版接入");
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  const rows = [["日期", "费用类型", "商户", "金额", "状态"], ...sampleItems.map((item) => [
    item.date,
    item.category,
    item.vendor,
    item.amount,
    item.status,
  ])];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "expense-ledger.csv";
  link.click();
  URL.revokeObjectURL(url);
});
