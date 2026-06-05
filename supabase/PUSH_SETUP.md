# Фоновые push-уведомления (Web Push / VAPID)

HouseGramX использует **родной Web Push** браузера (Push API + VAPID).
Доставку выполняет push-сервис самого браузера (Google / Mozilla), без сторонних
сервисов. Это важно: **OneSignal и похожие SaaS заблокированы в ряде сетей (РФ)** —
их SDK просто не загружается. Родной Web Push такой зависимости не имеет.

## Архитектура

- **Клиент** (`src/lib/push.ts`): регистрирует service worker `public/sw.js`,
  подписывается через `pushManager.subscribe` с публичным VAPID-ключом и сохраняет
  подписку в таблицу `push_subscriptions`.
- **Service worker** (`public/sw.js`): показывает уведомление по событию `push` и
  открывает нужный чат по клику.
- **Сервер** (`supabase/functions/push/index.ts`): Edge Function, которая по INSERT в
  `messages` рассылает push участникам чата через `npm:web-push`.

## Шаг 1. Сгенерировать VAPID-ключи (один раз)

```bash
npx web-push generate-vapid-keys
```

Получите пару: **Public Key** и **Private Key**.

> В проект уже вшит публичный ключ по умолчанию (в `src/lib/push.ts`), поэтому
> клиентская подписка работает сразу. Если генерируете свою пару — пропишите
> свой публичный ключ в `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

## Шаг 2. Переменная окружения в Vercel (опционально)

Если хотите использовать свой ключ вместо вшитого:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY = <ваш публичный ключ>
```

После добавления — **Redeploy** (NEXT_PUBLIC_* вшиваются на сборке).

## Шаг 3. Секреты Edge Function (для авторассылки)

Project Settings → Edge Functions → Secrets:

```
VAPID_PUBLIC_KEY  = <публичный ключ>
VAPID_PRIVATE_KEY = <приватный ключ>
VAPID_SUBJECT     = mailto:you@example.com
```

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` подставляются автоматически.

## Шаг 4. Развернуть функцию

```bash
supabase functions deploy push --no-verify-jwt
```

## Шаг 5. Database Webhook

Database → Webhooks → Create:
- Таблица: `public.messages`
- Событие: `INSERT`
- Type: **Supabase Edge Functions** → функция `push`

После этого каждое новое сообщение будет бить в функцию, и участники получат push.

## Шаг 6. Клиент

В приложении: Настройки → Уведомления → включить **«Push при закрытом
приложении»**. Браузер попросит разрешение — подтвердите.

## iOS

Na iPhone/iPad фоновые push работают только в iOS 16.4+ и только если сайт
добавлен на домашний экран (Share → Add to Home Screen) и запущен оттуда.
Это ограничение Apple, оно касается любых веб-push, не только этого приложения.

## Проверка

1. Откройте сайт в двух разных браузерах/устройствах под разными аккаунтами.
2. В обоих включите push.
3. Закройте один, напишите из другого — должно прийти фоновое уведомление.

Для отладки см. логи функции: Edge Functions → push → Logs.
