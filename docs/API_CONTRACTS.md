# AI 报销助理接口契约

## 票据识别

`POST /api/receipts/analyze`

请求：

```json
{
  "employee_id": "u_1001",
  "files": [
    {
      "file_id": "file_abc",
      "file_name": "hotel-invoice.pdf",
      "mime_type": "application/pdf"
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
  "claim_id": "claim_202604_001",
  "status": "draft",
  "title": "北京至上海客户拜访差旅报销",
  "total_amount": 4286
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
