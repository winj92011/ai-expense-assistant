const { test, expect } = require("@playwright/test");

test("platform adapter reflects the selected channel and draft payload", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("企业平台适配预览")).toBeVisible();

  await page.evaluate(() => {
    state.draftItems = [
      {
        date: "2026-04-18",
        category: "机票",
        vendor: "E2E 航空行程单",
        amount: 1280,
        status: "已匹配审批",
      },
      {
        date: "2026-04-19",
        category: "餐饮",
        vendor: "E2E 客户餐饮",
        amount: 320,
        status: "需补充说明",
      },
    ];
    document.querySelector("#tripTitle").textContent = "E2E 平台适配报销";
    document.querySelector("#routeInsight").textContent = "闭环行程 · 北京 → 上海 → 北京";
    renderDraft();
  });

  const payload = page.locator("#platformAdapter pre");
  await expect(payload).toContainText('"title": "E2E 平台适配报销"');
  await expect(payload).toContainText('"amount": 1600');
  await expect(payload).toContainText('"receiptCount": 2');
  await expect(payload).toContainText('"riskCount": 1');

  const platformSelect = page.locator("#enterprisePlatform");

  await platformSelect.selectOption("dingtalk");
  await expect(page.getByRole("heading", { name: "钉钉 接入预览" })).toBeVisible();
  await expect(payload).toContainText('"platform": "钉钉"');
  await expect(payload).toContainText('"identityField": "userid / unionid"');

  await platformSelect.selectOption("browser");
  await expect(page.getByRole("heading", { name: "浏览器测试 接入预览" })).toBeVisible();
  await expect(payload).toContainText('"platform": "浏览器测试"');
  await expect(payload).toContainText('"identityField": "mock_user_id"');
});
