const { test, expect } = require("@playwright/test");

test("language preview switches key prototype labels between Chinese and English", async ({ page }) => {
  await page.goto("/");

  const languageSelect = page.locator("#interfaceLanguage");

  await languageSelect.selectOption("en-US");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await expect(page.locator(".brand")).toContainText("Expense Assistant");
  await expect(page.getByRole("heading", { name: "Upload receipts and create a draft claim" })).toBeVisible();
  await expect(page.getByText("Enterprise identity not connected")).toBeVisible();
  await expect(page.locator("#roleStrip")).toContainText("Prototype role view");
  await expect(page.locator(".integration-strip")).toContainText("Enterprise platform");
  await expect(page.locator(".integration-strip")).toContainText("Language");
  await expect(page.locator('.nav-item[data-view="claim"]')).toContainText("New claim");
  await expect(page.locator('.nav-item[data-view="approvals"]')).toContainText("My approvals");
  await expect(page.locator('.nav-item[data-view="finance"]')).toContainText("Finance review");
  await expect(page.locator("#platformAdapter .label")).toHaveText("Platform adapter architecture");
  await expect(page.locator("#platformAdapter .adapter-payload span")).toHaveText("Mock platform payload");
  await expect(page.locator("#identityContext .label")).toHaveText("Unified currentUser");
  await expect(page.locator("#identityContext")).toContainText("Platform user field");
  await expect(page.locator("#platformCallbackSimulator .label")).toHaveText("Message card callback");
  await expect(page.locator("#platformCallbackSimulator")).toContainText("Mock approve");
  await expect(page.locator("#dataModelPreview .label")).toHaveText("Data object preview");
  await expect(page.locator("#dataModelPreview")).toContainText("Backend data model draft");

  await page.locator("#roleSelector").selectOption("finance");
  await expect(page.locator("#roleStrip")).toContainText("Prototype role view");
  await expect(page.locator("#identityContext")).toContainText("Organization role");

  await page.locator("#enterprisePlatform").selectOption("dingtalk");
  await expect(page.locator("#platformAdapter .label")).toHaveText("Platform adapter architecture");
  await expect(page.locator("#platformAdapter .adapter-payload span")).toHaveText("Mock platform payload");
  await expect(page.locator("#identityContext")).toContainText("Platform user ID");

  await languageSelect.selectOption("zh-CN");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.locator(".brand")).toContainText("报销助手");
  await expect(page.getByRole("heading", { name: "上传票据，生成报销草稿" })).toBeVisible();
  await expect(page.getByText("企业身份未连接")).toBeVisible();
  await expect(page.locator("#roleStrip")).toContainText("原型角色视角");
  await expect(page.locator("#platformAdapter .label")).toHaveText("平台适配架构");
  await expect(page.locator("#platformAdapter .adapter-payload span")).toHaveText("模拟平台载荷");
  await expect(page.locator("#identityContext .label")).toHaveText("统一 currentUser");
  await expect(page.locator("#platformCallbackSimulator .label")).toHaveText("消息卡片回调");
  await expect(page.locator("#dataModelPreview .label")).toHaveText("数据对象预览");
  await expect(page.locator('.nav-item[data-view="finance"]')).toContainText("财务复核");
});
