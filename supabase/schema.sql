-- cache — 웹 클라우드 스토리지 메타데이터 스키마
-- Supabase 대시보드 > SQL Editor 에서 한 번 실행하세요.
--
-- 실제 파일 바이트는 Cloudflare R2에 저장되고, 여기(items.r2_key)는 R2 객체 키만 가리킨다.
-- 폴더와 파일을 한 테이블(items)에 트리 구조(parent_id)로 저장한다.

create extension if not exists pgcrypto;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.items(id) on delete cascade,
  kind text not null check (kind in ('folder', 'file')),
  name text not null check (length(name) between 1 and 255),
  size bigint not null default 0 check (size >= 0),
  mime text,
  r2_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_user_parent_idx on public.items (user_id, parent_id);
create index if not exists items_user_updated_idx on public.items (user_id, updated_at desc);
create unique index if not exists items_r2_key_key on public.items (r2_key) where r2_key is not null;

-- 같은 폴더 안에서 이름이 겹치지 않도록 한다(루트는 parent_id가 null).
create unique index if not exists items_unique_name_in_folder
  on public.items (user_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- 사용자별 설정(저장 한도 등)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  storage_limit_bytes bigint not null default 10737418240, -- 10GB
  updated_at timestamptz not null default now()
);

-- ── RLS: 본인 행만 읽고 쓸 수 있다 ──────────────────────────────────────
alter table public.items enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "items select own" on public.items;
create policy "items select own" on public.items for select using (auth.uid() = user_id);

drop policy if exists "items insert own" on public.items;
create policy "items insert own" on public.items for insert with check (auth.uid() = user_id);

drop policy if exists "items update own" on public.items;
create policy "items update own" on public.items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "items delete own" on public.items;
create policy "items delete own" on public.items for delete using (auth.uid() = user_id);

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles for select using (auth.uid() = user_id);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = user_id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = user_id);

-- ── 사용량 집계 (홈 화면) ─────────────────────────────────────────────────
create or replace function public.storage_usage()
returns table (used_bytes bigint, file_count bigint, folder_count bigint)
language sql security invoker stable as $$
  select
    coalesce(sum(size) filter (where kind = 'file'), 0)::bigint as used_bytes,
    count(*) filter (where kind = 'file') as file_count,
    count(*) filter (where kind = 'folder') as folder_count
  from public.items
  where user_id = auth.uid();
$$;

-- ── 폴더 하위 전체 파일 키 조회 (삭제 시 R2 객체 정리용) ───────────────────
create or replace function public.subtree_r2_keys(root_id uuid)
returns table (key text)
language sql security invoker stable as $$
  with recursive tree as (
    select id, r2_key, kind from public.items where id = root_id and user_id = auth.uid()
    union all
    select i.id, i.r2_key, i.kind from public.items i join tree t on i.parent_id = t.id
  )
  select r2_key from tree where kind = 'file' and r2_key is not null;
$$;
