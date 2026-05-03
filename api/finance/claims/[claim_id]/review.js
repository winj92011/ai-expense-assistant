export default function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const claimId = request.query?.claim_id || "claim_mock_001";
  const archiveNo = "FIN-202605-0001";
  const voucherNo = "V-202605-0001";

  response.status(200).json({
    claim: {
      id: claimId,
      status: "finance_reviewed",
      archive_no: archiveNo,
      voucher_no: voucherNo,
      ledger_status: "ready_to_post",
      audit_note: request.body?.audit_note || "票据与审批链一致，准予入账。",
    },
    finance_archive: {
      claim_id: claimId,
      archive_no: archiveNo,
      voucher_no: voucherNo,
      voucher_files: [
        `${archiveNo}-cover.pdf`,
        `${archiveNo}-receipts.zip`,
        `${archiveNo}-ledger.csv`,
        `${archiveNo}-audit.txt`,
      ],
    },
  });
}
