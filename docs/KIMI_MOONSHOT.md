# Kimi / Moonshot 接入方案

## v0.1 路线

如果已有 Kimi API Key，可以先用 Kimi K2.5 直接完成票据识别和行程推断：

`票据图片 -> 后端 -> Kimi K2.5 -> 结构化 JSON -> 报销草稿`

Kimi 官方文档说明 `kimi-k2.5` 支持视觉与文本输入，并兼容 OpenAI Chat Completions 格式。

## 环境变量

```bash
AI_PROVIDER=kimi
MOONSHOT_API_KEY=your_api_key
MOONSHOT_BASE_URL=https://api.moonshot.ai/v1
KIMI_MODEL=kimi-k2.5
```

## 后端调用原则

- 不要在浏览器前端调用 Kimi API
- 不要把 API Key 写入源码
- 后端把图片转成 Base64 `data:image/...;base64,...`
- 要求模型只返回 JSON
- AI 结果只生成草稿，不自动入账、不自动付款

## Node 调用示例

见 `server/kimiReceiptClient.mjs`。

## 最小测试

在有 Node 环境的终端中，可以写一个临时脚本调用：

```js
import { analyzeReceiptsWithKimi } from "./server/kimiReceiptClient.mjs";

const result = await analyzeReceiptsWithKimi({
  images: ["data:image/png;base64,..."],
  apiKey: process.env.MOONSHOT_API_KEY,
  model: process.env.KIMI_MODEL || "kimi-k2.5",
});

console.log(JSON.stringify(result, null, 2));
```
