export default async function handler(request, response) {
  const provider = (process.env.AI_PROVIDER || "auto").toLowerCase();
  const kimiModel = process.env.KIMI_MODEL || "kimi-k2.5";
  const status = {
    provider,
    kimiConfigured: Boolean(process.env.MOONSHOT_API_KEY),
    kimiModel,
    kimiTextOk: false,
    kimiTextError: "",
  };

  if (!process.env.MOONSHOT_API_KEY) {
    response.status(200).json(status);
    return;
  }

  try {
    const res = await fetch(`${process.env.MOONSHOT_BASE_URL || "https://api.moonshot.ai/v1"}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MOONSHOT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: kimiModel,
        messages: [
          {
            role: "user",
            content: "只返回 JSON：{\"ok\":true,\"purpose\":\"ai-expense-debug\"}",
          },
        ],
        temperature: String(kimiModel || "").toLowerCase().includes("k2.6") ? 1 : 0,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      status.kimiTextError = data.error?.message || data.msg || `HTTP ${res.status}`;
    } else {
      status.kimiTextOk = true;
      status.sample = data?.choices?.[0]?.message?.content || "";
    }
  } catch (error) {
    status.kimiTextError = error.message || "Kimi text test failed";
  }

  response.status(200).json(status);
}
