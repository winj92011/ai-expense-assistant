(() => {
  if (window.__rolePermissionsInstalled) return;
  window.__rolePermissionsInstalled = true;

  const loginStrip = document.querySelector("#loginStrip");
  const accountCard = document.querySelector(".account-card");
  const navItems = Array.from(document.querySelectorAll(".nav-item"));

  if (!loginStrip || !accountCard || !navItems.length) return;

  const roles = {
    employee: {
      name: "吴经理",
      title: "员工 / 产品负责人",
      avatar: "吴",
      label: "员工",
      defaultView: "claim",
      views: ["claim", "drafts"],
      scope: ["上传票据", "确认草稿", "提交审批", "查看本人单据"],
      hint: "员工侧聚焦票据上传、AI 草稿确认和提交审批。",
    },
    manager: {
      name: "周主管",
      title: "直属主管",
      avatar: "周",
      label: "主管",
      defaultView: "approvals",
      views: ["approvals", "drafts"],
      scope: ["查看待审报销", "同意审批", "退回补充说明", "查看审批链"],
      hint: "主管侧聚焦快速判断异常、金额和行程合理性。",
    },
    finance: {
      name: "林会计",
      title: "财务复核",
      avatar: "林",
      label: "财务",
      defaultView: "finance",
      views: ["finance", "drafts", "debug"],
      scope: ["复核票据", "填写审计说明", "生成凭证包", "导出台账"],
      hint: "财务侧聚焦归档号、凭证包、审计说明和入账状态。",
    },
    cashier: {
      name: "陈出纳",
      title: "出纳付款",
      avatar: "陈",
      label: "出纳",
      defaultView: "finance",
      views: ["finance", "drafts"],
      scope: ["查看待付款", "确认付款", "更新付款状态", "查看凭证号"],
      hint: "出纳侧只处理已复核后的付款闭环。",
    },
    admin: {
      name: "系统管理员",
      title: "管理员",
      avatar: "管",
      label: "管理员",
      defaultView: "claim",
      views: ["claim", "drafts", "approvals", "finance", "debug"],
      scope: ["全流程演示", "AI 调试", "平台适配", "测试入口"],
      hint: "管理员用于原型演示、配置检查和端到端测试。",
    },
  };

  function installStyle() {
    if (document.querySelector("#role-permissions-style")) return;
    const style = document.createElement("style");
    style.id = "role-permissions-style";
    style.textContent = `
      .role-strip {
        display: grid;
        grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
        gap: 12px;
        margin-top: 10px;
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #ffffff;
        box-shadow: var(--shadow);
      }

      .role-strip label {
        display: grid;
        gap: 6px;
      }

      .role-strip label span,
      .role-scope span {
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
      }

      .role-strip select {
        min-height: 38px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #ffffff;
        color: var(--ink);
        padding: 0 10px;
      }

      .role-scope {
        display: grid;
        gap: 8px;
      }

      .role-scope-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .role-scope-list strong {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 5px 8px;
        border-radius: 999px;
        background: #f4f8ff;
        color: var(--blue);
        font-size: 12px;
      }

      .role-strip p {
        margin: 0;
        font-size: 13px;
      }

      .nav-item.locked {
        opacity: 0.45;
      }

      .nav-item.locked::after {
        content: "  · 无权限";
        color: #aab6ca;
        font-size: 12px;
      }

      @media (max-width: 920px) {
        .role-strip {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setActiveView(view) {
    const target = document.querySelector(`[data-view-panel="${view}"]`);
    const nav = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (!target || !nav) return;

    navItems.forEach((item) => item.classList.remove("active"));
    document.querySelectorAll("[data-view-panel]").forEach((panel) => panel.classList.remove("active"));
    nav.classList.add("active");
    target.classList.add("active");
  }

  function renderAccount(role) {
    const avatar = accountCard.querySelector(".avatar");
    const name = accountCard.querySelector("strong");
    const title = accountCard.querySelector("span:not(.avatar)");

    if (avatar) avatar.textContent = role.avatar;
    if (name) name.textContent = role.name;
    if (title) title.textContent = role.title;
  }

  function renderRoleStrip(selectedKey = "employee") {
    let strip = document.querySelector("#roleStrip");
    if (!strip) {
      strip = document.createElement("section");
      strip.id = "roleStrip";
      strip.className = "role-strip";
      strip.setAttribute("aria-label", "角色权限模拟");
      loginStrip.insertAdjacentElement("afterend", strip);
    }

    const role = roles[selectedKey] || roles.employee;
    strip.innerHTML = `
      <label>
        <span>原型角色视角</span>
        <select id="roleSelector">
          ${Object.entries(roles)
            .map(([key, item]) => `<option value="${key}" ${key === selectedKey ? "selected" : ""}>${item.label}</option>`)
            .join("")}
        </select>
      </label>

      <div class="role-scope">
        <span>权限范围</span>
        <div class="role-scope-list">
          ${role.scope.map((item) => `<strong>${item}</strong>`).join("")}
        </div>
        <p>${role.hint} 真实接入后将由企业身份自动决定角色。</p>
      </div>
    `;

    strip.querySelector("#roleSelector").addEventListener("change", (event) => {
      applyRole(event.target.value, true);
    });
  }

  function applyRole(roleKey, shouldNavigate = false) {
    const role = roles[roleKey] || roles.employee;
    document.body.dataset.role = roleKey;
    renderAccount(role);
    renderRoleStrip(roleKey);

    navItems.forEach((item) => {
      const allowed = role.views.includes(item.dataset.view);
      item.classList.toggle("locked", !allowed);
      item.setAttribute("aria-disabled", allowed ? "false" : "true");
      item.title = allowed ? "" : `${role.label}角色通常不处理此页面`;
    });

    if (shouldNavigate) {
      setActiveView(role.defaultView);
      showToast(`已切换为${role.label}视角`);
    }
  }

  document.addEventListener(
    "click",
    (event) => {
      const lockedNav = event.target.closest(".nav-item.locked");
      if (!lockedNav) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const role = roles[document.body.dataset.role] || roles.employee;
      showToast(`${role.label}角色通常不处理“${lockedNav.textContent.replace("· 无权限", "").trim()}”`);
    },
    true,
  );

  installStyle();
  applyRole("employee");
})();
