# Database Decision

## Decision

Use **Postgres** as the first real persistence database for the pilot.

Recommended order:

1. Vercel Marketplace Postgres / Neon Postgres.
2. Supabase Postgres.
3. SQLite or in-memory mock only for local fallback, not as the online pilot target.

The first schema is stored in:

```text
db/schema.sql
```

## Why Postgres

The expense assistant data is relationship-heavy:

- One employee owns many expense claims.
- One claim owns many expense items.
- One item can own receipt files and AI extraction output.
- One claim creates approval tasks, audit logs, and finance archive records.
- Finance users need status, archive number, voucher number, ledger status, and export queries.

SQL keeps these relationships explicit and makes audit queries easier to trust.

## Why Not KV Or Document Storage First

KV or document storage is useful for saving a whole JSON snapshot quickly. It is less suitable for the next pilot step because the app needs:

- Manager task queues.
- Finance review queues.
- Ledger and archive filtering.
- Audit log append and lookup.
- Item-level receipt and policy checks.

Those operations should be backed by tables before the product moves into a small real pilot.

## First Schema Boundary

The first database boundary covers:

- `departments`
- `users`
- `expense_claims`
- `expense_items`
- `receipts`
- `approval_tasks`
- `audit_logs`
- `finance_archives`

This matches the current `state-store.js` normalized object model and the data model preview.

## Environment Variable

Continue to use:

```text
DATABASE_URL=
```

The app should only need this connection string when switching the persistence adapter from prototype/local mode to server database mode.

## Integration Order

1. Create the database and run `db/schema.sql`.
2. Install the optional `postgres` package during deployment.
3. Set `DATABASE_URL`.
4. Keep the current browser/local persistence as fallback.
5. Enable API persistence with `?persistence=api` or the local storage persistence mode switch.
6. Save `expense_claims`, `expense_items`, `approval_tasks`, and `audit_logs` first.
7. Add receipt object storage through `receipts.storage_key`.
8. Add finance archive writes through `finance_archives`.

## Vercel Hobby Constraint

The current Vercel Hobby deployment has a strict serverless function count limit. The first database step should avoid adding many new `/api` files. Prefer one compact persistence endpoint or reuse an existing endpoint when implementation starts.
