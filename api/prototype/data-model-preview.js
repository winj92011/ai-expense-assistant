const COLLECTIONS = [
  "expense_claims",
  "expense_items",
  "receipts",
  "approval_tasks",
  "audit_logs",
  "finance_archives",
];

const TABLES = ["departments", "users", ...COLLECTIONS];

function json(response, code, body) {
  return response.status(code).json(body);
}

function now() {
  return new Date().toISOString();
}

function hasProcessEnv(name) {
  return typeof process !== "undefined" && Boolean(process.env?.[name]);
}

function normalizeModel(input = {}) {
  const model = input.model || input.dataModel || input;
  const normalized = {
    meta: {
      ...(model.meta || {}),
      generated_at: model.meta?.generated_at || now(),
      persistence: {
        ...(model.meta?.persistence || {}),
        requestedMode: "database",
      },
    },
    departments: Array.isArray(model.departments) ? model.departments : [],
    users: Array.isArray(model.users) ? model.users : [],
  };

  COLLECTIONS.forEach((name) => {
    normalized[name] = Array.isArray(model[name]) ? model[name] : [];
  });

  return normalized;
}

function fallbackModel(note = "Prototype endpoint only. DATABASE_URL is not configured.") {
  const empty = normalizeModel();
  return {
    ...empty,
    note,
    persistence: {
      mode: "api",
      databaseConnected: false,
      apiReady: true,
      fallback: "prototype-empty",
      reason: note,
    },
  };
}

async function createDatabase() {
  if (globalThis.__prototypeDatabaseClient) {
    return {
      connected: true,
      source: "test-client",
      query: globalThis.__prototypeDatabaseClient.query.bind(globalThis.__prototypeDatabaseClient),
      end: async () => {},
    };
  }

  if (!hasProcessEnv("DATABASE_URL")) return null;

  let postgresModule;
  try {
    postgresModule = await import("postgres");
  } catch (error) {
    return {
      connected: false,
      source: "missing-postgres-package",
      error: error.message,
    };
  }

  const sql = postgresModule.default(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 5,
    ssl: process.env.DATABASE_URL.includes("sslmode=disable") ? false : "require",
  });

  return {
    connected: true,
    source: "postgres",
    query: (text, params = []) => sql.unsafe(text, params),
    end: () => sql.end({ timeout: 1 }),
  };
}

async function withDatabase(work) {
  const database = await createDatabase();
  if (!database || !database.connected) {
    return {
      databaseConnected: false,
      database,
    };
  }

  try {
    const result = await work(database);
    return {
      ...result,
      databaseConnected: true,
      database,
    };
  } finally {
    await database.end();
  }
}

function value(value, fallback = "") {
  return value === undefined || value === null ? fallback : value;
}

function nonEmpty(value, fallback = "") {
  return value === undefined || value === null || value === "" ? fallback : value;
}

function dateOrNull(value) {
  return value ? value : null;
}

async function upsertModel(database, model) {
  for (const department of model.departments) {
    await database.query(
      `insert into departments (id, name, manager_id)
       values ($1, $2, null)
       on conflict (id) do update
       set name = excluded.name,
           updated_at = now()`,
      [department.id, department.name],
    );
  }

  for (const user of model.users) {
    await database.query(
      `insert into users (
         id, name, title, role, department_id, platform, platform_label,
         platform_user_id, identity_source, identity_field, is_mock_identity
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (id) do update
       set name = excluded.name,
           title = excluded.title,
           role = excluded.role,
           department_id = excluded.department_id,
           platform = excluded.platform,
           platform_label = excluded.platform_label,
           platform_user_id = excluded.platform_user_id,
           identity_source = excluded.identity_source,
           identity_field = excluded.identity_field,
           is_mock_identity = excluded.is_mock_identity,
           updated_at = now()`,
      [
        user.id,
        user.name,
        value(user.title),
        value(user.role, "employee"),
        value(user.department_id, null),
        value(user.platform, "browser"),
        value(user.platform_label),
        nonEmpty(user.platform_user_id, `${value(user.platform, "browser")}-${user.id}`),
        value(user.identity_source, "browser-local-mock"),
        value(user.identity_field, "mock_user_id"),
        user.is_mock_identity !== false,
      ],
    );
  }

  for (const department of model.departments) {
    if (!department.manager_id) continue;
    await database.query(
      `update departments
       set manager_id = case
           when exists (select 1 from users where id = $2) then $2
           else null
         end,
         updated_at = now()
       where id = $1`,
      [department.id, department.manager_id],
    );
  }

  for (const claim of model.expense_claims) {
    await database.query(
      `insert into expense_claims (
         id, employee_id, title, status, total, currency, receipt_count,
         risk_count, route_summary, archive_no, voucher_no, ledger_status,
         audit_note, source
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       on conflict (id) do update
       set employee_id = excluded.employee_id,
           title = excluded.title,
           status = excluded.status,
           total = excluded.total,
           currency = excluded.currency,
           receipt_count = excluded.receipt_count,
           risk_count = excluded.risk_count,
           route_summary = excluded.route_summary,
           archive_no = excluded.archive_no,
           voucher_no = excluded.voucher_no,
           ledger_status = excluded.ledger_status,
           audit_note = excluded.audit_note,
           source = excluded.source,
           updated_at = now()`,
      [
        claim.id,
        claim.employee_id,
        claim.title,
        value(claim.status, "draft"),
        Number(claim.total || 0),
        value(claim.currency, "CNY"),
        Number(claim.receipt_count || 0),
        Number(claim.risk_count || 0),
        value(claim.route_summary),
        value(claim.archive_no),
        value(claim.voucher_no),
        value(claim.ledger_status),
        value(claim.audit_note),
        value(claim.source, "prototype"),
      ],
    );
  }

  for (const item of model.expense_items) {
    await database.query(
      `insert into expense_items (
         id, claim_id, expense_date, invoice_date, category, vendor, amount,
         currency, status, employee_note, policy_warning, confidence
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (id) do update
       set claim_id = excluded.claim_id,
           expense_date = excluded.expense_date,
           invoice_date = excluded.invoice_date,
           category = excluded.category,
           vendor = excluded.vendor,
           amount = excluded.amount,
           currency = excluded.currency,
           status = excluded.status,
           employee_note = excluded.employee_note,
           policy_warning = excluded.policy_warning,
           confidence = excluded.confidence,
           updated_at = now()`,
      [
        item.id,
        item.claim_id,
        dateOrNull(item.expense_date),
        dateOrNull(item.invoice_date),
        value(item.category, "other"),
        value(item.vendor),
        Number(item.amount || 0),
        value(item.currency, "CNY"),
        value(item.status, "pending_review"),
        value(item.employee_note),
        value(item.policy_warning),
        Number(item.confidence || 0),
      ],
    );
  }

  for (const receipt of model.receipts) {
    await database.query(
      `insert into receipts (
         id, item_id, file_name, mime_type, storage_key, storage_status,
         ocr_text, ai_result_json
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       on conflict (id) do update
       set item_id = excluded.item_id,
           file_name = excluded.file_name,
           mime_type = excluded.mime_type,
           storage_key = excluded.storage_key,
           storage_status = excluded.storage_status,
           ocr_text = excluded.ocr_text,
           ai_result_json = excluded.ai_result_json,
           updated_at = now()`,
      [
        receipt.id,
        receipt.item_id,
        receipt.file_name,
        value(receipt.mime_type, "application/pdf"),
        value(receipt.storage_key),
        value(receipt.storage_status, "prototype-local"),
        value(receipt.ocr_text),
        JSON.stringify(receipt.ai_result_json || null),
      ],
    );
  }

  for (const task of model.approval_tasks) {
    await database.query(
      `insert into approval_tasks (
         id, claim_id, step, actor_id, actor, status, handled_at, comment,
         platform_message_id
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (id) do update
       set claim_id = excluded.claim_id,
           step = excluded.step,
           actor_id = excluded.actor_id,
           actor = excluded.actor,
           status = excluded.status,
           handled_at = excluded.handled_at,
           comment = excluded.comment,
           platform_message_id = excluded.platform_message_id,
           updated_at = now()`,
      [
        task.id,
        task.claim_id,
        task.step,
        value(task.actor_id, null),
        value(task.actor),
        value(task.status, "pending"),
        dateOrNull(task.handled_at),
        value(task.comment),
        value(task.platform_message_id),
      ],
    );
  }

  for (const log of model.audit_logs) {
    await database.query(
      `insert into audit_logs (
         id, claim_id, event, actor_id, actor, payload_json, created_at
       )
       values ($1, $2, $3, $4, $5, $6::jsonb, coalesce($7::timestamptz, now()))
       on conflict (id) do update
       set claim_id = excluded.claim_id,
           event = excluded.event,
           actor_id = excluded.actor_id,
           actor = excluded.actor,
           payload_json = excluded.payload_json`,
      [
        log.id,
        value(log.claim_id, null),
        log.event,
        value(log.actor_id, null),
        value(log.actor),
        JSON.stringify(log.payload_json || {}),
        dateOrNull(log.created_at),
      ],
    );
  }

  for (const archive of model.finance_archives) {
    await database.query(
      `insert into finance_archives (
         claim_id, archive_no, voucher_no, ledger_status, audit_note,
         voucher_files, exported_at, posted_at
       )
       values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
       on conflict (claim_id) do update
       set archive_no = excluded.archive_no,
           voucher_no = excluded.voucher_no,
           ledger_status = excluded.ledger_status,
           audit_note = excluded.audit_note,
           voucher_files = excluded.voucher_files,
           exported_at = excluded.exported_at,
           posted_at = excluded.posted_at,
           updated_at = now()`,
      [
        archive.claim_id,
        archive.archive_no,
        value(archive.voucher_no),
        value(archive.ledger_status, "not_posted"),
        value(archive.audit_note),
        JSON.stringify(archive.voucher_files || []),
        dateOrNull(archive.exported_at),
        dateOrNull(archive.posted_at),
      ],
    );
  }

  return model;
}

async function readModel(database) {
  const result = {};
  for (const table of TABLES) {
    result[table] = await database.query(`select * from ${table}`);
  }
  return normalizeModel({
    meta: {
      generated_at: now(),
      persistence: {
        mode: "api",
        databaseConnected: true,
        apiReady: true,
      },
    },
    ...result,
  });
}

async function clearPrototypeData(database) {
  await database.query("delete from expense_claims where source = $1", ["prototype"]);
  return true;
}

export default function handler(request, response) {
  return handlePersistenceRequest(request, response);
}

async function handlePersistenceRequest(request, response) {
  if (!["GET", "POST", "DELETE"].includes(request.method || "GET")) {
    response.setHeader("Allow", "GET, POST, DELETE");
    return json(response, 405, { error: "Method not allowed" });
  }

  const databaseResult = await withDatabase(async (database) => {
    if (request.method === "POST") {
      const model = normalizeModel(request.body || {});
      const snapshot = request.body?.snapshot || request.body || model;
      await upsertModel(database, model);
      return { model, snapshot };
    }

    if (request.method === "DELETE") {
      await clearPrototypeData(database);
      return { cleared: true, model: normalizeModel() };
    }

    return { model: await readModel(database) };
  });

  if (!databaseResult.databaseConnected) {
    const reason =
      databaseResult.database?.source === "missing-postgres-package"
        ? "Database client package is not installed."
        : "DATABASE_URL is not configured.";
    const fallback = fallbackModel(reason);
    return json(response, 200, {
      ...fallback,
      snapshot: request.method === "POST" ? request.body : null,
    });
  }

  const persistence = {
    mode: "api",
    databaseConnected: true,
    apiReady: true,
    database: databaseResult.database.source,
  };
  const model = {
    ...(databaseResult.model || normalizeModel()),
    meta: {
      ...(databaseResult.model?.meta || {}),
      persistence,
    },
  };

  return json(response, 200, {
    ...model,
    model,
    snapshot: databaseResult.snapshot || model,
    cleared: Boolean(databaseResult.cleared),
    persistence,
  });
}
