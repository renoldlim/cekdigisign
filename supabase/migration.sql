-- ============================================================
-- CekDigiSign v2 — Full Schema
-- Run in Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  email text,
  phone text,
  organization text,
  role text default 'user' check (role in ('user', 'admin')),
  plan text default 'free' check (plan in ('free', 'basic', 'premium')),
  stamp_quota int default 3,
  stamps_used int default 0,
  plan_expires_at timestamptz,
  default_brand_name text default 'CekDigiSign',
  default_brand_color text default '#2f8d62',
  default_brand_logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "read_own" on public.profiles for select using (auth.uid() = id);
create policy "update_own" on public.profiles for update using (auth.uid() = id);
create policy "insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "admin_read" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "admin_update" on public.profiles for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 2. PLANS
create table public.plans (
  id text primary key,
  name text not null,
  description text,
  price_idr int not null default 0,
  stamp_quota int not null,
  plan_type text not null check (plan_type in ('free', 'basic', 'premium')),
  duration_days int,
  is_active boolean default true,
  features jsonb default '[]',
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.plans enable row level security;
create policy "public_read_plans" on public.plans for select using (is_active = true);
create policy "admin_manage_plans" on public.plans for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

insert into public.plans (id, name, description, price_idr, stamp_quota, plan_type, duration_days, features, sort_order) values
  ('free', 'Gratis', '3 stamp gratis untuk mencoba', 0, 3, 'free', null,
   '["3 stamp gratis","Stamp sederhana","Verifikasi publik"]', 0),
  ('basic_10', 'Basic 10', 'Paket 10 stamp', 25000, 10, 'basic', null,
   '["10 stamp","Stamp sederhana","Verifikasi publik","Log verifikasi"]', 1),
  ('basic_50', 'Basic 50', 'Paket 50 stamp', 100000, 50, 'basic', null,
   '["50 stamp","Stamp sederhana","Verifikasi publik","Log verifikasi"]', 2),
  ('premium_monthly', 'Premium', 'Unlimited stamp + custom brand', 50000, 9999, 'premium', 30,
   '["Unlimited stamp/bulan","Custom branded stamp","Logo pada stamp","Pilih posisi stamp","Prioritas support"]', 3);

-- 3. PAYMENTS
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id text references public.plans(id) not null,
  amount_idr int not null,
  transfer_proof_url text,
  transfer_from_name text,
  transfer_from_bank text,
  transfer_date timestamptz,
  notes text,
  status text default 'pending' check (status in ('pending','verified','rejected','expired')),
  admin_notes text,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);

alter table public.payments enable row level security;
create policy "user_read_own_pay" on public.payments for select using (auth.uid() = user_id);
create policy "user_insert_pay" on public.payments for insert with check (auth.uid() = user_id);
create policy "admin_read_pay" on public.payments for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "admin_update_pay" on public.payments for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create index idx_pay_user on public.payments(user_id);
create index idx_pay_status on public.payments(status);

-- 4. DOCUMENTS
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  document_number text,
  description text,
  file_path text not null,
  file_name text,
  content_text text,
  page_count int default 1,
  qr_code_id text unique not null,
  verification_url text not null,
  stamp_page int default 1,
  stamp_x float default 0.7,
  stamp_y float default 0.85,
  stamp_size int default 120,
  stamp_type text default 'simple' check (stamp_type in ('simple','branded')),
  brand_name text default 'CekDigiSign',
  brand_logo_url text,
  brand_color text default '#2f8d62',
  stamped_file_path text,
  is_active boolean default true,
  signed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.documents enable row level security;
create policy "owner_crud" on public.documents for all using (auth.uid() = user_id);
create policy "public_verify" on public.documents for select using (is_active = true);
create policy "admin_read_docs" on public.documents for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create index idx_docs_qr on public.documents(qr_code_id);
create index idx_docs_docnum on public.documents(document_number);

-- 5. VERIFICATION LOGS
create table public.verification_logs (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  email text not null,
  ip_address text,
  user_agent text,
  verified_at timestamptz default now()
);

alter table public.verification_logs enable row level security;
create policy "anyone_insert_log" on public.verification_logs for insert with check (true);
create policy "owner_read_log" on public.verification_logs for select using (
  exists (select 1 from public.documents where documents.id = verification_logs.document_id and documents.user_id = auth.uid()));
create policy "admin_read_log" on public.verification_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 6. FUNCTIONS

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.verify_document(search_input text)
returns json as $$
declare doc record;
begin
  select d.*, p.full_name as signer_name, p.avatar_url as signer_avatar, p.organization as signer_org
  into doc from public.documents d join public.profiles p on p.id = d.user_id
  where d.is_active = true and (d.qr_code_id = search_input or lower(d.document_number) = lower(search_input));
  if doc is null then return null; end if;
  return json_build_object(
    'id', doc.id, 'title', doc.title, 'document_number', doc.document_number,
    'description', doc.description, 'content_text', doc.content_text,
    'file_name', doc.file_name, 'brand_name', doc.brand_name,
    'brand_logo_url', doc.brand_logo_url, 'brand_color', doc.brand_color,
    'stamp_type', doc.stamp_type, 'signed_at', doc.signed_at,
    'signer_name', doc.signer_name, 'signer_avatar', doc.signer_avatar,
    'signer_org', doc.signer_org, 'is_active', doc.is_active);
end;
$$ language plpgsql security definer;

create or replace function public.verify_payment(payment_id uuid, admin_id uuid, admin_note text default null)
returns json as $$
declare pay record; pl record;
begin
  select * into pay from public.payments where id = payment_id and status = 'pending';
  if pay is null then return json_build_object('error', 'Not found'); end if;
  select * into pl from public.plans where id = pay.plan_id;
  update public.payments set status='verified', verified_by=admin_id, verified_at=now(), admin_notes=admin_note where id=payment_id;
  if pl.plan_type = 'premium' then
    update public.profiles set plan='premium', stamp_quota=stamp_quota+pl.stamp_quota,
      plan_expires_at=now()+(pl.duration_days||' days')::interval, updated_at=now() where id=pay.user_id;
  else
    update public.profiles set plan=case when plan='free' then 'basic' else plan end,
      stamp_quota=stamp_quota+pl.stamp_quota, updated_at=now() where id=pay.user_id;
  end if;
  return json_build_object('success', true, 'quota_added', pl.stamp_quota);
end;
$$ language plpgsql security definer;

create or replace function public.reject_payment(payment_id uuid, admin_id uuid, admin_note text default null)
returns json as $$
begin
  update public.payments set status='rejected', verified_by=admin_id, verified_at=now(), admin_notes=admin_note
  where id=payment_id and status='pending';
  return json_build_object('success', true);
end;
$$ language plpgsql security definer;

create or replace function public.use_stamp_quota(uid uuid)
returns boolean as $$
declare p record;
begin
  select * into p from public.profiles where id = uid;
  if p is null or p.stamps_used >= p.stamp_quota then return false; end if;
  if p.plan='premium' and p.plan_expires_at is not null and p.plan_expires_at < now() then return false; end if;
  update public.profiles set stamps_used = stamps_used + 1, updated_at = now() where id = uid;
  return true;
end;
$$ language plpgsql security definer;

create or replace function public.admin_stats()
returns json as $$
begin
  return json_build_object(
    'total_users', (select count(*) from public.profiles),
    'total_documents', (select count(*) from public.documents),
    'total_verifications', (select count(*) from public.verification_logs),
    'pending_payments', (select count(*) from public.payments where status='pending'),
    'total_revenue', (select coalesce(sum(amount_idr),0) from public.payments where status='verified'),
    'premium_users', (select count(*) from public.profiles where plan='premium'),
    'basic_users', (select count(*) from public.profiles where plan='basic'));
end;
$$ language plpgsql security definer;

-- 7. STORAGE
insert into storage.buckets (id, name, public) values
  ('documents','documents',false),('logos','logos',true),('payment-proofs','payment-proofs',false)
on conflict (id) do nothing;

create policy "up_docs" on storage.objects for insert with check (bucket_id='documents' and auth.uid()::text=(storage.foldername(name))[1]);
create policy "read_docs" on storage.objects for select using (bucket_id='documents' and auth.uid()::text=(storage.foldername(name))[1]);
create policy "pub_logos" on storage.objects for select using (bucket_id='logos');
create policy "up_logos" on storage.objects for insert with check (bucket_id='logos' and auth.role()='authenticated');
create policy "up_proofs" on storage.objects for insert with check (bucket_id='payment-proofs' and auth.role()='authenticated');
create policy "read_proofs" on storage.objects for select using (bucket_id='payment-proofs');

-- 8. After Renold registers, set admin:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'renold@email.com';
