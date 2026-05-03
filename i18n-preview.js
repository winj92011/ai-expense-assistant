(() => {
  if (window.__i18nPreviewInstalled) return;
  window.__i18nPreviewInstalled = true;

  const languageSelect = document.querySelector("#interfaceLanguage");
  if (!languageSelect) return;

  const dictionary = {
    "zh-CN": {
      appName: "报销助理",
      appSubtitle: "员工报销入口",
      topTitle: "上传票据，生成报销草稿",
      topDesc: "AI 会整理行程、费用和异常提示。",
      sync: "同步企业审批",
      loginTitle: "企业身份未连接",
      loginSubtitle: "在企业 IM 内打开后，可自动识别当前员工。",
      roleLabel: "原型角色视角",
      platformLabel: "企业平台",
      languageLabel: "界面语言",
      uploadTitle: "上传票据",
      uploadDesc: "支持图片和 PDF",
      aiTitle: "AI 识别结果",
      aiDesc: "行程、费用、异常",
      financeNav: "财务复核",
      adapterTitle: "平台适配架构",
      adapterPayload: "模拟平台载荷",
    },
    "en-US": {
      appName: "Expense Assistant",
      appSubtitle: "Employee reimbursement",
      topTitle: "Upload receipts and create a draft claim",
      topDesc: "AI organizes itinerary, expenses, and exception hints.",
      sync: "Sync enterprise approval",
      loginTitle: "Enterprise identity not connected",
      loginSubtitle: "When opened in enterprise IM, the current employee can be identified automatically.",
      roleLabel: "Prototype role view",
      platformLabel: "Enterprise platform",
      languageLabel: "Language",
      uploadTitle: "Upload receipts",
      uploadDesc: "Images and PDF supported",
      aiTitle: "AI extraction result",
      aiDesc: "Itinerary, expenses, exceptions",
      financeNav: "Finance review",
      adapterTitle: "Platform adapter architecture",
      adapterPayload: "Mock platform payload",
    },
  };

  function t(key) {
    return (dictionary[languageSelect.value] || dictionary["zh-CN"])[key] || dictionary["zh-CN"][key] || key;
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function setFirstText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function applyLanguage() {
    document.documentElement.lang = languageSelect.value;
    setText(".brand strong", t("appName"));
    setText(".brand span", t("appSubtitle"));
    setText(".topbar h1", t("topTitle"));
    setText(".topbar p", t("topDesc"));
    setText("#syncFeishuBtn", t("sync"));
    setText("#loginTitle", t("loginTitle"));
    setText("#loginSubtitle", t("loginSubtitle"));
    setText("#roleStrip label span", t("roleLabel"));
    setFirstText(".integration-strip label:nth-child(1) span", t("platformLabel"));
    setFirstText(".integration-strip label:nth-child(2) span", t("languageLabel"));
    setText(".upload-panel .panel-head h2", t("uploadTitle"));
    setText(".upload-panel .panel-head p", t("uploadDesc"));
    setText(".assistant-panel .panel-head h2", t("aiTitle"));
    setText(".assistant-panel .panel-head p", t("aiDesc"));

    const financeNav = document.querySelector('.nav-item[data-view="finance"]');
    if (financeNav && languageSelect.value === "en-US") financeNav.childNodes[0].textContent = t("financeNav");
    if (financeNav && languageSelect.value === "zh-CN") financeNav.childNodes[0].textContent = "财务复核";

    const adapterLabel = document.querySelector("#platformAdapter .label");
    if (adapterLabel) adapterLabel.textContent = t("adapterTitle");
    const payloadLabel = document.querySelector("#platformAdapter .adapter-payload span");
    if (payloadLabel) payloadLabel.textContent = t("adapterPayload");

    document.body.dataset.languagePreview = languageSelect.value;
  }

  languageSelect.addEventListener("change", () => {
    window.setTimeout(applyLanguage, 0);
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("#roleSelector") || event.target.closest("#enterprisePlatform")) {
      window.setTimeout(applyLanguage, 0);
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.closest("#roleSelector") || event.target.closest("#enterprisePlatform")) {
      window.setTimeout(applyLanguage, 0);
    }
  });

  window.applyI18nPreview = applyLanguage;
  applyLanguage();
})();
