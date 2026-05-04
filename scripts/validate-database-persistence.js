const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function loadHandler(relativePath, databaseClient) {
  const fullPath = path.join(root, relativePath);
  const source = fs.readFileSync(fullPath, "utf8");
  const cjsSource = source.replace("export default function handler", "function handler") + "\nmodule.exports = handler;";
  const sandbox = {
    module: { exports: {} },
    exports: {},
    console,
    process: {
      env: {
        DATABASE_URL: "postgres://user:pass@example.com:5432/expense_test",
      },
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.__prototypeDatabaseClient = databaseClient;
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

async function call(handler, request) {
  const response = createResponse();
  await handler(request, response);
  return response;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createDatabaseClient() {
  const calls = [];
  const rows = {
    departments: [{ id: "dept-product", name: "Product", manager_id: "mock-user-manager" }],
    users: [{ id: "mock-user-employee", name: "Employee", role: "employee", department_id: "dept-product" }],
    expense_claims: [{ id: "claim-db-test", employee_id: "mock-user-employee", title: "DB Test", status: "draft" }],
    expense_items: [{ id: "item-db-test", claim_id: "claim-db-test", vendor: "DB Hotel", amount: 88 }],
    receipts: [{ id: "receipt-db-test", item_id: "item-db-test", file_name: "receipt.pdf" }],
    approval_tasks: [],
    audit_logs: [],
    finance_archives: [],
  };

  return {
    calls,
    async query(text, params = []) {
      calls.push({ text, params });
      const selectMatch = text.match(/select \* from ([a-z_]+)/i);
      if (selectMatch) return rows[selectMatch[1]] || [];
      return [];
    },
  };
}

async function main() {
  const databaseClient = createDatabaseClient();
  const handler = loadHandler("api/prototype/data-model-preview.js", databaseClient);

  const model = {
    meta: { generated_at: "2026-05-04T00:00:00.000Z" },
    departments: [{ id: "dept-product", name: "Product", manager_id: "mock-user-manager" }],
    users: [
      {
        id: "mock-user-employee",
        name: "Employee",
        title: "Product",
        role: "employee",
        department_id: "dept-product",
        platform: "browser",
        platform_user_id: "browser-mock-user-employee",
      },
    ],
    expense_claims: [
      {
        id: "claim-db-test",
        employee_id: "mock-user-employee",
        title: "DB Test",
        status: "draft",
        total: 88,
        source: "prototype",
      },
    ],
    expense_items: [
      {
        id: "item-db-test",
        claim_id: "claim-db-test",
        vendor: "DB Hotel",
        amount: 88,
      },
    ],
    receipts: [
      {
        id: "receipt-db-test",
        item_id: "item-db-test",
        file_name: "receipt.pdf",
      },
    ],
    approval_tasks: [],
    audit_logs: [
      {
        id: "audit-db-test",
        claim_id: "claim-db-test",
        event: "claim.created",
        payload_json: { source: "test" },
      },
    ],
    finance_archives: [],
  };

  const post = await call(handler, { method: "POST", query: {}, body: { model, snapshot: { savedAt: model.meta.generated_at } } });
  assert(post.code === 200, "POST should succeed");
  assert(post.body.persistence.databaseConnected === true, "POST should report database connection");
  assert(post.body.snapshot.savedAt === model.meta.generated_at, "POST should echo snapshot");

  [
    "insert into departments",
    "insert into users",
    "insert into expense_claims",
    "insert into expense_items",
    "insert into receipts",
    "insert into audit_logs",
  ].forEach((statement) => {
    assert(
      databaseClient.calls.some((call) => call.text.toLowerCase().includes(statement)),
      `Missing database write: ${statement}`,
    );
  });

  const get = await call(handler, { method: "GET", query: {}, body: {} });
  assert(get.code === 200, "GET should succeed");
  assert(get.body.model.expense_claims[0].id === "claim-db-test", "GET should return database claims");

  const del = await call(handler, { method: "DELETE", query: {}, body: {} });
  assert(del.code === 200, "DELETE should succeed");
  assert(
    databaseClient.calls.some((call) => call.text.toLowerCase().includes("delete from expense_claims")),
    "DELETE should clear prototype claims",
  );

  console.log("Database persistence validation passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
