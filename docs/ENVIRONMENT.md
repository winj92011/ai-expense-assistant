# 环境变量说明

当前项目可以在没有任何密钥的情况下运行原型和 E2E。没有配置 AI 或企业平台变量时，页面会使用 mock 数据和浏览器测试模式。

## 原型默认行为

| 变量 | 必需 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `AI_PROVIDER` | 否 | `auto` | `auto` 会优先尝试 Kimi，再尝试火山方舟，最后回落 mock |

## Kimi / Moonshot

| 变量 | 必需 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `MOONSHOT_API_KEY` | 接 Kimi 时必需 | 空 | Moonshot API Key，只能放在后端环境 |
| `MOONSHOT_BASE_URL` | 否 | `https://api.moonshot.ai/v1` | OpenAI 兼容接口地址 |
| `KIMI_MODEL` | 否 | `kimi-k2.5` | 票据识别模型 |

## 豆包 / 火山方舟

| 变量 | 必需 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `VOLCENGINE_ARK_API_KEY` | 接火山方舟时必需 | 空 | 火山方舟 API Key |
| `VOLCENGINE_ARK_BASE_URL` | 否 | `https://ark.cn-beijing.volces.com/api/v3` | OpenAI 兼容接口地址 |
| `VOLCENGINE_ARK_MODEL` | 接火山方舟时必需 | 空 | 模型 ID 或推理接入点 ID |

## 飞书

| 变量 | 必需 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `FEISHU_APP_ID` | 接飞书免登时必需 | 空 | 飞书企业自建应用 App ID |
| `FEISHU_APP_SECRET` | 接飞书免登时必需 | 空 | 飞书企业自建应用 App Secret |
| `FEISHU_BOT_WEBHOOK` | 接机器人通知时必需 | 空 | 后续消息通知预留 |
| `FEISHU_REDIRECT_URI` | 视 OAuth 配置而定 | 空 | 后续标准 OAuth 回调预留 |

## 未来持久化

这些变量当前只占位，不影响原型运行。

| 变量 | 必需 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `DATABASE_URL` | 接数据库时必需 | 空 | 未来保存报销单、明细、审批、审计日志 |
| `OBJECT_STORAGE_BUCKET` | 接附件存储时必需 | 空 | 未来保存票据和凭证包 |
| `OBJECT_STORAGE_REGION` | 接附件存储时必需 | 空 | 对象存储区域 |
| `OBJECT_STORAGE_ACCESS_KEY` | 接附件存储时必需 | 空 | 对象存储访问 Key |
| `OBJECT_STORAGE_SECRET_KEY` | 接附件存储时必需 | 空 | 对象存储访问 Secret |

## 本地验证

```bash
npm run test:contracts
npm run test:e2e
```

`test:contracts` 会检查 `.env.example`、环境变量文档、API 契约、数据模型和 mock API 响应形状。
## Database Persistence

Set `DATABASE_URL` to enable Postgres persistence through the prototype persistence API. The browser remains in local mode by default; use `?persistence=api` when validating the database-backed path.
