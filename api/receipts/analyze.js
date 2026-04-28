export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const files = Array.isArray(request.body?.files) ? request.body.files : [];
  const travelBase = normalizeTravelBase(request.body?.travelBase);
  if (!files.length) {
    response.status(400).json({ error: "Missing receipt files" });
    return;
  }

  const provider = (process.env.AI_PROVIDER || "auto").toLowerCase();

  try {
    if ((provider === "auto" || provider === "kimi") && process.env.MOONSHOT_API_KEY) {
      const result = await analyzeWithOpenAICompatible({
        apiKey: process.env.MOONSHOT_API_KEY,
        baseUrl: process.env.MOONSHOT_BASE_URL || "https://api.moonshot.ai/v1",
        model: process.env.KIMI_MODEL || "kimi-k2.5",
        files,
        travelBase,
      });
      response.status(200).json({ ...normalizeModelResult(result, files, travelBase), source: "kimi" });
      return;
    }
  } catch (error) {
    if (provider === "kimi") {
      response.status(200).json({
        ...createMockAnalysis(files, travelBase),
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
        travelBase,
      });
      response.status(200).json({ ...normalizeModelResult(result, files, travelBase), source: "volcengine" });
      return;
    }
  } catch (error) {
    if (provider === "volcengine") {
      response.status(200).json({
        ...createMockAnalysis(files, travelBase),
        source: "mock",
        aiError: error.message || "Volcengine receipt analysis failed",
      });
      return;
    }
  }

  response.status(200).json({ ...createMockAnalysis(files, travelBase), source: "mock" });
}

function normalizeTravelBase(travelBase) {
  const primary = String(travelBase?.primary || "").trim();
  const secondary = String(travelBase?.secondary || "").trim();
  return {
    primary,
    secondary: secondary && secondary !== primary ? secondary : "",
  };
}

async function analyzeWithOpenAICompatible({ apiKey, baseUrl, model, files, travelBase }) {
  const imageFiles = files.filter((file) => String(file.type || "").startsWith("image/"));
  const content = [
    {
      type: "text",
      text: buildPrompt(files, travelBase),
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
      temperature: getModelTemperature(model),
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

function getModelTemperature(model) {
  return String(model || "").toLowerCase().includes("k2.6") ? 1 : 0.1;
}

function buildPrompt(files, travelBase) {
  const fileList = files.map((file, index) => `${index + 1}. ${file.name} (${file.type || "unknown"})`).join("\n");
  const baseCities = [travelBase?.primary, travelBase?.secondary].filter(Boolean).join("、") || "未提供";
  return `你是企业报销票据识别助手。请根据上传的票据图片提取报销信息，并生成结构化 JSON。

文件列表：
${fileList}

员工常驻出发地：
${baseCities}

要求：
1. 只返回 JSON，不要输出解释性文字。
2. 不确定的字段填 null，不要编造票据上没有的信息。
3. 如果文件不是图片或无法识别，请基于文件名给出低置信度草稿，并标记 status 为“需确认”。
4. 如果可能遗漏住宿、本地交通、餐饮等票据，只放到 completeness_suggestions，不得阻止提交。
5. date 必须优先填写实际消费、出行或履约日期，不要把开票日期当成报销明细日期。
6. 机票/火车票优先提取航班或车次的出发日期、出发地、目的地、航班号/车次；invoice_date 单独填写开票日期。
7. 住宿优先提取入住日期作为 date，invoice_date 单独填写开票日期。
8. trip.start_date 和 trip.end_date 应根据出行/住宿/交通日期推断，不要根据开票日期推断。
9. 根据员工常驻出发地判断闭环行程：如果路线从某个常驻出发地出发，经过一个或多个城市，最后回到同一常驻出发地，trip.is_closed_loop 填 true。
10. 如果没有看到返程票据，但路线明显从常驻出发地开始，trip.is_closed_loop 填 false，并在 completeness_suggestions 提醒可能缺少返程票据；不得阻止提交。
11. route_path 按时间顺序填写城市数组，例如 ["北京","上海","深圳","新加坡","北京"]。

JSON 结构：
{
  "trip": {
    "from_city": null,
    "to_city": null,
    "start_date": null,
    "end_date": null,
    "base_city": null,
    "is_closed_loop": false,
    "route_path": [],
    "confidence": 0
  },
  "suggestedTitle": "",
  "summary": "",
  "items": [
    {
      "date": null,
      "invoice_date": null,
      "category": "机票|火车票|住宿|本地交通|餐饮|办公|其他",
      "vendor": null,
      "route": null,
      "flight_or_train_no": null,
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

function normalizeModelResult(result, files, travelBase) {
  const normalized = result && typeof result === "object" ? result : {};
  const items = Array.isArray(normalized.items) ? normalized.items : [];
  const normalizedItems = items.length ? items.map(normalizeItem) : createMockAnalysis(files, travelBase).items;
  const trip = normalizeTrip(normalized.trip, travelBase);
  const completenessSuggestions = normalizeCompletenessSuggestions(
    normalized.completeness_suggestions,
    trip,
    travelBase,
  );

  return {
    trip,
    suggestedTitle: normalized.suggestedTitle || "",
    summary: normalized.summary || "AI 已识别票据并生成报销草稿。",
    items: normalizedItems,
    risk_flags: Array.isArray(normalized.risk_flags) ? normalized.risk_flags : [],
    completeness_suggestions: completenessSuggestions,
  };
}

function normalizeTrip(trip, travelBase) {
  const normalized = trip && typeof trip === "object" ? trip : {};
  const routePath = normalizeRoutePath(normalized);
  const baseCity = pickBaseCity(normalized, routePath, travelBase);
  const isClosedLoop = Boolean(normalized.is_closed_loop) || isClosedRoute(routePath, baseCity);

  return {
    ...normalized,
    base_city: baseCity || normalized.base_city || null,
    is_closed_loop: isClosedLoop,
    route_path: routePath,
  };
}

function normalizeRoutePath(trip) {
  const routePath = Array.isArray(trip.route_path) ? trip.route_path.map(normalizeCity).filter(Boolean) : [];
  if (routePath.length) return routePath;

  const fromCity = normalizeCity(trip.from_city);
  const toCity = normalizeCity(trip.to_city);
  return [fromCity, toCity].filter(Boolean);
}

function normalizeCity(city) {
  return String(city || "").trim();
}

function getBaseCandidates(travelBase) {
  return [travelBase?.primary, travelBase?.secondary].map(normalizeCity).filter(Boolean);
}

function pickBaseCity(trip, routePath, travelBase) {
  const candidates = getBaseCandidates(travelBase);
  const modelBase = normalizeCity(trip.base_city);
  if (modelBase && (!candidates.length || candidates.includes(modelBase))) return modelBase;

  return candidates.find((city) => routePath[0] === city || routePath.at(-1) === city) || candidates[0] || "";
}

function isClosedRoute(routePath, baseCity) {
  if (!baseCity || routePath.length < 2) return false;
  return routePath[0] === baseCity && routePath.at(-1) === baseCity;
}

function normalizeCompletenessSuggestions(suggestions, trip, travelBase) {
  const normalizedSuggestions = Array.isArray(suggestions) ? suggestions.filter(Boolean) : [];
  const routePath = Array.isArray(trip.route_path) ? trip.route_path : [];
  const baseCity = trip.base_city || pickBaseCity(trip, routePath, travelBase);
  const startsFromBase = Boolean(baseCity && routePath[0] === baseCity);

  if (startsFromBase && !trip.is_closed_loop && !hasReturnTicketSuggestion(normalizedSuggestions)) {
    normalizedSuggestions.push("本次行程从常驻出发地开始，但尚未看到返回常驻地的票据；如已有返程票据，可继续补充，不影响先提交。");
  }

  return normalizedSuggestions;
}

function hasReturnTicketSuggestion(suggestions) {
  return suggestions.some((suggestion) => String(suggestion).includes("返程") || String(suggestion).includes("返回"));
}

function normalizeItem(item) {
  return {
    date: item.date || "",
    invoice_date: item.invoice_date || item.invoiceDate || null,
    category: item.category || "其他",
    vendor: item.vendor || "待确认商户",
    route: item.route || null,
    flight_or_train_no: item.flight_or_train_no || item.flightNo || item.trainNo || null,
    amount: Number(item.amount || 0),
    tax_amount: item.tax_amount ?? null,
    invoice_number: item.invoice_number || null,
    confidence: Number(item.confidence || 0),
    status: item.status || (Number(item.confidence || 0) < 0.7 ? "需确认" : "AI 已识别"),
  };
}

function createMockAnalysis(files, travelBase = {}) {
  const templates = [
    { category: "机票", vendor: "航空行程单", amount: 1280, status: "已匹配审批" },
    { category: "本地交通", vendor: "出行平台", amount: 146, status: "自动分类" },
    { category: "住宿", vendor: "酒店住宿", amount: 560, status: "已匹配审批" },
    { category: "餐饮", vendor: "餐饮商户", amount: 276, status: "需补充说明" },
    { category: "其他", vendor: "其他费用", amount: 88, status: "需确认" },
  ];

  const baseCity = travelBase.primary || "北京";

  return {
    trip: {
      from_city: baseCity,
      to_city: "上海",
      start_date: "2026-04-08",
      end_date: "2026-04-10",
      base_city: baseCity,
      is_closed_loop: false,
      route_path: [baseCity, "上海"],
      confidence: 0.6,
    },
    suggestedTitle: `${baseCity}至上海客户拜访`,
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
