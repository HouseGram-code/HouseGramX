"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ChatCircle, At, Bug } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { BugHunterBadge } from "@/components/BugHunterBadge";
import { PremiumBadge } from "@/components/PremiumBadge";
import { useProfile } from "@/lib/profile-store";
import { loadUserProfileByUsername, type UserProfile } from "@/lib/chat-remote";
import { badgeMeta } from "@/lib/badges";

const avatarInit = { opacity: 0, scale: 0.85 };
const avatarShow = { opacity: 1, scale: 1 };
const avatarTrans = { type: "spring", stiffness: 260, damping: 22 } as const;
const cardInit = { opacity: 0, y: 12 };
const cardShow = { opacity: 1, y: 0 };
const cardTrans = { delay: 0.1 } as const;

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { profile, initials } = useProfile();

  const isMe =
    username === "me" || (!!profile.username && username === profile.username);
  const targetUsername = username === "me" ? profile.username : username;

  const [remote, setRemote] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = targetUsername;
    if (!u) return;
    let alive = true;
    setLoading(true);
    void loadUserProfileByUsername(u).then((p) => {
      if (!alive) return;
      setRemote(p);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [targetUsername]);

  const name = isMe ? profile.name : remote?.name || `@${username}`;
  const handle = isMe ? profile.username : remote?.username || username;
  const bio = isMe ? profile.bio : remote?.bio || "";
  const avatar = isMe ? profile.avatar : remote?.avatar || "";
  const color = isMe ? profile.color : remote?.color || "#6c5ce7";
  const avatarInitials = isMe
    ? initials
    : remote?.initials || username.charAt(0).toUpperCase();

  // Бейджи всегда берём из публичного профиля (их выдаёт админ).
  const official = !!remote?.official;
  const meta = badgeMeta(remote?.badge);

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background px-6 pt-16 text-center">
      <motion.div initial={avatarInit} animate={avatarShow} transition={avatarTrans}>
        <Avatar
          initials={avatarInitials}
          color={color}
          size={120}
          src={avatar || undefined}
          className="text-5xl shadow-lg"
        />
      </motion.div>

      <h1 className="mt-5 flex items-center justify-center gap-1.5 text-2xl font-bold text-foreground">
        <span>{name}</span>
        {official && <VerifiedBadge size={22} />}
        {meta && <BugHunterBadge size={22} title={meta.description} />}
        {remote?.premium && (
          <PremiumBadge name={name} size={24} status={remote?.premiumStatus} />
        )}
      </h1>

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

      {meta && (
        <motion.div
          initial={cardInit}
          animate={cardShow}
          transition={cardTrans}
          className="mt-5 w-full max-w-sm rounded-2xl bg-surface p-4 text-left ring-1 ring-separator"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Bug size={20} weight="fill" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[15px] font-semibold text-foreground">
                <span>{meta.label}</span>
                <BugHunterBadge size={16} />
              </p>
              <p className="text-[12px] text-muted">{meta.short}</p>
            </div>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-foreground/80">
            {meta.description}
          </p>
        </motion.div>
      )}

      {!isMe && loading && !remote && (
        <p className="mt-4 text-[13px] text-muted">Загрузка профиля…</p>
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
