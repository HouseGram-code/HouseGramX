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
  /** Выбранный эмодзи-статус (id из каталога) или "". */
  status: string;
  /** Размер активной персональной скидки на Premium в % (0 = нет). */
  discountPercent: number;
  /** До какого момента действует скидка (ISO) или null. */
  discountUntil: string | null;
  /** Активна ли скидка прямо сейчас. */
  discountActive: boolean;
}

const EMPTY: MyPremium = {
  premiumUntil: null,
  active: false,
  dmClosed: false,
  status: "",
  discountPercent: 0,
  discountUntil: null,
  discountActive: false,
};

/** Загружает Premium-статус текущего пользователя из Supabase. */
export async function fetchMyPremium(): Promise<MyPremium> {
  if (!isSupabaseConfigured) return EMPTY;
  const uid = getSyncUser();
  if (!uid) return EMPTY;
  try {
    const { data, error } = await getSupabase()
      .from("profiles")
      .select(
        "premium_until, dm_closed, premium_status, premium_discount_percent, premium_discount_until"
      )
      .eq("id", uid)
      .maybeSingle();
    if (error || !data) return EMPTY;
    const until = (data.premium_until as string | null) ?? null;
    const discUntil = (data.premium_discount_until as string | null) ?? null;
    const discPercent = (data.premium_discount_percent as number | null) ?? 0;
    const discActive =
      !!discUntil && discPercent > 0 && new Date(discUntil).getTime() > Date.now();
    return {
      premiumUntil: until,
      active: until ? new Date(until).getTime() > Date.now() : false,
      dmClosed: !!data.dm_closed,
      status: (data.premium_status as string | null) ?? "",
      discountPercent: discActive ? discPercent : 0,
      discountUntil: discUntil,
      discountActive: discActive,
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

/** Устанавливает эмодзи-статус Premium (id из каталога; "" — снять). */
export async function setPremiumStatus(statusId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Сервис недоступен");
  const uid = getSyncUser();
  if (!uid) throw new Error("Нужен вход в аккаунт");
  const { error } = await getSupabase()
    .from("profiles")
    .update({ premium_status: statusId, updated_at: new Date().toISOString() })
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

/** Дата и время окончания скидки: «15 июля, 14:30» (скидки бывают на час и т.д.). */
export function formatDiscountUntil(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
