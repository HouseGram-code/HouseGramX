-- ============================================================================
--  Админ-панель и бан-система для мессенджера
--  Выполните этот скрипт в дашборде Supabase:
--  Supabase → ваш проект → SQL Editor → New query → вставьте → Run
--
--  Скрипт идемпотентен — его можно запускать повторно.
--
--  Супер-администратор определяется по e-mail: goh@gmail.com
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Поле «забанен» и уникальность username (без учёта регистра)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists banned boolean not null default false;

-- Уникальный индекс по username в нижнем регистре (пустые строки не считаются).
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username <> '';

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Кто является администратором (по e-mail из JWT)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $fn$
  select coalesce((auth.jwt() ->> 'email') = 'goh@gmail.com', false);
$fn$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Забанен ли текущий пользователь (используется в политике messages_insert)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.is_banned()
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $fn$
  select coalesce((select banned from public.profiles where id = auth.uid()), false);
$fn$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Проверка занятости username — доступна и НЕавторизованным (для регистрации)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.username_available(_username text)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $fn$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(_username))
      and trim(_username) <> ''
  );
$fn$;

grant execute on function public.username_available(text) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 5) RLS: профили читают все авторизованные, обновлять — только админ
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

-- Сохраняем возможность пользователю менять свой профиль…
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- …и отдельно разрешаем админу обновлять любой профиль (для бана).
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- 6) RPC для бана/разбана пользователя (только админ, нельзя забанить себя)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_set_banned(_user_id uuid, _banned boolean)
  returns boolean
  language plpgsql
  security definer
  set search_path = public
as $fn$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if _user_id = auth.uid() then
    raise exception 'cannot ban self';
  end if;
  update public.profiles
     set banned = _banned, updated_at = now()
   where id = _user_id;
  return true;
end;
$fn$;

grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 7) Забаненные не могут отправлять сообщения
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    public.is_chat_member(chat_id)
    and (author_id = auth.uid() or author_id is null)
    and not public.sender_is_blocked(chat_id)
    and not public.is_banned()
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 8) app_settings — глобальные настройки приложения (режим техработ и пр.)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.app_settings (
  key        text        primary key,
  value      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Читать настройки могут все авторизованные (чтобы узнать о режиме техработ).
drop policy if exists "app_settings_select" on public.app_settings;
create policy "app_settings_select" on public.app_settings
  for select to authenticated using (true);

-- Изменять — только администратор.
drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write" on public.app_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Стартовое значение режима техработ (выключен).
insert into public.app_settings (key, value)
  values ('maintenance', '{"enabled": false, "message": ""}'::jsonb)
  on conflict (key) do nothing;

-- Доступ к флагу техработ и для НЕавторизованных (экран входа во время техработ).
create or replace function public.get_maintenance()
  returns jsonb
  language sql
  security definer
  stable
  set search_path = public
as $fn$
  select coalesce(
    (select value from public.app_settings where key = 'maintenance'),
    '{"enabled": false, "message": ""}'::jsonb
  );
$fn$;

grant execute on function public.get_maintenance() to anon, authenticated;

-- Realtime: моментально применяем изменения настроек у всех клиентов.
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.app_settings'; exception when duplicate_object then null; end;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 9) Статистика для админ-панели (только админ)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_stats()
  returns json
  language sql
  security definer
  stable
  set search_path = public
as $fn$
  select json_build_object(
    'users',    (select count(*) from public.profiles),
    'banned',   (select count(*) from public.profiles where banned),
    'chats',    (select count(*) from public.chats),
    'groups',   (select count(*) from public.chats where kind = 'group'),
    'channels', (select count(*) from public.chats where kind = 'channel'),
    'privates', (select count(*) from public.chats where kind = 'private'),
    'messages', (select count(*) from public.messages)
  )
  where public.is_admin();
$fn$;

grant execute on function public.admin_stats() to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 10) Официальный (верифицированный) аккаунт разработчика
--     Значок ставится автоматически аккаунту с админским e-mail и не может
--     быть подделан обычным пользователем (выставляется триггером на сервере).
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists official boolean not null default false;

create or replace function public.sync_official()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $fn$
begin
  new.official := exists (
    select 1 from auth.users
    where id = new.id and lower(email) = 'goh@gmail.com'
  );
  return new;
end;
$fn$;

drop trigger if exists profiles_sync_official on public.profiles;
create trigger profiles_sync_official
  before insert or update on public.profiles
  for each row execute function public.sync_official();

-- Разовое проставление флага существующим профилям.
update public.profiles p
   set official = exists (
     select 1 from auth.users u
     where u.id = p.id and lower(u.email) = 'goh@gmail.com'
   );
