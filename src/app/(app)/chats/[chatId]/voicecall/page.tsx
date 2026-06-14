"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  PhoneX,
  Microphone,
  MicrophoneSlash,
  Phone,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { useChats } from "@/lib/chat-store";
import { usePeerCall } from "@/lib/peer-call";
import { useCalls } from "@/lib/calls-store";

export default function VoiceCallPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const { getConversation } = useChats();
  const { logCall } = useCalls();
  const { ready, state, muted, seconds, call, hangup, toggleMute } =
    usePeerCall();

  const conv = getConversation(chatId);

  // Автозвонок при открытии — реальный вызов по auth-id собеседника.
  useEffect(() => {
    if (ready && state === "idle" && conv && conv.peerId) {
      call({
        id: conv.peerId,
        name: conv.title,
        color: conv.color,
        initials: conv.initials,
        avatar: conv.avatar,
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Логируем и закрываем при завершении
  useEffect(() => {
    if (state === "ended" || (state === "idle" && seconds > 0)) {
      if (conv) {
        logCall({
          title: conv.title,
          color: conv.color,
          initials: conv.initials,
          type: "audio",
          direction: "outgoing",
          duration: seconds,
        });
      }
      const t = setTimeout(() => router.back(), 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!conv) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-zinc-900 text-white">
        Чат не найден
      </div>
    );
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const statusText =
    state === "calling"
      ? "Вызов…"
      : state === "active"
        ? `${mm}:${ss}`
        : state === "ended"
          ? "Звонок завершён"
          : !ready
            ? "Соединение…"
            : "Вызов…";

  return (
    <div className="relative flex h-full flex-1 flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-950 text-white">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 pt-16">
        <motion.div
          animate={
            state === "active" ? {} : { scale: [1, 1.06, 1], opacity: [1, 0.85, 1] }
          }
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          <Avatar
            initials={conv.initials}
            color={conv.color}
            size={130}
            src={conv.avatar || undefined}
            className="text-5xl shadow-2xl ring-4 ring-white/10"
          />
        </motion.div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{conv.title}</h1>
          <p className="mt-1 text-[15px] text-white/70">{statusText}</p>
        </div>
      </div>

      <div className="w-full pb-[max(env(safe-area-inset-bottom),32px)] pt-6">
        <div className="mx-auto flex max-w-xs items-center justify-center gap-10 px-6">
          <CallButton
            active={muted}
            disabled={state !== "active"}
            onClick={toggleMute}
            icon={muted ? MicrophoneSlash : Microphone}
            label={muted ? "Вкл. микро" : "Микрофон"}
          />
        </div>

        <div className="mt-8 flex justify-center">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={hangup}
            aria-label="Завершить"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg"
          >
            <PhoneX size={28} weight="fill" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function CallButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: typeof Phone;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 disabled:opacity-40"
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
          active ? "bg-white text-zinc-900" : "bg-white/15 text-white"
        }`}
      >
        <Icon size={26} weight="fill" />
      </span>
      <span className="text-[12px] text-white/70">{label}</span>
    </button>
  );
}
