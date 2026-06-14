"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { getSyncUser } from "./sync";

export type TypingActivity = "typing" | "sticker";

export interface Typer {
  userId: string;
  name: string;
  activity: TypingActivity;
}

interface TypingPayload {
  userId: string;
  name: string;
  activity: TypingActivity | "stop";
}

// Через сколько мс участник считается «перестал печатать», если не было обновлений.
const TYPER_TTL = 4500;
// Не чаще одного broadcast в этот интервал.
const SEND_THROTTLE = 1500;

/**
 * Реальный индикатор «печатает…» для чата через Supabase Realtime broadcast.
 *
 * Канал typing:{chatId}. Каждый клиент рассылает своё состояние, а остальные
 * видят, кто сейчас печатает (с именем — как в Telegram для групп).
 */
export function useChatTyping(chatId: string | null | undefined) {
  const [typers, setTypers] = useState<Typer[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const meRef = useRef<string | null>(null);
  const nameRef = useRef<string>("Кто-то");
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const lastSentRef = useRef<number>(0);

  // Имя и id текущего пользователя из профиля.
  useEffect(() => {
    meRef.current = getSyncUser();
    try {
      const raw = localStorage.getItem("messenger.profile.v1");
      const p = raw ? JSON.parse(raw) : {};
      nameRef.current = p.name || p.username || "Кто-то";
    } catch {
      nameRef.current = "Кто-то";
    }
  }, []);

  useEffect(() => {
    if (!chatId || !isSupabaseConfigured) return;
    const sb = getSupabase();
    const timers = timersRef.current;

    const drop = (userId: string) => {
      setTypers((list) => list.filter((t) => t.userId !== userId));
      const tm = timers.get(userId);
      if (tm) {
        clearTimeout(tm);
        timers.delete(userId);
      }
    };

    const channel = sb.channel("typing:" + chatId, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "typing" }, (msg) => {
      const p = msg.payload as TypingPayload;
      if (!p || !p.userId || p.userId === meRef.current) return;
      if (p.activity === "stop") {
        drop(p.userId);
        return;
      }
      const activity: TypingActivity = p.activity;
      const entry: Typer = { userId: p.userId, name: p.name, activity };
      setTypers((list) => {
        const rest = list.filter((t) => t.userId !== entry.userId);
        return [...rest, entry];
      });
      const prev = timers.get(p.userId);
      if (prev) clearTimeout(prev);
      timers.set(
        p.userId,
        setTimeout(() => drop(p.userId), TYPER_TTL),
      );
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      timers.forEach((tm) => clearTimeout(tm));
      timers.clear();
      setTypers([]);
      void sb.removeChannel(channel);
      channelRef.current = null;
    };
  }, [chatId]);

  /** Сообщить, что я печатаю / выбираю стикер (с троттлингом). */
  const notifyTyping = useCallback((activity: TypingActivity = "typing") => {
    const channel = channelRef.current;
    const me = meRef.current;
    if (!channel || !me) return;
    const now = Date.now();
    if (now - lastSentRef.current < SEND_THROTTLE) return;
    lastSentRef.current = now;
    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId: me,
        name: nameRef.current,
        activity,
      } as TypingPayload,
    });
  }, []);

  /** Сообщить, что я перестал печатать (например, после отправки). */
  const stopTyping = useCallback(() => {
    const channel = channelRef.current;
    const me = meRef.current;
    if (!channel || !me) return;
    lastSentRef.current = 0;
    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId: me,
        name: nameRef.current,
        activity: "stop",
      } as TypingPayload,
    });
  }, []);

  return { typers, notifyTyping, stopTyping };
}
