# AI 报销助理 v0.2

这是一个飞书优先的 AI 报销助理原型。当前版本是零依赖静态应用，可以直接打开 `index.html` 体验核心流程。

## 当前能力

- 飞书工作台风格入口
- 飞书内员工报销首屏
- 上传票据与拖拽上传
- 文件卡片状态
- 模拟 AI 票据识别
- 自动生成行程摘要和报销草稿
- 本地结构化草稿
- 删除报销明细
- 提交后生成记录
- `/api/receipts/analyze` AI 识别接口
- 异常提示
- 行程完整性建议，不强制补齐
- 浏览器本地暂存快照，用于原型演示时恢复草稿和单据
- 审批链路预览
- 财务台账 CSV 导出
- 数据对象预览与 JSON 导出，用于对齐后续数据库和附件存储
- 数据模型草案：`docs/DATA_MODEL.md`
- Prototype mock API 已按接口契约预留，暂不写真实数据库；`npm run test:contracts` 会检查文档和 mock API 响应形状
- 环境变量说明：`docs/ENVIRONMENT.md`
- 演示指南：`docs/DEMO_GUIDE.md`
- 原型自动验证：访问 `index.html?smoke=1` 或线上地址追加 `?smoke=1`，自动跑员工提交、主管审批、财务复核、凭证包、付款闭环和数据对象校验
- Playwright E2E：安装依赖后运行 `npm run test:e2e`，覆盖平台适配、角色权限、多语言、异常说明、本地暂存、财务凭证包、数据对象、系统诊断和 smoke 入口

## 自动验证

页面内冒烟验证：

```bash
https://ai-expense-assistant.vercel.app/?smoke=1
```

Playwright E2E：

```bash
npm install
npx playwright install
npm test
```

完整演示路径和人工 smoke test 清单见：`docs/DEMO_GUIDE.md`

发布前检查清单见：`docs/RELEASE_CHECKLIST.md`

后续数据库与对象关系草案见：`docs/DATA_MODEL.md`

后续接口契约草案见：`docs/API_CONTRACTS.md`

环境变量配置说明见：`docs/ENVIRONMENT.md`

## 原型暂存

页面会显示“浏览器本地暂存”工具条，可手动保存、恢复或清空当前草稿和已提交单据。该能力只用于原型演示，正式版本仍建议接入数据库、附件存储和企业身份权限。

## 后续接入顺序

1. 接入飞书企业自建应用免登录
2. 接入飞书通讯录与出差审批数据
3. 接入豆包/火山方舟视觉模型，输出结构化 JSON
4. 接入飞书机器人消息卡片
5. 增加后端、数据库和附件存储

## 建议后端数据表

- `users`
- `departments`
- `travel_approvals`
- `expense_claims`
- `expense_items`
- `receipts`
- `approval_tasks`
- `audit_logs`

## 飞书集成点

- 工作台网页应用主页
- OAuth 免登录
- 通讯录同步
- 机器人消息
- 交互式消息卡片

## AI 识别方案

第一版采用低成本方案：使用多模态大模型同时完成票据 OCR、费用分类、行程推断和异常提示。前端不保存 API Key，票据文件必须先传到后端，再由后端调用模型接口。

已准备两种低成本接入。`AI_PROVIDER=auto` 时会优先尝试 Kimi，再尝试豆包/火山方舟，最后回落到模拟识别。

- Kimi K2.5：`docs/KIMI_MOONSHOT.md`
- 豆包/火山方舟：`docs/DOUBAO_VOLCENGINE.md`
