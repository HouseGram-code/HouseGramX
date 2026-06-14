-- ============================================================================
--  Триггер: при новом сообщении вызывать Edge Function `push` (фоновые пуши).
--  Выполните ОДИН РАЗ в SQL Editor.
--
--  Использует расширение pg_net для асинхронного HTTP-запроса.
-- ============================================================================

create extension if not exists pg_net with schema extensions;

-- Функция-триггер: шлёт запись сообщения в Edge Function.
create or replace function public.notify_push_on_message()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
declare
  req_id bigint;
begin
  -- Системные сообщения не пушим.
  if new.kind = 'system' then
    return new;
  end if;

  perform net.http_post(
    url := 'https://sgzvjgxbdpiflpypqisd.supabase.co/functions/v1/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_push_on_message on public.messages;

create trigger trg_notify_push_on_message
  after insert on public.messages
  for each row
  execute function public.notify_push_on_message();
