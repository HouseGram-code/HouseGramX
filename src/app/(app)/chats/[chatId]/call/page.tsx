"use client";

import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  PhoneX,
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSimpleSlash,
  CaretLeft,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { useChats } from "@/lib/chat-store";
import { useProfile } from "@/lib/profile-store";
import { useAuth } from "@/lib/auth-store";
import { useGroupCall } from "@/lib/group-call";
import { useToast } from "@/components/Toast";

export default function GroupCallPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const { getConversation } = useChats();
  const { profile, initials } = useProfile();
  const { user } = useAuth();
  const {
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
  } = useGroupCall();
  const { show } = useToast();

  const conv = getConversation(chatId);
  const triedRef = useRef(false);

  // Входим в звонок при открытии страницы.
  useEffect(() => {
    if (!conv || !user?.id) return;
    if (activeChatId === chatId && joined) return;
    if (triedRef.current) return;
    triedRef.current = true;
    join(chatId, {
      userId: user.id,
      name: profile.name || "Вы",
      initials,
      color: profile.color,
      avatar: profile.avatar || undefined,
    }).catch((e) => {
      show(e instanceof Error ? e.message : "Не удалось начать звонок");
      router.back();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv, user?.id, chatId]);

  const copyCallLink = async () => {
    try {
      const url = `${window.location.origin}/join/${chatId}?type=group`;
      await navigator.clipboard?.writeText(url);
      show("Ссылка на звонок скопирована");
    } catch {
      show("Не удалось скопировать");
    }
  };

  const handleEnd = () => {
    leave();
    router.back();
  };

  if (!conv) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-zinc-900 text-white">
        Чат не найден
      </div>
    );
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const statusText = connecting
    ? "Соединение…"
    : participants.length <= 1
      ? "Ожидание участников…"
      : `Аудиозвонок · ${mm}:${ss}`;

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
          <p className="text-[12px] text-white/60">{statusText}</p>
        </div>
      </header>

      {/* Сетка участников */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="grid w-full max-w-md grid-cols-2 gap-4 sm:grid-cols-3">
          {participants.map((p) => (
            <div
              key={p.userId}
              className="flex flex-col items-center gap-2"
            >
              <div className="relative">
                {!p.muted && (
                  <span className="absolute inset-0 animate-pulse rounded-full ring-2 ring-green-400" />
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
                    <MicrophoneSlash
                      size={15}
                      weight="fill"
                      className="text-white"
                    />
                  </span>
                )}
              </div>
              <span className="max-w-[90px] truncate text-[13px] text-white/90">
                {p.isSelf ? "Вы" : p.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Управление */}
      <div className="w-full pb-[max(env(safe-area-inset-bottom),28px)] pt-4">
        <div className="mx-auto flex max-w-sm items-center justify-around px-6">
          <CallButton
            icon={LinkIcon}
            label="Пригласить"
            onClick={copyCallLink}
          />
          <CallButton
            icon={muted ? MicrophoneSlash : Microphone}
            label={muted ? "Включить" : "Микрофон"}
            active={muted}
            onClick={toggleMute}
          />
          <CallButton
            icon={speaker ? SpeakerHigh : SpeakerSimpleSlash}
            label="Динамик"
            active={!speaker}
            onClick={toggleSpeaker}
          />
        </div>

        {/* Завершить */}
        <div className="mt-7 flex justify-center">
          <button
            type="button"
            onClick={handleEnd}
            aria-label="Завершить звонок"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition active:scale-95"
          >
            <PhoneX size={28} weight="fill" />
          </button>
        </div>
      </div>
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
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2"
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
