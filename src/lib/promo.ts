"use client";

import { getSupabase, isSupabaseConfigured } from "./supabase";

/** Промокод (для админ-панели). */
export interface PromoCode {
  /** Сам код (название), в верхнем регистре. */
  code: string;
  /** Сколько дней Premium выдаёт активация. */
  premium_days: number;
  /** Всего доступно активаций. */
  max_activations: number;
  /** Сколько раз уже активирован. */
  used_count: number;
  /** Активен ли код. */
  active: boolean;
  /** ISO-дата создания. */
  created_at: string;
}

/** Результат активации промокода. */
export interface RedeemResult {
  /** ISO-дата окончания Premium после активации. */
  premiumUntil: string;
  /** На сколько дней выдан Premium. */
  days: number;
}

/** Переводит технические ошибки RPC промокодов в понятные сообщения. */
function translatePromoError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("forbidden")) return "Недостаточно прав";
  if (m.includes("banned")) return "Аккаунт заблокирован";
  if (m.includes("invalid code")) return "Промокод не найден";
  if (m.includes("invalid days")) return "Укажите корректное число дней";
  if (m.includes("invalid activations")) return "Укажите число активаций";
  if (m.includes("code exists")) return "Такой промокод уже существует";
  if (m.includes("exhausted")) return "Лимит активаций промокода исчерпан";
  if (m.includes("already redeemed")) return "Вы уже активировали этот промокод";
  return message;
}

/**
 * Активирует промокод текущим пользователем и выдаёт Premium.
 * Возвращает дату окончания Premium и число выданных дней.
 */
export async function redeemPromoCode(code: string): Promise<RedeemResult> {
  if (!isSupabaseConfigured) throw new Error("Сервис недоступен");
  const { data, error } = await getSupabase().rpc("redeem_promo_code", {
    _code: code.trim(),
  });
  if (error) throw new Error(translatePromoError(error.message));
  const d = (data ?? {}) as { premium_until?: string; premium_days?: number };
  return { premiumUntil: d.premium_until ?? "", days: d.premium_days ?? 0 };
}

/**
 * Создаёт промокод (только админ): название, число дней Premium и лимит активаций.
 */
export async function createPromoCode(
  code: string,
  premiumDays: number,
  maxActivations: number
): Promise<PromoCode> {
  if (!isSupabaseConfigured) throw new Error("Сервис недоступен");
  const { data, error } = await getSupabase().rpc("admin_create_promo_code", {
    _code: code.trim(),
    _premium_days: premiumDays,
    _max_activations: maxActivations,
  });
  if (error) throw new Error(translatePromoError(error.message));
  const d = (data ?? {}) as Partial<PromoCode>;
  return {
    code: d.code ?? code.trim().toUpperCase(),
    premium_days: d.premium_days ?? premiumDays,
    max_activations: d.max_activations ?? maxActivations,
    used_count: d.used_count ?? 0,
    active: true,
    created_at: new Date().toISOString(),
  };
}

/** Загружает все промокоды (только админ). */
export async function fetchPromoCodes(): Promise<PromoCode[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabase().rpc("admin_list_promo_codes");
  if (error) throw new Error(translatePromoError(error.message));
  return (data ?? []) as PromoCode[];
}

/** Удаляет промокод по названию (только админ). */
export async function deletePromoCode(code: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Сервис недоступен");
  const { error } = await getSupabase().rpc("admin_delete_promo_code", {
    _code: code.trim(),
  });
  if (error) throw new Error(translatePromoError(error.message));
}
