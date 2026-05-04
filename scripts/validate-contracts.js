const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(text, value, label) {
  if (!text.includes(value)) {
    throw new Error(`${label} 缺少：${value}`);
  }
}

function assertFile(relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    throw new Error(`缺少文件：${relativePath}`);
  }
}

function assertFileIncludes(relativePath, values) {
  assertFile(relativePath);
  const text = read(relativePath);
  values.forEach((value) => assertIncludes(text, value, relativePath));
}

function main() {
  const api = read("docs/API_CONTRACTS.md");
  const model = read("docs/DATA_MODEL.md");
  const environment = read("docs/ENVIRONMENT.md");
  const envExample = read(".env.example");
  const readme = read("README.md");

  const tables = [
    "users",
    "departments",
    "expense_claims",
    "expense_items",
    "receipts",
    "approval_tasks",
    "audit_logs",
    "finance_archives",
  ];

  const claimStatuses = ["draft", "submitted", "manager_approved", "finance_reviewed", "paid"];
  const ledgerStatuses = ["not_posted", "ready_to_post", "posted"];
  const apiRoutes = [
    "POST /api/receipts/analyze",
    "GET /api/session/context",
    "POST /api/expense-claims/drafts",
    "PATCH /api/expense-claims/{claim_id}/items/{item_id}",
    "POST /api/expense-claims/{claim_id}/submit",
    "POST /api/approval-tasks/{task_id}/decision",
    "POST /api/finance/claims/{claim_id}/review",
    "POST /api/finance/claims/{claim_id}/pay",
    "GET /api/prototype/data-model-preview",
    "POST /api/feishu/cards/expense-approval",
  ];
  const apiFiles = [
    "api/receipts/analyze.js",
    "api/session/context.js",
    "api/expense-claims/[claim_id]/items/[item_id].js",
    "api/expense-claims/[claim_id]/submit.js",
    "api/approval-tasks/[task_id]/decision.js",
    "api/finance/claims/[claim_id]/review.js",
    "api/finance/claims/[claim_id]/pay.js",
    "api/prototype/data-model-preview.js",
    "api/feishu-config.js",
    "api/feishu-login.js",
  ];
  const frontendDataFiles = ["state-store.js", "data-model-preview.js"];
  const persistenceScripts = ["scripts/load-env-file.js", "scripts/run-db-schema.js", "scripts/verify-online-persistence.js"];
  const previewCollections = [
    "expense_claims",
    "expense_items",
    "receipts",
    "approval_tasks",
    "audit_logs",
    "finance_archives",
  ];
  const envVars = [
    "AI_PROVIDER",
    "MOONSHOT_API_KEY",
    "MOONSHOT_BASE_URL",
    "KIMI_MODEL",
    "VOLCENGINE_ARK_API_KEY",
    "VOLCENGINE_ARK_BASE_URL",
    "VOLCENGINE_ARK_MODEL",
    "FEISHU_APP_ID",
    "FEISHU_APP_SECRET",
    "FEISHU_BOT_WEBHOOK",
    "FEISHU_REDIRECT_URI",
    "DATABASE_URL",
    "OBJECT_STORAGE_BUCKET",
    "OBJECT_STORAGE_REGION",
    "OBJECT_STORAGE_ACCESS_KEY",
    "OBJECT_STORAGE_SECRET_KEY",
  ];
  const mockApiShapes = {
    "api/session/context.js": ["user", "permissions", "locale"],
    "api/prototype/data-model-preview.js": previewCollections,
    "api/expense-claims/[claim_id]/items/[item_id].js": ["PATCH", "item", "employee_note"],
    "api/expense-claims/[claim_id]/submit.js": ["POST", "submitted", "approval_task", "audit_log"],
    "api/approval-tasks/[task_id]/decision.js": ["POST", "manager_approved", "next_task"],
    "api/finance/claims/[claim_id]/review.js": ["POST", "finance_reviewed", "ready_to_post", "finance_archive", "voucher_files"],
    "api/finance/claims/[claim_id]/pay.js": ["POST", "paid", "posted", "audit_log"],
  };

  tables.forEach((table) => {
    assertIncludes(model, `## ${table}`, "DATA_MODEL.md");
  });

  claimStatuses.forEach((status) => {
    assertIncludes(model, status, "DATA_MODEL.md");
    assertIncludes(api, status, "API_CONTRACTS.md");
  });

  ledgerStatuses.forEach((status) => {
    assertIncludes(api, status, "API_CONTRACTS.md");
  });

  apiRoutes.forEach((route) => {
    assertIncludes(api, route, "API_CONTRACTS.md");
  });

  apiFiles.forEach(assertFile);
  frontendDataFiles.forEach(assertFile);
  persistenceScripts.forEach(assertFile);
  assertFileIncludes("package.json", ["db:schema", "verify:persistence"]);

  Object.entries(mockApiShapes).forEach(([relativePath, values]) => {
    assertFileIncludes(relativePath, values);
  });

  previewCollections.forEach((collection) => {
    assertIncludes(api, collection, "API_CONTRACTS.md");
  });

  envVars.forEach((name) => {
    assertIncludes(environment, name, "ENVIRONMENT.md");
    assertIncludes(envExample, `${name}=`, ".env.example");
  });

  assertIncludes(readme, "docs/API_CONTRACTS.md", "README.md");
  assertIncludes(readme, "docs/DATA_MODEL.md", "README.md");
  assertIncludes(readme, "docs/ENVIRONMENT.md", "README.md");

  console.log("Contract validation passed.");
}

main();
