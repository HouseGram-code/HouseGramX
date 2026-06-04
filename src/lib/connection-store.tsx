"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Состояние соединения — как в Telegram: «Соединение…», «Обновление…»,
 * «Ожидание сети…». Учитывает navigator.onLine и статус Supabase Realtime.
 */

export type ConnState =
  | "connected" // всё хорошо
  | "connecting" // realtime подключается
  | "updating" // подключились, грузим/догоняем данные
  | "waiting"; // нет сети

// ─── Глобальные сеттеры (обновляются из chat-store) ──────────────────────────

let realtimeState: "connecting" | "connected" | "error" = "connecting";
let updating = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore */
    }
  });
}

/** Сообщить статус realtime-канала (из chat-store). */
export function setRealtimeState(s: "connecting" | "connected" | "error") {
  if (realtimeState === s) return;
  realtimeState = s;
  emit();
}

/** Идёт ли сейчас загрузка/догон данных. */
export function setUpdating(v: boolean) {
  if (updating === v) return;
  updating = v;
  emit();
}

function computeState(online: boolean): ConnState {
  if (!online) return "waiting";
  if (realtimeState !== "connected") return "connecting";
  if (updating) return "updating";
  return "connected";
}

// ─── Контекст ────────────────────────────────────────────────────────────────

interface ConnectionContextValue {
  state: ConnState;
  online: boolean;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [, force] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      listeners.delete(rerender);
    };
  }, []);

  const state = computeState(online);

  return (
    <ConnectionContext.Provider value={{ state, online }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error("useConnection должен быть внутри ConnectionProvider");
  return ctx;
}

/** Подпись статуса для шапки. */
export function connLabel(state: ConnState): string {
  switch (state) {
    case "waiting":
      return "Ожидание сети…";
    case "connecting":
      return "Соединение…";
    case "updating":
      return "Обновление…";
    default:
      return "";
  }
}
