-- AI Expense Assistant pilot schema
-- Target database: PostgreSQL 15+ compatible services such as Neon, Vercel Postgres, or Supabase.

create extension if not exists pgcrypto;

create table if not exists departments (
  id text primary key,
  name text not null,
  manager_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  name text not null,
  title text not null default '',
  role text not null check (role in ('employee', 'manager', 'finance', 'cashier', 'admin')),
  department_id text references departments(id),
  platform text not null default 'browser' check (platform in ('feishu', 'dingtalk', 'browser')),
  platform_label text not null default '',
  platform_user_id text not null default '',
  identity_source text not null default 'browser-local-mock',
  identity_field text not null default 'mock_user_id',
  is_mock_identity boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, platform_user_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'departments_manager_id_fkey'
  ) then
    alter table departments
      add constraint departments_manager_id_fkey
      foreign key (manager_id) references users(id);
  end if;
end;
$$;

create table if not exists expense_claims (
  id text primary key default ('claim_' || replace(gen_random_uuid()::text, '-', '')),
  employee_id text not null references users(id),
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'manager_approved', 'finance_reviewed', 'paid', 'returned')),
  total numeric(12, 2) not null default 0 check (total >= 0),
  currency text not null default 'CNY',
  receipt_count integer not null default 0 check (receipt_count >= 0),
  risk_count integer not null default 0 check (risk_count >= 0),
  route_summary text not null default '',
  archive_no text not null default '',
  voucher_no text not null default '',
  ledger_status text not null default '' check (ledger_status in ('', 'not_posted', 'ready_to_post', 'posted')),
  audit_note text not null default '',
  source text not null default 'prototype' check (source in ('prototype', 'feishu', 'dingtalk', 'api')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists expense_items (
  id text primary key default ('item_' || replace(gen_random_uuid()::text, '-', '')),
  claim_id text not null references expense_claims(id) on delete cascade,
  expense_date date,
  invoice_date date,
  category text not null default 'other',
  vendor text not null default '',
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  currency text not null default 'CNY',
  status text not null default 'pending_review',
  employee_note text not null default '',
  policy_warning text not null default '',
  confidence numeric(5, 4) not null default 0 check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists receipts (
  id text primary key default ('receipt_' || replace(gen_random_uuid()::text, '-', '')),
  item_id text not null references expense_items(id) on delete cascade,
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  storage_key text not null default '',
  storage_status text not null default 'prototype-local' check (storage_status in ('prototype-local', 'uploaded', 'analyzed', 'archived')),
  ocr_text text not null default '',
  ai_result_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists approval_tasks (
  id text primary key default ('task_' || replace(gen_random_uuid()::text, '-', '')),
  claim_id text not null references expense_claims(id) on delete cascade,
  step text not null,
  actor_id text references users(id),
  actor text not null default '',
  status text not null default 'pending' check (status in ('pending', 'submitted', 'approved', 'returned', 'completed')),
  handled_at timestamptz,
  comment text not null default '',
  platform_message_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id text primary key default ('audit_' || replace(gen_random_uuid()::text, '-', '')),
  claim_id text references expense_claims(id) on delete cascade,
  event text not null,
  actor_id text references users(id),
  actor text not null default '',
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists finance_archives (
  claim_id text primary key references expense_claims(id) on delete cascade,
  archive_no text not null unique,
  voucher_no text not null default '',
  ledger_status text not null default 'not_posted' check (ledger_status in ('not_posted', 'ready_to_post', 'posted')),
  audit_note text not null default '',
  voucher_files jsonb not null default '[]'::jsonb,
  exported_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_department_id_idx on users(department_id);
create index if not exists users_platform_identity_idx on users(platform, platform_user_id);
create index if not exists expense_claims_employee_status_idx on expense_claims(employee_id, status);
create index if not exists expense_claims_created_at_idx on expense_claims(created_at desc);
create index if not exists expense_items_claim_id_idx on expense_items(claim_id);
create index if not exists receipts_item_id_idx on receipts(item_id);
create index if not exists approval_tasks_claim_status_idx on approval_tasks(claim_id, status);
create index if not exists approval_tasks_actor_status_idx on approval_tasks(actor_id, status);
create index if not exists audit_logs_claim_created_idx on audit_logs(claim_id, created_at desc);
create index if not exists finance_archives_ledger_status_idx on finance_archives(ledger_status);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists departments_set_updated_at on departments;
create trigger departments_set_updated_at
before update on departments
for each row execute function set_updated_at();

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
before update on users
for each row execute function set_updated_at();

drop trigger if exists expense_claims_set_updated_at on expense_claims;
create trigger expense_claims_set_updated_at
before update on expense_claims
for each row execute function set_updated_at();

drop trigger if exists expense_items_set_updated_at on expense_items;
create trigger expense_items_set_updated_at
before update on expense_items
for each row execute function set_updated_at();

drop trigger if exists receipts_set_updated_at on receipts;
create trigger receipts_set_updated_at
before update on receipts
for each row execute function set_updated_at();

drop trigger if exists approval_tasks_set_updated_at on approval_tasks;
create trigger approval_tasks_set_updated_at
before update on approval_tasks
for each row execute function set_updated_at();

drop trigger if exists finance_archives_set_updated_at on finance_archives;
create trigger finance_archives_set_updated_at
before update on finance_archives
for each row execute function set_updated_at();
