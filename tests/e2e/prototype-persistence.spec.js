const { test, expect } = require("@playwright/test");

test("prototype persistence saves and restores a local snapshot", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByLabel("原型本地暂存")).toBeVisible();

  await page.evaluate(() => {
    const item = {
      date: "2026-04-12",
      category: "住宿",
      vendor: "E2E 本地暂存酒店",
      amount: 480,
      status: "需补充说明",
    };

    state.draftItems = [item];
    state.submittedClaims = [
      {
        id: "persist-e2e-claim",
        title: "E2E 本地暂存报销",
        total: 480,
        count: 1,
        items: [{ ...item }],
        status: "待主管审批",
        timeline: [],
      },
    ];
    state.claimStatus = "submitted";
    state.analyzed = true;
    document.querySelector("#tripTitle").textContent = "E2E 本地暂存报销";
    document.querySelector("#tripSummary").textContent = "本地快照恢复测试";
    renderDraft();
    renderDraftsView();
    renderApprovalsView();
    renderFinanceView();
  });

  await page.getByRole("button", { name: "保存快照" }).click();
  await expect(page.getByText("草稿 1 条 · 单据 1 条")).toBeVisible();

  await page.reload();
  await expect(page.locator('input[value="E2E 本地暂存酒店"]')).toBeVisible();
  await expect(page.locator("#draftsView")).toContainText("E2E 本地暂存报销");
  await expect(page.getByText("草稿 1 条 · 单据 1 条")).toBeVisible();

  await page.getByRole("button", { name: "清空快照" }).click();
  await page.reload();
  await expect(page.getByText("草稿 0 条 · 单据 0 条")).toBeVisible();
  await expect(page.locator('input[value="E2E 本地暂存酒店"]')).toHaveCount(0);
});
