const { test, expect } = require("@playwright/test");

test("platform callback simulator approves and returns enterprise card actions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("region", { name: "平台回调模拟器" })).toBeVisible();

  await page.evaluate(() => {
    state.files = [new File(["receipt"], "callback-flight.pdf", { type: "application/pdf" })];
    state.draftItems = [
      {
        date: "2026-04-22",
        invoice_date: "2026-04-22",
        category: "机票",
        vendor: "E2E 回调航旅",
        amount: 930,
        status: "已匹配审批",
      },
    ];
    state.claimStatus = "ready";
    state.analyzed = true;
    document.querySelector("#tripTitle").textContent = "E2E 平台回调报销";
    document.querySelector("#routeInsight").textContent = "闭环行程 · 北京 → 上海 → 北京";
    document.querySelector("#aiResult").classList.remove("hidden");
    document.querySelector("#draftSection").classList.remove("hidden");
    renderFiles();
    renderDraft();
    renderDraftsView();
  });

  await page.getByRole("button", { name: "确认并提交" }).click();

  const simulator = page.getByRole("region", { name: "平台回调模拟器" });
  await expect(simulator).toContainText("E2E 平台回调报销");
  await expect(simulator.locator("pre").first()).toContainText('"action": "view_detail"');
  await expect(simulator.locator("pre").first()).toContainText('"platform": "飞书"');

  await page.locator("#enterprisePlatform").selectOption("dingtalk");
  await expect(simulator.locator("pre").first()).toContainText('"platform": "钉钉"');
  await expect(simulator.locator("pre").first()).toContainText("/mock/dingtalk/card-action");

  await simulator.getByRole("button", { name: "模拟同意" }).click();
  await expect(simulator.locator("#platformCallbackResult")).toContainText("审批已通过");
  await expect(page.locator("#financeView")).toContainText("E2E 平台回调报销");
  await expect(page.locator("#financeView")).toContainText("钉钉卡片回调");

  await page.evaluate(() => {
    state.submittedClaims.unshift({
      id: "claim-e2e-return",
      title: "E2E 平台退回报销",
      total: 420,
      count: 1,
      status: "待主管审批",
      items: [
        {
          date: "2026-04-23",
          invoice_date: "2026-04-23",
          category: "餐饮",
          vendor: "E2E 回调餐饮",
          amount: 420,
          status: "需补充说明",
        },
      ],
      timeline: [],
    });
    renderDraftsView();
    renderApprovalsView();
    renderFinanceView();
    window.platformCallbackSimulator.render();
  });

  await simulator.getByRole("button", { name: "模拟退回" }).click();
  await expect(simulator.locator("#platformCallbackResult")).toContainText("审批已退回");
  await expect(page.locator("#draftsView")).toContainText("退回补充说明");
  await expect(simulator.locator("#platformCallbackResult")).toContainText("请补充异常票据说明");
});
