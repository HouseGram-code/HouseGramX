-- ============================================================================
--  HouseGram Premium — премиум-подписка и «Закрытая личка»
--  Выполните в Supabase → SQL Editor → New query → вставьте → Run.
--  ВАЖНО: сначала должны быть выполнены schema.sql и admin.sql
--         (используются функции is_admin(), is_banned(), sender_is_blocked()).
--  Скрипт идемпотентен — можно запускать повторно.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Колонки премиума в профиле
--    premium_until — до какого времени активен Premium (NULL = нет).
--    dm_closed     — пользователь закрыл личку (премиум-функция): пока активен
--                    Premium, ему никто не может писать в личных чатах.
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists premium_until timestamptz;

alter table public.profiles
  add column if not exists dm_closed boolean not null default false;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Активен ли Premium у пользователя
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.is_premium(_uid uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $fn$
  select coalesce(
    (select premium_until from public.profiles where id = _uid) > now(),
    false
  );
$fn$;

grant execute on function public.is_premium(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Закрыта ли личка у получателя (премиум-функция)
--    В личном чате: второй участник закрыл личку И его Premium активен →
--    отправка сообщения запрещена.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.recipient_dm_closed(_chat_id text)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $fn$
  select exists (
    select 1
    from public.chat_members cm
    join public.chats c    on c.id = cm.chat_id
    join public.profiles p on p.id = cm.user_id
    where cm.chat_id = _chat_id
      and c.kind = 'private'
      and cm.user_id <> auth.uid()
      and p.dm_closed = true
      and coalesce(p.premium_until > now(), false)
  );
$fn$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Обновляем политику вставки сообщений: нельзя писать тому, кто закрыл личку.
--    ИСКЛЮЧЕНИЕ: отправитель с активным Premium может писать в обход.
--    (повторяет финальную версию из admin.sql + новое условие).
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    public.is_chat_member(chat_id)
    and (author_id = auth.uid() or author_id is null)
    and not public.sender_is_blocked(chat_id)
    and not public.is_banned()
    and (
      not public.recipient_dm_closed(chat_id)
      or public.is_premium(auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 5) Выдать Premium по username на N дней (только админ)
--    Если Premium ещё активен — продлевает от текущей даты окончания.
--    Возвращает { user_id, premium_until }.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_grant_premium(_username text, _days int)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $fn$
declare
  _uid   uuid;
  _base  timestamptz;
  _until timestamptz;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if _days is null or _days <= 0 then
    raise exception 'invalid days';
  end if;

  select id into _uid
    from public.profiles
   where lower(username) = lower(trim(_username))
     and trim(_username) <> ''
   limit 1;

  if _uid is null then
    raise exception 'user not found';
  end if;

  select premium_until into _base from public.profiles where id = _uid;
  if _base is null or _base < now() then
    _base := now();
  end if;
  _until := _base + make_interval(days => _days);

  update public.profiles
     set premium_until = _until, updated_at = now()
   where id = _uid;

  return jsonb_build_object('user_id', _uid, 'premium_until', _until);
end;
$fn$;

grant execute on function public.admin_grant_premium(text, int) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 6) Снять Premium по username (только админ)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_revoke_premium(_username text)
  returns boolean
  language plpgsql
  security definer
  set search_path = public
as $fn$
declare
  _uid uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select id into _uid
    from public.profiles
   where lower(username) = lower(trim(_username))
     and trim(_username) <> ''
   limit 1;

  if _uid is null then
    raise exception 'user not found';
  end if;

  update public.profiles
     set premium_until = null, updated_at = now()
   where id = _uid;

  return true;
end;
$fn$;

grant execute on function public.admin_revoke_premium(text) to authenticated;
