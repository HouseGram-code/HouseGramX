# Фоновые Web Push уведомления — настройка

Это включает уведомления, которые приходят **даже когда вкладка/браузер закрыты**.
Слой состоит из 4 частей (весь код уже написан):

1. **Service worker** `public/sw.js` — показывает уведомления в фоне.
2. **Клиент** `src/lib/push.ts` — подписка + сохранение в таблицу `push_subscriptions`.
   Переключатель в Настройки → Уведомления → «Push при закрытом приложении».
3. **Таблица** `push_subscriptions` — уже в `schema.sql`.
4. **Edge Function** `supabase/functions/push` — рассылает пуши при новом сообщении.

## VAPID-ключи

Уже сгенерированы и лежат в `.env.local`:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BM-_TCXEjpwcEfIHc3HyzY_NXyeViIxVOFz8Ab3pngIY-eOuQcT1lpmcRQKHtABng5Q6cRw0AIQjv2wrc6nga2E
VAPID_PRIVATE_KEY=GMkNxB15_M3V7PYZNVgyn4PJue9B7Wm0IX66dhULR-c
```

Сгенерировать новые при необходимости: `node scripts/gen-vapid.mjs`

## Шаги настройки (один раз)

### 1. Применить обновлённую схему

В дашборде → **SQL Editor** → выполните `supabase/schema.sql` ещё раз
(добавилась таблица `push_subscriptions`). Скрипт идемпотентен.

### 2. Установить Supabase CLI и залогиниться

```bash
npm i -g supabase
supabase login
supabase link --project-ref sgzvjgxbdpiflpypqisd
```

### 3. Задать секреты функции

```bash
supabase secrets set VAPID_PUBLIC_KEY=BM-_TCXEjpwcEfIHc3HyzY_NXyeViIxVOFz8Ab3pngIY-eOuQcT1lpmcRQKHtABng5Q6cRw0AIQjv2wrc6nga2E
supabase secrets set VAPID_PRIVATE_KEY=GMkNxB15_M3V7PYZNVgyn4PJue9B7Wm0IX66dhULR-c
supabase secrets set VAPID_SUBJECT=mailto:admin@housegramx.app
```

(`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` доступны функции автоматически.)

### 4. Задеплоить функцию

```bash
supabase functions deploy push --no-verify-jwt
```

Флаг `--no-verify-jwt` нужен, потому что вызывать её будет Database Webhook
(без пользовательского JWT). Доступ к данным внутри идёт через service_role.

### 5. Создать Database Webhook на новые сообщения

Дашборд → **Database → Webhooks → Create a new hook**:

- **Name**: `push-on-message`
- **Table**: `public.messages`
- **Events**: ☑ Insert
- **Type**: Supabase Edge Functions
- **Edge Function**: `push`
- **Method**: POST
- Save.

Теперь при каждом новом сообщении вебхук вызывает функцию `push`, она находит
участников чата (кроме автора), берёт их подписки и шлёт фоновые уведомления.

## Проверка

1. `npm run dev`, войдите, откройте Настройки → Уведомления →
   включите «Push при закрытом приложении» (браузер попросит разрешение).
2. **Полностью закройте вкладку** приложения.
3. С другого аккаунта/устройства напишите вам сообщение.
4. Должно прийти системное уведомление. Клик по нему открывает нужный чат.

## Замечания

- Работает только по HTTPS (или localhost). На реальном домене — обязателен HTTPS.
- iOS Safari: уведомления работают только для PWA, добавленного на главный экран
  (iOS 16.4+). На десктопе Chrome/Edge/Firefox и Android Chrome — без проблем.
- Если меняете VAPID-ключи — пользователям нужно переподписаться (выкл/вкл тумблер).
