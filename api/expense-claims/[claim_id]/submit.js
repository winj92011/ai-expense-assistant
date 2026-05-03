export default function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const claimId = request.query?.claim_id || "claim_mock_001";
  response.status(200).json({
    claim: {
      id: claimId,
      status: "submitted",
    },
    approval_task: {
      id: "task_manager_001",
      claim_id: claimId,
      step: "主管审批",
      actor: "mock-user-manager",
      status: "pending",
    },
    audit_log: {
      event: "员工提交/submitted",
      actor: request.body?.employee_id || "mock-user-employee",
    },
  });
}
