-- ============================================================================
--  HouseGram Premium — промокоды: выдача Premium ИЛИ скидка на покупку Premium.
--  Выполните в Supabase → SQL Editor → New query → вставьте → Run.
--  ВАЖНО: сначала должны быть выполнены schema.sql, admin.sql и premium.sql
--         (используются функции is_admin(), is_banned() и колонка premium_until).
--  Скрипт идемпотентен — можно запускать повторно (в т.ч. для обновления схемы).
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Таблица промокодов
--    kind            — 'premium' (выдаёт дни Premium) или 'discount' (скидка %).
--    premium_days    — сколько дней Premium выдаёт код типа 'premium'.
--    discount_percent— размер скидки в % (1..100) для кода типа 'discount'.
--    duration_minutes— на сколько минут активируется скидка после ввода кода.
--    max_activations — сколько всего раз код можно активировать.
--    used_count      — сколько раз код уже активирован.
--    active          — выключенный код активировать нельзя.
--    expires_at      — крайний срок активации кода (NULL = без ограничения).
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

-- Идемпотентно добавляем новые колонки (для баз, где таблица уже создана).
alter table public.promo_codes
  add column if not exists kind text not null default 'premium';
alter table public.promo_codes
  add column if not exists discount_percent int not null default 0;
alter table public.promo_codes
  add column if not exists duration_minutes int not null default 0;
alter table public.promo_codes
  add column if not exists expires_at timestamptz;

-- Допустимые типы кода.
alter table public.promo_codes
  drop constraint if exists promo_codes_kind_chk;
alter table public.promo_codes
  add constraint promo_codes_kind_chk check (kind in ('premium', 'discount'));

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
-- 3) Колонки персональной скидки в профиле
--    premium_discount_percent — текущая скидка пользователя в % (0 = нет).
--    premium_discount_until   — до какого момента скидка активна (NULL = нет).
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists premium_discount_percent int not null default 0;
alter table public.profiles
  add column if not exists premium_discount_until timestamptz;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Создать промокод (только админ)
--    _kind            — 'premium' | 'discount'.
--    _premium_days    — дни Premium (для kind='premium').
--    _discount_percent— скидка % (для kind='discount').
--    _duration_minutes— срок жизни скидки после активации, мин (для 'discount').
--    _max_activations — лимит активаций.
--    _valid_minutes   — через сколько минут код перестанет активироваться
--                       (0 = без ограничения по времени).
-- ────────────────────────────────────────────────────────────────────────────
drop function if exists public.admin_create_promo_code(text, int, int);

create or replace function public.admin_create_promo_code(
  _code text,
  _kind text,
  _premium_days int,
  _discount_percent int,
  _duration_minutes int,
  _max_activations int,
  _valid_minutes int
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $fn$
declare
  _c     text := upper(trim(coalesce(_code, '')));
  _k     text := lower(trim(coalesce(_kind, 'premium')));
  _exp   timestamptz;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if _c = '' then
    raise exception 'invalid code';
  end if;
  if _k not in ('premium', 'discount') then
    raise exception 'invalid kind';
  end if;
  if _max_activations is null or _max_activations <= 0 then
    raise exception 'invalid activations';
  end if;

  if _k = 'premium' then
    if _premium_days is null or _premium_days <= 0 then
      raise exception 'invalid days';
    end if;
  else
    if _discount_percent is null or _discount_percent <= 0 or _discount_percent > 100 then
      raise exception 'invalid discount';
    end if;
    if _duration_minutes is null or _duration_minutes <= 0 then
      raise exception 'invalid duration';
    end if;
  end if;

  if exists (select 1 from public.promo_codes where code = _c) then
    raise exception 'code exists';
  end if;

  if _valid_minutes is not null and _valid_minutes > 0 then
    _exp := now() + make_interval(mins => _valid_minutes);
  else
    _exp := null;
  end if;

  insert into public.promo_codes (
    code, kind, premium_days, discount_percent, duration_minutes,
    max_activations, expires_at, created_by
  )
  values (
    _c, _k,
    case when _k = 'premium' then _premium_days else 0 end,
    case when _k = 'discount' then _discount_percent else 0 end,
    case when _k = 'discount' then _duration_minutes else 0 end,
    _max_activations, _exp, auth.uid()
  );

  return jsonb_build_object(
    'code', _c,
    'kind', _k,
    'premium_days', case when _k = 'premium' then _premium_days else 0 end,
    'discount_percent', case when _k = 'discount' then _discount_percent else 0 end,
    'duration_minutes', case when _k = 'discount' then _duration_minutes else 0 end,
    'max_activations', _max_activations,
    'used_count', 0,
    'active', true,
    'expires_at', _exp
  );
end;
$fn$;

grant execute on function
  public.admin_create_promo_code(text, text, int, int, int, int, int)
  to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 5) Список всех промокодов (только админ)
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
    select code, kind, premium_days, discount_percent, duration_minutes,
           max_activations, used_count, active, expires_at, created_at
      from public.promo_codes
  ) t;

  return _rows;
end;
$fn$;

grant execute on function public.admin_list_promo_codes() to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 6) Удалить промокод (только админ)
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
-- 7) Активировать промокод (любой авторизованный пользователь)
--    kind='premium'  — продлевает Premium на premium_days (от текущей даты
--                      окончания, как admin_grant_premium).
--    kind='discount' — включает персональную скидку discount_percent на
--                      duration_minutes минут (для покупки Premium дешевле).
--    Защита: бан, неверный/выключенный/просроченный код, лимит, повтор.
--    Возвращает { kind, premium_until, premium_days,
--                 discount_percent, discount_until, duration_minutes }.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.redeem_promo_code(_code text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $fn$
declare
  _c        text := upper(trim(coalesce(_code, '')));
  _uid      uuid := auth.uid();
  _row      public.promo_codes%rowtype;
  _base     timestamptz;
  _until    timestamptz;
  _disc_to  timestamptz;
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
  if _row.expires_at is not null and _row.expires_at < now() then
    raise exception 'expired';
  end if;
  if _row.used_count >= _row.max_activations then
    raise exception 'exhausted';
  end if;
  if exists (
    select 1 from public.promo_redemptions where code = _c and user_id = _uid
  ) then
    raise exception 'already redeemed';
  end if;

  if _row.kind = 'discount' then
    -- Включаем персональную скидку на заданный срок.
    _disc_to := now() + make_interval(mins => _row.duration_minutes);
    update public.profiles
       set premium_discount_percent = _row.discount_percent,
           premium_discount_until   = _disc_to,
           updated_at               = now()
     where id = _uid;
  else
    -- Продлеваем Premium от текущей даты окончания (или от now(), если истёк).
    select premium_until into _base from public.profiles where id = _uid;
    if _base is null or _base < now() then
      _base := now();
    end if;
    _until := _base + make_interval(days => _row.premium_days);
    update public.profiles
       set premium_until = _until, updated_at = now()
     where id = _uid;
  end if;

  update public.promo_codes
     set used_count = used_count + 1
   where code = _c;

  insert into public.promo_redemptions (code, user_id) values (_c, _uid);

  return jsonb_build_object(
    'kind', _row.kind,
    'premium_until', _until,
    'premium_days', _row.premium_days,
    'discount_percent', _row.discount_percent,
    'discount_until', _disc_to,
    'duration_minutes', _row.duration_minutes
  );
end;
$fn$;

grant execute on function public.redeem_promo_code(text) to authenticated;
