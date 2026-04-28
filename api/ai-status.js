export default function handler(request, response) {
  response.status(200).json({
    provider: process.env.AI_PROVIDER || "auto",
    kimiConfigured: Boolean(process.env.MOONSHOT_API_KEY),
    kimiModel: process.env.KIMI_MODEL || "kimi-k2.5",
    volcengineConfigured: Boolean(process.env.VOLCENGINE_ARK_API_KEY && process.env.VOLCENGINE_ARK_MODEL),
    volcengineModelConfigured: Boolean(process.env.VOLCENGINE_ARK_MODEL),
  });
}
