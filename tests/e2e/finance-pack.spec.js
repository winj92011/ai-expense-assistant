const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");

test("finance pack flow creates a new reimbursable record", async ({ page }) => {
  await page.goto("/?e2e=1");

  await expect(page.getByRole("heading", { name: "新增测试报销" })).toBeVisible();

  await page.getByLabel("标题").fill("E2E 财务凭证包报销");
  await page.getByLabel("商户").fill("E2E 出行平台");
  await page.getByLabel("金额").fill("256");
  await page.getByRole("button", { name: "提交测试报销" }).click();

  await expect(page.getByRole("heading", { name: "财务复核工作台" })).toBeVisible();
  const financeCard = page.locator(".finance-card").filter({ hasText: "E2E 财务凭证包报销" });
  await expect(financeCard).toBeVisible();
  await expect(financeCard.getByText("已生成归档号: FIN-")).toBeVisible();
  await expect(financeCard.getByText("入账状态: 未入账")).toBeVisible();
  await expect(financeCard.getByText("E2E 出行平台")).toBeVisible();
  await expect(financeCard.getByText("凭证包", { exact: true })).toBeVisible();
  const archiveText = await financeCard.locator(".archive-line span").first().textContent();
  const archiveNo = archiveText.replace("已生成归档号: ", "").trim();

  await page.locator("[data-finance-search]").fill("E2E 出行平台");
  await expect(page.getByText("显示 1 / 1 单")).toBeVisible();
  await expect(financeCard).toBeVisible();
  await page.locator("[data-finance-search]").fill("不存在的商户");
  await expect(page.getByText("没有匹配的财务单据")).toBeVisible();
  await page.locator("[data-finance-search]").fill("");
  await page.locator("[data-finance-status-filter]").selectOption("finance");
  await expect(financeCard).toBeVisible();

  await financeCard.getByRole("button", { name: "查看明细" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(archiveNo, { exact: true })).toBeVisible();
  await expect(dialog.getByText("E2E 出行平台")).toBeVisible();

  await dialog.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await financeCard.getByLabel("复核说明").fill("E2E 复核说明：票据与审批链一致，准予入账。");
  await financeCard.getByRole("button", { name: "标记已复核" }).click();
  await page.locator("[data-finance-status-filter]").selectOption("finance");
  await expect(page.getByText("没有匹配的财务单据")).toBeVisible();
  await page.locator("[data-finance-status-filter]").selectOption("payment");
  await expect(financeCard.getByText("入账状态: 待入账")).toBeVisible();
  await expect(financeCard.getByText("凭证号: V-")).toBeVisible();
  await expect(financeCard.getByText("审计说明: E2E 复核说明：票据与审批链一致，准予入账。")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await financeCard.getByRole("button", { name: "下载凭证包" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`${archiveNo}-voucher-package.json`);
  const manifestPath = await download.path();
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  expect(manifest.archiveNo).toBe(archiveNo);
  expect(manifest.auditNote).toBe("E2E 复核说明：票据与审批链一致，准予入账。");
  expect(manifest.files).toContain(`${archiveNo}-audit.txt`);

  await financeCard.getByRole("button", { name: "查看明细" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const reviewedDialog = page.getByRole("dialog");
  await expect(reviewedDialog.getByText("E2E 复核说明：票据与审批链一致，准予入账。")).toBeVisible();
  await reviewedDialog.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await financeCard.getByRole("button", { name: "确认付款" }).click();
  await page.locator("[data-finance-status-filter]").selectOption("paid");
  await expect(financeCard.getByText("入账状态: 已入账")).toBeVisible();
});
