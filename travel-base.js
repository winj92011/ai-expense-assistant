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
  const originalApplyAnalysisResult = window.applyAnalysisResult;
  const originalGetCompletenessText = window.getCompletenessText;
  let suggestions = [];

  if (typeof originalApplyAnalysisResult !== "function" || typeof originalGetCompletenessText !== "function") return;

  window.applyAnalysisResult = function patchedApplyAnalysisResult(result) {
    suggestions = Array.isArray(result?.completeness_suggestions)
      ? result.completeness_suggestions.filter(Boolean)
      : [];

    return originalApplyAnalysisResult(result);
  };

  window.getCompletenessText = function patchedGetCompletenessText() {
    if (suggestions.length) {
      return suggestions.join("；");
    }

    return originalGetCompletenessText();
  };
})();
