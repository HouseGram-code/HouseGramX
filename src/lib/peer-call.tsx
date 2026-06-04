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

export type CallState = "idle" | "calling" | "incoming" | "active" | "ended";

// STUN + публичный TURN (OpenRelay) — работает даже за строгим NAT.
const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun2.l.google.com:19302",
    ],
  },
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

/** Кого зовём / кто звонит. id — auth-uuid пользователя. */
export interface CallPeerInfo {
  id: string;
  name: string;
  color?: string;
  initials?: string;
  avatar?: string;
}

interface PeerCallValue {
  ready: boolean;
  state: CallState;
  /** id (auth uuid) собеседника в текущем звонке. */
  peerId: string | null;
  /** Отображаемое имя собеседника. */
  peerName: string | null;
  muted: boolean;
  seconds: number;
  call: (remote: CallPeerInfo) => Promise<void>;
  answer: () => Promise<void>;
  hangup: () => void;
  toggleMute: () => void;
}

const PeerCallContext = createContext<PeerCallValue | null>(null);

/** Совместимость: нормализует строку в id (больше не используется для звонков). */
export function toPeerId(raw: string): string {
  return (
    "msgr-" +
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 24)
  );
}

type Signal =
  | { kind: "offer"; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; candidate: RTCIceCandidateInit }
  | { kind: "join" }
  | { kind: "hangup" };

interface InvitePayload {
  callId: string;
  from: CallPeerInfo;
}

export function PeerCallProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<CallState>("idle");
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const myIdRef = useRef<string | null>(null);
  const myProfileRef = useRef<CallPeerInfo>({ id: "", name: "Контакт" });
  const ringRef = useRef<RealtimeChannel | null>(null);
  const callChanRef = useRef<RealtimeChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const callIdRef = useRef<string | null>(null);
  const isCallerRef = useRef(false);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const incomingInviteRef = useRef<InvitePayload | null>(null);
  const mutedRef = useRef(false);

  // Скрытый аудио-элемент для удалённого звука.
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

  function startTimer() {
    setSeconds(0);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function getMic() {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    localStreamRef.current = stream;
    return stream;
  }

  function sendSignal(sig: Signal) {
    const ch = callChanRef.current;
    if (!ch) return;
    void ch.send({ type: "broadcast", event: "signal", payload: sig });
  }

  function teardown(next: CallState) {
    stopTimer();
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    pendingIceRef.current = [];
    if (callChanRef.current) {
      const sb = getSupabase();
      void sb.removeChannel(callChanRef.current);
      callChanRef.current = null;
    }
    callIdRef.current = null;
    isCallerRef.current = false;
    incomingInviteRef.current = null;
    mutedRef.current = false;
    setMuted(false);
    setPeerId(null);
    setPeerName(null);
    setState(next);
    if (next === "ended") {
      window.setTimeout(() => setState("idle"), 800);
    }
  }

  async function drainIce() {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const list = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const c of list) {
      try {
        await pc.addIceCandidate(c);
      } catch {}
    }
  }

  function newPc() {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({ kind: "ice", candidate: e.candidate.toJSON() });
      }
    };
    pc.ontrack = (e) => {
      if (audioRef.current) {
        audioRef.current.srcObject = e.streams[0];
        audioRef.current.play().catch(() => {});
      }
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") {
        setState("active");
        startTimer();
      } else if (
        st === "failed" ||
        st === "disconnected" ||
        st === "closed"
      ) {
        teardown("ended");
      }
    };
    pcRef.current = pc;
    return pc;
  }

  async function handleSignal(sig: Signal) {
    if (sig.kind === "hangup") {
      teardown("ended");
      return;
    }
    const pc = pcRef.current;
    if (sig.kind === "join") {
      // Звонящий: собеседник присоединился — шлём offer.
      if (!isCallerRef.current || !pc) return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ kind: "offer", sdp: offer });
      return;
    }
    if (!pc) return;
    if (sig.kind === "offer") {
      await pc.setRemoteDescription(sig.sdp);
      await drainIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal({ kind: "answer", sdp: answer });
    } else if (sig.kind === "answer") {
      await pc.setRemoteDescription(sig.sdp);
      await drainIce();
    } else if (sig.kind === "ice") {
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(sig.candidate);
        } catch {}
      } else {
        pendingIceRef.current.push(sig.candidate);
      }
    }
  }

  function joinCallChannel(callId: string) {
    const sb = getSupabase();
    const ch = sb.channel("call1:" + callId, {
      config: { broadcast: { self: false } },
    });
    ch.on("broadcast", { event: "signal" }, (msg) => {
      void handleSignal(msg.payload as Signal);
    });
    callChanRef.current = ch;
    return ch;
  }

  // Подписка на персональный канал входящих звонков.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();

    const loadProfile = (uid: string): CallPeerInfo => {
      try {
        const raw = localStorage.getItem("messenger.profile.v1");
        const p = raw ? JSON.parse(raw) : {};
        return {
          id: uid,
          name: p.name || p.username || "Контакт",
          color: p.color || undefined,
          avatar: p.avatar || undefined,
        };
      } catch {
        return { id: uid, name: "Контакт" };
      }
    };

    const connect = (uid: string) => {
      if (ringRef.current) {
        void sb.removeChannel(ringRef.current);
        ringRef.current = null;
      }
      myIdRef.current = uid;
      myProfileRef.current = loadProfile(uid);

      const ring = sb.channel("ring:" + uid, {
        config: { broadcast: { self: false } },
      });
      ring.on("broadcast", { event: "invite" }, (msg) => {
        const inv = msg.payload as InvitePayload;
        if (!inv || !inv.callId) return;
        // Уже в звонке — игнорируем (занято).
        if (pcRef.current || callChanRef.current) return;
        incomingInviteRef.current = inv;
        setPeerId(inv.from.id);
        setPeerName(inv.from.name);
        setState("incoming");
      });
      ring.subscribe((status) => {
        if (status === "SUBSCRIBED") setReady(true);
      });
      ringRef.current = ring;
    };

    const current = getSyncUser();
    if (current) connect(current);

    const off = onSyncUserChange((id) => {
      if (id) {
        connect(id);
      } else {
        setReady(false);
        myIdRef.current = null;
      }
    });

    return () => {
      off();
      if (ringRef.current) {
        void sb.removeChannel(ringRef.current);
        ringRef.current = null;
      }
    };
  }, []);

  async function call(remote: CallPeerInfo) {
    const me = myIdRef.current;
    if (!me || !isSupabaseConfigured) return;
    const sb = getSupabase();
    isCallerRef.current = true;
    setPeerId(remote.id);
    setPeerName(remote.name);
    setState("calling");

    const stream = await getMic();
    const pc = newPc();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const callId = me + "-" + Date.now();
    callIdRef.current = callId;
    const ch = joinCallChannel(callId);
    ch.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      // Шлём приглашение собеседнику на его персональный канал.
      const ring = sb.channel("ring:" + remote.id);
      ring.subscribe((st) => {
        if (st !== "SUBSCRIBED") return;
        void ring
          .send({
            type: "broadcast",
            event: "invite",
            payload: {
              callId,
              from: myProfileRef.current,
            } as InvitePayload,
          })
          .then(() => {
            void sb.removeChannel(ring);
          });
      });
    });
  }

  async function answer() {
    const inv = incomingInviteRef.current;
    const me = myIdRef.current;
    if (!inv || !me) return;
    isCallerRef.current = false;
    callIdRef.current = inv.callId;

    const stream = await getMic();
    const pc = newPc();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const ch = joinCallChannel(inv.callId);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // Сообщаем звонящему, что мы готовы — он пришлёт offer.
        sendSignal({ kind: "join" });
      }
    });
  }

  function hangup() {
    if (callChanRef.current) {
      sendSignal({ kind: "hangup" });
      window.setTimeout(() => teardown("ended"), 150);
    } else {
      teardown("idle");
    }
  }

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !mutedRef.current;
    mutedRef.current = next;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  const ctxValue: PeerCallValue = {
    ready,
    state,
    peerId,
    peerName,
    muted,
    seconds,
    call,
    answer,
    hangup,
    toggleMute,
  };

  return (
    <PeerCallContext.Provider value={ctxValue}>
      {children}
    </PeerCallContext.Provider>
  );
}

export function usePeerCall() {
  const ctx = useContext(PeerCallContext);
  if (!ctx) throw new Error("usePeerCall должен быть внутри PeerCallProvider");
  return ctx;
}
