-- ============================================================================
--  Запланированные сообщения (отложенная отправка) — синхронизация через Supabase
--  Выполните этот скрипт в дашборде:
--  Supabase → ваш проект → SQL Editor → New query → вставьте → Run
--
--  Скрипт идемпотентен — его можно запускать повторно.
--  Зависит от таблиц из schema.sql (auth.users). Запускайте ПОСЛЕ schema.sql.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
--  scheduled_messages — очередь отложенных сообщений конкретного пользователя
--  Примечания:
--   * chat_id хранится как text БЕЗ внешнего ключа на public.chats —
--     отложить можно и в локальный чат (например «Избранное»), которого
--     может не быть в таблице chats.
--   * Это таблица-очередь: запись удаляется после фактической отправки
--     (на клиенте или серверным шедулером — см. блок ниже).
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.scheduled_messages (
  id            text        primary key,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  chat_id       text        not null,
  text          text        not null default '',
  reply_to_id   text,
  reply_to_text text,
  fire_at       timestamptz not null,
  created_at    timestamptz not null default now()
);

-- Быстрый выбор «моих» записей и поиск наступивших по времени
create index if not exists scheduled_messages_user_idx
  on public.scheduled_messages (user_id, fire_at);
create index if not exists scheduled_messages_fire_idx
  on public.scheduled_messages (fire_at);

alter table public.scheduled_messages enable row level security;

-- RLS: пользователь видит и меняет только свои отложенные сообщения
drop policy if exists "scheduled_select_own" on public.scheduled_messages;
drop policy if exists "scheduled_insert_own" on public.scheduled_messages;
drop policy if exists "scheduled_update_own" on public.scheduled_messages;
drop policy if exists "scheduled_delete_own" on public.scheduled_messages;

create policy "scheduled_select_own" on public.scheduled_messages
  for select using (auth.uid() = user_id);
create policy "scheduled_insert_own" on public.scheduled_messages
  for insert with check (auth.uid() = user_id);
create policy "scheduled_update_own" on public.scheduled_messages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scheduled_delete_own" on public.scheduled_messages
  for delete using (auth.uid() = user_id);

-- Realtime: чтобы очередь синхронизировалась между вкладками/устройствами
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.scheduled_messages';
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================================
--  (ОПЦИОНАЛЬНО) Серверный шедулер через pg_cron + pg_net / Edge Function
--  ----------------------------------------------------------------------------
--  Таблица выше даёт ПЕРСИСТЕНТНОСТЬ и синхронизацию очереди. Но чтобы
--  сообщения уходили, даже когда вкладка закрыта, нужен серверный обработчик.
--
--  Вариант: периодически переносить «созревшие» записи в public.messages.
--  Требуется расширение pg_cron (Supabase → Database → Extensions → pg_cron).
--
--  ВНИМАНИЕ: author_id у messages ссылается на auth.users, поэтому функция
--  должна выполняться с правами, позволяющими вставку. Ниже — пример функции,
--  которую можно вызывать по расписанию. Раскомментируйте при необходимости.
-- ============================================================================

-- create or replace function public.flush_due_scheduled_messages()
-- returns integer
-- language plpgsql
-- security definer
-- set search_path = public
-- as $$
-- declare
--   moved integer := 0;
-- begin
--   with due as (
--     delete from public.scheduled_messages s
--     where s.fire_at <= now()
--     returning s.*
--   )
--   insert into public.messages
--     (id, chat_id, author_id, kind, text, reply_to_id, reply_to_text, created_at)
--   select
--     d.id, d.chat_id, d.user_id, 'text', d.text, d.reply_to_id, d.reply_to_text, now()
--   from due d;
--   get diagnostics moved = row_count;
--   return moved;
-- end $$;
--
-- -- Запуск каждую минуту (нужно расширение pg_cron):
-- -- select cron.schedule('flush-scheduled', '* * * * *',
-- --   $$select public.flush_due_scheduled_messages();$$);
