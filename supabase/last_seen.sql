-- ============================================================================
-- HouseGramX: статус «был(а) в сети…» (last_seen)
-- ----------------------------------------------------------------------------
-- ПРОБЛЕМА: время не меняется («был 6 июня в 00:51» и застыло).
-- ПРИЧИНА: в schema.sql колонка last_seen была только внутри
--   create table if not exists public.profiles (...). Если таблица уже
--   существовала, этот запрос НЕ добавляет новую колонку →
--   last_seen в базе нет → запись/чтение молча падают, и UI
--   показывает время последнего сообщения (оно не меняется).
--
-- РЕШЕНИЕ: выполните этот файл в Supabase → SQL Editor. Безопасно
-- запускать повторно.
-- ============================================================================

-- 1) Добавляем колонку (идемпотентно).
alter table public.profiles
  add column if not exists last_seen timestamptz;

-- 2) Проверяем, что RLS разрешает владельцу обновлять свой профиль,
--    а читать профили могут все авторизованные (пересоздаём безопасно).
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 3) (Необязательно) индекс для сортировки по активности.
create index if not exists profiles_last_seen_idx
  on public.profiles (last_seen desc nulls last);

-- ============================================================================
-- ДИАГНОСТИКА — запустите отдельно, чтобы увидеть реальные данные:
-- ----------------------------------------------------------------------------
-- Есть ли колонка и какие значения:
--   select id, name, username, last_seen
--   from public.profiles
--   order by last_seen desc nulls last;
--
-- После миграции: зайдите в приложение под нужным аккаунтом —
-- его last_seen должен обновиться на текущее время в течение минуты.
-- ============================================================================
