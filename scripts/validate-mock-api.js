const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function loadHandler(relativePath) {
  const fullPath = path.join(root, relativePath);
  const source = fs.readFileSync(fullPath, "utf8");
  const cjsSource = source.replace("export default function handler", "function handler") + "\nmodule.exports = handler;";
  const sandbox = {
    module: { exports: {} },
    exports: {},
    console,
  };
  vm.runInNewContext(cjsSource, sandbox, { filename: relativePath });
  return sandbox.module.exports;
}

function createResponse() {
  return {
    code: 200,
    headers: {},
    body: null,
    status(code) {
      this.code = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function call(relativePath, request) {
  const handler = loadHandler(relativePath);
  const response = createResponse();
  await handler(request, response);
  return response;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertPath(object, pathExpression, label) {
  const value = pathExpression.split(".").reduce((current, key) => current?.[key], object);
  assert(value !== undefined && value !== null, `${label} 缺少字段：${pathExpression}`);
}

async function assertMethodGuard(relativePath, method) {
  const response = await call(relativePath, { method: "GET", query: {}, body: {} });
  if (method === "GET") return;
  assert(response.code === 405, `${relativePath} 应拒绝 GET`);
  assert(response.headers.Allow === method, `${relativePath} 应设置 Allow: ${method}`);
}

async function main() {
  const cases = [
    {
      file: "api/session/context.js",
      request: { method: "GET", query: { platform: "browser", locale: "zh-CN" }, body: {} },
      fields: ["user.id", "user.role", "permissions", "locale"],
    },
    {
      file: "api/prototype/data-model-preview.js",
      request: { method: "GET", query: {}, body: {} },
      fields: ["expense_claims", "expense_items", "receipts", "approval_tasks", "audit_logs", "finance_archives"],
    },
    {
      file: "api/expense-claims/[claim_id]/items/[item_id].js",
      method: "PATCH",
      request: {
        method: "PATCH",
        query: { claim_id: "claim_test", item_id: "item_test" },
        body: { vendor: "测试商户", amount: 123, employee_note: "测试说明" },
      },
      fields: ["item.id", "item.claim_id", "item.vendor", "item.amount", "item.employee_note"],
    },
    {
      file: "api/expense-claims/[claim_id]/submit.js",
      method: "POST",
      request: { method: "POST", query: { claim_id: "claim_test" }, body: { employee_id: "u_test" } },
      fields: ["claim.id", "claim.status", "approval_task.id", "audit_log.event"],
    },
    {
      file: "api/approval-tasks/[task_id]/decision.js",
      method: "POST",
      request: { method: "POST", query: { task_id: "task_test" }, body: { claim_id: "claim_test", decision: "approved" } },
      fields: ["claim.id", "claim.status", "next_task.id", "next_task.step"],
    },
    {
      file: "api/finance/claims/[claim_id]/review.js",
      method: "POST",
      request: { method: "POST", query: { claim_id: "claim_test" }, body: { audit_note: "测试复核" } },
      fields: ["claim.id", "claim.status", "claim.archive_no", "claim.voucher_no", "claim.ledger_status", "finance_archive.voucher_files"],
    },
    {
      file: "api/finance/claims/[claim_id]/pay.js",
      method: "POST",
      request: { method: "POST", query: { claim_id: "claim_test" }, body: { actor_id: "u_cashier" } },
      fields: ["claim.id", "claim.status", "claim.ledger_status", "audit_log.event"],
    },
  ];

  for (const item of cases) {
    if (item.method) await assertMethodGuard(item.file, item.method);
    const response = await call(item.file, item.request);
    assert(response.code === 200, `${item.file} 应返回 200`);
    item.fields.forEach((field) => assertPath(response.body, field, item.file));
  }

  console.log("Mock API validation passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
