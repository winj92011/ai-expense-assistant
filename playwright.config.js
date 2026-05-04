const { defineConfig } = require("@playwright/test");

const httpServerCommand =
  process.platform === "win32"
    ? "npx.cmd http-server . -p 4173 -c-1"
    : "npx http-server . -p 4173 -c-1";

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: httpServerCommand,
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
