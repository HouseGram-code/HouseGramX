"use client";

/**
 * Настоящие групповые аудиозвонки на WebRTC (mesh) + Supabase Realtime.
 *
 * Архитектура:
 *  - Сигналинг (offer/answer/ICE) идёт через Realtime Broadcast канала
 *    `call:{chatId}`.
 *  - Список участников звонка берётся из Realtime Presence того же канала
 *    (живой mute-статус, имя, аватар).
 *  - Для индикатора «Идёт звонок» у тех, кто ещё НЕ зашёл, используется
 *    таблица `call_sessions` (postgres realtime). Каждый участник держит в ней
 *    свою строку, пока находится в звонке.
 *  - Между каждой парой участников поднимается отдельный RTCPeerConnection
 *    (полная mesh-топология). Инициатор соединения — тот, у кого меньше userId
 *    (защита от glare).
 *
 * Ограничения: используются только публичные STUN-серверы Google. За строгим
 * (симметричным) NAT для гарантированного соединения нужен TURN-сервер —
 * добавьте его в ICE_SERVERS.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { getSyncUser } from "./sync";

const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun2.l.google.com:19302",
    ],
  },
  // Публичный бесплатный TURN (OpenRelay / Metered) — ретрансляция за строгим NAT.
  // Для продакшена рекомендуется свой TURN (этот общий и может быть перегружен).
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export type CallParticipant = {
  userId: string;
  name: string;
  initials: string;
  color: string;
  avatar?: string;
  muted: boolean;
  isSelf: boolean;
};

/** Метаданные текущего пользователя, которые он публикует в presence. */
export type CallSelf = {
  userId: string;
  name: string;
  initials: string;
  color: string;
  avatar?: string;
};

type PresenceMeta = {
  userId: string;
  name: string;
  initials: string;
  color: string;
  avatar?: string;
  muted: boolean;
};

type SignalPayload = {
  from: string;
  to: string;
  kind: "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type GroupCallValue = {
  /** chatId активного звонка, в котором вы сейчас находитесь, либо null. */
  activeChatId: string | null;
  joined: boolean;
  connecting: boolean;
  muted: boolean;
  speaker: boolean;
  seconds: number;
  participants: CallParticipant[];
  /** Войти в звонок чата (создаёт его, если ещё не идёт). */
  join: (chatId: string, self: CallSelf) => Promise<void>;
  /** Выйти из звонка / завершить участие. */
  leave: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
};

const GroupCallContext = createContext<GroupCallValue | null>(null);

export function GroupCallProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const chatIdRef = useRef<string | null>(null);
  const selfRef = useRef<CallSelf | null>(null);
  const mutedRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const timerRef = useRef<number | null>(null);
  const speakerRef = useRef(true);

  // ----- Таймер длительности -----
  const startTimer = useCallback(() => {
    setSeconds(0);
    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      setSeconds(Math.round((Date.now() - startedAt) / 1000));
    }, 1000);
  }, []);
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ----- Воспроизведение удалённого звука -----
  const attachAudio = useCallback((remoteId: string, stream: MediaStream) => {
    let el = audioElsRef.current.get(remoteId);
    if (!el) {
      el = document.createElement("audio");
      el.autoplay = true;
      el.setAttribute("playsinline", "true");
      el.style.display = "none";
      document.body.appendChild(el);
      audioElsRef.current.set(remoteId, el);
    }
    el.srcObject = stream;
    el.muted = !speakerRef.current;
    el.play().catch(() => {});
  }, []);

  const removeAudio = useCallback((remoteId: string) => {
    const el = audioElsRef.current.get(remoteId);
    if (el) {
      el.srcObject = null;
      el.remove();
      audioElsRef.current.delete(remoteId);
    }
  }, []);

  // ----- Сигналинг -----
  const sendSignal = useCallback((payload: SignalPayload) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "signal",
      payload,
    });
  }, []);

  // ----- Создание соединения с конкретным участником -----
  const newPc = useCallback(
    (remoteId: string): RTCPeerConnection => {
      const existing = pcsRef.current.get(remoteId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcsRef.current.set(remoteId, pc);

      const local = localStreamRef.current;
      if (local) {
        local.getTracks().forEach((t) => pc.addTrack(t, local));
      }

      pc.onicecandidate = (e) => {
        if (e.candidate && selfRef.current) {
          sendSignal({
            from: selfRef.current.userId,
            to: remoteId,
            kind: "ice",
            candidate: e.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (e) => {
        const [stream] = e.streams;
        if (stream) attachAudio(remoteId, stream);
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          closePeer(remoteId);
        }
      };

      return pc;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attachAudio, sendSignal]
  );

  const closePeer = useCallback(
    (remoteId: string) => {
      const pc = pcsRef.current.get(remoteId);
      if (pc) {
        try {
          pc.onicecandidate = null;
          pc.ontrack = null;
          pc.onconnectionstatechange = null;
          pc.close();
        } catch {
          /* noop */
        }
        pcsRef.current.delete(remoteId);
      }
      pendingIceRef.current.delete(remoteId);
      removeAudio(remoteId);
    },
    [removeAudio]
  );

  // Инициатор (меньший userId) создаёт offer.
  const callPeer = useCallback(
    async (remoteId: string) => {
      if (pcsRef.current.has(remoteId)) return;
      const pc = newPc(remoteId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (selfRef.current) {
          sendSignal({
            from: selfRef.current.userId,
            to: remoteId,
            kind: "offer",
            sdp: pc.localDescription ?? offer,
          });
        }
      } catch {
        /* noop */
      }
    },
    [newPc, sendSignal]
  );

  const drainPendingIce = useCallback(async (remoteId: string) => {
    const pc = pcsRef.current.get(remoteId);
    const pending = pendingIceRef.current.get(remoteId);
    if (!pc || !pending) return;
    for (const c of pending) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* noop */
      }
    }
    pendingIceRef.current.delete(remoteId);
  }, []);

  const handleSignal = useCallback(
    async (payload: SignalPayload) => {
      const self = selfRef.current;
      if (!self || payload.to !== self.userId) return;
      const remoteId = payload.from;

      if (payload.kind === "offer" && payload.sdp) {
        const pc = newPc(remoteId);
        try {
          await pc.setRemoteDescription(payload.sdp);
          await drainPendingIce(remoteId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({
            from: self.userId,
            to: remoteId,
            kind: "answer",
            sdp: pc.localDescription ?? answer,
          });
        } catch {
          /* noop */
        }
      } else if (payload.kind === "answer" && payload.sdp) {
        const pc = pcsRef.current.get(remoteId);
        if (pc) {
          try {
            await pc.setRemoteDescription(payload.sdp);
            await drainPendingIce(remoteId);
          } catch {
            /* noop */
          }
        }
      } else if (payload.kind === "ice" && payload.candidate) {
        const pc = pcsRef.current.get(remoteId);
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(payload.candidate);
          } catch {
            /* noop */
          }
        } else {
          const list = pendingIceRef.current.get(remoteId) ?? [];
          list.push(payload.candidate);
          pendingIceRef.current.set(remoteId, list);
        }
      }
    },
    [newPc, drainPendingIce, sendSignal]
  );

  // ----- Пересчёт участников из presence + установка соединений -----
  const syncPresence = useCallback(() => {
    const channel = channelRef.current;
    const self = selfRef.current;
    if (!channel || !self) return;

    const state = channel.presenceState() as Record<string, PresenceMeta[]>;
    const list: CallParticipant[] = [];
    const remoteIds: string[] = [];

    for (const key of Object.keys(state)) {
      const meta = state[key]?.[0];
      if (!meta) continue;
      const isSelf = meta.userId === self.userId;
      list.push({
        userId: meta.userId,
        name: meta.name,
        initials: meta.initials,
        color: meta.color,
        avatar: meta.avatar,
        muted: meta.muted,
        isSelf,
      });
      if (!isSelf) remoteIds.push(meta.userId);
    }

    // Я звоню только тем, у кого userId больше моего (я — инициатор).
    for (const remoteId of remoteIds) {
      if (!pcsRef.current.has(remoteId) && self.userId < remoteId) {
        void callPeer(remoteId);
      }
    }

    // Закрываем соединения с теми, кто вышел.
    for (const remoteId of Array.from(pcsRef.current.keys())) {
      if (!remoteIds.includes(remoteId)) closePeer(remoteId);
    }

    list.sort((a, b) => {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      return a.name.localeCompare(b.name);
    });
    setParticipants(list);
  }, [callPeer, closePeer]);

  // ----- Полная очистка ресурсов звонка -----
  const teardown = useCallback(() => {
    stopTimer();
    for (const remoteId of Array.from(pcsRef.current.keys())) {
      closePeer(remoteId);
    }
    pcsRef.current.clear();
    pendingIceRef.current.clear();
    for (const id of Array.from(audioElsRef.current.keys())) {
      removeAudio(id);
    }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    const channel = channelRef.current;
    if (channel) {
      try {
        channel.untrack();
      } catch {
        /* noop */
      }
      getSupabase().removeChannel(channel);
    }
    channelRef.current = null;

    // Удаляем свою строку из call_sessions.
    const chatId = chatIdRef.current;
    const self = selfRef.current;
    if (chatId && self && isSupabaseConfigured) {
      void getSupabase()
        .from("call_sessions")
        .delete()
        .eq("chat_id", chatId)
        .eq("user_id", self.userId);
    }
    chatIdRef.current = null;
  }, [stopTimer, closePeer, removeAudio]);

  const leave = useCallback(() => {
    teardown();
    setJoined(false);
    setConnecting(false);
    setActiveChatId(null);
    setParticipants([]);
    setMuted(false);
    mutedRef.current = false;
    setSeconds(0);
  }, [teardown]);

  const join = useCallback(
    async (chatId: string, self: CallSelf) => {
      if (!isSupabaseConfigured) throw new Error("Supabase не настроен");
      if (chatIdRef.current === chatId) return; // уже в этом звонке
      if (chatIdRef.current) teardown(); // выходим из предыдущего

      setConnecting(true);
      setActiveChatId(chatId);
      chatIdRef.current = chatId;
      selfRef.current = self;
      mutedRef.current = false;
      setMuted(false);

      // 1) Микрофон
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        localStreamRef.current = stream;
      } catch {
        setConnecting(false);
        chatIdRef.current = null;
        setActiveChatId(null);
        throw new Error("Нет доступа к микрофону");
      }

      const sb = getSupabase();

      // 2) Регистрируем сессию (для индикатора у других участников)
      void sb.from("call_sessions").upsert(
        {
          chat_id: chatId,
          user_id: self.userId,
          name: self.name,
          joined_at: new Date().toISOString(),
        },
        { onConflict: "chat_id,user_id" }
      );

      // 3) Realtime-канал: presence + сигналинг
      const channel = sb.channel(`call:${chatId}`, {
        config: { presence: { key: self.userId } },
      });
      channelRef.current = channel;

      channel
        .on("presence", { event: "sync" }, () => syncPresence())
        .on("presence", { event: "join" }, () => syncPresence())
        .on("presence", { event: "leave" }, () => syncPresence())
        .on("broadcast", { event: "signal" }, ({ payload }) => {
          void handleSignal(payload as SignalPayload);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              userId: self.userId,
              name: self.name,
              initials: self.initials,
              color: self.color,
              avatar: self.avatar,
              muted: false,
            } satisfies PresenceMeta);
            setJoined(true);
            setConnecting(false);
            startTimer();
          }
        });
    },
    [teardown, syncPresence, handleSignal, startTimer]
  );

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    }
    const channel = channelRef.current;
    const self = selfRef.current;
    if (channel && self) {
      void channel.track({
        userId: self.userId,
        name: self.name,
        initials: self.initials,
        color: self.color,
        avatar: self.avatar,
        muted: next,
      } satisfies PresenceMeta);
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    const next = !speakerRef.current;
    speakerRef.current = next;
    setSpeaker(next);
    for (const el of audioElsRef.current.values()) {
      el.muted = !next;
    }
  }, []);

  // Завершаем звонок при размонтировании / закрытии вкладки.
  useEffect(() => {
    const onUnload = () => teardown();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ctxValue: GroupCallValue = {
    activeChatId,
    joined,
    connecting,
    muted,
    speaker,
    seconds,
    participants,
    join,
    leave,
    toggleMute,
    toggleSpeaker,
  };

  return (
    <GroupCallContext.Provider value={ctxValue}>
      {children}
    </GroupCallContext.Provider>
  );
}

export function useGroupCall() {
  const ctx = useContext(GroupCallContext);
  if (!ctx)
    throw new Error("useGroupCall должен быть внутри GroupCallProvider");
  return ctx;
}

/**
 * Наблюдатель за активным звонком конкретного чата (для баннера «Идёт звонок»).
 * Читает таблицу call_sessions и подписывается на её изменения в реальном
 * времени. Не подключает медиа — только считает участников.
 */
export function useCallWatch(chatId: string | null): {
  active: boolean;
  count: number;
} {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!chatId || !isSupabaseConfigured) {
      setCount(0);
      return;
    }
    const sb = getSupabase();
    let cancelled = false;

    const refresh = async () => {
      const { count: c } = await sb
        .from("call_sessions")
        .select("user_id", { count: "exact", head: true })
        .eq("chat_id", chatId);
      if (!cancelled) setCount(c ?? 0);
    };
    void refresh();

    const channel = sb
      .channel(`call-watch:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_sessions",
          filter: `chat_id=eq.${chatId}`,
        },
        () => void refresh()
      )
      .subscribe();

    // Запасной опрос: если realtime-событие по call_sessions не дошло
    // (например, клиент уже был в чате, когда начался звонок) — всё равно
    // обновляем счётчик раз в несколько секунд, чтобы баннер «Идёт
    // аудиозвонок» гарантированно появился у всех.
    const poll = window.setInterval(() => void refresh(), 4000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      sb.removeChannel(channel);
    };
  }, [chatId]);

  return { active: count > 0, count };
}

/**
 * Следит за активными групповыми звонками сразу по списку чатов — для
 * индикатора «Идёт звонок» в списке чатов (как в Telegram), чтобы другие
 * участники видели звонок, даже не открывая чат. Realtime + опрос на случай,
 * если postgres_changes по call_sessions не доставлены.
 */
export function useActiveCallChats(chatIds: string[]): Set<string> {
  const [active, setActive] = useState<Set<string>>(() => new Set());
  // Стабильный ключ зависимости, чтобы не пересоздавать подписку каждый рендер.
  const key = chatIds.slice().sort().join(",");

  useEffect(() => {
    if (!isSupabaseConfigured || chatIds.length === 0) {
      setActive(new Set());
      return;
    }
    const sb = getSupabase();
    let cancelled = false;

    const refresh = async () => {
      const { data } = await sb
        .from("call_sessions")
        .select("chat_id")
        .in("chat_id", chatIds);
      if (cancelled) return;
      const next = new Set<string>();
      for (const r of (data ?? []) as { chat_id: string }[]) {
        next.add(r.chat_id);
      }
      setActive(next);
    };
    void refresh();

    const channel = sb
      .channel("call-watch-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_sessions" },
        () => void refresh()
      )
      .subscribe();

    const poll = window.setInterval(() => void refresh(), 4000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return active;
}
