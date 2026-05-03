const { test, expect } = require("@playwright/test");

test("role selector updates account identity and navigation permissions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("角色权限模拟")).toBeVisible();
  await expect(page.locator(".account-card")).toContainText("吴经理");
  await expect(page.locator(".account-card")).toContainText("员工 / 产品负责人");

  const claimNav = page.locator('.nav-item[data-view="claim"]');
  const approvalsNav = page.locator('.nav-item[data-view="approvals"]');
  const financeNav = page.locator('.nav-item[data-view="finance"]');
  const debugNav = page.locator('.nav-item[data-view="debug"]');
  const roleSelect = page.locator("#roleSelector");

  await expect(claimNav).toHaveAttribute("aria-disabled", "false");
  await expect(financeNav).toHaveAttribute("aria-disabled", "true");

  await financeNav.dispatchEvent("click");
  await expect(page.locator("#claimView")).toHaveClass(/active/);
  await expect(page.locator("#financeView")).not.toHaveClass(/active/);

  await roleSelect.selectOption("manager");
  await expect(page.locator(".account-card")).toContainText("周主管");
  await expect(page.locator(".role-scope-list")).toContainText("同意审批");
  await expect(page.locator("#approvalsView")).toHaveClass(/active/);
  await expect(approvalsNav).toHaveAttribute("aria-disabled", "false");
  await expect(financeNav).toHaveAttribute("aria-disabled", "true");

  await roleSelect.selectOption("finance");
  await expect(page.locator(".account-card")).toContainText("林会计");
  await expect(page.locator(".role-scope-list")).toContainText("生成凭证包");
  await expect(page.locator("#financeView")).toHaveClass(/active/);
  await expect(financeNav).toHaveAttribute("aria-disabled", "false");
  await expect(debugNav).toHaveAttribute("aria-disabled", "false");
  await expect(approvalsNav).toHaveAttribute("aria-disabled", "true");

  await roleSelect.selectOption("cashier");
  await expect(page.locator(".account-card")).toContainText("陈出纳");
  await expect(page.locator(".role-scope-list")).toContainText("确认付款");
  await expect(page.locator("#financeView")).toHaveClass(/active/);
  await expect(debugNav).toHaveAttribute("aria-disabled", "true");

  await roleSelect.selectOption("admin");
  await expect(page.locator(".account-card")).toContainText("系统管理员");
  await expect(page.locator(".role-scope-list")).toContainText("全流程演示");
  await expect(claimNav).toHaveAttribute("aria-disabled", "false");
  await expect(approvalsNav).toHaveAttribute("aria-disabled", "false");
  await expect(financeNav).toHaveAttribute("aria-disabled", "false");
  await expect(debugNav).toHaveAttribute("aria-disabled", "false");
});
