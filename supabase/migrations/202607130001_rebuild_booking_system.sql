begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'ADMIN' check (role in ('ADMIN', 'MANAGER')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists admin_users_email_unique
  on public.admin_users (lower(email));

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  weekend_start date not null,
  weekend_end date generated always as (weekend_start + 2) stored,
  church_name text not null check (char_length(church_name) between 2 and 120),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  phone text not null check (char_length(phone) between 10 and 20),
  email text not null check (char_length(email) between 5 and 160),
  people_count integer not null check (people_count between 40 and 140),
  notes text not null default '' check (char_length(notes) <= 1000),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED')),
  source text not null default 'PUBLIC' check (source in ('PUBLIC', 'MANUAL')),
  request_fingerprint text,
  expires_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_weekend_starts_friday
    check (extract(isodow from weekend_start)::integer = 5)
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  weekend_start date not null unique,
  weekend_end date generated always as (weekend_start + 2) stored,
  reason text not null default '' check (char_length(reason) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blocks_weekend_starts_friday
    check (extract(isodow from weekend_start)::integer = 5)
);

create table if not exists public.booking_status_history (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status text,
  to_status text not null,
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists bookings_weekend_start_idx
  on public.bookings (weekend_start);
create index if not exists bookings_status_idx
  on public.bookings (status);
create index if not exists bookings_created_at_idx
  on public.bookings (created_at desc);
create index if not exists bookings_fingerprint_recent_idx
  on public.bookings (request_fingerprint, created_at desc)
  where request_fingerprint is not null;
create index if not exists booking_status_history_booking_idx
  on public.booking_status_history (booking_id, created_at desc);

create unique index if not exists one_confirmed_booking_per_weekend
  on public.bookings (weekend_start)
  where status = 'CONFIRMED';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

drop trigger if exists blocks_set_updated_at on public.blocks;
create trigger blocks_set_updated_at
before update on public.blocks
for each row execute function public.set_updated_at();

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
before update on public.admin_users
for each row execute function public.set_updated_at();

create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = p_user_id
      and au.active = true
  );
$$;

create or replace function public.expire_pending_bookings()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  with expired as (
    update public.bookings
       set status = 'REJECTED',
           decided_at = now(),
           decision_reason = 'Solicitação expirada automaticamente.'
     where status = 'PENDING'
       and expires_at is not null
       and expires_at <= now()
    returning id
  ), history_rows as (
    insert into public.booking_status_history (
      booking_id,
      from_status,
      to_status,
      reason
    )
    select id, 'PENDING', 'REJECTED', 'Solicitação expirada automaticamente.'
    from expired
    returning 1
  )
  select count(*) into v_count from history_rows;

  return v_count;
end;
$$;

create or replace function public.get_public_weekend_availability(
  p_from date,
  p_to date
)
returns table (
  weekend_start date,
  status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'DATE_RANGE_INVALID';
  end if;

  if p_to - p_from > 760 then
    raise exception 'DATE_RANGE_TOO_LARGE';
  end if;

  perform public.expire_pending_bookings();

  return query
  with status_candidates as (
    select
      b.weekend_start,
      case
        when b.status = 'CONFIRMED' then 'RESERVED'
        when b.status = 'PENDING' then 'PENDING'
      end as status,
      case when b.status = 'CONFIRMED' then 20 else 10 end as priority
    from public.bookings b
    where b.weekend_start between p_from and p_to
      and b.status in ('PENDING', 'CONFIRMED')

    union all

    select bl.weekend_start, 'BLOCKED', 30
    from public.blocks bl
    where bl.weekend_start between p_from and p_to
  )
  select distinct on (sc.weekend_start)
    sc.weekend_start,
    sc.status
  from status_candidates sc
  order by sc.weekend_start, sc.priority desc;
end;
$$;

create or replace function public.create_booking_request(
  p_weekend_start date,
  p_church_name text,
  p_contact_name text,
  p_phone text,
  p_email text,
  p_people_count integer,
  p_notes text default '',
  p_request_fingerprint text default null
)
returns table (
  id uuid,
  weekend_start date,
  weekend_end date,
  status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings%rowtype;
  v_recent_requests integer;
begin
  perform public.expire_pending_bookings();

  if p_weekend_start is null
     or extract(isodow from p_weekend_start)::integer <> 5 then
    raise exception 'BOOKING_DATE_INVALID';
  end if;

  if p_weekend_start < current_date then
    raise exception 'BOOKING_DATE_PAST';
  end if;

  if char_length(trim(coalesce(p_church_name, ''))) < 2
     or char_length(trim(coalesce(p_contact_name, ''))) < 2
     or char_length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) < 10
     or char_length(trim(coalesce(p_email, ''))) < 5
     or p_people_count not between 40 and 140 then
    raise exception 'BOOKING_DATA_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_weekend_start::text));

  if exists (
    select 1 from public.blocks bl
    where bl.weekend_start = p_weekend_start
  ) then
    raise exception 'WEEKEND_BLOCKED';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.weekend_start = p_weekend_start
      and b.status = 'CONFIRMED'
  ) then
    raise exception 'WEEKEND_RESERVED';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.weekend_start = p_weekend_start
      and b.status = 'PENDING'
      and (
        b.phone = regexp_replace(p_phone, '[^0-9]', '', 'g')
        or lower(b.email) = lower(trim(p_email))
      )
  ) then
    raise exception 'DUPLICATE_REQUEST';
  end if;

  if nullif(trim(coalesce(p_request_fingerprint, '')), '') is not null then
    select count(*) into v_recent_requests
    from public.bookings b
    where b.request_fingerprint = p_request_fingerprint
      and b.created_at >= now() - interval '15 minutes';

    if v_recent_requests >= 5 then
      raise exception 'RATE_LIMITED';
    end if;
  end if;

  insert into public.bookings (
    weekend_start,
    church_name,
    contact_name,
    phone,
    email,
    people_count,
    notes,
    status,
    source,
    request_fingerprint,
    expires_at
  ) values (
    p_weekend_start,
    trim(p_church_name),
    trim(p_contact_name),
    regexp_replace(p_phone, '[^0-9]', '', 'g'),
    lower(trim(p_email)),
    p_people_count,
    left(trim(coalesce(p_notes, '')), 1000),
    'PENDING',
    'PUBLIC',
    nullif(trim(coalesce(p_request_fingerprint, '')), ''),
    now() + interval '48 hours'
  )
  returning * into v_booking;

  return query
  select
    v_booking.id,
    v_booking.weekend_start,
    v_booking.weekend_end,
    v_booking.status,
    v_booking.expires_at;
end;
$$;

create or replace function public.admin_update_booking_status(
  p_booking_id uuid,
  p_status text,
  p_actor_id uuid,
  p_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings%rowtype;
  v_previous_status text;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin(p_actor_id) then
    raise exception 'NOT_ADMIN';
  end if;

  if upper(coalesce(p_status, '')) not in ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED') then
    raise exception 'STATUS_INVALID';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  v_previous_status := v_booking.status;
  p_status := upper(p_status);

  perform pg_advisory_xact_lock(hashtext(v_booking.weekend_start::text));

  if p_status = 'CONFIRMED' then
    if exists (
      select 1 from public.blocks bl
      where bl.weekend_start = v_booking.weekend_start
    ) then
      raise exception 'WEEKEND_BLOCKED';
    end if;

    if exists (
      select 1 from public.bookings b
      where b.weekend_start = v_booking.weekend_start
        and b.status = 'CONFIRMED'
        and b.id <> v_booking.id
    ) then
      raise exception 'WEEKEND_RESERVED';
    end if;

    with rejected as (
      update public.bookings
         set status = 'REJECTED',
             decided_at = now(),
             decided_by = p_actor_id,
             decision_reason = 'Outra solicitação foi confirmada para esta data.',
             expires_at = null
       where weekend_start = v_booking.weekend_start
         and status = 'PENDING'
         and id <> v_booking.id
      returning id
    )
    insert into public.booking_status_history (
      booking_id, from_status, to_status, reason, changed_by
    )
    select
      id,
      'PENDING',
      'REJECTED',
      'Outra solicitação foi confirmada para esta data.',
      p_actor_id
    from rejected;

    update public.bookings
       set status = 'CONFIRMED',
           decided_at = now(),
           decided_by = p_actor_id,
           decision_reason = v_reason,
           expires_at = null
     where id = v_booking.id
    returning * into v_booking;

  elsif p_status = 'PENDING' then
    if v_booking.weekend_start < current_date then
      raise exception 'BOOKING_DATE_PAST';
    end if;

    if exists (
      select 1 from public.blocks bl
      where bl.weekend_start = v_booking.weekend_start
    ) then
      raise exception 'WEEKEND_BLOCKED';
    end if;

    if exists (
      select 1 from public.bookings b
      where b.weekend_start = v_booking.weekend_start
        and b.status = 'CONFIRMED'
        and b.id <> v_booking.id
    ) then
      raise exception 'WEEKEND_RESERVED';
    end if;

    update public.bookings
       set status = 'PENDING',
           decided_at = null,
           decided_by = null,
           decision_reason = v_reason,
           expires_at = now() + interval '48 hours'
     where id = v_booking.id
    returning * into v_booking;

  else
    update public.bookings
       set status = p_status,
           decided_at = now(),
           decided_by = p_actor_id,
           decision_reason = coalesce(
             v_reason,
             case
               when p_status = 'REJECTED' then 'Solicitação rejeitada pelo administrador.'
               else 'Reserva cancelada pelo administrador.'
             end
           ),
           expires_at = null
     where id = v_booking.id
    returning * into v_booking;
  end if;

  if v_previous_status is distinct from v_booking.status then
    insert into public.booking_status_history (
      booking_id,
      from_status,
      to_status,
      reason,
      changed_by
    ) values (
      v_booking.id,
      v_previous_status,
      v_booking.status,
      v_booking.decision_reason,
      p_actor_id
    );
  end if;

  return v_booking;
end;
$$;

create or replace function public.create_manual_booking(
  p_weekend_start date,
  p_church_name text,
  p_contact_name text,
  p_phone text,
  p_email text,
  p_people_count integer,
  p_notes text,
  p_actor_id uuid
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings%rowtype;
begin
  if not public.is_admin(p_actor_id) then
    raise exception 'NOT_ADMIN';
  end if;

  if p_weekend_start is null
     or extract(isodow from p_weekend_start)::integer <> 5
     or p_weekend_start < current_date then
    raise exception 'BOOKING_DATE_INVALID';
  end if;

  if char_length(trim(coalesce(p_church_name, ''))) < 2
     or char_length(trim(coalesce(p_contact_name, ''))) < 2
     or char_length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) < 10
     or char_length(trim(coalesce(p_email, ''))) < 5
     or p_people_count not between 40 and 140 then
    raise exception 'BOOKING_DATA_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_weekend_start::text));

  if exists (select 1 from public.blocks where weekend_start = p_weekend_start) then
    raise exception 'WEEKEND_BLOCKED';
  end if;

  if exists (
    select 1 from public.bookings
    where weekend_start = p_weekend_start
      and status = 'CONFIRMED'
  ) then
    raise exception 'WEEKEND_RESERVED';
  end if;

  insert into public.bookings (
    weekend_start,
    church_name,
    contact_name,
    phone,
    email,
    people_count,
    notes,
    status,
    source,
    decided_at,
    decided_by
  ) values (
    p_weekend_start,
    trim(p_church_name),
    trim(p_contact_name),
    regexp_replace(p_phone, '[^0-9]', '', 'g'),
    lower(trim(p_email)),
    p_people_count,
    left(trim(coalesce(p_notes, '')), 1000),
    'CONFIRMED',
    'MANUAL',
    now(),
    p_actor_id
  )
  returning * into v_booking;

  with rejected as (
    update public.bookings
       set status = 'REJECTED',
           decided_at = now(),
           decided_by = p_actor_id,
           decision_reason = 'Reserva manual confirmada para esta data.',
           expires_at = null
     where weekend_start = p_weekend_start
       and status = 'PENDING'
       and id <> v_booking.id
    returning id
  )
  insert into public.booking_status_history (
    booking_id, from_status, to_status, reason, changed_by
  )
  select
    id,
    'PENDING',
    'REJECTED',
    'Reserva manual confirmada para esta data.',
    p_actor_id
  from rejected;

  insert into public.booking_status_history (
    booking_id, from_status, to_status, reason, changed_by
  ) values (
    v_booking.id, null, 'CONFIRMED', 'Reserva criada manualmente.', p_actor_id
  );

  return v_booking;
end;
$$;

create or replace function public.admin_block_weekend(
  p_weekend_start date,
  p_reason text,
  p_actor_id uuid
)
returns public.blocks
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_block public.blocks%rowtype;
  v_reason text := left(trim(coalesce(p_reason, '')), 500);
begin
  if not public.is_admin(p_actor_id) then
    raise exception 'NOT_ADMIN';
  end if;

  if p_weekend_start is null
     or extract(isodow from p_weekend_start)::integer <> 5
     or p_weekend_start < current_date then
    raise exception 'BOOKING_DATE_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_weekend_start::text));

  if exists (
    select 1 from public.bookings
    where weekend_start = p_weekend_start
      and status = 'CONFIRMED'
  ) then
    raise exception 'CONFIRMED_BOOKING_EXISTS';
  end if;

  insert into public.blocks (weekend_start, reason, created_by)
  values (p_weekend_start, v_reason, p_actor_id)
  on conflict (weekend_start) do update
    set reason = excluded.reason,
        created_by = excluded.created_by,
        updated_at = now()
  returning * into v_block;

  with rejected as (
    update public.bookings
       set status = 'REJECTED',
           decided_at = now(),
           decided_by = p_actor_id,
           decision_reason = coalesce(nullif(v_reason, ''), 'Data bloqueada pelo administrador.'),
           expires_at = null
     where weekend_start = p_weekend_start
       and status = 'PENDING'
    returning id
  )
  insert into public.booking_status_history (
    booking_id, from_status, to_status, reason, changed_by
  )
  select
    id,
    'PENDING',
    'REJECTED',
    coalesce(nullif(v_reason, ''), 'Data bloqueada pelo administrador.'),
    p_actor_id
  from rejected;

  return v_block;
end;
$$;

create or replace function public.admin_unblock_weekend(
  p_weekend_start date,
  p_actor_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin(p_actor_id) then
    raise exception 'NOT_ADMIN';
  end if;

  delete from public.blocks
  where weekend_start = p_weekend_start;

  return found;
end;
$$;

alter table public.bookings enable row level security;
alter table public.blocks enable row level security;
alter table public.admin_users enable row level security;
alter table public.booking_status_history enable row level security;

drop policy if exists "admins can read bookings" on public.bookings;
create policy "admins can read bookings"
on public.bookings for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "admins can read blocks" on public.blocks;
create policy "admins can read blocks"
on public.blocks for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "admins can read admin users" on public.admin_users;
create policy "admins can read admin users"
on public.admin_users for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "admins can read booking history" on public.booking_status_history;
create policy "admins can read booking history"
on public.booking_status_history for select
to authenticated
using (public.is_admin(auth.uid()));

revoke all on table public.bookings from anon, authenticated;
revoke all on table public.blocks from anon, authenticated;
revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.booking_status_history from anon, authenticated;

grant select on table public.bookings to authenticated;
grant select on table public.blocks to authenticated;
grant select on table public.admin_users to authenticated;
grant select on table public.booking_status_history to authenticated;

grant all on table public.bookings to service_role;
grant all on table public.blocks to service_role;
grant all on table public.admin_users to service_role;
grant all on table public.booking_status_history to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke all on function public.is_admin(uuid) from public, anon;
revoke all on function public.expire_pending_bookings() from public, anon, authenticated;
revoke all on function public.create_booking_request(date, text, text, text, text, integer, text, text) from public, anon, authenticated;
revoke all on function public.admin_update_booking_status(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.create_manual_booking(date, text, text, text, text, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_block_weekend(date, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_unblock_weekend(date, uuid) from public, anon, authenticated;

revoke all on function public.get_public_weekend_availability(date, date) from public;
grant execute on function public.get_public_weekend_availability(date, date) to anon, authenticated, service_role;
grant execute on function public.is_admin(uuid) to authenticated, service_role;
grant execute on function public.expire_pending_bookings() to service_role;
grant execute on function public.create_booking_request(date, text, text, text, text, integer, text, text) to service_role;
grant execute on function public.admin_update_booking_status(uuid, text, uuid, text) to service_role;
grant execute on function public.create_manual_booking(date, text, text, text, text, integer, text, uuid) to service_role;
grant execute on function public.admin_block_weekend(date, text, uuid) to service_role;
grant execute on function public.admin_unblock_weekend(date, uuid) to service_role;

commit;
