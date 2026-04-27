const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

export async function analyzeReceiptsWithDoubao({ images, apiKey, model, baseUrl = DEFAULT_BASE_URL }) {
  if (!apiKey) throw new Error("Missing VOLCENGINE_ARK_API_KEY");
  if (!model) throw new Error("Missing VOLCENGINE_ARK_MODEL");
  if (!Array.isArray(images) || images.length === 0) throw new Error("At least one image is required");

  const content = [
    {
      type: "text",
      text: buildReceiptPrompt(),
    },
    ...images.map((image) => ({
      type: "image_url",
      image_url: {
        url: image,
      },
    })),
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content,
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Volcengine Ark request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty model response");

  return parseJsonResponse(text);
}

function parseJsonResponse(text) {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim()
    : trimmed;

  return JSON.parse(jsonText);
}

function buildReceiptPrompt() {
  return `你是企业报销票据识别助手。请根据上传的票据图片或 PDF，提取结构化信息，并推断可能的出差行程。

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
}`;
}
