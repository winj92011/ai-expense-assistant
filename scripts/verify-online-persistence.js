const DEFAULT_BASE_URL = "https://ai-expense-assistant.vercel.app";
const path = require("node:path");
const { loadEnvFiles } = require("./load-env-file");

loadEnvFiles(path.resolve(__dirname, ".."));

function baseUrl() {
  return (process.env.PRODUCTION_URL || process.argv[2] || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(response, label) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} did not return JSON: ${text.slice(0, 160)}`);
  }
}

async function assertOk(response, label) {
  if (response.ok) return;
  const text = await response.text();
  throw new Error(`${label} failed: ${response.status} ${text.slice(0, 500)}`);
}

function testModel() {
  const suffix = Date.now();
  const claimId = `claim_online_${suffix}`;
  const itemId = `item_online_${suffix}`;
  const receiptId = `receipt_online_${suffix}`;
  return {
    meta: {
      generated_at: new Date().toISOString(),
      persistence: { mode: "api" },
    },
    departments: [
      {
        id: "dept-product",
        name: "Product",
        manager_id: "mock-user-manager",
      },
    ],
    users: [
      {
        id: "mock-user-employee",
        name: "Online Verify Employee",
        title: "Pilot user",
        role: "employee",
        department_id: "dept-product",
        platform: "browser",
        platform_label: "Browser",
        platform_user_id: "browser-mock-user-employee",
      },
    ],
    expense_claims: [
      {
        id: claimId,
        employee_id: "mock-user-employee",
        title: "Online persistence verification",
        status: "draft",
        total: 1,
        currency: "CNY",
        receipt_count: 1,
        risk_count: 0,
        route_summary: "online verification",
        source: "prototype",
      },
    ],
    expense_items: [
      {
        id: itemId,
        claim_id: claimId,
        category: "verification",
        vendor: "Online DB Verify",
        amount: 1,
        currency: "CNY",
        status: "pending_review",
      },
    ],
    receipts: [
      {
        id: receiptId,
        item_id: itemId,
        file_name: "online-verify.pdf",
        mime_type: "application/pdf",
        storage_status: "prototype-local",
      },
    ],
    approval_tasks: [],
    audit_logs: [
      {
        id: `audit_online_${suffix}`,
        claim_id: claimId,
        event: "online.persistence.verify",
        actor: "Codex",
        payload_json: { source: "verify-online-persistence" },
      },
    ],
    finance_archives: [],
  };
}

async function main() {
  const root = baseUrl();
  const pageResponse = await fetch(`${root}/?persistence=api`);
  await assertOk(pageResponse, "Page check");

  const endpoint = `${root}/api/prototype/data-model-preview`;
  const model = testModel();
  const post = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      snapshot: {
        savedAt: model.meta.generated_at,
        claimStatus: "draft",
        draftItems: [{ vendor: "Online DB Verify", amount: 1 }],
      },
    }),
  });
  await assertOk(post, "Persistence POST");
  const posted = await readJson(post, "Persistence POST");
  assert(posted.persistence?.apiReady === true, "Persistence API is not ready");
  assert(posted.persistence?.databaseConnected === true, "Database is not connected online");

  const get = await fetch(endpoint);
  await assertOk(get, "Persistence GET");
  const current = await readJson(get, "Persistence GET");
  const claims = current.model?.expense_claims || current.expense_claims || [];
  assert(
    claims.some((claim) => claim.id === model.expense_claims[0].id),
    "Written verification claim was not found in the online database response",
  );

  console.log("Online database persistence verification passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
