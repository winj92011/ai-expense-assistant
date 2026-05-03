export default function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  response.status(200).json({
    claim: {
      id: request.query?.claim_id || "claim_mock_001",
      status: "paid",
      ledger_status: "posted",
    },
    audit_log: {
      event: "出纳付款/paid",
      actor: request.body?.actor_id || "mock-user-cashier",
    },
  });
}
