const { test, expect } = require("@playwright/test");

test("employee exception notes travel from draft to manager and finance review", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    state.files = [new File(["receipt"], "client-dinner.pdf", { type: "application/pdf" })];
    state.draftItems = [
      {
        date: "2026-04-16",
        invoice_date: "2026-04-16",
        category: "餐饮",
        vendor: "E2E 客户晚餐",
        amount: 360,
        status: "需补充说明",
      },
    ];
    state.claimStatus = "ready";
    state.analyzed = true;
    document.querySelector("#tripTitle").textContent = "E2E 异常说明报销";
    document.querySelector("#tripSummary").textContent = "客户晚餐补充说明测试";
    document.querySelector("#aiResult").classList.remove("hidden");
    document.querySelector("#draftSection").classList.remove("hidden");
    renderFiles();
    renderDraft();
    renderDraftsView();
  });

  const note = "客户晚餐，参与人 4 人，项目复盘。";
  await expect(page.getByLabel("员工补充说明")).toBeVisible();
  await page.getByLabel("员工补充说明").fill(note);
  await page.getByRole("button", { name: "确认并提交" }).click();

  await page.locator("#roleSelector").selectOption("manager");
  await expect(page.locator("#approvalsView")).toHaveClass(/active/);
  const approvalCard = page.locator("#approvalsView .queue-card").filter({ hasText: "E2E 异常说明报销" });
  await expect(approvalCard).toContainText("员工补充说明");
  await expect(approvalCard).toContainText(note);

  await approvalCard.getByRole("button", { name: "同意" }).click();
  await page.locator("#roleSelector").selectOption("finance");
  await expect(page.locator("#financeView")).toHaveClass(/active/);
  const financeCard = page.locator("#financeView .finance-card").filter({ hasText: "E2E 异常说明报销" });
  await expect(financeCard).toContainText("员工补充说明");
  await expect(financeCard).toContainText(note);
  await expect(financeCard).toContainText("1 项需确认");
});
