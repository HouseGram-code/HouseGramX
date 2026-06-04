"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  PhoneX,
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSimpleSlash,
  UserPlus,
  CaretLeft,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { CallInviteSheet } from "@/components/CallInviteSheet";
import { useChats } from "@/lib/chat-store";
import { useContacts } from "@/lib/contacts-store";
import { useProfile } from "@/lib/profile-store";
import { useToast } from "@/components/Toast";

export default function GroupCallPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const {
    getConversation,
    activeCall,
    startGroupCall,
    joinGroupCall,
    endGroupCall,
    toggleCallMute,
    toggleCallSpeaker,
  } = useChats();
  const { getContact } = useContacts();
  const { profile, initials } = useProfile();
  const { show } = useToast();

  const conv = getConversation(chatId);
  const [seconds, setSeconds] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);

  const copyCallLink = async () => {
    try {
      const url = `${window.location.origin}/join/${chatId}?type=group`;
      await navigator.clipboard?.writeText(url);
      show("Ссылка на звонок скопирована");
    } catch {
      show("Не удалось скопировать");
    }
  };

  // Запускаем звонок, если его ещё нет для этого чата.
  useEffect(() => {
    if (conv && (!activeCall || activeCall.chatId !== chatId)) {
      startGroupCall(chatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, conv]);

  useEffect(() => {
    if (!activeCall) return;
    const i = setInterval(() => {
      setSeconds(Math.round((Date.now() - activeCall.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(i);
  }, [activeCall]);

  if (!conv) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-zinc-900 text-white">
        Чат не найден
      </div>
    );
  }

  const call = activeCall;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  // Участники звонка: я + присоединившиеся
  const participants = (call?.participantIds ?? ["me"]).map((id) => {
    if (id === "me") {
      return {
        id: "me",
        name: profile.name,
        initials,
        color: profile.color,
        avatar: profile.avatar,
        muted: call?.muted ?? false,
      };
    }
    const c = getContact(id);
    return {
      id,
      name: c?.name ?? "Участник",
      initials: c?.initials ?? "?",
      color: c?.color ?? "#888",
      avatar: undefined as string | undefined,
      muted: false,
    };
  });

  // Кого можно позвать в звонок (участники группы вне звонка)
  const invitable = (conv.memberIds ?? []).filter(
    (id) => !(call?.participantIds ?? []).includes(id)
  );

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-950 text-white">
      {/* Шапка */}
      <header className="z-10 flex items-center gap-2 px-3 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Свернуть"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10"
        >
          <CaretLeft size={26} weight="bold" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold">{conv.title}</p>
          <p className="text-[12px] text-white/60">
            Аудиозвонок · {mm}:{ss}
          </p>
        </div>
      </header>

      {/* Сетка участников */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="grid w-full max-w-md grid-cols-2 gap-4 sm:grid-cols-3">
          <AnimatePresence>
            {participants.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="relative">
                  {/* Пульсация говорящего */}
                  {!p.muted && (
                    <motion.span
                      className="absolute inset-0 rounded-full ring-2 ring-green-400"
                      animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    />
                  )}
                  <Avatar
                    initials={p.initials}
                    color={p.color}
                    size={84}
                    src={p.avatar || undefined}
                    className="text-3xl shadow-lg"
                  />
                  {p.muted && (
                    <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700 ring-2 ring-zinc-900">
                      <MicrophoneSlash size={15} weight="fill" className="text-white" />
                    </span>
                  )}
                </div>
                <span className="max-w-[90px] truncate text-[13px] text-white/90">
                  {p.id === "me" ? "Вы" : p.name}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Управление */}
      <div className="w-full pb-[max(env(safe-area-inset-bottom),28px)] pt-4">
        <div className="mx-auto flex max-w-sm items-center justify-around px-6">
          {/* Пригласить */}
          <CallButton
            icon={UserPlus}
            label="Добавить"
            onClick={() => setInviteOpen(true)}
          />
          {/* Микрофон */}
          <CallButton
            icon={call?.muted ? MicrophoneSlash : Microphone}
            label={call?.muted ? "Включить" : "Микрофон"}
            active={call?.muted}
            onClick={toggleCallMute}
          />
          {/* Динамик */}
          <CallButton
            icon={call?.speaker ? SpeakerHigh : SpeakerSimpleSlash}
            label="Динамик"
            active={call?.speaker}
            onClick={toggleCallSpeaker}
          />
          {/* Ссылка */}
          <CallButton
            icon={LinkIcon}
            label="Ссылка"
            onClick={copyCallLink}
          />
        </div>

        {/* Завершить */}
        <div className="mt-7 flex justify-center">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              endGroupCall();
              router.back();
            }}
            aria-label="Завершить звонок"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg"
          >
            <PhoneX size={28} weight="fill" />
          </motion.button>
        </div>
      </div>

      <CallInviteSheet
        open={inviteOpen}
        candidateIds={invitable}
        onClose={() => setInviteOpen(false)}
        onAdd={(ids) => {
          ids.forEach((id) => joinGroupCall(chatId, id));
          show(
            ids.length === 1
              ? "Участник добавлен"
              : `Добавлено: ${ids.length}`
          );
        }}
        onCopyLink={copyCallLink}
      />
    </div>
  );
}

function CallButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Microphone;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2">
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
