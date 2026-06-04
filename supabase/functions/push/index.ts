// Supabase Edge Function: рассылка Web Push при новом сообщении.
//
// Триггерится Database Webhook на INSERT в public.messages.
// Находит участников чата (кроме автора), берёт их push-подписки и
// отправляет фоновые уведомления через VAPID (npm:web-push).
//
// Переменные окружения функции (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL                — авто
//   SUPABASE_SERVICE_ROLE_KEY   — авто (или задайте вручную)
//   VAPID_PUBLIC_KEY            — публичный VAPID-ключ
//   VAPID_PRIVATE_KEY          — приватный VAPID-ключ
//   VAPID_SUBJECT              — mailto:you@example.com (по желанию)

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
      admin.from("chats").select("title, kind").eq("id", msg.chat_id).maybeSingle(),
      admin.from("chat_members").select("user_id, role").eq("chat_id", msg.chat_id),
    ]);

    const recipientIds = (members ?? [])
      .filter((m: { user_id: string; role: string }) =>
        m.role !== "pending" && m.user_id !== msg.author_id
      )
      .map((m: { user_id: string }) => m.user_id);

    if (recipientIds.length === 0) {
      return new Response("no recipients", { status: 200 });
    }

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id")
      .in("user_id", recipientIds);

    if (!subs || subs.length === 0) {
      return new Response("no subscriptions", { status: 200 });
    }

    const title = chat?.title || "HouseGramX";
    const mediaLabel =
      msg.media_kind === "image"
        ? "📷 Фото"
        : msg.media_kind === "video"
          ? "🎬 Видео"
          : msg.media_kind === "audio"
            ? "🎵 Аудио"
            : "📎 Файл";
    const content =
      msg.kind === "sticker"
        ? `Стикер ${msg.sticker_emoji ?? "🙂"}`
        : msg.kind === "media"
          ? mediaLabel
          : (msg.text ?? "Новое сообщение");
    const body = (msg.sender_name ? `${msg.sender_name}: ` : "") + content;

    const notification = JSON.stringify({
      title,
      body: body.slice(0, 140),
      tag: msg.chat_id,
      url: `/chats/${msg.chat_id}`,
    });

    const results = await Promise.allSettled(
      subs.map((s: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          notification
        )
      )
    );

    // Удаляем «протухшие» подписки (404/410).
    const dead: string[] = [];
    results.forEach((r, i) => {
      if (
        r.status === "rejected" &&
        (r.reason?.statusCode === 404 || r.reason?.statusCode === 410)
      ) {
        dead.push(subs[i].endpoint);
      }
    });
    if (dead.length) {
      await admin.from("push_subscriptions").delete().in("endpoint", dead);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ sent, total: subs.length }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("[push fn] error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
