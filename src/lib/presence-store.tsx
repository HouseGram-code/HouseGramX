"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { getSyncUser, onSyncUserChange } from "./sync";

/**
 * Статусы «онлайн / был недавно» через Supabase Realtime Presence.
 *
 * Каждый вошедший пользователь подключается к общему каналу присутствия и
 * «трекает» себя. Остальные клиенты получают список онлайн-пользователей.
 * При отключении в profiles.last_seen пишется текущее время.
 */

interface PresenceContextValue {
  /** Множество id пользователей, которые сейчас онлайн. */
  onlineIds: Set<string>;
  /** Онлайн ли пользователь. */
  isOnline: (userId: string | null | undefined) => boolean;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

const PRESENCE_CHANNEL = "online-users";

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const touchLastSeen = (uid: string) => {
      void sb
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", uid);
    };

    const connect = (uid: string) => {
      // Закрываем прошлый канал (смена пользователя).
      if (channelRef.current) {
        void sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = sb.channel(PRESENCE_CHANNEL, {
        config: { presence: { key: uid } },
      });

      const recompute = () => {
        const state = channel.presenceState();
        setOnlineIds(new Set(Object.keys(state)));
      };

      channel
        .on("presence", { event: "sync" }, recompute)
        .on("presence", { event: "join" }, recompute)
        .on("presence", { event: "leave" }, recompute)
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void channel.track({ online_at: new Date().toISOString() });
            touchLastSeen(uid);
          }
        });

      channelRef.current = channel;

      // Периодически обновляем last_seen, пока вкладка активна.
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = setInterval(() => touchLastSeen(uid), 60_000);
    };

    const disconnect = () => {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
      if (channelRef.current) {
        void sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setOnlineIds(new Set());
    };

    const current = getSyncUser();
    if (current) connect(current);

    const off = onSyncUserChange((id) => {
      if (id) connect(id);
      else disconnect();
    });

    // Фиксируем last_seen при закрытии вкладки.
    const onHide = () => {
      const uid = getSyncUser();
      if (uid && document.visibilityState === "hidden") touchLastSeen(uid);
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      off();
      document.removeEventListener("visibilitychange", onHide);
      disconnect();
    };
  }, []);

  const isOnline = (userId: string | null | undefined) =>
    !!userId && onlineIds.has(userId);

  return (
    <PresenceContext.Provider value={{ onlineIds, isOnline }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error("usePresence должен быть внутри PresenceProvider");
  return ctx;
}
