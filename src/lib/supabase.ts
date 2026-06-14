"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Единый клиент Supabase для браузера (singleton).
 * Использует публичные переменные окружения NEXT_PUBLIC_*.
 *
 * Сессия пользователя хранится в localStorage и автоматически
 * обновляется библиотекой supabase-js.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Сконфигурирован ли Supabase (заданы переменные окружения). */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * Возвращает singleton-клиент Supabase.
 * Бросает понятную ошибку, если переменные окружения не заданы.
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase не настроен: задайте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local"
    );
  }
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
