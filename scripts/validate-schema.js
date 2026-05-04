const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const schemaPath = path.join(root, "db", "schema.sql");
const decisionPath = path.join(root, "docs", "DATABASE_DECISION.md");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(text, value, label) {
  if (!text.includes(value)) {
    throw new Error(`${label} is missing ${value}`);
  }
}

function assertRegex(text, pattern, label) {
  if (!pattern.test(text)) {
    throw new Error(`${label} does not match ${pattern}`);
  }
}

function main() {
  if (!fs.existsSync(schemaPath)) throw new Error("Missing db/schema.sql");
  if (!fs.existsSync(decisionPath)) throw new Error("Missing docs/DATABASE_DECISION.md");

  const schema = read(schemaPath);
  const decision = read(decisionPath);
  const tables = [
    "departments",
    "users",
    "expense_claims",
    "expense_items",
    "receipts",
    "approval_tasks",
    "audit_logs",
    "finance_archives",
  ];
  const statuses = ["draft", "submitted", "manager_approved", "finance_reviewed", "paid"];
  const ledgerStatuses = ["not_posted", "ready_to_post", "posted"];

  assertIncludes(decision, "Postgres", "DATABASE_DECISION.md");
  assertIncludes(decision, "db/schema.sql", "DATABASE_DECISION.md");
  assertIncludes(schema, "create extension if not exists pgcrypto", "schema.sql");
  assertIncludes(schema, "do $$", "schema.sql");
  assertIncludes(schema, "create or replace function set_updated_at()", "schema.sql");
  assertIncludes(schema, "drop trigger if exists", "schema.sql");

  tables.forEach((table) => {
    assertRegex(schema, new RegExp(`create table if not exists ${table}\\s*\\(`, "i"), "schema.sql");
  });

  statuses.forEach((status) => assertIncludes(schema, status, "schema.sql"));
  ledgerStatuses.forEach((status) => assertIncludes(schema, status, "schema.sql"));

  [
    "references users(id)",
    "references departments(id)",
    "references expense_claims(id) on delete cascade",
    "references expense_items(id) on delete cascade",
    "jsonb",
    "unique (platform, platform_user_id)",
    "archive_no text not null unique",
  ].forEach((value) => assertIncludes(schema, value, "schema.sql"));

  [
    "expense_claims_employee_status_idx",
    "approval_tasks_actor_status_idx",
    "audit_logs_claim_created_idx",
    "finance_archives_ledger_status_idx",
  ].forEach((indexName) => assertIncludes(schema, indexName, "schema.sql"));

  console.log("Schema validation passed.");
}

main();
