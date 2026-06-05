-- Включает realtime-события для таблицы profiles, чтобы изменения профиля
-- (аватар, имя, цвет, галочка/бейдж) сразу появлялись у других пользователей
-- без перезагрузки страницы.
-- Безопасно запускать повторно.
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.profiles';
  exception when duplicate_object then null;
  end;
end $$;
