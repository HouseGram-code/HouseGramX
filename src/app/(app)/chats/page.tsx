"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  MagnifyingGlass,
  At,
  Plus,
  QrCode,
  ChatsCircle,
  Megaphone,
  PencilSimpleLine,
  UsersThree,
  Phone,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/lib/auth-store";
import { PopoverMenu } from "@/components/PopoverMenu";
import { useChats, type Conversation } from "@/lib/chat-store";
import { useActiveCallChats } from "@/lib/group-call";
import { countUnread, searchUsers, type FoundUser } from "@/lib/chat-remote";
import { usePresence } from "@/lib/presence-store";
import { ConnectionTitle } from "@/components/ConnectionTitle";
import { cn } from "@/lib/utils";

type ChatFilter = "all" | "new";

const filters: { key: ChatFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
];

function lastPreview(conv: Conversation) {
  // Активность собеседника имеет приоритет в превью
  if (conv.activity) {
    return {
      text: conv.activity === "sticker" ? "выбирает стикер…" : "печатает…",
      time: conv.messages[conv.messages.length - 1]?.time ?? "",
      activity: true,
    };
  }
  const last = conv.messages[conv.messages.length - 1];
  if (!last) return { text: "Нет сообщений", time: "", activity: false };
  const prefix = last.author === "me" ? "Вы: " : "";
  if (last.kind === "system")
    return { text: last.text ?? "", time: last.time, activity: false };
  if (last.kind === "sticker") {
    return {
      text: `${prefix}Стикер ${last.stickerEmoji ?? ""}`,
      time: last.time,
      activity: false,
    };
  }
  if (last.kind === "media") {
    const label =
      last.mediaKind === "image"
        ? "Фото"
        : last.mediaKind === "video"
          ? "Видео"
          : last.mediaKind === "audio"
            ? "Аудио"
            : "Файл";
    return { text: `${prefix}${label}`, time: last.time, activity: false };
  }
  return { text: `${prefix}${last.text ?? ""}`, time: last.time, activity: false };
}

export default function ChatsPage() {
  const router = useRouter();
  const { conversations, activeCall, startDirectChat } = useChats();
  const { isOnline } = usePresence();
  const { user } = useAuth();
  // Чаты, в которых прямо сейчас идёт групповой звонок (у любого
  // участника), чтобы показать индикатор «Идёт звонок» в списке.
  const callChatIds = useMemo(
    () => conversations.map((c) => c.id),
    [conversations]
  );
  const activeCallChats = useActiveCallChats(callChatIds);
  const [filter, setFilter] = useState<ChatFilter>("all");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [people, setPeople] = useState<FoundUser[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const peopleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Глобальный поиск людей по имени/@username (как в Telegram).
  useEffect(() => {
    const q = query.trim();
    if (peopleTimer.current) clearTimeout(peopleTimer.current);
    if (!q || !user) {
      setPeople([]);
      setPeopleLoading(false);
      return;
    }
    setPeopleLoading(true);
    peopleTimer.current = setTimeout(async () => {
      const found = await searchUsers(q, user.id);
      setPeople(found);
      setPeopleLoading(false);
    }, 350);
    return () => {
      if (peopleTimer.current) clearTimeout(peopleTimer.current);
    };
  }, [query, user]);

  const openPerson = async (u: FoundUser) => {
    setOpeningId(u.id);
    try {
      const id = await startDirectChat(u);
      router.push(`/chats/${id}`);
    } catch {
      setOpeningId(null);
    }
  };

  const visible = useMemo(() => {
    let list = [...conversations];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }
    return list;
  }, [conversations, query]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface">
      {/* Шапка */}
      <header className="z-10 bg-surface px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
        <div className="flex items-center justify-between">
          <ConnectionTitle />
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Поиск"
              onClick={() => searchRef.current?.focus()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted transition active:scale-90"
            >
              <MagnifyingGlass size={20} weight="bold" />
            </button>
            <div className="relative">
              <button
                type="button"
                aria-label="Создать"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-sm transition active:scale-90"
              >
                <Plus size={22} weight="bold" />
              </button>
              <PopoverMenu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                items={[
                  {
                    label: "Новое сообщение",
                    icon: PencilSimpleLine,
                    onClick: () => router.push("/chats/new-message"),
                  },
                  {
                    label: "Создать группу",
                    icon: UsersThree,
                    onClick: () => router.push("/chats/new-group"),
                  },
                  {
                    label: "Создать канал",
                    icon: Megaphone,
                    onClick: () => router.push("/chats/new-channel"),
                  },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Поиск */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5">
          <MagnifyingGlass size={18} weight="bold" className="text-muted-2" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск"
            className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-2 focus:outline-none"
          />
          <QrCode size={18} weight="bold" className="text-muted-2" />
        </div>

        {/* Фильтры */}
        <div className="mt-3 flex items-center gap-6">
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className="relative flex items-center gap-1.5 pb-2"
              >
                <span
                  className={cn(
                    "text-[15px] font-medium transition-colors",
                    active ? "text-accent" : "text-muted"
                  )}
                >
                  {f.label}
                </span>
                {active && (
                  <motion.span
                    layoutId="chat-filter"
                    className="absolute -bottom-px left-0 right-0 h-[2.5px] rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Список чатов */}
      <div className="no-scrollbar flex-1 overflow-y-auto border-t border-separator">
        {visible.map((conv, i) => {
            const preview = lastPreview(conv);
            const unread = countUnread(conv);
            return (
              <motion.button
                key={conv.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
                whileTap={{ backgroundColor: "rgba(120,120,128,0.12)" }}
                onClick={() => router.push(`/chats/${conv.id}`)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/70"
              >
                <div className="relative">
                  <Avatar
                    initials={conv.initials}
                    color={conv.color}
                    size={54}
                    src={conv.peerBlockedMe ? undefined : conv.avatar || undefined}
                  />
                  {!conv.peerBlockedMe &&
                    (conv.online || conv.kind === "bot" || isOnline(conv.peerId)) && (
                      <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-green-500" />
                    )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col border-b border-separator pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold text-foreground">
                      {conv.title}
                    </span>
                    {conv.kind === "channel" && (
                      <Megaphone
                        size={14}
                        weight="fill"
                        className="shrink-0 text-muted-2"
                      />
                    )}
                    {conv.kind === "group" && (
                      <span className="flex shrink-0 items-center gap-0.5 text-muted-2">
                        <UsersThree size={14} weight="fill" />
                        <span className="text-[11px] font-medium leading-none">
                          {conv.subscribers ?? 1 + (conv.memberIds?.length ?? 0)}
                        </span>
                      </span>
                    )}
                    {(activeCall?.chatId === conv.id ||
                      (activeCallChats.get(conv.id) ?? 0) > 0) && (
                      <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-green-500/15 px-1.5 py-[1px] text-[11px] font-semibold leading-none text-green-600">
                        <Phone size={11} weight="fill" />
                        {(activeCallChats.get(conv.id) ?? 0) > 0
                          ? activeCallChats.get(conv.id)
                          : ""}
                      </span>
                    )}
                    {conv.verified && (
                      <span className="shrink-0 text-accent">✓</span>
                    )}
                    <span className="ml-auto shrink-0 text-xs text-muted">
                      {preview.time}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p
                      className={cn(
                        "min-w-0 flex-1 truncate text-[13.5px] leading-snug",
                        preview.activity ? "text-accent" : "text-muted"
                      )}
                    >
                      {preview.text}
                    </p>
                    {unread > 0 && (
                      <span
                        className={cn(
                          "flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white",
                          conv.muted ? "bg-muted-2" : "bg-accent"
                        )}
                      >
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}

        {query.trim() && (
          <PeopleSection
            people={people}
            loading={peopleLoading}
            openingId={openingId}
            onOpen={openPerson}
          />
        )}

        {visible.length === 0 && !query.trim() && (
          <EmptyChats hasQuery={false} />
        )}
        {visible.length === 0 &&
          query.trim() &&
          !peopleLoading &&
          people.length === 0 && <EmptyChats hasQuery={true} />}
      </div>
    </div>
  );
}

function EmptyChats({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-10 py-24 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-2"
      >
        <ChatsCircle size={44} weight="duotone" className="text-accent" />
      </motion.div>
      <div className="space-y-1.5">
        <p className="text-lg font-semibold text-foreground">
          {hasQuery ? "Ничего не найдено" : "Пока нет чатов"}
        </p>
        <p className="text-sm leading-relaxed text-muted">
          {hasQuery ? "Попробуйте изменить запрос" : "Начните новую переписку"}
        </p>
      </div>
    </div>
  );
}

/** Секция «Глобальный поиск»: найденные люди, тап — начать чат. */
function PeopleSection({
  people,
  loading,
  openingId,
  onOpen,
}: {
  people: FoundUser[];
  loading: boolean;
  openingId: string | null;
  onOpen: (u: FoundUser) => void;
}) {
  if (!loading && people.length === 0) return null;
  return (
    <div className="pb-4">
      <p className="px-4 pb-1 pt-3 text-[13px] font-semibold uppercase tracking-wide text-muted-2">
        Глобальный поиск
      </p>
      {loading && people.length === 0 ? (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        people.map((u) => (
          <button
            key={u.id}
            type="button"
            disabled={openingId !== null}
            onClick={() => onOpen(u)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/70 active:bg-surface-2 disabled:opacity-50"
          >
            <Avatar
              initials={u.initials}
              color={u.color}
              size={48}
              src={u.avatar || undefined}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[15px] font-semibold text-foreground">
                <span className="truncate">{u.name}</span>
                {u.official && <VerifiedBadge size={16} />}
              </span>
              {u.username && (
                <span className="flex items-center gap-0.5 text-[13px] text-muted">
                  <At size={12} weight="bold" />
                  {u.username}
                </span>
              )}
            </span>
            {openingId === u.id && (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            )}
          </button>
        ))
      )}
    </div>
  );
}
