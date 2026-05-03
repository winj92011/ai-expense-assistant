const { test, expect } = require("@playwright/test");

test("page smoke mode validates the prototype flow and data model", async ({ page }) => {
  await page.goto("/?smoke=1");

  const panel = page.locator(".smoke-panel-card");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "原型流程验证通过" })).toBeVisible();
  await expect(panel).toContainText("平台适配载荷出现");
  await expect(panel).toContainText("员工提交");
  await expect(panel).toContainText("财务复核后进入付款");
  await expect(panel).toContainText("出纳付款闭环");
  await expect(panel).toContainText("财务归档对象生成");
  await expect(panel).toContainText("数据模型可导出");
});
