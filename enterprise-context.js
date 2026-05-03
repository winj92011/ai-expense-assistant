(() => {
  const platformSelect = document.querySelector("#enterprisePlatform");
  const languageSelect = document.querySelector("#interfaceLanguage");
  const syncButton = document.querySelector("#syncFeishuBtn");
  const signInButton = document.querySelector("#loginBtn");
  const platformStatusPill = document.querySelector("#platformStatusPill");
  const integrationHint = document.querySelector("#integrationHint");

  const platformLabels = {
    feishu: "飞书",
    dingtalk: "钉钉",
    browser: "浏览器测试",
  };

  if (!platformSelect || !languageSelect) return;

  function currentPlatform() {
    return platformSelect.value || "feishu";
  }

  function platformLabel() {
    return platformLabels[currentPlatform()] || "企业 IM";
  }

  function setReservedLoginState() {
    const platform = currentPlatform();
    if (platform === "feishu") {
      setLoginState("", "飞书身份未连接", "在飞书内打开后，可自动识别当前员工。");
      return;
    }

    if (platform === "dingtalk") {
      setLoginState("warning", "钉钉身份能力已预留", "后续接入钉钉免登和审批接口后即可启用。");
      return;
    }

    setLoginState("warning", "浏览器测试身份", "用于本地演示和流程验证，不绑定真实企业账号。");
  }

  function renderEnterpriseContext() {
    const label = platformLabel();
    const isEnglishReserved = languageSelect.value === "en-US";

    if (syncButton) syncButton.textContent = `同步${label}审批`;
    if (platformStatusPill) platformStatusPill.textContent = currentPlatform() === "feishu" ? "飞书内测" : `${label}预留`;
    if (integrationHint) {
      integrationHint.textContent = isEnglishReserved
        ? `当前平台：${label}；English language pack reserved.`
        : `当前平台：${label}；钉钉与英文语言包已预留。`;
    }

    setReservedLoginState();
  }

  platformSelect.addEventListener("change", () => {
    renderEnterpriseContext();
    showToast(`${platformLabel()}入口已切换`);
  });

  languageSelect.addEventListener("change", () => {
    renderEnterpriseContext();
    if (languageSelect.value === "en-US") {
      showToast("英文语言包已预留，后续可切换完整英文界面");
    } else {
      showToast("已切回简体中文");
    }
  });

  if (syncButton) {
    syncButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        showToast(`已模拟同步${platformLabel()}出差审批`);
      },
      true,
    );
  }

  if (signInButton) {
    signInButton.addEventListener(
      "click",
      (event) => {
        if (currentPlatform() === "feishu") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        setReservedLoginState();
        showToast(`${platformLabel()}免登录接口已预留`);
      },
      true,
    );
  }

  renderEnterpriseContext();
})();
