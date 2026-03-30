-- Apply this patch to existing Supabase projects before deploying the app update.
-- It locks down admin RPCs, enforces the document access gate server-side,
-- fixes stamp quota consumption, and secures payment proof access.

create or replace function public.verify_document(search_input text)
returns json as $$
declare doc record;
begin
  select
    d.id,
    d.title,
    d.document_number,
    d.description,
    d.file_name,
    d.brand_name,
    d.brand_logo_url,
    d.brand_color,
    d.stamp_type,
    d.signed_at,
    d.is_active,
    p.full_name as signer_name,
    p.avatar_url as signer_avatar,
    p.organization as signer_org
  into doc
  from public.documents d
  join public.profiles p on p.id = d.user_id
  where d.is_active = true and (d.qr_code_id = search_input or lower(d.document_number) = lower(search_input));

  if doc is null then return null; end if;

  return json_build_object(
    'id', doc.id, 'title', doc.title, 'document_number', doc.document_number,
    'description', doc.description,
    'file_name', doc.file_name, 'brand_name', doc.brand_name,
    'brand_logo_url', doc.brand_logo_url, 'brand_color', doc.brand_color,
    'stamp_type', doc.stamp_type, 'signed_at', doc.signed_at,
    'signer_name', doc.signer_name, 'signer_avatar', doc.signer_avatar,
    'signer_org', doc.signer_org, 'is_active', doc.is_active
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.access_document_content(
  document_id uuid,
  verifier_email text,
  verifier_user_agent text default null
)
returns json as $$
declare doc record;
begin
  if verifier_email is null or btrim(verifier_email) = '' then
    raise exception 'Email wajib diisi';
  end if;

  select d.*, p.full_name as signer_name, p.avatar_url as signer_avatar, p.organization as signer_org
  into doc
  from public.documents d
  join public.profiles p on p.id = d.user_id
  where d.is_active = true and d.id = document_id;

  if doc is null then return null; end if;

  insert into public.verification_logs (document_id, email, user_agent)
  values (doc.id, lower(btrim(verifier_email)), verifier_user_agent);

  return json_build_object(
    'id', doc.id, 'title', doc.title, 'document_number', doc.document_number,
    'description', doc.description, 'content_text', doc.content_text,
    'file_name', doc.file_name, 'brand_name', doc.brand_name,
    'brand_logo_url', doc.brand_logo_url, 'brand_color', doc.brand_color,
    'stamp_type', doc.stamp_type, 'signed_at', doc.signed_at,
    'signer_name', doc.signer_name, 'signer_avatar', doc.signer_avatar,
    'signer_org', doc.signer_org, 'is_active', doc.is_active
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.create_document_with_quota(
  p_title text,
  p_document_number text default null,
  p_description text default null,
  p_file_path text default null,
  p_file_name text default null,
  p_content_text text default null,
  p_qr_code_id text default null,
  p_verification_url text default null,
  p_stamp_page int default 1,
  p_stamp_x float default 0.7,
  p_stamp_y float default 0.85,
  p_stamp_type text default 'simple',
  p_brand_name text default 'CekDigiSign',
  p_brand_logo_url text default null,
  p_brand_color text default '#2f8d62'
)
returns json as $$
declare
  current_user_id uuid := auth.uid();
  profile_row record;
  inserted_doc_id uuid;
begin
  if current_user_id is null then
    raise exception 'Tidak terautentikasi';
  end if;

  if p_title is null or btrim(p_title) = '' then
    raise exception 'Judul wajib diisi';
  end if;

  if p_file_path is null or btrim(p_file_path) = '' then
    raise exception 'File dokumen wajib diunggah';
  end if;

  if p_content_text is null or btrim(p_content_text) = '' then
    raise exception 'Isi dokumen wajib diisi';
  end if;

  if p_qr_code_id is null or btrim(p_qr_code_id) = '' then
    raise exception 'QR code tidak valid';
  end if;

  select * into profile_row
  from public.profiles
  where id = current_user_id
  for update;

  if profile_row is null then
    raise exception 'Profil tidak ditemukan';
  end if;

  if p_stamp_type = 'branded' then
    if profile_row.plan <> 'premium' then
      raise exception 'Fitur branded hanya untuk paket premium';
    end if;

    if profile_row.plan_expires_at is not null and profile_row.plan_expires_at < now() then
      raise exception 'Paket premium Anda sudah berakhir';
    end if;
  end if;

  if profile_row.plan = 'premium' then
    if profile_row.plan_expires_at is not null and profile_row.plan_expires_at < now() then
      raise exception 'Paket premium Anda sudah berakhir';
    end if;
  elsif profile_row.stamps_used >= profile_row.stamp_quota then
    raise exception 'Kuota stamp habis! Silakan beli kuota tambahan.';
  end if;

  insert into public.documents (
    user_id,
    title,
    document_number,
    description,
    file_path,
    file_name,
    content_text,
    qr_code_id,
    verification_url,
    stamp_page,
    stamp_x,
    stamp_y,
    stamp_type,
    brand_name,
    brand_logo_url,
    brand_color
  )
  values (
    current_user_id,
    p_title,
    nullif(btrim(coalesce(p_document_number, '')), ''),
    nullif(btrim(coalesce(p_description, '')), ''),
    p_file_path,
    p_file_name,
    btrim(p_content_text),
    p_qr_code_id,
    p_verification_url,
    p_stamp_page,
    p_stamp_x,
    p_stamp_y,
    p_stamp_type,
    p_brand_name,
    p_brand_logo_url,
    p_brand_color
  )
  returning id into inserted_doc_id;

  update public.profiles
  set stamps_used = stamps_used + 1,
      updated_at = now()
  where id = current_user_id;

  return json_build_object('id', inserted_doc_id, 'qr_code_id', p_qr_code_id);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.verify_payment(payment_id uuid, admin_id uuid, admin_note text default null)
returns json as $$
declare
  pay record;
  pl record;
  current_user_id uuid := auth.uid();
  is_admin boolean;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if admin_id is not null and admin_id <> current_user_id then
    raise exception 'Admin mismatch';
  end if;

  select exists(
    select 1 from public.profiles where id = current_user_id and role = 'admin'
  ) into is_admin;

  if not is_admin then
    raise exception 'Admin only';
  end if;

  select * into pay from public.payments where id = payment_id and status = 'pending' for update;
  if pay is null then return json_build_object('error', 'Not found'); end if;

  select * into pl from public.plans where id = pay.plan_id;

  update public.payments
  set status='verified',
      verified_by=current_user_id,
      verified_at=now(),
      admin_notes=admin_note
  where id=payment_id;

  if pl.plan_type = 'premium' then
    update public.profiles
    set plan='premium',
        stamp_quota=stamp_quota+pl.stamp_quota,
        plan_expires_at=now()+(pl.duration_days||' days')::interval,
        updated_at=now()
    where id=pay.user_id;
  else
    update public.profiles
    set plan=case when plan='free' then 'basic' else plan end,
        stamp_quota=stamp_quota+pl.stamp_quota,
        updated_at=now()
    where id=pay.user_id;
  end if;

  return json_build_object('success', true, 'quota_added', pl.stamp_quota);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.reject_payment(payment_id uuid, admin_id uuid, admin_note text default null)
returns json as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if admin_id is not null and admin_id <> current_user_id then
    raise exception 'Admin mismatch';
  end if;

  select exists(
    select 1 from public.profiles where id = current_user_id and role = 'admin'
  ) into is_admin;

  if not is_admin then
    raise exception 'Admin only';
  end if;

  update public.payments
  set status='rejected',
      verified_by=current_user_id,
      verified_at=now(),
      admin_notes=admin_note
  where id=payment_id and status='pending';

  return json_build_object('success', true);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.use_stamp_quota(uid uuid)
returns boolean as $$
declare
  p record;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or current_user_id <> uid then
    raise exception 'Unauthorized';
  end if;

  select * into p from public.profiles where id = uid;
  if p is null or p.stamps_used >= p.stamp_quota then return false; end if;
  if p.plan='premium' and p.plan_expires_at is not null and p.plan_expires_at < now() then return false; end if;

  update public.profiles
  set stamps_used = stamps_used + 1,
      updated_at = now()
  where id = uid;

  return true;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.admin_stats()
returns json as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select exists(
    select 1 from public.profiles where id = current_user_id and role = 'admin'
  ) into is_admin;

  if not is_admin then
    raise exception 'Admin only';
  end if;

  return json_build_object(
    'total_users', (select count(*) from public.profiles),
    'total_documents', (select count(*) from public.documents),
    'total_verifications', (select count(*) from public.verification_logs),
    'pending_payments', (select count(*) from public.payments where status='pending'),
    'total_revenue', (select coalesce(sum(amount_idr),0) from public.payments where status='verified'),
    'premium_users', (select count(*) from public.profiles where plan='premium'),
    'basic_users', (select count(*) from public.profiles where plan='basic')
  );
end;
$$ language plpgsql security definer set search_path = public;

drop policy if exists "up_logos" on storage.objects;
drop policy if exists "up_proofs" on storage.objects;
drop policy if exists "read_proofs" on storage.objects;
drop policy if exists "del_docs" on storage.objects;
drop policy if exists "del_logos" on storage.objects;
drop policy if exists "del_proofs" on storage.objects;

create policy "up_logos" on storage.objects for insert
with check (bucket_id='logos' and auth.uid()::text=(storage.foldername(name))[1]);

create policy "up_proofs" on storage.objects for insert
with check (bucket_id='payment-proofs' and auth.uid()::text=(storage.foldername(name))[1]);

create policy "read_proofs" on storage.objects for select
using (
  bucket_id='payment-proofs'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create policy "del_docs" on storage.objects for delete
using (bucket_id='documents' and auth.uid()::text=(storage.foldername(name))[1]);

create policy "del_logos" on storage.objects for delete
using (bucket_id='logos' and auth.uid()::text=(storage.foldername(name))[1]);

create policy "del_proofs" on storage.objects for delete
using (bucket_id='payment-proofs' and auth.uid()::text=(storage.foldername(name))[1]);

revoke all on function public.verify_payment(uuid, uuid, text) from public;
revoke all on function public.reject_payment(uuid, uuid, text) from public;
revoke all on function public.admin_stats() from public;

grant execute on function public.verify_payment(uuid, uuid, text) to authenticated;
grant execute on function public.reject_payment(uuid, uuid, text) to authenticated;
grant execute on function public.admin_stats() to authenticated;
