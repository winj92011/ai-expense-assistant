const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");

test("data model preview reflects draft, submitted claim, approval, and finance archive objects", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("数据对象预览")).toBeVisible();
  await expect(page.locator("#dataModelPreview")).toContainText("报销单 0");

  await page.evaluate(() => {
    const item = {
      date: "2026-04-20",
      invoice_date: "2026-04-20",
      category: "住宿",
      vendor: "E2E 数据模型酒店",
      amount: 680,
      status: "需补充说明",
      employee_note: "酒店晚到说明。",
    };
    state.draftItems = [item];
    state.claimStatus = "ready";
    state.analyzed = true;
    document.querySelector("#tripTitle").textContent = "E2E 数据模型报销";
    document.querySelector("#routeInsight").textContent = "闭环行程 · 北京 → 上海 → 北京";
    document.querySelector("#aiResult").classList.remove("hidden");
    document.querySelector("#draftSection").classList.remove("hidden");
    renderDraft();
    renderDraftsView();
  });

  await expect(page.locator("#dataModelPreview")).toContainText("报销单 1");
  await expect(page.locator("#dataModelPreview")).toContainText("明细 1");
  await expect(page.locator("#dataModelPreview pre")).toContainText('"id": "draft-current"');
  await expect(page.locator("#dataModelPreview pre")).toContainText('"vendor": "E2E 数据模型酒店"');

  await page.getByRole("button", { name: "确认并提交" }).click();
  await page.locator("#roleSelector").selectOption("manager");
  const approvalCard = page.locator("#approvalsView .queue-card").filter({ hasText: "E2E 数据模型报销" });
  await approvalCard.getByRole("button", { name: "同意" }).click();
  await page.locator("#roleSelector").selectOption("finance");
  const financeCard = page.locator("#financeView .finance-card").filter({ hasText: "E2E 数据模型报销" });
  await financeCard.getByRole("button", { name: "标记已复核" }).click();

  const preview = page.locator("#dataModelPreview");
  await expect(preview).toContainText("审批任务 3");
  await expect(preview).toContainText("归档 1");
  await expect(preview.locator("pre")).toContainText('"finance_archives"');
  await expect(preview.locator("pre")).toContainText('"archive_no": "FIN-');
  await expect(preview.locator("pre")).toContainText('"ledger_status": "待入账"');

  const downloadPromise = page.waitForEvent("download");
  await preview.getByRole("button", { name: "导出 JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("expense-data-model-preview.json");
  const path = await download.path();
  const model = JSON.parse(await fs.readFile(path, "utf8"));
  expect(model.expense_claims.some((claim) => claim.title === "E2E 数据模型报销")).toBe(true);
  expect(model.expense_items.some((item) => item.vendor === "E2E 数据模型酒店")).toBe(true);
  expect(model.finance_archives).toHaveLength(1);
});
