# AI 报销助理接口契约

当前接口契约对应产品原型阶段，目标是为后续接数据库、附件存储、飞书/钉钉审批和财务归档做准备。数据对象字段参考 `docs/DATA_MODEL.md`。

当前仓库已为关键契约提供 prototype mock API 文件。这些接口返回契约形状，暂不写数据库；后续接入真实后端时可逐个替换实现。

## 状态枚举

后端建议使用英文状态，前端可按语言包展示中文。

| 后端状态 | 中文展示 | 说明 |
| --- | --- | --- |
| draft | 草稿 | 员工仍在编辑 |
| submitted | 待主管审批 | 员工已提交 |
| manager_approved | 待财务复核 | 主管已同意 |
| finance_reviewed | 待出纳付款 | 财务已复核并生成凭证号 |
| paid | 已付款 | 出纳已付款，入账状态为已入账 |

入账状态建议单独保存：

| 后端状态 | 中文展示 |
| --- | --- |
| not_posted | 未入账 |
| ready_to_post | 待入账 |
| posted | 已入账 |

## 票据识别

`POST /api/receipts/analyze`

请求：

```json
{
  "employee_id": "u_1001",
  "files": [
    {
      "name": "hotel-invoice.png",
      "type": "image/png",
      "size": 120000,
      "dataUrl": "data:image/png;base64,..."
    }
  ]
}
```

响应：

```json
{
  "trip": {
    "from_city": "北京",
    "to_city": "上海",
    "start_date": "2026-04-08",
    "end_date": "2026-04-10",
    "matched_approval_id": "trip_20260408_001",
    "confidence": 0.91
  },
  "items": [
    {
      "date": "2026-04-08",
      "category": "住宿",
      "vendor": "上海虹桥商务酒店",
      "amount": 1560,
      "tax_amount": 88.3,
      "invoice_number": "044002600111",
      "source_file_id": "file_abc",
      "confidence": 0.94
    }
  ],
  "summary": "识别到北京至上海客户拜访差旅，合计 5 张票据。",
  "risk_flags": [
    {
      "type": "policy_warning",
      "message": "1 张餐饮票据接近单人标准上限，建议补充业务说明。",
      "severity": "medium"
    }
  ]
}
```

## 获取当前用户上下文

`GET /api/session/context`

响应：

```json
{
  "user": {
    "id": "u_1001",
    "name": "吴经理",
    "role": "employee",
    "department_id": "dept-product",
    "platform": "feishu",
    "platform_user_id": "ou_xxx"
  },
  "permissions": ["expense:create", "expense:read:self"],
  "locale": "zh-CN"
}
```

## 创建报销草稿

`POST /api/expense-claims/drafts`

请求：

```json
{
  "employee_id": "u_1001",
  "trip": {
    "matched_approval_id": "trip_20260408_001",
    "from_city": "北京",
    "to_city": "上海",
    "start_date": "2026-04-08",
    "end_date": "2026-04-10"
  },
  "items": [
    {
      "category": "住宿",
      "amount": 1560,
      "receipt_id": "r_001"
    }
  ]
}
```

响应：

```json
{
  "claim": {
    "id": "claim_202604_001",
    "employee_id": "u_1001",
    "status": "draft",
    "title": "北京至上海客户拜访差旅报销",
    "total": 4286,
    "currency": "CNY",
    "receipt_count": 5,
    "risk_count": 1,
    "route_summary": "闭环行程 · 北京 → 上海 → 北京"
  },
  "items": [
    {
      "id": "item_001",
      "claim_id": "claim_202604_001",
      "category": "住宿",
      "vendor": "上海虹桥商务酒店",
      "amount": 1560,
      "status": "已匹配审批"
    }
  ]
}
```

## 更新报销明细

`PATCH /api/expense-claims/{claim_id}/items/{item_id}`

请求：

```json
{
  "category": "餐饮",
  "vendor": "客户餐叙",
  "amount": 286,
  "employee_note": "客户晚餐，参与人 4 人，项目复盘。"
}
```

响应：

```json
{
  "item": {
    "id": "item_003",
    "claim_id": "claim_202604_001",
    "category": "餐饮",
    "vendor": "客户餐叙",
    "amount": 286,
    "status": "需补充说明",
    "employee_note": "客户晚餐，参与人 4 人，项目复盘。"
  }
}
```

## 提交报销

`POST /api/expense-claims/{claim_id}/submit`

请求：

```json
{
  "employee_id": "u_1001",
  "comment": "确认提交"
}
```

响应：

```json
{
  "claim": {
    "id": "claim_202604_001",
    "status": "submitted"
  },
  "approval_task": {
    "id": "task_manager_001",
    "claim_id": "claim_202604_001",
    "step": "主管审批",
    "actor": "u_manager_001",
    "status": "pending"
  },
  "audit_log": {
    "event": "员工提交/submitted",
    "actor": "u_1001"
  }
}
```

## 主管审批

`POST /api/approval-tasks/{task_id}/decision`

请求：

```json
{
  "actor_id": "u_manager_001",
  "decision": "approved",
  "comment": "同意"
}
```

响应：

```json
{
  "claim": {
    "id": "claim_202604_001",
    "status": "manager_approved"
  },
  "next_task": {
    "id": "task_finance_001",
    "claim_id": "claim_202604_001",
    "step": "财务复核",
    "actor": "u_finance_001",
    "status": "pending"
  }
}
```

## 财务复核

`POST /api/finance/claims/{claim_id}/review`

请求：

```json
{
  "actor_id": "u_finance_001",
  "audit_note": "票据与审批链一致，准予入账。"
}
```

响应：

```json
{
  "claim": {
    "id": "claim_202604_001",
    "status": "finance_reviewed",
    "archive_no": "FIN-202605-0001",
    "voucher_no": "V-202605-0001",
    "ledger_status": "待入账",
    "audit_note": "票据与审批链一致，准予入账。"
  },
  "finance_archive": {
    "claim_id": "claim_202604_001",
    "archive_no": "FIN-202605-0001",
    "voucher_no": "V-202605-0001",
    "voucher_files": [
      "FIN-202605-0001-cover.pdf",
      "FIN-202605-0001-receipts.zip",
      "FIN-202605-0001-ledger.csv",
      "FIN-202605-0001-audit.txt"
    ]
  }
}
```

## 出纳付款

`POST /api/finance/claims/{claim_id}/pay`

请求：

```json
{
  "actor_id": "u_cashier_001",
  "payment_ref": "PAY-202605-0001"
}
```

响应：

```json
{
  "claim": {
    "id": "claim_202604_001",
    "status": "paid",
    "ledger_status": "已入账"
  },
  "audit_log": {
    "event": "出纳付款/paid",
    "actor": "u_cashier_001"
  }
}
```

## 导出数据对象预览

`GET /api/prototype/data-model-preview?claim_id=claim_202604_001`

响应：

```json
{
  "expense_claims": [],
  "expense_items": [],
  "receipts": [],
  "approval_tasks": [],
  "audit_logs": [],
  "finance_archives": []
}
```

## 推送飞书审批卡片

`POST /api/feishu/cards/expense-approval`

请求：

```json
{
  "claim_id": "claim_202604_001",
  "approver_open_id": "ou_xxx",
  "card": {
    "title": "吴经理提交了 ¥4,286 差旅报销",
    "summary": "北京至上海客户拜访，7 张票据，1 项需要确认。"
  }
}
```

响应：

```json
{
  "message_id": "om_xxx",
  "status": "sent"
}
```
