# 豆包 / 火山引擎接入方案

## 低成本 v0.1 路线

第一版只接一个多模态模型：

`票据图片/PDF -> 后端 -> 豆包视觉模型 -> 结构化 JSON -> 报销草稿`

这样可以先省掉专业 OCR、发票验真和复杂票据服务。AI 结果只用于生成草稿，用户和财务仍然需要确认。

## 需要准备

1. 注册并登录火山引擎
2. 进入火山方舟
3. 创建 API Key
4. 开通豆包视觉模型
5. 获取模型 ID 或推理接入点 ID
6. 配置 `.env`

```bash
AI_PROVIDER=volcengine
VOLCENGINE_ARK_API_KEY=your_api_key
VOLCENGINE_ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VOLCENGINE_ARK_MODEL=your_model_or_endpoint_id
```

## 后端接口

前端上传票据后，调用自己的后端接口：

`POST /api/receipts/analyze`

后端负责：

1. 接收票据文件
2. 转成模型可读取的图片 URL 或 Base64
3. 调用火山方舟 Chat Completions
4. 要求模型只返回 JSON
5. 校验 JSON
6. 保存识别结果
7. 返回报销草稿

不要在浏览器前端直接调用火山方舟 API，否则 API Key 会暴露。

## 推荐提示词

```text
你是企业报销票据识别助手。请根据上传的票据图片或 PDF，提取结构化信息，并推断可能的出差行程。

要求：
1. 只返回 JSON，不要输出解释性文字。
2. 不确定的字段填 null，并给出 confidence。
3. 不要编造票据上没有的信息。
4. 可以根据日期、城市、商户和票据类型推断行程，但必须标记推断来源。
5. 如果发现可能遗漏住宿、餐饮、本地交通等票据，只作为 completeness_suggestions，不得阻止提交。

JSON 结构：
{
  "trip": {
    "from_city": null,
    "to_city": null,
    "start_date": null,
    "end_date": null,
    "confidence": 0
  },
  "items": [
    {
      "date": null,
      "category": "机票|火车票|住宿|本地交通|餐饮|办公|其他",
      "vendor": null,
      "amount": null,
      "tax_amount": null,
      "invoice_number": null,
      "departure_city": null,
      "arrival_city": null,
      "confidence": 0
    }
  ],
  "summary": "",
  "risk_flags": [],
  "completeness_suggestions": []
}
```

## Node 调用示例

见 `server/doubaoReceiptClient.mjs`。

## 后续升级

当报销量变大或财务要求更严格时，再增加：

- 专业 OCR 兜底
- 发票验真
- 重复发票库
- 公司制度知识库
- 飞书原生出差审批匹配
