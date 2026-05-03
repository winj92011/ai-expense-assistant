(() => {
  if (window.__i18nPreviewInstalled) return;
  window.__i18nPreviewInstalled = true;

  const languageSelect = document.querySelector("#interfaceLanguage");
  if (!languageSelect) return;

  const dictionary = {
    "zh-CN": {
      appName: "报销助手",
      appSubtitle: "员工报销入口",
      topTitle: "上传票据，生成报销草稿",
      topDesc: "AI 会整理行程、费用和异常提示。",
      sync: "同步企业审批",
      navClaim: "开始报销",
      navDrafts: "我的草稿",
      navApprovals: "待我处理",
      navDebug: "AI 调试",
      navFinance: "财务复核",
      loginTitle: "企业身份未连接",
      loginSubtitle: "在企业 IM 内打开后，可自动识别当前员工。",
      roleLabel: "原型角色视角",
      platformLabel: "企业平台",
      languageLabel: "界面语言",
      uploadTitle: "上传票据",
      uploadDesc: "支持图片和 PDF",
      aiTitle: "AI 识别结果",
      aiDesc: "行程、费用、异常",
      adapterTitle: "平台适配架构",
      adapterPayload: "模拟平台载荷",
      identityLabel: "统一 currentUser",
      identitySource: "身份来源",
      identityField: "平台用户字段",
      identityId: "平台用户 ID",
      identityRole: "组织角色",
      callbackLabel: "消息卡片回调",
      callbackDetail: "查看详情",
      callbackApprove: "模拟同意",
      callbackReturn: "模拟退回",
      dataModelLabel: "数据对象预览",
      dataModelTitle: "后端数据模型草稿",
      dataModelDesc: "用于对齐后续数据库、附件存储、审批任务和财务归档字段。",
      dataModelExport: "导出 JSON",
    },
    "en-US": {
      appName: "Expense Assistant",
      appSubtitle: "Employee reimbursement",
      topTitle: "Upload receipts and create a draft claim",
      topDesc: "AI organizes itinerary, expenses, and exception hints.",
      sync: "Sync enterprise approval",
      navClaim: "New claim",
      navDrafts: "My drafts",
      navApprovals: "My approvals",
      navDebug: "AI debug",
      navFinance: "Finance review",
      loginTitle: "Enterprise identity not connected",
      loginSubtitle: "When opened in enterprise IM, the current employee can be identified automatically.",
      roleLabel: "Prototype role view",
      platformLabel: "Enterprise platform",
      languageLabel: "Language",
      uploadTitle: "Upload receipts",
      uploadDesc: "Images and PDF supported",
      aiTitle: "AI extraction result",
      aiDesc: "Itinerary, expenses, exceptions",
      adapterTitle: "Platform adapter architecture",
      adapterPayload: "Mock platform payload",
      identityLabel: "Unified currentUser",
      identitySource: "Identity source",
      identityField: "Platform user field",
      identityId: "Platform user ID",
      identityRole: "Organization role",
      callbackLabel: "Message card callback",
      callbackDetail: "View details",
      callbackApprove: "Mock approve",
      callbackReturn: "Mock return",
      dataModelLabel: "Data object preview",
      dataModelTitle: "Backend data model draft",
      dataModelDesc: "Used to align future database, attachment storage, approval tasks, and finance archive fields.",
      dataModelExport: "Export JSON",
    },
  };

  function t(key) {
    const locale = dictionary[languageSelect.value] || dictionary["zh-CN"];
    return locale[key] || dictionary["zh-CN"][key] || key;
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function setNavText(view, value) {
    const node = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (node) node.childNodes[0].textContent = value;
  }

  function applyLanguage() {
    document.documentElement.lang = languageSelect.value;

    setText(".brand strong", t("appName"));
    setText(".brand span", t("appSubtitle"));
    setText(".topbar h1", t("topTitle"));
    setText(".topbar p", t("topDesc"));
    setText("#syncFeishuBtn", t("sync"));
    setNavText("claim", t("navClaim"));
    setNavText("drafts", t("navDrafts"));
    setNavText("approvals", t("navApprovals"));
    setNavText("debug", t("navDebug"));
    setNavText("finance", t("navFinance"));

    setText("#loginTitle", t("loginTitle"));
    setText("#loginSubtitle", t("loginSubtitle"));
    setText("#roleStrip label span", t("roleLabel"));
    setText(".integration-strip label:nth-child(1) span", t("platformLabel"));
    setText(".integration-strip label:nth-child(2) span", t("languageLabel"));
    setText(".upload-panel .panel-head h2", t("uploadTitle"));
    setText(".upload-panel .panel-head p", t("uploadDesc"));
    setText(".assistant-panel .panel-head h2", t("aiTitle"));
    setText(".assistant-panel .panel-head p", t("aiDesc"));

    setText("#platformAdapter .label", t("adapterTitle"));
    setText("#platformAdapter .adapter-payload span", t("adapterPayload"));

    setText("#identityContext .label", t("identityLabel"));
    setText("#identityContext .identity-cell:nth-child(1) span", t("identitySource"));
    setText("#identityContext .identity-cell:nth-child(2) span", t("identityField"));
    setText("#identityContext .identity-cell:nth-child(3) span", t("identityId"));
    setText("#identityContext .identity-cell:nth-child(4) span", t("identityRole"));

    setText("#platformCallbackSimulator .label", t("callbackLabel"));
    setText('#platformCallbackSimulator [data-platform-callback="view_detail"]', t("callbackDetail"));
    setText('#platformCallbackSimulator [data-platform-callback="approve"]', t("callbackApprove"));
    setText('#platformCallbackSimulator [data-platform-callback="return"]', t("callbackReturn"));

    setText("#dataModelPreview .label", t("dataModelLabel"));
    setText("#dataModelPreview h2", t("dataModelTitle"));
    setText("#dataModelPreview p", t("dataModelDesc"));
    setText("#dataModelPreview [data-export-data-model]", t("dataModelExport"));

    document.body.dataset.languagePreview = languageSelect.value;
  }

  function applySoon() {
    window.setTimeout(applyLanguage, 0);
  }

  function applyAfterLateRender() {
    window.setTimeout(applyLanguage, 30);
  }

  languageSelect.addEventListener("change", applySoon);

  document.addEventListener("click", (event) => {
    if (event.target.closest("#roleSelector, #enterprisePlatform, [data-platform-callback]")) applySoon();
  });

  document.addEventListener("change", (event) => {
    if (event.target.closest("#roleSelector, #enterprisePlatform, #interfaceLanguage")) {
      applySoon();
      applyAfterLateRender();
    }
  });

  document.addEventListener("identity-context-change", applySoon);
  document.addEventListener("identity-context-change", applyAfterLateRender);

  window.applyI18nPreview = applyLanguage;
  applyLanguage();
})();
