"use client";

import { getSupabase, isSupabaseConfigured } from "./supabase";
import { getSyncUser } from "./sync";

/**
 * Фоновые Web Push уведомления при закрытом приложении.
 *
 * Родной Push API + VAPID: доставку выполняет push-сервис самого браузера
 * (Google/Mozilla), без сторонних SaaS-доменов — работает там, где OneSignal заблокирован.
 * Подписка сохраняется в таблицу push_subscriptions; рассылку выполняет
 * Supabase Edge Function (см. supabase/functions/push и supabase/PUSH_SETUP.md).
 */

// Публичный VAPID-ключ. Берётся из переменной окружения, иначе — вшитый по умолчанию.
// Публичный ключ безопасно держать в клиентском коде.
const VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BM-_TCXEjpwcEfIHc3HyzY_NXyeViIxVOFz8Ab3pngIY-eOuQcT1lpmcRQKHtABng5Q6cRw0AIQjv2wrc6nga2E";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Регистрирует service worker (один раз). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.warn("[push] SW register failed:", e);
    return null;
  }
}

/**
 * Подписывается на push и сохраняет подписку в БД. Возвращает true при успехе.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!pushSupported() || !VAPID_PUBLIC || !isSupabaseConfigured) return false;
  const uid = getSyncUser();
  if (!uid) return false;

  try {
    if (Notification.permission !== "granted") {
      const res = await Notification.requestPermission();
      if (res !== "granted") return false;
    }

    const reg =
      (await navigator.serviceWorker.getRegistration()) ||
      (await registerServiceWorker());
    if (!reg) return false;
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }

    const json = sub.toJSON();
    const keys = json.keys ?? {};
    const { error } = await getSupabase()
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: sub.endpoint,
          user_id: uid,
          p256dh: keys.p256dh ?? "",
          auth: keys.auth ?? "",
        },
        { onConflict: "endpoint" }
      );
    if (error) {
      console.warn("[push] save subscription:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[push] subscribe failed:", e);
    return false;
  }
}

/** Отписывается от push и удаляет подписку из БД. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      if (isSupabaseConfigured) {
        await getSupabase()
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", endpoint);
      }
    }
  } catch (e) {
    console.warn("[push] unsubscribe failed:", e);
  }
}

/** Подписано ли сейчас устройство на push. */
export async function isPushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}
