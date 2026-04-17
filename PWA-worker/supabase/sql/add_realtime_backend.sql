-- Additive Supabase migration for GigShield realtime backend.
-- Keep this idempotent so it can be applied safely in existing projects.

alter table if exists public.users
  add column if not exists aadhaar_status text default 'pending',
  add column if not exists aadhaar_number text,
  add column if not exists platform_id text,
  add column if not exists platform_type text,
  add column if not exists zone_city text default 'Mumbai',
  add column if not exists zone_pincode text default '400070',
  add column if not exists zone_lat numeric(9,6),
  add column if not exists zone_lng numeric(9,6),
  add column if not exists upi_handle text,
  add column if not exists bank_account text,
  add column if not exists bank_name text,
  add column if not exists bank_ifsc text,
  add column if not exists bank_account_name text,
  add column if not exists declared_weekly_earnings numeric(10,2) default 4200,
  add column if not exists declared_weekly_hours numeric(5,2) default 56,
  add column if not exists loyalty_score integer default 100,
  add column if not exists claims_count integer default 0,
  add column if not exists total_payout numeric(12,2) default 0,
  add column if not exists avatar_url text,
  add column if not exists notification_prefs jsonb default '{}'::jsonb,
  add column if not exists role text default 'worker',
  add column if not exists updated_at timestamptz default now();

alter table if exists public.policies
  add column if not exists weekly_premium numeric(8,2),
  add column if not exists adjusted_premium numeric(8,2),
  add column if not exists coverage_cap numeric(10,2),
  add column if not exists premium_multiplier numeric(4,3) default 1.000,
  add column if not exists started_at timestamptz default now(),
  add column if not exists ends_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text,
  add column if not exists refund_amount numeric(10,2),
  add column if not exists switch_requested_plan text,
  add column if not exists switch_at text,
  add column if not exists upi_handle text,
  add column if not exists razorpay_subscription_id text;

alter table if exists public.triggers
  add column if not exists zone_city text,
  add column if not exists severity_label text,
  add column if not exists threshold_value numeric(10,4),
  add column if not exists raw_api_payload jsonb,
  add column if not exists triggered_at timestamptz default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists dedupe_key text,
  add column if not exists claims_generated integer default 0;

alter table if exists public.claims
  add column if not exists policy_id uuid,
  add column if not exists trigger_id uuid,
  add column if not exists status text default 'pending',
  add column if not exists hours_disrupted numeric(4,2),
  add column if not exists hourly_rate numeric(8,2),
  add column if not exists payout_amount numeric(10,2),
  add column if not exists fraud_score numeric(4,3),
  add column if not exists fraud_flags jsonb default '[]'::jsonb,
  add column if not exists gps_lat numeric(9,6),
  add column if not exists gps_lng numeric(9,6),
  add column if not exists context_validated_at timestamptz,
  add column if not exists admin_note text,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.payouts
  add column if not exists claim_id uuid,
  add column if not exists user_id uuid,
  add column if not exists amount numeric(10,2),
  add column if not exists status text default 'pending',
  add column if not exists upi_handle text,
  add column if not exists razorpay_payout_id text,
  add column if not exists attempt_count integer default 0,
  add column if not exists failure_reason text,
  add column if not exists paid_at timestamptz,
  add column if not exists created_at timestamptz default now();

alter table if exists public.support_tickets
  add column if not exists ticket_ref text,
  add column if not exists subject text,
  add column if not exists status text default 'OPEN',
  add column if not exists updated_at timestamptz default now();

alter table if exists public.support_messages
  add column if not exists role text,
  add column if not exists text text,
  add column if not exists created_at timestamptz default now();

create table if not exists public.otp_store (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  otp text not null,
  verified boolean default false,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists public.razorpay_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  policy_id uuid,
  razorpay_order_id text unique not null,
  razorpay_payment_id text,
  razorpay_signature text,
  amount integer not null,
  purpose text,
  plan_type text,
  status text default 'created',
  verified_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_policies_user_status on public.policies(user_id, status);
create index if not exists idx_triggers_zone_time on public.triggers(zone_pincode, triggered_at desc);
create index if not exists idx_claims_trigger on public.claims(trigger_id);
create index if not exists idx_claims_user on public.claims(user_id, created_at desc);
create index if not exists idx_payouts_user on public.payouts(user_id, created_at desc);
create index if not exists idx_payouts_claim on public.payouts(claim_id);

alter table if exists public.users enable row level security;
alter table if exists public.policies enable row level security;
alter table if exists public.claims enable row level security;
alter table if exists public.payouts enable row level security;
alter table if exists public.support_tickets enable row level security;
alter table if exists public.support_messages enable row level security;
alter table if exists public.triggers enable row level security;
alter table if exists public.otp_store enable row level security;
alter table if exists public.razorpay_orders enable row level security;

do $$
begin
  create policy users_own on public.users for all using (id = auth.uid()::uuid) with check (id = auth.uid()::uuid);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy policies_own on public.policies for all using (user_id = auth.uid()::uuid) with check (user_id = auth.uid()::uuid);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy claims_own on public.claims for all using (user_id = auth.uid()::uuid) with check (user_id = auth.uid()::uuid);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy payouts_own on public.payouts for all using (user_id = auth.uid()::uuid) with check (user_id = auth.uid()::uuid);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy triggers_read on public.triggers for select using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy tickets_own on public.support_tickets for all using (user_id = auth.uid()::uuid) with check (user_id = auth.uid()::uuid);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy messages_own on public.support_messages for all using (
    ticket_id in (select id from public.support_tickets where user_id = auth.uid()::uuid)
  ) with check (
    ticket_id in (select id from public.support_tickets where user_id = auth.uid()::uuid)
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy razorpay_orders_own on public.razorpay_orders for all using (user_id = auth.uid()::uuid) with check (user_id = auth.uid()::uuid);
exception when duplicate_object then null;
end $$;

alter publication supabase_realtime add table if not exists public.users;
alter publication supabase_realtime add table if not exists public.policies;
alter publication supabase_realtime add table if not exists public.support_tickets;
alter publication supabase_realtime add table if not exists public.support_messages;
alter publication supabase_realtime add table if not exists public.razorpay_orders;
alter publication supabase_realtime add table if not exists public.payouts;
alter publication supabase_realtime add table if not exists public.triggers;
alter publication supabase_realtime add table if not exists public.claims;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;