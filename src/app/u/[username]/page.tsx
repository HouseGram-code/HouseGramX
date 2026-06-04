"use client";

import { use } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ChatCircle, At } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { useProfile } from "@/lib/profile-store";

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { profile, initials } = useProfile();

  // Если открыт собственный профиль — показываем реальные данные.
  const isMe =
    username === profile.username || username === "me" || !profile.username;

  const name = isMe ? profile.name : `@${username}`;
  const handle = isMe ? profile.username : username;
  const bio = isMe ? profile.bio : "";
  const avatar = isMe ? profile.avatar : "";
  const color = isMe ? profile.color : "#6c5ce7";

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background px-6 pt-16 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 16 }}
      >
        <Avatar
          initials={isMe ? initials : username.charAt(0).toUpperCase()}
          color={color}
          size={120}
          src={avatar || undefined}
          className="text-5xl shadow-lg"
        />
      </motion.div>

      <h1 className="mt-5 text-2xl font-bold text-foreground">{name}</h1>
      {handle && (
        <p className="mt-1 flex items-center gap-0.5 text-[15px] text-muted">
          <At size={15} weight="bold" />
          {handle}
        </p>
      )}
      {bio && (
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-foreground/80">
          {bio}
        </p>
      )}

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/chats"
          className="flex items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-white shadow-sm transition active:scale-[0.98]"
        >
          <ChatCircle size={20} weight="fill" />
          {isMe ? "Открыть HouseGramX" : "Написать сообщение"}
        </Link>
        {!isMe && (
          <Link
            href="/chats"
            className="rounded-2xl bg-surface py-3.5 text-[16px] font-medium text-foreground ring-1 ring-separator transition active:bg-surface-2"
          >
            Назад
          </Link>
        )}
      </div>
    </div>
  );
}
