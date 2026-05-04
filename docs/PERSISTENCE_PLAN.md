# 真实持久化最小版本计划

本文定义从当前演示原型进入“可小范围试点”的第一批持久化工作。目标不是一次做完企业级后端，而是让报销单、明细、审批任务和审计日志先能真实保存、恢复和继续处理。

## 目标

把当前浏览器 state 和 mock API 逐步替换成服务端可恢复数据：

- 刷新页面后仍能看到已创建的报销单。
- 换角色后仍能处理同一张单据。
- 审批和财务动作写入服务端审计日志。
- 数据对象预览和真实数据库对象保持同一套字段。

## 非目标

第一阶段暂不做：

- 真实银行付款。
- 深度财务系统集成。
- 复杂多租户计费。
- 完整企业组织同步。
- 正式合规审计认证。

## 推荐存储选择

优先选择轻量关系数据库，例如：

- Vercel Marketplace 上的 Postgres / Neon。
- Supabase Postgres。
- 本地开发可用 SQLite 或内存 mock 兜底。

原因：当前对象关系天然是关系型结构，后续审计、筛选、财务导出也更适合 SQL。

## 第一阶段落库对象

必须优先落库：

- `users`
- `departments`
- `expense_claims`
- `expense_items`
- `approval_tasks`
- `audit_logs`
- `finance_archives`

第二阶段再强化：

- `receipts.storage_key`
- `receipts.ocr_text`
- `receipts.ai_result_json`
- 凭证包真实文件清单

## API 策略

当前 Vercel Hobby 计划最多 12 个 Serverless Functions，仓库已经接近或达到上限。因此第一阶段不建议新增大量 `/api` 文件。

优先复用现有接口：

- `GET /api/session/context`
- `POST /api/receipts/analyze`
- `POST /api/expense-claims/{claim_id}/submit`
- `PATCH /api/expense-claims/{claim_id}/items/{item_id}`
- `POST /api/approval-tasks/{task_id}/decision`
- `POST /api/finance/claims/{claim_id}/review`
- `POST /api/finance/claims/{claim_id}/pay`
- `GET /api/prototype/data-model-preview`

如果需要新增“创建草稿”和“读取列表”，建议优先合并为一个 catch-all 或复用现有 `api/prototype/data-model-preview.js` 作为过渡，而不是新增多个函数文件。

## 最小 API 扩展建议

### 创建或保存草稿

建议路径：

```text
POST /api/expense-claims/drafts
```

如果受函数数量限制，可以先合并到：

```text
POST /api/prototype/data-model-preview
```

请求核心字段：

```json
{
  "employee_id": "mock-user-employee",
  "title": "北京至上海客户拜访",
  "items": [],
  "route_summary": "闭环行程 · 北京 → 上海 → 北京"
}
```

响应核心字段：

```json
{
  "claim": {
    "id": "claim_202605_001",
    "status": "draft"
  },
  "items": []
}
```

### 读取当前用户单据

建议路径：

```text
GET /api/expense-claims?employee_id=mock-user-employee
```

如果受函数数量限制，可以先由 `GET /api/prototype/data-model-preview` 返回当前原型数据快照。

## 数据写入顺序

### 员工创建草稿

1. upsert `users`
2. insert `expense_claims`
3. insert `expense_items`
4. insert `receipts` metadata
5. insert `audit_logs` event: `claim.created`

### 员工提交

1. update `expense_claims.status = submitted`
2. insert manager `approval_tasks`
3. insert `audit_logs` event: `claim.submitted`

### 主管审批

1. update manager `approval_tasks.status`
2. update `expense_claims.status = manager_approved`
3. insert finance `approval_tasks`
4. insert `audit_logs` event: `approval.approved`

### 财务复核

1. update finance `approval_tasks.status`
2. update `expense_claims.status = finance_reviewed`
3. upsert `finance_archives`
4. insert `audit_logs` event: `finance.reviewed`

### 出纳付款

1. update `expense_claims.status = paid`
2. update `finance_archives.ledger_status = posted`
3. insert `audit_logs` event: `finance.paid`

## 前端迁移策略

第一阶段不需要重写前端：

1. 保留当前 `state-store.js`，继续作为数据对象适配层。
2. 保留 `persistence-adapter.js`，让页面先通过统一 adapter 保存和恢复。当前 adapter 已支持 `local` 模式和 `api` fallback 模式；当 API 不可用时会回落到本地保存，后续接数据库时替换 endpoint 即可。
3. 服务端返回标准对象后，再回填页面 state。
4. 确认稳定后，逐步让提交、审批、财务复核按钮直接调用真实 API。

## 测试要求

每个阶段至少保留：

- 合同检查：`npm run test:contracts`
- 核心 E2E：`npm run test:e2e -- smoke.spec.js`
- 全量 E2E：`npm test`
- 线上 smoke：`/?smoke=1`
- 系统 readiness/debug 输出应展示当前 persistence adapter 状态。

新增持久化后，需要增加一个 E2E：

```text
persistence-api.spec.js
```

覆盖：

- 创建草稿。
- 刷新页面。
- 恢复草稿。
- 提交审批。
- 审计日志出现。

## 70% 达成判断

当以下能力稳定后，可以把成熟度从 55% 调整到约 70%：

- 报销单真实保存。
- 明细真实保存。
- 审批任务真实保存。
- 审计日志真实保存。
- 页面刷新后可恢复。
- 线上 smoke 和全量 E2E 稳定通过。

这时产品就不只是“看起来能跑”，而是进入“可以拿真实小样本试点”的阶段。

## Database Decision

Pilot persistence will use Postgres. See `docs/DATABASE_DECISION.md` for the storage choice and `db/schema.sql` for the first table schema.

## Database Adapter Implementation

The prototype persistence adapter can now use the existing `GET /api/prototype/data-model-preview` endpoint as a compact database bridge.

- Browser default remains local mode to keep demos stable without a database.
- Add `?persistence=api` or set `localStorage["ai-expense-assistant:persistence-mode"] = "api"` to use API persistence.
- When `DATABASE_URL` and the optional `postgres` package are available, the API writes the normalized data model into Postgres tables.
- When the database is unavailable, the browser adapter falls back to local storage and records `persistenceMode: "api-fallback"`.
- The database path is covered by `scripts/validate-database-persistence.js` without needing a real database during CI.
