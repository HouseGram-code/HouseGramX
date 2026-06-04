"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type Peer from "peerjs";
import type { MediaConnection } from "peerjs";

export type CallState = "idle" | "calling" | "incoming" | "active" | "ended";

interface PeerCallValue {
  /** Мой peer-id (по нему мне можно позвонить). */
  myId: string;
  ready: boolean;
  state: CallState;
  /** id собеседника в текущем звонке. */
  peerId: string | null;
  muted: boolean;
  /** Длительность активного звонка, сек. */
  seconds: number;
  /** Позвонить по peer-id. */
  call: (remoteId: string) => Promise<void>;
  /** Принять входящий. */
  answer: () => Promise<void>;
  /** Завершить / отклонить. */
  hangup: () => void;
  toggleMute: () => void;
}

const PeerCallContext = createContext<PeerCallValue | null>(null);

/** Нормализует произвольную строку в безопасный peer-id. */
export function toPeerId(raw: string): string {
  return "msgr-" + raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24);
}

export function PeerCallProvider({ children }: { children: ReactNode }) {
  const [myId, setMyId] = useState("");
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<CallState>("idle");
  const [peerId, setPeerId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const connRef = useRef<MediaConnection | null>(null);
  const incomingRef = useRef<MediaConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // Инициализация PeerJS на основе профиля.
  useEffect(() => {
    let cancelled = false;
    let savedId = "";
    try {
      const raw = localStorage.getItem("messenger.profile.v1");
      const p = raw ? JSON.parse(raw) : {};
      savedId = toPeerId(p.username || p.name || "me-" + Math.random());
    } catch {
      savedId = toPeerId("me-" + Math.random());
    }

    let peer: Peer | null = null;
    (async () => {
      const { default: PeerCtor } = await import("peerjs");
      if (cancelled) return;
      peer = new PeerCtor(savedId);
      peerRef.current = peer;

      peer.on("open", (id) => {
        if (cancelled) return;
        setMyId(id);
        setReady(true);
      });
      peer.on("error", (e) => {
        // Если id занят — генерируем случайный
        if ((e as { type?: string }).type === "unavailable-id") {
          const fallback = toPeerId("me-" + Date.now());
          peer?.destroy();
          const np = new PeerCtor(fallback);
          peerRef.current = np;
          np.on("open", (id) => {
            setMyId(id);
            setReady(true);
          });
          attachIncoming(np);
        }
      });

      attachIncoming(peer);
    })();

    return () => {
      cancelled = true;
      stopTimer();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peer?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Создаём скрытый аудио-элемент для воспроизведения удалённого звука.
  useEffect(() => {
    const el = document.createElement("audio");
    el.autoplay = true;
    el.style.display = "none";
    document.body.appendChild(el);
    audioRef.current = el;
    return () => {
      el.remove();
    };
  }, []);

  const startTimer = () => {
    setSeconds(0);
    timerRef.current = window.setInterval(
      () => setSeconds((s) => s + 1),
      1000
    );
  };
  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const getMic = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    localStreamRef.current = stream;
    return stream;
  };

  const playRemote = (stream: MediaStream) => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => {});
    }
  };

  const attachIncoming = (peer: Peer) => {
    peer.on("call", (mc) => {
      incomingRef.current = mc;
      setPeerId(mc.peer);
      setState("incoming");
    });
  };

  const cleanup = useCallback(() => {
    stopTimer();
    connRef.current?.close();
    connRef.current = null;
    incomingRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    setMuted(false);
  }, []);

  const wireConnection = (mc: MediaConnection) => {
    connRef.current = mc;
    mc.on("stream", (remote) => {
      playRemote(remote);
      setState("active");
      startTimer();
    });
    mc.on("close", () => {
      cleanup();
      setState("ended");
      setTimeout(() => setState("idle"), 800);
    });
  };

  const call: PeerCallValue["call"] = async (remoteId) => {
    if (!peerRef.current) return;
    const stream = await getMic();
    setPeerId(remoteId);
    setState("calling");
    const mc = peerRef.current.call(remoteId, stream);
    wireConnection(mc);
  };

  const answer: PeerCallValue["answer"] = async () => {
    const mc = incomingRef.current;
    if (!mc) return;
    const stream = await getMic();
    mc.answer(stream);
    wireConnection(mc);
  };

  const hangup: PeerCallValue["hangup"] = () => {
    incomingRef.current?.close();
    connRef.current?.close();
    cleanup();
    setState("idle");
    setPeerId(null);
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };

  return (
    <PeerCallContext.Provider
      value={{
        myId,
        ready,
        state,
        peerId,
        muted,
        seconds,
        call,
        answer,
        hangup,
        toggleMute,
      }}
    >
      {children}
    </PeerCallContext.Provider>
  );
}

export function usePeerCall() {
  const ctx = useContext(PeerCallContext);
  if (!ctx) throw new Error("usePeerCall должен быть внутри PeerCallProvider");
  return ctx;
}
