// Supabase Edge Function: рассылка Web Push при новом сообщении (VAPID).
//
// Триггерится Database Webhook на INSERT в public.messages.
// Находит участников чата (кроме автора), берёт их push-подписки и
// шлёт фоновые уведомления через VAPID (npm:web-push). Доставку делает
// push-сервис браузера (Google/Mozilla) — сторонние SaaS не нужны.
//
// Секреты функции (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL                — авто
//   SUPABASE_SERVICE_ROLE_KEY   — авто
//   VAPID_PUBLIC_KEY            — публичный VAPID-ключ
//   VAPID_PRIVATE_KEY           — приватный VAPID-ключ
//   VAPID_SUBJECT               — mailto:you@example.com (по желанию)

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@housegramx.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

interface MessageRow {
  id: string;
  chat_id: string;
  author_id: string | null;
  kind: string;
  text: string | null;
  sticker_emoji: string | null;
  media_kind: string | null;
  sender_name: string | null;
}

interface SubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Короткое описание содержимого сообщения для тела уведомления.
function previewOf(msg: MessageRow): string {
  if (msg.text && msg.text.trim()) return msg.text.trim().slice(0, 120);
  if (msg.sticker_emoji) return msg.sticker_emoji;
  switch (msg.media_kind) {
    case "photo":
      return "📷 Фото";
    case "video":
      return "🎥 Видео";
    case "audio":
      return "🎤 Голосовое сообщение";
    case "file":
      return "📎 Файл";
    default:
      return "Новое сообщение";
  }
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    // Database Webhook присылает { type, table, record, ... }.
    const msg: MessageRow = payload.record ?? payload;
    if (!msg || !msg.chat_id) {
      return new Response("no record", { status: 200 });
    }
    // Системные сообщения не пушим.
    if (msg.kind === "system") return new Response("system", { status: 200 });

    // Данные чата (название) + участники.
    const [{ data: chat }, { data: members }] = await Promise.all([
      admin.from("chats").select("title, kind").eq("id", msg.chat_id).single(),
      admin.from("chat_members").select("user_id").eq("chat_id", msg.chat_id),
    ]);

    const recipientIds = (members ?? [])
      .map((m: { user_id: string }) => m.user_id)
      .filter((id: string) => id && id !== msg.author_id);

    if (recipientIds.length === 0) {
      return new Response("no recipients", { status: 200 });
    }

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", recipientIds);

    if (!subs || subs.length === 0) {
      return new Response("no subs", { status: 200 });
    }

    const isGroup = chat?.kind === "group";
    const sender = msg.sender_name || "Новое сообщение";
    const title = isGroup ? chat?.title || "Новое сообщение" : sender;
    const body = isGroup ? `${sender}: ${previewOf(msg)}` : previewOf(msg);

    const data = JSON.stringify({
      title,
      body,
      tag: msg.chat_id,
      url: `/chats/${msg.chat_id}`,
    });

    await Promise.all(
      (subs as SubRow[]).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            data
          );
        } catch (err) {
          const code = (err as { statusCode?: number })?.statusCode;
          // 404/410 — подписка мёртвая, удаляем.
          if (code === 404 || code === 410) {
            await admin
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", s.endpoint);
          }
        }
      })
    );

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.warn("[push] handler error:", e);
    return new Response("error", { status: 200 });
  }
});
