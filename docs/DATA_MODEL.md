# 数据模型草案

当前版本仍是前端原型。本文档用于对齐后续数据库、附件存储、审批任务和财务归档字段，和页面中的“数据对象预览”保持同一方向。

## 对象关系

```text
users
  └─ expense_claims
       ├─ expense_items
       │    └─ receipts
       ├─ approval_tasks
       ├─ audit_logs
       └─ finance_archives
```

## users

员工、主管、财务、出纳和管理员都归入用户表。正式接入飞书或钉钉后，企业身份字段会成为关键索引。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 内部用户 ID |
| name | string | 展示名 |
| title | string | 职位或角色说明 |
| role | string | employee / manager / finance / cashier / admin |
| department_id | string | 所属部门 |
| platform | string | feishu / dingtalk / browser |
| platform_user_id | string | 飞书 open_id / union_id，或钉钉 userid / unionid |

## departments

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 部门 ID |
| name | string | 部门名称 |
| manager_id | string | 直属主管用户 ID |

## expense_claims

报销单主表。草稿、审批中、财务复核、付款完成都属于同一张报销单的状态变化。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 报销单 ID |
| employee_id | string | 报销人 |
| title | string | 报销标题 |
| status | string | draft / submitted / manager_approved / finance_reviewed / paid |
| total | number | 总金额 |
| currency | string | 默认 CNY |
| receipt_count | number | 票据数量 |
| risk_count | number | 需确认明细数量 |
| route_summary | string | 行程闭环摘要 |
| archive_no | string | 财务归档号 |
| voucher_no | string | 凭证号 |
| ledger_status | string | 未入账 / 待入账 / 已入账 |
| audit_note | string | 财务审计说明 |
| source | string | prototype / feishu / dingtalk / api |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

## expense_items

报销明细表。一张报销单可包含多条费用明细。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 明细 ID |
| claim_id | string | 所属报销单 |
| expense_date | date | 费用或行程日期 |
| invoice_date | date | 开票日期 |
| category | string | 机票 / 火车票 / 住宿 / 餐饮 / 本地交通 / 其他 |
| vendor | string | 商户或承运方 |
| amount | number | 金额 |
| currency | string | 默认 CNY |
| status | string | AI 已识别 / 已匹配审批 / 需补充说明 / 需确认 |
| employee_note | string | 员工补充说明 |
| policy_warning | string | 政策提醒 |
| confidence | number | AI 识别置信度 |

## receipts

票据附件表。当前原型只展示文件名和状态，正式版本需要接对象存储。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 票据 ID |
| item_id | string | 关联报销明细 |
| file_name | string | 原始文件名 |
| mime_type | string | 文件类型 |
| storage_key | string | 对象存储 key |
| storage_status | string | uploaded / analyzed / archived |
| ocr_text | text | OCR 原文 |
| ai_result_json | json | AI 结构化识别结果 |

## approval_tasks

审批任务表，用于记录主管、财务、出纳待处理事项。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 任务 ID |
| claim_id | string | 所属报销单 |
| step | string | 员工提交 / 主管审批 / 财务复核 / 出纳付款 |
| actor | string | 处理人 |
| status | string | pending / approved / returned / completed |
| handled_at | datetime | 处理时间 |
| comment | string | 处理意见 |
| platform_message_id | string | 飞书或钉钉消息 ID |

## audit_logs

不可变审计日志。每个关键动作都写入一条日志，便于后续追踪。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 日志 ID |
| claim_id | string | 所属报销单 |
| event | string | 事件名称 |
| actor | string | 操作人 |
| payload_json | json | 事件上下文 |
| created_at | datetime | 发生时间 |

## finance_archives

财务归档表。保存归档号、凭证号、入账状态和凭证包文件清单。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| claim_id | string | 报销单 ID |
| archive_no | string | 归档号，例如 FIN-202605-0001 |
| voucher_no | string | 凭证号 |
| ledger_status | string | 未入账 / 待入账 / 已入账 |
| audit_note | string | 审计说明 |
| voucher_files | json | 凭证包文件列表 |
| exported_at | datetime | 导出时间 |
| posted_at | datetime | 入账时间 |

## 状态流转

```text
draft
  -> submitted
  -> manager_approved
  -> finance_reviewed
  -> paid
```

当前原型里的中文状态可映射为：

| 原型状态 | 后端状态 |
| --- | --- |
| 草稿 | draft |
| 待主管审批 | submitted |
| 待财务复核 | manager_approved |
| 待出纳付款 | finance_reviewed |
| 已付款 | paid |

## 后续持久化建议

1. 先保存 `expense_claims`、`expense_items`、`approval_tasks`、`audit_logs`。
2. 再接对象存储，保存 `receipts.storage_key` 和 AI 原始识别结果。
3. 财务复核稳定后，再拆出 `finance_archives`。
4. 企业身份接入后，把 `users.platform_user_id` 作为飞书/钉钉映射字段。
5. 所有状态变更都写 `audit_logs`，不要只改主表状态。
