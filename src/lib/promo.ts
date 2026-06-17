"use client";

import { getSupabase, isSupabaseConfigured } from "./supabase";

/** Тип промокода: выдаёт Premium или даёт скидку на покупку Premium. */
export type PromoKind = "premium" | "discount";

/** Промокод (для админ-панели). */
export interface PromoCode {
  /** Сам код (название), в верхнем регистре. */
  code: string;
  /** Тип кода. */
  kind: PromoKind;
  /** Сколько дней Premium выдаёт активация (для kind='premium'). */
  premium_days: number;
  /** Размер скидки в % (для kind='discount'). */
  discount_percent: number;
  /** Срок жизни скидки после активации, в минутах (для kind='discount'). */
  duration_minutes: number;
  /** Всего доступно активаций. */
  max_activations: number;
  /** Сколько раз уже активирован. */
  used_count: number;
  /** Активен ли код. */
  active: boolean;
  /** Крайний срок активации кода (ISO) или null. */
  expires_at: string | null;
  /** ISO-дата создания. */
  created_at: string;
}

/** Результат активации промокода. */
export interface RedeemResult {
  /** Тип активированного кода. */
  kind: PromoKind;
  /** ISO-дата окончания Premium (для premium-кода). */
  premiumUntil: string;
  /** На сколько дней выдан Premium (для premium-кода). */
  days: number;
  /** Размер активированной скидки в % (для discount-кода). */
  discountPercent: number;
  /** До какого момента действует скидка, ISO (для discount-кода). */
  discountUntil: string;
}

/** Параметры создания промокода (админ). */
export interface CreatePromoInput {
  /** Название кода. */
  code: string;
  /** Тип кода. */
  kind: PromoKind;
  /** Дни Premium (для kind='premium'). */
  premiumDays?: number;
  /** Скидка в % (для kind='discount'). */
  discountPercent?: number;
  /** Срок жизни скидки после активации, в минутах (для kind='discount'). */
  durationMinutes?: number;
  /** Лимит активаций. */
  maxActivations: number;
  /** Через сколько минут код перестанет активироваться (0 = без срока). */
  validMinutes?: number;
}

/** Переводит технические ошибки RPC промокодов в понятные сообщения. */
function translatePromoError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("forbidden")) return "Недостаточно прав";
  if (m.includes("banned")) return "Аккаунт заблокирован";
  if (m.includes("invalid code")) return "Промокод не найден";
  if (m.includes("invalid kind")) return "Неверный тип промокода";
  if (m.includes("invalid days")) return "Укажите корректное число дней";
  if (m.includes("invalid discount")) return "Скидка должна быть от 1 до 100%";
  if (m.includes("invalid duration")) return "Укажите срок действия скидки";
  if (m.includes("invalid activations")) return "Укажите число активаций";
  if (m.includes("code exists")) return "Такой промокод уже существует";
  if (m.includes("expired")) return "Срок действия промокода истёк";
  if (m.includes("exhausted")) return "Лимит активаций промокода исчерпан";
  if (m.includes("already redeemed")) return "Вы уже активировали этот промокод";
  return message;
}

/**
 * Активирует промокод текущим пользователем.
 * Для premium-кода выдаёт/продлевает Premium, для discount-кода включает скидку.
 */
export async function redeemPromoCode(code: string): Promise<RedeemResult> {
  if (!isSupabaseConfigured) throw new Error("Сервис недоступен");
  const { data, error } = await getSupabase().rpc("redeem_promo_code", {
    _code: code.trim(),
  });
  if (error) throw new Error(translatePromoError(error.message));
  const d = (data ?? {}) as {
    kind?: PromoKind;
    premium_until?: string;
    premium_days?: number;
    discount_percent?: number;
    discount_until?: string;
  };
  return {
    kind: d.kind ?? "premium",
    premiumUntil: d.premium_until ?? "",
    days: d.premium_days ?? 0,
    discountPercent: d.discount_percent ?? 0,
    discountUntil: d.discount_until ?? "",
  };
}

/** Создаёт промокод (только админ): Premium на N дней либо скидку на %. */
export async function createPromoCode(input: CreatePromoInput): Promise<PromoCode> {
  if (!isSupabaseConfigured) throw new Error("Сервис недоступен");
  const { data, error } = await getSupabase().rpc("admin_create_promo_code", {
    _code: input.code.trim(),
    _kind: input.kind,
    _premium_days: input.premiumDays ?? 0,
    _discount_percent: input.discountPercent ?? 0,
    _duration_minutes: input.durationMinutes ?? 0,
    _max_activations: input.maxActivations,
    _valid_minutes: input.validMinutes ?? 0,
  });
  if (error) throw new Error(translatePromoError(error.message));
  return (data ?? {}) as PromoCode;
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

/** Истёк ли срок активации промокода (expires_at в прошлом). */
export function isPromoExpired(code: Pick<PromoCode, "expires_at">): boolean {
  return !!code.expires_at && new Date(code.expires_at).getTime() < Date.now();
}
