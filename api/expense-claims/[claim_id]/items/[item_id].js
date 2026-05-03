export default function handler(request, response) {
  if (request.method !== "PATCH") {
    response.setHeader("Allow", "PATCH");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  response.status(200).json({
    item: {
      id: request.query?.item_id || "item_mock_001",
      claim_id: request.query?.claim_id || "claim_mock_001",
      category: request.body?.category || "餐饮",
      vendor: request.body?.vendor || "客户餐叙",
      amount: Number(request.body?.amount || 0),
      status: request.body?.status || "需补充说明",
      employee_note: request.body?.employee_note || "",
    },
  });
}
