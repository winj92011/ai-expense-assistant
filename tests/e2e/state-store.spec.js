const { test, expect } = require("@playwright/test");

test("prototype store maps page state into database-like records", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("body")).toHaveAttribute("data-role", "employee");

  await page.evaluate(() => {
    const item = {
      date: "2026-04-22",
      invoice_date: "2026-04-22",
      category: "餐饮",
      vendor: "E2E 数据结构餐饮",
      amount: 288,
      status: "需补充说明",
      employee_note: "业务复盘。",
    };
    state.draftItems = [item];
    state.submittedClaims = [
      {
        id: "claim-store-e2e",
        title: "E2E 数据结构落地",
        total: 288,
        count: 1,
        items: [{ ...item }],
        status: "待财务复核",
        archiveNo: "FIN-202605-0099",
        voucherNo: "V-202605-0099",
        ledgerStatus: "待入账",
        auditNote: "测试审计说明",
        voucherFiles: ["FIN-202605-0099-audit.txt"],
        timeline: [{ step: "主管审批", actor: "周主管", status: "同意", at: "05/03 09:30" }],
      },
    ];
    state.claimStatus = "ready";
    document.querySelector("#tripTitle").textContent = "E2E 数据结构落地";
    document.querySelector("#routeInsight").textContent = "闭环行程 · 北京 → 上海 → 北京";
  });

  const model = await page.evaluate(() => window.prototypeStore.buildDataModel());
  expect(model.users[0]).toMatchObject({
    id: "mock-user-employee",
    role: "employee",
    platform: "feishu",
  });
  expect(model.departments.length).toBeGreaterThanOrEqual(2);
  expect(model.expense_claims).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "draft-current", status: "draft", risk_count: 1 }),
      expect.objectContaining({
        id: "claim-store-e2e",
        status: "manager_approved",
        ledger_status: "ready_to_post",
        archive_no: "FIN-202605-0099",
      }),
    ]),
  );
  expect(model.expense_items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        claim_id: "claim-store-e2e",
        vendor: "E2E 数据结构餐饮",
        employee_note: "业务复盘。",
      }),
    ]),
  );
  expect(model.receipts).toEqual(expect.arrayContaining([expect.objectContaining({ storage_status: "prototype-local" })]));
  expect(model.approval_tasks).toEqual(expect.arrayContaining([expect.objectContaining({ claim_id: "claim-store-e2e", step: "主管审批" })]));
  expect(model.audit_logs).toEqual(expect.arrayContaining([expect.objectContaining({ event: "主管审批/同意" })]));
  expect(model.finance_archives).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        claim_id: "claim-store-e2e",
        ledger_status: "ready_to_post",
        voucher_files: ["FIN-202605-0099-audit.txt"],
      }),
    ]),
  );
});
