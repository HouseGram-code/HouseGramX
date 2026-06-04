"use client";

import { useEffect, useRef } from "react";
import { getSupabase, isSupabaseConfigured } from "./supabase";

/**
 * Слой синхронизации данных с Supabase.
 *
 * Каждый стор приложения хранит свой JSON-«снимок» в одной строке таблицы
 * `user_data` (ключ — пара user_id + store_key). Локально мы дублируем данные
 * в localStorage как быстрый кэш и для оффлайн-режима.
 *
 * Поток данных:
 *  1. При загрузке стора читаем кэш (мгновенно) → затем подтягиваем облако.
 *  2. При изменениях пишем в кэш и (debounce) отправляем в облако.
 *  3. При входе/выходе пользователя перечитываем облако.
 */

/** Все ключи хранилищ приложения (для очистки кэша при выходе). */
export const STORE_KEYS = [
  "messenger.chats.v2",
  "messenger.profile.v1",
  "messenger.contacts.v1",
  "messenger.settings.v1",
  "messenger.stickers.v1",
  "messenger.calls.v1",
  "messenger.folders.v1",
] as const;

// ─── Текущий пользователь (обновляется из AuthProvider) ──────────────────────

let currentUserId: string | null = null;
const userListeners = new Set<(id: string | null) => void>();

/** Устанавливает активного пользователя и оповещает подписчиков. */
export function setSyncUser(id: string | null) {
  if (id === currentUserId) return;
  currentUserId = id;
  userListeners.forEach((cb) => {
    try {
      cb(id);
    } catch {
      /* ignore */
    }
  });
}

export function getSyncUser(): string | null {
  return currentUserId;
}

/** Подписка на смену пользователя (вход/выход). Возвращает функцию отписки. */
export function onSyncUserChange(cb: (id: string | null) => void): () => void {
  userListeners.add(cb);
  return () => userListeners.delete(cb);
}

// ─── Локальный кэш ───────────────────────────────────────────────────────────

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* квота переполнена или хранилище недоступно — не критично */
  }
}

/** Очищает локальный кэш всех сторов (при выходе из аккаунта). */
export function clearAppCache() {
  for (const key of STORE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

// ─── Облако (Supabase) ───────────────────────────────────────────────────────

/** Подтягивает снимок стора из облака. null — если нет данных/пользователя. */
export async function pull<T>(key: string): Promise<T | null> {
  if (!isSupabaseConfigured || !currentUserId) return null;
  try {
    const { data, error } = await getSupabase()
      .from("user_data")
      .select("data")
      .eq("user_id", currentUserId)
      .eq("store_key", key)
      .maybeSingle();
    if (error) {
      console.warn(`[sync] pull "${key}":`, error.message);
      return null;
    }
    return (data?.data ?? null) as T | null;
  } catch (e) {
    console.warn(`[sync] pull "${key}" failed:`, e);
    return null;
  }
}

const pushTimers: Record<string, ReturnType<typeof setTimeout>> = {};

/** Сохраняет снимок: всегда в кэш, и (с debounce) в облако. */
export function push(key: string, value: unknown, delay = 600) {
  writeCache(key, value);
  if (!isSupabaseConfigured) return;
  const uid = currentUserId;
  if (!uid) return;

  if (pushTimers[key]) clearTimeout(pushTimers[key]);
  pushTimers[key] = setTimeout(async () => {
    try {
      const { error } = await getSupabase()
        .from("user_data")
        .upsert(
          {
            user_id: uid,
            store_key: key,
            data: value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,store_key" }
        );
      if (error) console.warn(`[sync] push "${key}":`, error.message);
    } catch (e) {
      console.warn(`[sync] push "${key}" failed:`, e);
    }
  }, delay);
}

// ─── Хук синхронизации для стора ─────────────────────────────────────────────

interface CloudPersistenceOptions<T> {
  /** Ключ хранилища (см. STORE_KEYS). */
  key: string;
  /** Текущий снимок состояния для сохранения. */
  snapshot: T;
  /** Завершена ли первичная гидратация. */
  hydrated: boolean;
  /** Пометить гидратацию завершённой (вызывается после чтения кэша). */
  setHydrated: (b: boolean) => void;
  /** Применить загруженные данные (из кэша/облака) в состояние стора. */
  applyData: (data: T) => void;
}

/**
 * Универсальный хук: связывает состояние стора с кэшем и облаком Supabase.
 * Заменяет ручные load/save эффекты в сторах.
 */
export function useCloudPersistence<T>({
  key,
  snapshot,
  hydrated,
  setHydrated,
  applyData,
}: CloudPersistenceOptions<T>) {
  const snapRef = useRef(snapshot);
  const applyRef = useRef(applyData);
  const ready = useRef(false);

  // Держим в ref-ах актуальные значения, не вызывая перерисовку.
  useEffect(() => {
    snapRef.current = snapshot;
    applyRef.current = applyData;
  });

  // Первичная загрузка + подписка на смену пользователя.
  useEffect(() => {
    let active = true;

    const cached = readCache<T>(key);
    if (cached != null) applyRef.current(cached);
    setHydrated(true);

    (async () => {
      const remote = await pull<T>(key);
      if (!active) return;
      if (remote != null) {
        applyRef.current(remote);
      } else if (getSyncUser()) {
        // У пользователя ещё нет облачных данных — переносим локальные.
        push(key, snapRef.current);
      }
      ready.current = true;
    })();

    const off = onSyncUserChange((id) => {
      if (!id) return; // выход — состояние очистит AuthProvider/перезагрузка
      (async () => {
        const remote = await pull<T>(key);
        if (!active) return;
        if (remote != null) applyRef.current(remote);
        else push(key, snapRef.current); // миграция локальных данных в новый аккаунт
        ready.current = true;
      })();
    });

    return () => {
      active = false;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Сохранение при изменениях (после готовности, чтобы не затереть облако).
  useEffect(() => {
    if (!hydrated || !ready.current) return;
    push(key, snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, hydrated]);
}
