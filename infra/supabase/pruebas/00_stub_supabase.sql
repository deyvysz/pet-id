-- Simulación mínima de Supabase para probar las migraciones en un Postgres local con pgvector.
-- NO se aplica en Supabase. Crea: roles anon/authenticated/service_role, esquema auth
-- (users, identities, uid(), role()), esquema storage (buckets, objects, foldername()) y un
-- stub de pgmq (create, send, read, list_queues) si la extensión no está instalada.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
-- Igual que Supabase: lo que cree postgres en public queda con ALL para los tres roles.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create extension if not exists pgcrypto;

-- auth
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  instance_id uuid,
  id uuid primary key,
  aud text,
  role text,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  confirmation_token text,
  recovery_token text,
  email_change_token_new text,
  email_change text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  identity_data jsonb not null,
  provider text not null,
  last_sign_in_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (provider_id, provider)
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create or replace function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

-- storage
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id text primary key,
  name text not null unique,
  owner uuid,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;

-- Carpetas de una ruta, sin el nombre del archivo ('a/b/c.jpg' -> {a,b}).
create or replace function storage.foldername(name text) returns text[] language plpgsql immutable as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end $$;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;

-- pgmq (stub solo si la extensión no está instalada ni disponible)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pgmq') then
    create extension if not exists pgmq;
    return;
  end if;
  create schema if not exists pgmq;
  create table if not exists pgmq.colas (queue_name text primary key, created_at timestamptz default now());
  create table if not exists pgmq.mensajes (
    msg_id bigserial primary key,
    queue_name text not null references pgmq.colas(queue_name),
    read_ct int not null default 0,
    enqueued_at timestamptz not null default now(),
    vt timestamptz not null default now(),
    message jsonb not null
  );
  create or replace function pgmq.create(queue_name text) returns void language sql as
    'insert into pgmq.colas (queue_name) values ($1) on conflict do nothing';
  create or replace function pgmq.list_queues() returns table (queue_name text, created_at timestamptz)
    language sql as 'select queue_name, created_at from pgmq.colas';
  create or replace function pgmq.send(queue_name text, msg jsonb, delay integer default 0) returns setof bigint
    language sql as
    'insert into pgmq.mensajes (queue_name, message, vt) values ($1, $2, now() + make_interval(secs => $3)) returning msg_id';
  create or replace function pgmq.read(queue_name text, vt integer, qty integer)
    returns table (msg_id bigint, read_ct int, enqueued_at timestamptz, vt timestamptz, message jsonb)
    language sql as $f$
      update pgmq.mensajes m set read_ct = m.read_ct + 1, vt = now() + make_interval(secs => $2)
      where m.msg_id in (select x.msg_id from pgmq.mensajes x where x.queue_name = $1 and x.vt <= now()
                         order by x.msg_id limit $3 for update skip locked)
      returning m.msg_id, m.read_ct, m.enqueued_at, m.vt, m.message
    $f$;
  revoke all on schema pgmq from public;
  revoke all on all functions in schema pgmq from public;
end $$;
