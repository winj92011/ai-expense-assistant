export default function handler(request, response) {
  response.status(200).json({
    expense_claims: [],
    expense_items: [],
    receipts: [],
    approval_tasks: [],
    audit_logs: [],
    finance_archives: [],
    note: "Prototype endpoint only. The browser preview builds live data from local state.",
  });
}
