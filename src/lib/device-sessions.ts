"use client";

import { getSupabase, isSupabaseConfigured } from "./supabase";

/**
 * Реальные сессии (устройства), на которых выполнен вход в аккаунт.
 *
 * Каждый браузер/устройство получает стабильный session_id (localStorage) и
 * держит свою строку в таблице public.device_sessions. При каждом запуске
 * приложения строка обновляется (last_seen) — так список устройств отражает
 * настоящие активные сеансы, а не заглушки.
 */

export type DevicePlatform = "mobile" | "tablet" | "desktop";

export interface DeviceSession {
  sessionId: string;
  deviceName: string;
  platform: DevicePlatform;
  current: boolean;
  lastSeen: number;
}

const SID_KEY = "messenger.session.v1";

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

/** Стабильный идентификатор текущего сеанса (этого браузера/устройства). */
export function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      sid = genId();
      localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "local";
  }
}

/** Разбирает userAgent в человекочитаемое имя устройства и тип платформы. */
export function describeDevice(ua: string): {
  name: string;
  platform: DevicePlatform;
} {
  const s = ua || "";
  const isTablet = /iPad|Tablet/i.test(s);
  const isMobile = !isTablet && /Mobi|Android|iPhone|iPod/i.test(s);
  const platform: DevicePlatform = isTablet
    ? "tablet"
    : isMobile
      ? "mobile"
      : "desktop";

  let os = "Устройство";
  if (/iPhone|iPod/i.test(s)) os = "iPhone";
  else if (/iPad/i.test(s)) os = "iPad";
  else if (/Android/i.test(s)) os = "Android";
  else if (/Windows/i.test(s)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(s)) os = "Mac";
  else if (/CrOS/i.test(s)) os = "Chrome OS";
  else if (/Linux/i.test(s)) os = "Linux";

  let br = "";
  if (/Edg\//i.test(s)) br = "Edge";
  else if (/OPR\/|Opera/i.test(s)) br = "Opera";
  else if (/YaBrowser/i.test(s)) br = "Яндекс";
  else if (/Firefox\//i.test(s)) br = "Firefox";
  else if (/Chrome\//i.test(s)) br = "Chrome";
  else if (/Safari\//i.test(s)) br = "Safari";

  const name = br ? `${br} · ${os}` : os;
  return { name, platform };
}

/** Данные текущего устройства (без обращения к сети). */
export function currentDevice(): DeviceSession {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const { name, platform } = describeDevice(ua);
  return {
    sessionId: getSessionId(),
    deviceName: name,
    platform,
    current: true,
    lastSeen: Date.now(),
  };
}

/** Регистрирует/обновляет текущий сеанс в облаке (last_seen = now). */
export async function registerSession(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;
  const dev = currentDevice();
  try {
    await getSupabase()
      .from("device_sessions")
      .upsert(
        {
          user_id: userId,
          session_id: dev.sessionId,
          device_name: dev.deviceName,
          platform: dev.platform,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "user_id,session_id" },
      );
  } catch (e) {
    console.warn("[device-sessions] register failed:", e);
  }
}

interface SessionRow {
  session_id: string;
  device_name: string | null;
  platform: string | null;
  last_seen: string | null;
}

/** Загружает реальные сеансы пользователя (текущий — первым). */
export async function listSessions(
  userId: string | null | undefined,
): Promise<DeviceSession[]> {
  const me = getSessionId();
  if (!isSupabaseConfigured || !userId) {
    // Нет облака — показываем хотя бы реальное текущее устройство.
    return [currentDevice()];
  }
  try {
    const { data, error } = await getSupabase()
      .from("device_sessions")
      .select("session_id, device_name, platform, last_seen")
      .eq("user_id", userId)
      .order("last_seen", { ascending: false });
    if (error) {
      console.warn("[device-sessions] list:", error.message);
      return [currentDevice()];
    }
    const rows = (data ?? []) as SessionRow[];
    const mapped: DeviceSession[] = rows.map((r) => {
      const platform = (
        r.platform === "mobile" || r.platform === "tablet" ? r.platform : "desktop"
      ) as DevicePlatform;
      return {
        sessionId: r.session_id,
        deviceName: r.device_name || "Устройство",
        platform,
        current: r.session_id === me,
        lastSeen: r.last_seen ? Date.parse(r.last_seen) : 0,
      };
    });
    // Гарантируем, что текущее устройство всегда присутствует в списке.
    if (!mapped.some((d) => d.current)) mapped.unshift(currentDevice());
    // Текущее — первым.
    mapped.sort((a, b) =>
      a.current === b.current ? b.lastSeen - a.lastSeen : a.current ? -1 : 1,
    );
    return mapped;
  } catch (e) {
    console.warn("[device-sessions] list failed:", e);
    return [currentDevice()];
  }
}

/** Завершает конкретный сеанс. */
export async function removeSession(
  userId: string,
  sessionId: string,
): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;
  try {
    await getSupabase()
      .from("device_sessions")
      .delete()
      .eq("user_id", userId)
      .eq("session_id", sessionId);
  } catch (e) {
    console.warn("[device-sessions] remove failed:", e);
  }
}

/** Завершает все сеансы, кроме текущего. */
export async function removeOtherSessions(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;
  try {
    await getSupabase()
      .from("device_sessions")
      .delete()
      .eq("user_id", userId)
      .neq("session_id", getSessionId());
  } catch (e) {
    console.warn("[device-sessions] removeOthers failed:", e);
  }
}
