"use client";

import { getSupabase, isSupabaseConfigured } from "./supabase";
import { getSyncUser } from "./sync";

/** Статус Premium текущего пользователя. */
export interface MyPremium {
  /** ISO-дата окончания Premium или null. */
  premiumUntil: string | null;
  /** Активен ли Premium прямо сейчас. */
  active: boolean;
  /** Пользователь закрыл личку (премиум-функция). */
  dmClosed: boolean;
}

const EMPTY: MyPremium = {
  premiumUntil: null,
  active: false,
  dmClosed: false,
};

/** Загружает Premium-статус текущего пользователя из Supabase. */
export async function fetchMyPremium(): Promise<MyPremium> {
  if (!isSupabaseConfigured) return EMPTY;
  const uid = getSyncUser();
  if (!uid) return EMPTY;
  try {
    const { data, error } = await getSupabase()
      .from("profiles")
      .select("premium_until, dm_closed")
      .eq("id", uid)
      .maybeSingle();
    if (error || !data) return EMPTY;
    const until = (data.premium_until as string | null) ?? null;
    return {
      premiumUntil: until,
      active: until ? new Date(until).getTime() > Date.now() : false,
      dmClosed: !!data.dm_closed,
    };
  } catch {
    return EMPTY;
  }
}

/** Включает/выключает «Закрытую личку» (запись в свой профиль). */
export async function setDmClosed(closed: boolean): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Сервис недоступен");
  const uid = getSyncUser();
  if (!uid) throw new Error("Нужен вход в аккаунт");
  const { error } = await getSupabase()
    .from("profiles")
    .update({ dm_closed: closed, updated_at: new Date().toISOString() })
    .eq("id", uid);
  if (error) throw new Error(error.message);
}

/** Человекочитаемая дата окончания Premium: «15 июля 2026». */
export function formatPremiumUntil(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
