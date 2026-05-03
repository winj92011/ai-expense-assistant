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
