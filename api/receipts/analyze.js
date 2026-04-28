export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const files = Array.isArray(request.body?.files) ? request.body.files : [];
  if (!files.length) {
    response.status(400).json({ error: "Missing receipt files" });
    return;
  }

  const provider = (process.env.AI_PROVIDER || "auto").toLowerCase();

  try {
    if ((provider === "auto" || provider === "kimi") && process.env.MOONSHOT_API_KEY) {
      const result = await analyzeWithOpenAICompatible({
        apiKey: process.env.MOONSHOT_API_KEY,
        baseUrl: process.env.MOONSHOT_BASE_URL || "https://api.moonshot.cn/v1",
        model: process.env.KIMI_MODEL || "kimi-k2.5",
        files,
      });
      response.status(200).json({ ...normalizeModelResult(result, files), source: "kimi" });
      return;
    }
  } catch (error) {
    if (provider === "kimi") {
      response.status(200).json({
        ...createMockAnalysis(files),
        source: "mock",
        aiError: error.message || "Kimi receipt analysis failed",
      });
      return;
    }
  }

  try {
    if ((provider === "auto" || provider === "volcengine") && process.env.VOLCENGINE_ARK_API_KEY && process.env.VOLCENGINE_ARK_MODEL) {
      const result = await analyzeWithOpenAICompatible({
        apiKey: process.env.VOLCENGINE_ARK_API_KEY,
        baseUrl: process.env.VOLCENGINE_ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3",
        model: process.env.VOLCENGINE_ARK_MODEL,
        files,
      });
      response.status(200).json({ ...normalizeModelResult(result, files), source: "volcengine" });
      return;
    }
  } catch (error) {
    if (provider === "volcengine") {
      response.status(200).json({
        ...createMockAnalysis(files),
        source: "mock",
        aiError: error.message || "Volcengine receipt analysis failed",
      });
      return;
    }
  }

  response.status(200).json({ ...createMockAnalysis(files), source: "mock" });
}

async function analyzeWithOpenAICompatible({ apiKey, baseUrl, model, files }) {
  const imageFiles = files.filter((file) => String(file.type || "").startsWith("image/"));
  const content = [
    {
      type: "text",
      text: buildPrompt(files),
    },
    ...imageFiles.map((file) => ({
      type: "image_url",
      image_url: {
        url: file.dataUrl,
      },
    })),
  ];

  const apiResponse = await fetch(`${baseUrl}/chat/completions`, {
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

  const data = await apiResponse.json();
  if (!apiResponse.ok) {
    throw new Error(data.error?.message || data.msg || "Model request failed");
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty model response");

  return parseJsonResponse(text);
}

function buildPrompt(files) {
  const fileList = files.map((file, index) => `${index + 1}. ${file.name} (${file.type || "unknown"})`).join("\n");
  return `你是企业报销票据识别助手。请根据上传的票据图片提取报销信息，并生成结构化 JSON。

文件列表：
${fileList}

要求：
1. 只返回 JSON，不要输出解释性文字。
2. 不确定的字段填 null，不要编造票据上没有的信息。
3. 如果文件不是图片或无法识别，请基于文件名给出低置信度草稿，并标记 status 为“需确认”。
4. 如果可能遗漏住宿、本地交通、餐饮等票据，只放到 completeness_suggestions，不得阻止提交。

JSON 结构：
{
  "trip": {
    "from_city": null,
    "to_city": null,
    "start_date": null,
    "end_date": null,
    "confidence": 0
  },
  "suggestedTitle": "",
  "summary": "",
  "items": [
    {
      "date": null,
      "category": "机票|火车票|住宿|本地交通|餐饮|办公|其他",
      "vendor": null,
      "amount": null,
      "tax_amount": null,
      "invoice_number": null,
      "confidence": 0,
      "status": "AI 已识别|需确认"
    }
  ],
  "risk_flags": [],
  "completeness_suggestions": []
}`;
}

function parseJsonResponse(text) {
  const trimmed = String(text).trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const match = withoutFence.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : withoutFence);
}

function normalizeModelResult(result, files) {
  const normalized = result && typeof result === "object" ? result : {};
  const items = Array.isArray(normalized.items) ? normalized.items : [];
  return {
    trip: normalized.trip || {},
    suggestedTitle: normalized.suggestedTitle || "",
    summary: normalized.summary || "AI 已识别票据并生成报销草稿。",
    items: items.length ? items.map(normalizeItem) : createMockAnalysis(files).items,
    risk_flags: Array.isArray(normalized.risk_flags) ? normalized.risk_flags : [],
    completeness_suggestions: Array.isArray(normalized.completeness_suggestions) ? normalized.completeness_suggestions : [],
  };
}

function normalizeItem(item) {
  return {
    date: item.date || "",
    category: item.category || "其他",
    vendor: item.vendor || "待确认商户",
    amount: Number(item.amount || 0),
    tax_amount: item.tax_amount ?? null,
    invoice_number: item.invoice_number || null,
    confidence: Number(item.confidence || 0),
    status: item.status || (Number(item.confidence || 0) < 0.7 ? "需确认" : "AI 已识别"),
  };
}

function createMockAnalysis(files) {
  const templates = [
    { category: "机票", vendor: "航空行程单", amount: 1280, status: "已匹配审批" },
    { category: "本地交通", vendor: "出行平台", amount: 146, status: "自动分类" },
    { category: "住宿", vendor: "酒店住宿", amount: 560, status: "已匹配审批" },
    { category: "餐饮", vendor: "餐饮商户", amount: 276, status: "需补充说明" },
    { category: "其他", vendor: "其他费用", amount: 88, status: "需确认" },
  ];

  return {
    trip: {
      from_city: "北京",
      to_city: "上海",
      start_date: "2026-04-08",
      end_date: "2026-04-10",
      confidence: 0.6,
    },
    suggestedTitle: "北京至上海客户拜访",
    summary: "2026-04-08 至 2026-04-10，已生成可编辑报销草稿。",
    items: files.map((file, index) => {
      const template = templates[index % templates.length];
      return {
        date: `2026-04-${String(8 + Math.min(index, 2)).padStart(2, "0")}`,
        category: inferCategory(file.name, template.category),
        vendor: inferVendor(file.name, template.vendor),
        amount: template.amount + index * 18,
        confidence: 0.5,
        status: template.status,
      };
    }),
    risk_flags: [],
    completeness_suggestions: ["如有住宿、本地交通或餐饮票据，可继续补充；不影响提交。"],
  };
}

function inferCategory(fileName, fallback) {
  const name = String(fileName || "").toLowerCase();
  if (name.includes("hotel") || name.includes("酒店") || name.includes("住宿")) return "住宿";
  if (name.includes("taxi") || name.includes("didi") || name.includes("打车")) return "本地交通";
  if (name.includes("flight") || name.includes("机票") || name.includes("行程")) return "机票";
  if (name.includes("餐") || name.includes("food")) return "餐饮";
  return fallback;
}

function inferVendor(fileName, fallback) {
  const base = String(fileName || "").replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim();
  return base ? `${fallback} · ${base.slice(0, 18)}` : fallback;
}
