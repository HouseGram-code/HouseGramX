"use client";

import { getSupabase, isSupabaseConfigured } from "./supabase";

/** E-mail единственного супер-администратора приложения. */
export const ADMIN_EMAIL = "goh@gmail.com";

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  color: string;
  bio: string;
  banned: boolean;
  last_seen: string | null;
  updated_at: string;
}

/** Является ли указанный e-mail админским. */
export function isAdminEmail(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
}

/** Загружает все публичные профили (для админ-панели). */
export async function fetchAllUsers(): Promise<AdminUser[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, name, username, avatar, color, bio, banned, last_seen, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminUser[];
}

/** Банит/разбанивает пользователя через защищённую RPC-функцию. */
export async function setBanned(userId: string, banned: boolean): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Сервис недоступен");
  const { error } = await getSupabase().rpc("admin_set_banned", {
    _user_id: userId,
    _banned: banned,
  });
  if (error) throw new Error(translateAdminError(error.message));
}

/**
 * Проверяет, свободен ли username (для формы регистрации).
 * Работает для неавторизованных пользователей через SECURITY DEFINER RPC.
 * При сбое «открывается» (возвращает true), чтобы не блокировать регистрацию.
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const u = username.trim();
  if (!u) return false;
  if (!isSupabaseConfigured) return true;
  try {
    const { data, error } = await getSupabase().rpc("username_available", {
      _username: u,
    });
    if (error) return true;
    return Boolean(data);
  } catch {
    return true;
  }
}

/** Переводит технические ошибки RPC в понятные сообщения. */
function translateAdminError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("forbidden")) return "Недостаточно прав";
  if (m.includes("cannot ban self")) return "Нельзя забанить самого себя";
  return message;
}

export interface AdminStats {
  users: number;
  banned: number;
  chats: number;
  groups: number;
  channels: number;
  privates: number;
  messages: number;
}

/** Загружает агрегированную статистику для админ-панели. */
export async function fetchStats(): Promise<AdminStats | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabase().rpc("admin_stats");
  if (error || !data) return null;
  return data as AdminStats;
}

export interface Maintenance {
  enabled: boolean;
  message: string;
}

const MAINTENANCE_DEFAULT: Maintenance = { enabled: false, message: "" };

/** Текущее состояние режима техработ (доступно всем). */
export async function fetchMaintenance(): Promise<Maintenance> {
  if (!isSupabaseConfigured) return MAINTENANCE_DEFAULT;
  try {
    const { data, error } = await getSupabase().rpc("get_maintenance");
    if (error || !data) return MAINTENANCE_DEFAULT;
    return {
      enabled: Boolean((data as Maintenance).enabled),
      message: (data as Maintenance).message ?? "",
    };
  } catch {
    return MAINTENANCE_DEFAULT;
  }
}

/** Включает/выключает режим техработ (только админ). */
export async function setMaintenance(value: Maintenance): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Сервис недоступен");
  const { error } = await getSupabase()
    .from("app_settings")
    .upsert({
      key: "maintenance",
      value: value as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(translateAdminError(error.message));
}

/** CSV-экспорт списка пользователей. */
export function usersToCsv(users: AdminUser[]): string {
  const header = ["id", "name", "username", "banned", "last_seen", "updated_at"];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = users.map((u) =>
    [
      u.id,
      u.name,
      u.username,
      u.banned ? "yes" : "no",
      u.last_seen ?? "",
      u.updated_at ?? "",
    ]
      .map((x) => escape(String(x)))
      .join(",")
  );
  return [header.join(","), ...rows].join("\r\n");
}
