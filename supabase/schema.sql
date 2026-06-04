-- ============================================================================
--  Схема Supabase для мессенджера (полная)
--  Выполните этот скрипт в дашборде:
--  Supabase → ваш проект → SQL Editor → New query → вставьте → Run
--
--  Скрипт идемпотентен — его можно запускать повторно.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) user_data — JSON-снимки личных сторов (настройки, контакты, стикеры, звонки)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_data (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  store_key  text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, store_key)
);

create index if not exists user_data_user_id_idx on public.user_data (user_id);

alter table public.user_data enable row level security;

drop policy if exists "user_data_select_own" on public.user_data;
drop policy if exists "user_data_insert_own" on public.user_data;
drop policy if exists "user_data_update_own" on public.user_data;
drop policy if exists "user_data_delete_own" on public.user_data;

create policy "user_data_select_own" on public.user_data
  for select using (auth.uid() = user_id);
create policy "user_data_insert_own" on public.user_data
  for insert with check (auth.uid() = user_id);
create policy "user_data_update_own" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_data_delete_own" on public.user_data
  for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 2) profiles — публичный профиль (имя/аватар) для отображения авторов в группах
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  name       text        not null default '',
  username   text        not null default '',
  avatar     text        not null default '',
  color      text        not null default '#c0392b',
  bio        text        not null default '',
  last_seen  timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- Профили читают все авторизованные (чтобы видеть имена участников групп).
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- 3) chats — каналы, группы, личные чаты, бот
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.chats (
  id                text        primary key,
  kind              text        not null check (kind in ('bot','private','channel','group')),
  title             text        not null default '',
  color             text        not null default '',
  initials          text        not null default '',
  avatar            text,
  description       text,
  owner_id          uuid        not null references auth.users (id) on delete cascade,
  verified          boolean     not null default false,
  reactions_enabled boolean     not null default true,
  reactions_count   int         not null default 8,
  join_requests     boolean     not null default false,
  subscribers       int         not null default 1,
  -- Списки для UI управления (id локальных контактов, не auth-пользователей):
  member_ids        jsonb       not null default '[]'::jsonb,
  admin_ids         jsonb       not null default '[]'::jsonb,
  pending_ids       jsonb       not null default '[]'::jsonb,
  admin_rights      jsonb       not null default '{}'::jsonb,
  member_perms      jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists chats_owner_idx on public.chats (owner_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 4) chat_members — участники (роли: owner/admin/member/pending)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.chat_members (
  chat_id      text        not null references public.chats (id) on delete cascade,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  role         text        not null default 'member' check (role in ('owner','admin','member','pending')),
  admin_rights jsonb,
  muted        boolean     not null default false,
  muted_until  bigint,
  last_read    timestamptz,
  blocked      boolean     not null default false,
  joined_at    timestamptz not null default now(),
  primary key (chat_id, user_id)
);

create index if not exists chat_members_user_idx on public.chat_members (user_id);
create index if not exists chat_members_chat_idx on public.chat_members (chat_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 5) messages — сообщения / посты
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id              text        primary key,
  chat_id         text        not null references public.chats (id) on delete cascade,
  author_id       uuid        references auth.users (id) on delete set null, -- null = бот/системное
  kind            text        not null default 'text' check (kind in ('text','sticker','system','media')),
  text            text,
  sticker_src     text,
  sticker_emoji   text,
  media_kind      text,
  media_url       text,
  media_name      text,
  media_size      bigint,
  reaction        text,
  edited          boolean     not null default false,
  pinned          boolean     not null default false,
  reply_to_id     text,
  reply_to_text   text,
  reply_to_author text,
  forwarded_from  text,
  sender_name     text,
  sender_color    text,
  sender_initials text,
  read            boolean     not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists messages_chat_idx on public.messages (chat_id, created_at);

-- ────────────────────────────────────────────────────────────────────────────
-- 6) Вспомогательные функции (SECURITY DEFINER — обходят RLS, чтобы не было
--    бесконечной рекурсии в политиках)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.is_chat_member(_chat_id text)
  returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.chat_members
    where chat_id = _chat_id and user_id = auth.uid() and role <> 'pending'
  );
$$;

create or replace function public.is_chat_admin(_chat_id text)
  returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.chat_members
    where chat_id = _chat_id and user_id = auth.uid() and role in ('owner','admin')
  );
$$;

create or replace function public.can_read_messages(_chat_id text)
  returns boolean language sql security definer stable set search_path = public as $$
  select public.is_chat_member(_chat_id)
      or exists (select 1 from public.chats where id = _chat_id and kind = 'channel');
$$;

-- В личном чате нельзя писать, если собеседник тебя заблокировал.
create or replace function public.sender_is_blocked(_chat_id text)
  returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.chat_members cm
    join public.chats c on c.id = cm.chat_id
    where cm.chat_id = _chat_id
      and c.kind = 'private'
      and cm.user_id <> auth.uid()
      and cm.blocked = true
  );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 7) RLS политики
-- ────────────────────────────────────────────────────────────────────────────
alter table public.chats        enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages     enable row level security;

-- chats ----------------------------------------------------------------------
drop policy if exists "chats_select"  on public.chats;
drop policy if exists "chats_insert"  on public.chats;
drop policy if exists "chats_update"  on public.chats;
drop policy if exists "chats_delete"  on public.chats;

-- Видны: свои, публичные (каналы/группы — для перехода по ссылке), где состоишь.
create policy "chats_select" on public.chats
  for select to authenticated
  using (owner_id = auth.uid() or kind in ('channel','group') or public.is_chat_member(id));
create policy "chats_insert" on public.chats
  for insert to authenticated with check (owner_id = auth.uid());
create policy "chats_update" on public.chats
  for update to authenticated using (public.is_chat_admin(id)) with check (public.is_chat_admin(id));
create policy "chats_delete" on public.chats
  for delete to authenticated using (owner_id = auth.uid());

-- chat_members ---------------------------------------------------------------
drop policy if exists "members_select" on public.chat_members;
drop policy if exists "members_insert" on public.chat_members;
drop policy if exists "members_update" on public.chat_members;
drop policy if exists "members_delete" on public.chat_members;

create policy "members_select" on public.chat_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_chat_member(chat_id));
-- Вступить самому ИЛИ админ добавляет других.
create policy "members_insert" on public.chat_members
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_chat_admin(chat_id));
create policy "members_update" on public.chat_members
  for update to authenticated
  using (user_id = auth.uid() or public.is_chat_admin(chat_id));
create policy "members_delete" on public.chat_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_chat_admin(chat_id));

-- messages -------------------------------------------------------------------
drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;
drop policy if exists "messages_update" on public.messages;
drop policy if exists "messages_delete" on public.messages;

create policy "messages_select" on public.messages
  for select to authenticated using (public.can_read_messages(chat_id));
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    public.is_chat_member(chat_id)
    and (author_id = auth.uid() or author_id is null)
    and not public.sender_is_blocked(chat_id)
  );
create policy "messages_update" on public.messages
  for update to authenticated
  using (author_id = auth.uid() or public.is_chat_admin(chat_id));
create policy "messages_delete" on public.messages
  for delete to authenticated
  using (author_id = auth.uid() or public.is_chat_admin(chat_id));

-- ────────────────────────────────────────────────────────────────────────────
-- 8) Realtime — добавляем таблицы в публикацию (идемпотентно)
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.chats';        exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.chat_members';  exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.messages';      exception when duplicate_object then null; end;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 9) push_subscriptions — Web Push подписки устройств (фоновые уведомления)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  endpoint   text        primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subs_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subs_select_own" on public.push_subscriptions;
drop policy if exists "push_subs_insert_own" on public.push_subscriptions;
drop policy if exists "push_subs_update_own" on public.push_subscriptions;
drop policy if exists "push_subs_delete_own" on public.push_subscriptions;

create policy "push_subs_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "push_subs_insert_own" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy "push_subs_update_own" on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push_subs_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- 10) Storage — публичный bucket для аватаров и вложений
-- ────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Политики доступа к bucket'у avatars.
drop policy if exists "avatars_public_read"   on storage.objects;
drop policy if exists "avatars_auth_insert"   on storage.objects;
drop policy if exists "avatars_auth_update"   on storage.objects;
drop policy if exists "avatars_auth_delete"   on storage.objects;

-- Чтение — всем (bucket публичный).
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Загружать/менять/удалять может только авторизованный пользователь, и только
-- внутри своей папки: avatars/<uid>/...
create policy "avatars_auth_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_auth_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_auth_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 11) Storage — bucket для вложений в чатах (фото/видео/аудио/файлы)
-- ────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('media', 'media', true)
  on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
drop policy if exists "media_auth_insert" on storage.objects;
drop policy if exists "media_auth_delete" on storage.objects;

create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');

create policy "media_auth_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "media_auth_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
