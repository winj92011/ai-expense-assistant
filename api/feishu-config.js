export default function handler(request, response) {
  response.status(200).json({
    appId: process.env.FEISHU_APP_ID || "",
    enabled: Boolean(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET),
  });
}
