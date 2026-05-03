const { test, expect } = require("@playwright/test");

test("identity context maps platform and role into a unified currentUser", async ({ page }) => {
  await page.goto("/");

  const identity = page.getByRole("region", { name: "身份上下文" });
  await expect(identity).toBeVisible();
  await expect(identity).toContainText("统一 currentUser");
  await expect(identity.locator("pre")).toContainText('"role": "employee"');
  await expect(identity.locator("pre")).toContainText('"platform": "feishu"');
  await expect(identity.locator("pre")).toContainText('"identity_field": "open_id / union_id"');

  await page.locator("#roleSelector").selectOption("manager");
  await expect(identity.locator("pre")).toContainText('"role": "manager"');
  await expect(identity.locator("pre")).toContainText('"name": "周主管"');
  await expect(identity.locator("pre")).toContainText('"department_id": "dept-product"');

  await page.locator("#enterprisePlatform").selectOption("dingtalk");
  await expect(identity.locator("pre")).toContainText('"platform": "dingtalk"');
  await expect(identity.locator("pre")).toContainText('"identity_field": "userid / unionid"');
  await expect(identity.locator("pre")).toContainText('"platform_user_id": "dt_user_mock-user-manager"');

  await page.evaluate(() => {
    state.draftItems = [
      {
        date: "2026-04-25",
        invoice_date: "2026-04-25",
        category: "交通",
        vendor: "E2E 身份上下文用车",
        amount: 188,
        status: "已匹配审批",
      },
    ];
    state.claimStatus = "ready";
    document.querySelector("#tripTitle").textContent = "E2E 身份上下文报销";
    document.querySelector("#routeInsight").textContent = "闭环行程 · 北京 → 上海 → 北京";
    renderDraft();
    window.identityContext.render();
  });

  const dataModel = page.locator("#dataModelPreview pre");
  await expect(dataModel).toContainText('"platform": "dingtalk"');
  await expect(dataModel).toContainText('"employee_id": "mock-user-manager"');
  await expect(dataModel).toContainText('"platform_user_id": "dt_user_mock-user-manager"');
});
