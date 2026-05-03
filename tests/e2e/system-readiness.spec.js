const { test, expect } = require("@playwright/test");

test("debug panel shows system readiness for prototype deployment", async ({ page }) => {
  await page.goto("/");

  await page.locator("#roleSelector").selectOption("admin");
  await page.locator('.nav-item[data-view="debug"]').click();
  await expect(page.locator("#debugView")).toHaveClass(/active/);

  await page.getByRole("button", { name: "运行测试" }).click();

  const output = page.locator("#aiDebugOutput");
  await expect(output).toContainText('"readiness"');
  await expect(output).toContainText('"mockApi": true');
  await expect(output).toContainText('"browserTestMode": true');
  await expect(output).toContainText('"persistence"');
  await expect(output).toContainText('"mode": "local"');
  await expect(output).toContainText('"databaseConnected": false');
  await expect(output).toContainText('"contractCommand": "npm run test:contracts"');
  await expect(output).toContainText('"smokeUrl": "/?smoke=1"');
});
