(() => {
  if (window.__identityContextInstalled) return;
  window.__identityContextInstalled = true;

  const loginStrip = document.querySelector("#loginStrip");
  const platformSelect = document.querySelector("#enterprisePlatform");

  if (!loginStrip || !platformSelect) return;

  const USERS = {
    employee: {
      id: "mock-user-employee",
      name: "吴经理",
      title: "员工 / 产品负责人",
      role: "employee",
      role_label: "员工",
      department_id: "dept-product",
      department_name: "产品部",
    },
    manager: {
      id: "mock-user-manager",
      name: "周主管",
      title: "直属主管",
      role: "manager",
      role_label: "主管",
      department_id: "dept-product",
      department_name: "产品部",
    },
    finance: {
      id: "mock-user-finance",
      name: "林会计",
      title: "财务复核",
      role: "finance",
      role_label: "财务",
      department_id: "dept-finance",
      department_name: "财务部",
    },
    cashier: {
      id: "mock-user-cashier",
      name: "陈出纳",
      title: "出纳付款",
      role: "cashier",
      role_label: "出纳",
      department_id: "dept-finance",
      department_name: "财务部",
    },
    admin: {
      id: "mock-user-admin",
      name: "系统管理员",
      title: "管理员",
      role: "admin",
      role_label: "管理员",
      department_id: "dept-it",
      department_name: "信息化",
    },
  };

  const PLATFORM = {
    feishu: {
      label: "飞书",
      source: "feishu-jsapi-mock",
      identityField: "open_id / union_id",
      prefix: "ou_mock_",
    },
    dingtalk: {
      label: "钉钉",
      source: "dingtalk-jsapi-mock",
      identityField: "userid / unionid",
      prefix: "dt_user_",
    },
    browser: {
      label: "浏览器测试",
      source: "browser-local-mock",
      identityField: "mock_user_id",
      prefix: "browser_",
    },
  };

  function roleKey() {
    return document.body.dataset.role || document.querySelector("#roleSelector")?.value || "employee";
  }

  function platformKey() {
    return platformSelect.value || "browser";
  }

  function accountName(fallback) {
    return document.querySelector(".account-card strong")?.textContent || fallback;
  }

  function accountTitle(fallback) {
    return document.querySelector(".account-card span:not(.avatar)")?.textContent || fallback;
  }

  function currentUser() {
    const base = USERS[roleKey()] || USERS.employee;
    const platform = PLATFORM[platformKey()] || PLATFORM.browser;
    const platformUserId = `${platform.prefix}${base.id}`;

    return {
      id: base.id,
      name: accountName(base.name),
      title: accountTitle(base.title),
      role: base.role,
      role_label: base.role_label,
      department_id: base.department_id,
      department_name: base.department_name,
      platform: platformKey(),
      platform_label: platform.label,
      identity_source: platform.source,
      identity_field: platform.identityField,
      platform_user_id: platformUserId,
      is_mock_identity: true,
    };
  }

  function dispatchIdentityChange() {
    document.dispatchEvent(
      new CustomEvent("identity-context-change", {
        detail: currentUser(),
      }),
    );
  }

  function installStyle() {
    if (document.querySelector("#identity-context-style")) return;
    const style = document.createElement("style");
    style.id = "identity-context-style";
    style.textContent = `
      .identity-context {
        display: grid;
        gap: 12px;
        margin-top: 10px;
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #ffffff;
        box-shadow: var(--shadow);
      }

      .identity-context-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: start;
      }

      .identity-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }

      .identity-cell {
        min-height: 70px;
        padding: 10px;
        border: 1px solid #dbe3ee;
        border-radius: 8px;
        background: #f8fbff;
      }

      .identity-cell span {
        display: block;
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
      }

      .identity-cell strong {
        display: block;
        margin-top: 6px;
        color: var(--ink);
        font-size: 13px;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .identity-context pre {
        margin: 0;
        max-height: 180px;
        overflow: auto;
        border-radius: 8px;
        background: #101828;
        color: #e8eefb;
        padding: 12px;
        font-size: 12px;
        line-height: 1.5;
      }

      @media (max-width: 920px) {
        .identity-context-head,
        .identity-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function render() {
    let panel = document.querySelector("#identityContext");
    const user = currentUser();

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "identityContext";
      panel.className = "identity-context";
      panel.setAttribute("aria-label", "身份上下文");
      const roleStrip = document.querySelector("#roleStrip");
      (roleStrip || loginStrip).insertAdjacentElement("afterend", panel);
    }

    panel.innerHTML = `
      <div class="identity-context-head">
        <div>
          <span class="label">统一 currentUser</span>
          <h2>${user.name} · ${user.role_label}</h2>
          <p>${user.platform_label} 身份会先映射为统一用户对象，后续可替换成真实免登录结果。</p>
        </div>
        <span class="status-pill">${user.is_mock_identity ? "模拟身份" : "企业身份"}</span>
      </div>

      <div class="identity-grid">
        <div class="identity-cell">
          <span>身份来源</span>
          <strong>${user.identity_source}</strong>
        </div>
        <div class="identity-cell">
          <span>平台用户字段</span>
          <strong>${user.identity_field}</strong>
        </div>
        <div class="identity-cell">
          <span>平台用户 ID</span>
          <strong>${user.platform_user_id}</strong>
        </div>
        <div class="identity-cell">
          <span>组织角色</span>
          <strong>${user.department_name} / ${user.title}</strong>
        </div>
      </div>

      <pre>${JSON.stringify(user, null, 2)}</pre>
    `;

    dispatchIdentityChange();
  }

  installStyle();
  render();

  document.addEventListener("change", (event) => {
    if (event.target.closest("#enterprisePlatform, #roleSelector")) window.setTimeout(render, 0);
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("#loginBtn, #syncFeishuBtn")) window.setTimeout(render, 0);
  });

  window.identityContext = {
    currentUser,
    render,
    users: USERS,
    platforms: PLATFORM,
  };
})();
