-- ============================================================================
--  HouseGram Premium — промокоды (скидка/выдача Premium по коду)
--  Выполните в Supabase → SQL Editor → New query → вставьте → Run.
--  ВАЖНО: сначала должны быть выполнены schema.sql, admin.sql и premium.sql
--         (используются функции is_admin(), is_banned() и колонка premium_until).
--  Скрипт идемпотентен — можно запускать повторно.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Таблица промокодов
--    code            — сам код (название), хранится в ВЕРХНЕМ регистре.
--    premium_days    — сколько дней Premium выдаёт активация кода.
--    max_activations — сколько всего раз код можно активировать.
--    used_count      — сколько раз код уже активирован.
--    active          — выключенный код активировать нельзя.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.promo_codes (
  code            text        primary key,
  premium_days    int         not null default 30,
  max_activations int         not null default 1,
  used_count      int         not null default 0,
  active          boolean     not null default true,
  created_by      uuid        references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.promo_codes enable row level security;
-- Политик нет намеренно: доступ к таблице — только через SECURITY DEFINER
-- функции ниже (создание/список — админ, активация — сам пользователь).

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Кто какой код активировал (защита от повторной активации одним юзером)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.promo_redemptions (
  code        text        not null references public.promo_codes (code) on delete cascade,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code, user_id)
);

alter table public.promo_redemptions enable row level security;
-- Политик нет намеренно: запись только через redeem_promo_code() (definer).

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Создать промокод (только админ)
--    Возвращает { code, premium_days, max_activations, used_count }.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_create_promo_code(
  _code text,
  _premium_days int,
  _max_activations int
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $fn$
declare
  _c text := upper(trim(coalesce(_code, '')));
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if _c = '' then
    raise exception 'invalid code';
  end if;
  if _premium_days is null or _premium_days <= 0 then
    raise exception 'invalid days';
  end if;
  if _max_activations is null or _max_activations <= 0 then
    raise exception 'invalid activations';
  end if;
  if exists (select 1 from public.promo_codes where code = _c) then
    raise exception 'code exists';
  end if;

  insert into public.promo_codes (code, premium_days, max_activations, created_by)
  values (_c, _premium_days, _max_activations, auth.uid());

  return jsonb_build_object(
    'code', _c,
    'premium_days', _premium_days,
    'max_activations', _max_activations,
    'used_count', 0
  );
end;
$fn$;

grant execute on function public.admin_create_promo_code(text, int, int) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Список всех промокодов (только админ)
--    Возвращает jsonb-массив объектов промокодов (свежие сверху).
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_list_promo_codes()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $fn$
declare
  _rows jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
    into _rows
  from (
    select code, premium_days, max_activations, used_count, active, created_at
      from public.promo_codes
  ) t;

  return _rows;
end;
$fn$;

grant execute on function public.admin_list_promo_codes() to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 5) Удалить промокод (только админ)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_delete_promo_code(_code text)
  returns boolean
  language plpgsql
  security definer
  set search_path = public
as $fn$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  delete from public.promo_codes where code = upper(trim(coalesce(_code, '')));
  return true;
end;
$fn$;

grant execute on function public.admin_delete_promo_code(text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 6) Активировать промокод (любой авторизованный пользователь)
--    Продлевает Premium от текущей даты окончания (как admin_grant_premium).
--    Защита: бан, неверный/выключенный код, исчерпанный лимит, повтор.
--    Возвращает { premium_until, premium_days }.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.redeem_promo_code(_code text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $fn$
declare
  _c     text := upper(trim(coalesce(_code, '')));
  _uid   uuid := auth.uid();
  _row   public.promo_codes%rowtype;
  _base  timestamptz;
  _until timestamptz;
begin
  if _uid is null then
    raise exception 'forbidden';
  end if;
  if public.is_banned() then
    raise exception 'banned';
  end if;
  if _c = '' then
    raise exception 'invalid code';
  end if;

  -- Блокируем строку, чтобы корректно считать активации при гонке запросов.
  select * into _row from public.promo_codes where code = _c for update;
  if not found or not _row.active then
    raise exception 'invalid code';
  end if;
  if _row.used_count >= _row.max_activations then
    raise exception 'exhausted';
  end if;
  if exists (
    select 1 from public.promo_redemptions where code = _c and user_id = _uid
  ) then
    raise exception 'already redeemed';
  end if;

  -- Продлеваем Premium от текущей даты окончания (или от now(), если истёк).
  select premium_until into _base from public.profiles where id = _uid;
  if _base is null or _base < now() then
    _base := now();
  end if;
  _until := _base + make_interval(days => _row.premium_days);

  update public.profiles
     set premium_until = _until, updated_at = now()
   where id = _uid;

  update public.promo_codes
     set used_count = used_count + 1
   where code = _c;

  insert into public.promo_redemptions (code, user_id) values (_c, _uid);

  return jsonb_build_object('premium_until', _until, 'premium_days', _row.premium_days);
end;
$fn$;

grant execute on function public.redeem_promo_code(text) to authenticated;
