export default function handler(request, response) {
  response.status(200).json({
    prototype: {
      mode: "prototype",
      persistence: "browser-local",
      mockApi: true,
      databaseConnected: Boolean(process.env.DATABASE_URL),
      objectStorageConfigured: Boolean(process.env.OBJECT_STORAGE_BUCKET),
    },
    ai: {
      provider: process.env.AI_PROVIDER || "auto",
      kimiConfigured: Boolean(process.env.MOONSHOT_API_KEY),
      volcengineConfigured: Boolean(process.env.VOLCENGINE_ARK_API_KEY && process.env.VOLCENGINE_ARK_MODEL),
      fallback: "mock",
    },
    enterprise: {
      feishuConfigured: Boolean(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET),
      dingtalkConfigured: false,
      browserTestMode: true,
    },
    validation: {
      contractCommand: "npm run test:contracts",
      e2eCommand: "npm run test:e2e",
      smokeUrl: "/?smoke=1",
    },
  });
}
