-- ============================================================================
--  Бейдж «Багхантер» (галочка «нашёл баги»)
--  Выполните в Supabase → SQL Editor → New query → вставьте → Run.
--  ВАЖНО: сначала должен быть выполнен admin.sql (там функция is_admin()).
--  Скрипт идемпотентен — можно запускать повторно.
-- ============================================================================

-- 1) Колонка бейджа в профиле. Пустая строка = нет бейджа.
--    Читают все (политика profiles_select_all), поэтому галочку видят все.
alter table public.profiles
  add column if not exists badge text not null default '';

-- 2) Выдать/снять бейдж может только администратор (проверка по e-mail в JWT).
--    badge: '' — снять, 'bug_hunter' — выдать.
create or replace function public.admin_set_badge(_user_id uuid, _badge text)
  returns boolean
  language plpgsql
  security definer
  set search_path = public
as $fn$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  update public.profiles
     set badge = coalesce(_badge, ''), updated_at = now()
   where id = _user_id;
  return true;
end;
$fn$;

grant execute on function public.admin_set_badge(uuid, text) to authenticated;
