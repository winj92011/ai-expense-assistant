export default function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const approved = (request.body?.decision || "approved") === "approved";
  response.status(200).json({
    claim: {
      id: request.body?.claim_id || "claim_mock_001",
      status: approved ? "manager_approved" : "submitted",
    },
    next_task: approved
      ? {
          id: "task_finance_001",
          claim_id: request.body?.claim_id || "claim_mock_001",
          step: "财务复核",
          actor: "mock-user-finance",
          status: "pending",
        }
      : null,
  });
}
