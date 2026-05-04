const { test, expect } = require("@playwright/test");

test("persistence adapter saves, reads, and clears prototype snapshots", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByLabel("原型本地暂存")).toBeVisible();

  const adapterInfo = await page.evaluate(() => window.prototypePersistence.adapter.describe());
  expect(adapterInfo).toMatchObject({
    mode: "local",
    databaseConnected: false,
    apiReady: false,
  });

  const saved = await page.evaluate(() =>
    window.prototypePersistence.adapter.save({
      savedAt: "2026-05-03T00:00:00.000Z",
      draftItems: [{ vendor: "E2E Adapter Hotel", amount: 520 }],
      submittedClaims: [{ id: "adapter-claim", title: "E2E Adapter Claim" }],
      claimStatus: "submitted",
    }),
  );

  expect(saved).toMatchObject({
    persistenceMode: "local",
    claimStatus: "submitted",
  });

  const restored = await page.evaluate(() => window.prototypePersistence.adapter.read());
  expect(restored.draftItems[0].vendor).toBe("E2E Adapter Hotel");
  expect(restored.submittedClaims[0].id).toBe("adapter-claim");

  await page.evaluate(() => window.prototypePersistence.adapter.clear());
  const cleared = await page.evaluate(() => window.prototypePersistence.adapter.read());
  expect(cleared).toBeNull();
});

test("api persistence mode falls back to local storage when the API is unavailable", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());

  const result = await page.evaluate(async () => {
    const adapter = window.createPersistenceAdapter({
      mode: "api",
      key: "ai-expense-assistant:e2e-api-fallback",
      endpoint: "/api/not-real-persistence-endpoint",
    });
    const saved = await adapter.save({
      savedAt: "2026-05-04T00:00:00.000Z",
      draftItems: [{ vendor: "E2E API Fallback Hotel", amount: 610 }],
      submittedClaims: [],
      claimStatus: "ready",
    });
    const restored = await adapter.read();
    await adapter.clear();
    const cleared = await adapter.read();
    return {
      info: adapter.describe(),
      saved,
      restored,
      cleared,
    };
  });

  expect(result.info).toMatchObject({
    mode: "api",
    fallback: "local",
    apiReady: false,
  });
  expect(result.saved).toMatchObject({
    persistenceMode: "api-fallback",
    fallbackReason: "api_unavailable",
    claimStatus: "ready",
  });
  expect(result.restored.draftItems[0].vendor).toBe("E2E API Fallback Hotel");
  expect(result.cleared).toBeNull();
});

test("api persistence mode reports database-backed saves when the endpoint is connected", async ({ page }) => {
  await page.route("**/api/prototype/data-model-preview", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          snapshot: body,
          persistence: {
            mode: "api",
            databaseConnected: true,
            apiReady: true,
            database: "postgres",
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        model: { expense_claims: [{ id: "claim-db-e2e" }], expense_items: [], receipts: [], approval_tasks: [], audit_logs: [], finance_archives: [] },
        persistence: {
          mode: "api",
          databaseConnected: true,
          apiReady: true,
          database: "postgres",
        },
      }),
    });
  });

  await page.goto("/?persistence=api");
  await page.evaluate(() => localStorage.clear());

  const result = await page.evaluate(async () => {
    const adapter = window.createPersistenceAdapter({
      mode: "api",
      key: "ai-expense-assistant:e2e-api-database",
    });
    const saved = await adapter.save({
      savedAt: "2026-05-04T01:00:00.000Z",
      draftItems: [{ vendor: "E2E Database Hotel", amount: 720 }],
      submittedClaims: [],
      claimStatus: "ready",
    });
    const restored = await adapter.read();
    return {
      info: adapter.describe(),
      saved,
      restored,
    };
  });

  expect(result.info).toMatchObject({
    mode: "api",
    databaseConnected: true,
    apiReady: true,
  });
  expect(result.saved).toMatchObject({
    persistenceMode: "api-database",
    databaseConnected: true,
  });
  expect(result.restored.expense_claims[0].id).toBe("claim-db-e2e");
});

test("api persistence mode restores visible page state from database records", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.route("**/api/prototype/data-model-preview", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        model: {
          meta: { generated_at: "2026-05-04T02:00:00.000Z" },
          departments: [],
          users: [],
          expense_claims: [
            {
              id: "draft-current",
              employee_id: "mock-user-employee",
              title: "E2E 数据库恢复草稿",
              status: "draft",
              total: 880,
              currency: "CNY",
              receipt_count: 1,
              risk_count: 0,
              route_summary: "数据库恢复路线",
              source: "prototype",
            },
            {
              id: "claim-visible-db",
              employee_id: "mock-user-employee",
              title: "E2E 数据库恢复单据",
              status: "submitted",
              total: 660,
              currency: "CNY",
              receipt_count: 1,
              risk_count: 0,
              route_summary: "数据库恢复路线",
              source: "prototype",
            },
          ],
          expense_items: [
            {
              id: "item-visible-draft",
              claim_id: "draft-current",
              expense_date: "2026-05-04",
              invoice_date: "2026-05-04",
              category: "住宿",
              vendor: "E2E 数据库恢复酒店",
              amount: 880,
              currency: "CNY",
              status: "已识别",
            },
            {
              id: "item-visible-claim",
              claim_id: "claim-visible-db",
              expense_date: "2026-05-05",
              invoice_date: "2026-05-05",
              category: "交通",
              vendor: "E2E 数据库恢复交通",
              amount: 660,
              currency: "CNY",
              status: "已识别",
            },
          ],
          receipts: [],
          approval_tasks: [
            {
              id: "task-visible-db",
              claim_id: "claim-visible-db",
              step: "员工提交",
              actor: "吴经理",
              status: "已提交",
              handled_at: "05/04 10:00",
            },
          ],
          audit_logs: [],
          finance_archives: [],
        },
        persistence: {
          mode: "api",
          databaseConnected: true,
          apiReady: true,
          database: "postgres",
        },
      }),
    });
  });

  await page.goto("/?persistence=api");

  await expect(page.locator('input[value="E2E 数据库恢复酒店"]')).toBeVisible();
  await expect(page.locator("#draftsView")).toContainText("E2E 数据库恢复单据");
  await expect(page.locator("#persistenceStrip")).toContainText("数据库已连接");
});

test("data model exposes the current persistence mode", async ({ page }) => {
  await page.goto("/");

  const model = await page.evaluate(() => window.prototypeStore.buildDataModel());
  expect(model.meta.persistence).toMatchObject({
    mode: "local",
    databaseConnected: false,
    apiReady: false,
  });
});
