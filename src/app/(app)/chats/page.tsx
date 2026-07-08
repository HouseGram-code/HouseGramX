"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
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
  Archive,
  BellSlash,
  Bell,
  Trash,
  CaretRight,
  ChatText,
  PushPin,
  PushPinSlash,
  X,
  Checks,
  Check,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/lib/auth-store";
import { PopoverMenu } from "@/components/PopoverMenu";
import { ConfirmSheet, type ConfirmConfig } from "@/components/ConfirmSheet";
import { useChats, type Conversation, type Message } from "@/lib/chat-store";
import { useActiveCallChats } from "@/lib/group-call";
import { countUnread, searchUsers, type FoundUser } from "@/lib/chat-remote";
import { stripPremiumEmoji } from "@/lib/premium-emoji";
import { usePresence } from "@/lib/presence-store";
import { ConnectionTitle } from "@/components/ConnectionTitle";
import { cn } from "@/lib/utils";
import { StickerPromoBanner } from "@/components/StickerPromoBanner";

type ChatFilter = "all" | "new" | "channels";

const filters: { key: ChatFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "channels", label: "Каналы" },
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
  return { text: `${prefix}${stripPremiumEmoji(last.text)}`, time: last.time, activity: false };
}

export default function ChatsPage() {
  const router = useRouter();
  const {
    conversations,
    activeCall,
    startDirectChat,
    setArchived,
    setMuted,
    setPinned,
    markChatRead,
    deleteChat,
  } = useChats();
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
  const [showArchived, setShowArchived] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);
  // Режим множественного выбора чатов (как в Telegram/MAX).
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Контекстное меню чата (по правому клику на десктопе).
  const [ctxMenu, setCtxMenu] = useState<{
    conv: Conversation;
    x: number;
    y: number;
  } | null>(null);
  const longPressFired = useRef(false);
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const archivedCount = useMemo(
    () => conversations.filter((c) => c.archived).length,
    [conversations]
  );

  // Кол-во активных (не архивных) чатов с непрочитанными — для бейджа
  // на вкладке «Новые».
  const unreadChatsCount = useMemo(
    () => conversations.filter((c) => !c.archived && countUnread(c) > 0).length,
    [conversations]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Во время поиска ищем по всем чатам (включая архив); иначе —
    // только текущая вкладка (обычные или архивные).
    let list = q
      ? [...conversations]
      : conversations.filter((c) => (showArchived ? c.archived : !c.archived));
    if (q) {
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    } else {
      // Вкладки-фильтры (работают только вне поиска и архива).
      if (filter === "new") {
        list = list.filter((c) => countUnread(c) > 0);
      } else if (filter === "channels") {
        list = list.filter((c) => c.kind === "channel");
      }
    }
    // Закреплённые чаты — всегда вверху (стабильная сортировка по pinnedAt).
    if (!q) {
      list = [...list].sort((a, b) => {
        const ap = a.pinned ? 1 : 0;
        const bp = b.pinned ? 1 : 0;
        if (ap !== bp) return bp - ap;
        if (ap && bp) return (a.pinnedAt ?? 0) - (b.pinnedAt ?? 0);
        return 0;
      });
    }
    return list;
  }, [conversations, query, showArchived, filter]);

  // Глобальный поиск по тексту сообщений во всех чатах.
  const messageMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as { conv: Conversation; msg: Message }[];
    const out: { conv: Conversation; msg: Message }[] = [];
    for (const c of conversations) {
      for (let i = c.messages.length - 1; i >= 0; i--) {
        const m = c.messages[i];
        if (m.kind !== "text" || !m.text) continue;
        if (m.text.toLowerCase().includes(q)) {
          out.push({ conv: c, msg: m });
          if (out.length >= 50) return out;
        }
      }
    }
    return out;
  }, [conversations, query]);

  // ── Множественный выбор ──
  const selectedConvs = useMemo(
    () => visible.filter((c) => selected.has(c.id)),
    [visible, selected]
  );
  const enterSelect = (id: string) => {
    setSelectMode(true);
    setSelected(new Set([id]));
    setCtxMenu(null);
  };
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectMode(false);
      return next;
    });
  };
  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };
  const allVisibleSelected =
    visible.length > 0 && visible.every((c) => selected.has(c.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      exitSelect();
    } else {
      setSelected(new Set(visible.map((c) => c.id)));
    }
  };

  // Производные состояния для нижней панели действий.
  const allMuted =
    selectedConvs.length > 0 && selectedConvs.every((c) => c.muted);
  const allPinned =
    selectedConvs.length > 0 && selectedConvs.every((c) => c.pinned);
  const allArchived =
    selectedConvs.length > 0 && selectedConvs.every((c) => c.archived);

  const doRead = () => {
    selectedConvs.forEach((c) => markChatRead(c.id));
    exitSelect();
  };
  const doPin = () => {
    const target = !allPinned;
    selectedConvs.forEach((c) => setPinned(c.id, target));
    exitSelect();
  };
  const doMute = () => {
    const target = !allMuted;
    selectedConvs.forEach((c) => setMuted(c.id, target));
    exitSelect();
  };
  const doArchive = () => {
    const target = !allArchived;
    selectedConvs.forEach((c) => setArchived(c.id, target));
    exitSelect();
  };
  const doDelete = () => {
    const count = selectedConvs.length;
    setConfirm({
      title: count === 1 ? "Удалить чат?" : `Удалить чаты (${count})?`,
      message: "Это действие нельзя отменить.",
      confirmLabel: "Удалить",
      danger: true,
      onConfirm: () => {
        selectedConvs.forEach((c) => deleteChat(c.id));
        exitSelect();
      },
    });
  };

  // ── Контекстное меню (правый клик на десктопе) ──
  const openCtxMenu = (conv: Conversation, x: number, y: number) => {
    const mx = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 360) - 220);
    const my = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 640) - 220);
    setCtxMenu({ conv, x: Math.max(8, mx), y: Math.max(8, my) });
  };

  // ── Долгое нажатие → режим выбора ──
  const startLongPress = (conv: Conversation) => {
    longPressFired.current = false;
    if (lpTimer.current) clearTimeout(lpTimer.current);
    lpTimer.current = setTimeout(() => {
      longPressFired.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate?.(15);
        } catch {}
      }
      if (selectMode) toggleSelect(conv.id);
      else enterSelect(conv.id);
    }, 400);
  };
  const cancelLongPress = () => {
    if (lpTimer.current) {
      clearTimeout(lpTimer.current);
      lpTimer.current = null;
    }
  };

  const onRowClick = (conv: Conversation) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (selectMode) {
      toggleSelect(conv.id);
      return;
    }
    router.push(`/chats/${conv.id}`);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface">
      {/* Шапка */}
      <header className="glass-header z-10 px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
        {selectMode ? (
          // ── Шапка режима выбора ──
          <div className="flex h-9 items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Отменить выбор"
                onClick={exitSelect}
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition active:scale-90"
              >
                <X size={22} weight="bold" />
              </button>
              <span className="text-[17px] font-semibold text-foreground">
                {selected.size}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="rounded-full px-3 py-1.5 text-[14px] font-medium text-accent transition active:scale-95"
            >
              {allVisibleSelected ? "Снять всё" : "Выбрать всё"}
            </button>
          </div>
        ) : (
          <>
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
                    className="btn-tg-circle flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90"
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
            <div className="glass-field mt-3 flex items-center gap-2 rounded-2xl px-3 py-2.5 ring-1 ring-separator/60">
              <MagnifyingGlass size={18} weight="bold" className="text-muted-2" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск"
                // Защита от сканирования расширениями-автозаполнителями
                // (вызывают переполнение стека при обходе поля):
                name="chats-search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-2 focus:outline-none"
              />
              <QrCode size={18} weight="bold" className="text-muted-2" />
            </div>

            {/* Фильтры (segmented control с бейджем непрочитанных) */}
            {!query.trim() && !showArchived && (
              <div className="mt-3 flex items-center gap-1.5 rounded-2xl bg-surface-2 p-1">
                {filters.map((f) => {
                  const active = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key)}
                      className="relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5"
                    >
                      {active && (
                        <motion.span
                          layoutId="chat-filter"
                          className="absolute inset-0 rounded-xl bg-surface shadow-sm ring-1 ring-separator"
                          transition={ { type: "spring", stiffness: 500, damping: 40 } } 
                        />
                      )}
                      <span
                        className={cn(
                          "relative z-10 text-[14px] font-medium transition-colors",
                          active ? "text-accent" : "text-muted"
                        )}
                      >
                        {f.label}
                      </span>
                      {f.key === "new" && unreadChatsCount > 0 && (
                        <span className="relative z-10 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-white">
                          {unreadChatsCount > 99 ? "99+" : unreadChatsCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </header>

      {/* Список чатов */}
      <div className="no-scrollbar flex-1 overflow-y-auto border-t border-separator">
        {!query.trim() && !showArchived && !selectMode && <StickerPromoBanner />}
        {/* Вход в архив (когда есть архивные чаты и нет поиска) */}
        {!query.trim() && !showArchived && !selectMode && archivedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived(true)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/70"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
              <Archive size={24} weight="fill" />
            </span>
            <span className="flex-1 text-[15px] font-semibold text-foreground">
              Архив
            </span>
            <span className="text-[13px] text-muted">{archivedCount}</span>
            <CaretRight size={16} weight="bold" className="text-muted-2" />
          </button>
        )}
        {!query.trim() && showArchived && !selectMode && (
          <button
            type="button"
            onClick={() => setShowArchived(false)}
            className="flex w-full items-center gap-2 border-b border-separator px-4 py-3 text-left text-[15px] font-medium text-accent transition-colors hover:bg-surface-2/70"
          >
            <CaretRight size={16} weight="bold" className="rotate-180" />
            Назад к чатам
          </button>
        )}
        {visible.map((conv, i) => {
            const preview = lastPreview(conv);
            const unread = countUnread(conv);
            const isSelected = selected.has(conv.id);
            return (
              <motion.button
                key={conv.id}
                type="button"
                initial={ { opacity: 0 } } 
                animate={ { opacity: 1 } } 
                transition={ { duration: 0.15, delay: Math.min(i * 0.015, 0.2) } } 
                whileTap={ { scale: 0.99 } } 
                onClick={() => onRowClick(conv)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (selectMode) toggleSelect(conv.id);
                  else openCtxMenu(conv, e.clientX, e.clientY);
                }}
                onPointerDown={() => startLongPress(conv)}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerMove={cancelLongPress}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  isSelected ? "bg-accent/10" : "hover:bg-surface-2/70"
                )}
              >
                {selectMode && (
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isSelected
                        ? "border-accent bg-accent text-white"
                        : "border-muted-2 text-transparent"
                    )}
                  >
                    <Check size={14} weight="bold" />
                  </span>
                )}
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
                    <span
                      suppressHydrationWarning
                      className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted"
                    >
                      {conv.muted && (
                        <BellSlash size={13} weight="fill" className="text-muted-2" />
                      )}
                      {conv.pinned && (
                        <PushPin size={13} weight="fill" className="text-muted-2" />
                      )}
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
                          conv.muted ? "bg-muted-2" : "badge-accent"
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

        {query.trim() && messageMatches.length > 0 && (
          <MessagesSection
            matches={messageMatches}
            query={query.trim()}
            onOpen={(id) => router.push(`/chats/${id}`)}
          />
        )}

        {query.trim() && (
          <PeopleSection
            people={people}
            loading={peopleLoading}
            openingId={openingId}
            onOpen={openPerson}
          />
        )}

        {visible.length === 0 && !query.trim() && (
          <EmptyChats hasQuery={false} filter={filter} />
        )}
        {visible.length === 0 &&
          query.trim() &&
          !peopleLoading &&
          people.length === 0 &&
          messageMatches.length === 0 && <EmptyChats hasQuery={true} filter={filter} />}
        {selectMode && <div className="h-20" />}
      </div>

      {/* Нижняя панель действий (режим выбора) */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={ { y: 80, opacity: 0 } } 
            animate={ { y: 0, opacity: 1 } } 
            exit={ { y: 80, opacity: 0 } } 
            transition={ { type: "spring", stiffness: 500, damping: 40 } } 
            className="absolute inset-x-0 bottom-0 z-30 border-t border-separator bg-surface px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2"
          >
            <div className="flex items-center justify-around">
              <ActionBtn
                icon={Checks}
                label="Прочитать"
                disabled={selected.size === 0}
                onClick={doRead}
              />
              <ActionBtn
                icon={allPinned ? PushPinSlash : PushPin}
                label={allPinned ? "Открепить" : "Закрепить"}
                disabled={selected.size === 0}
                onClick={doPin}
              />
              <ActionBtn
                icon={allMuted ? Bell : BellSlash}
                label={allMuted ? "Звук" : "Без звука"}
                disabled={selected.size === 0}
                onClick={doMute}
              />
              <ActionBtn
                icon={Archive}
                label={allArchived ? "Из архива" : "В архив"}
                disabled={selected.size === 0}
                onClick={doArchive}
              />
              <ActionBtn
                icon={Trash}
                label="Удалить"
                danger
                disabled={selected.size === 0}
                onClick={doDelete}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Контекстное меню чата (правый клик на десктопе) */}
      {ctxMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu(null);
            }}
          />
          <div
            className="fixed z-50 min-w-[210px] overflow-hidden rounded-2xl bg-surface py-1 shadow-xl ring-1 ring-separator"
            style={ { top: ctxMenu.y, left: ctxMenu.x } }
          >
            <CtxItem
              icon={ctxMenu.conv.pinned ? PushPinSlash : PushPin}
              label={ctxMenu.conv.pinned ? "Открепить" : "Закрепить"}
              onClick={() => {
                setPinned(ctxMenu.conv.id, !ctxMenu.conv.pinned);
                setCtxMenu(null);
              }}
            />
            <CtxItem
              icon={Checks}
              label="Отметить прочитанным"
              onClick={() => {
                markChatRead(ctxMenu.conv.id);
                setCtxMenu(null);
              }}
            />
            <CtxItem
              icon={Archive}
              label={ctxMenu.conv.archived ? "Из архива" : "Архивировать"}
              onClick={() => {
                setArchived(ctxMenu.conv.id, !ctxMenu.conv.archived);
                setCtxMenu(null);
              }}
            />
            <CtxItem
              icon={ctxMenu.conv.muted ? Bell : BellSlash}
              label={ctxMenu.conv.muted ? "Включить звук" : "Без звука"}
              onClick={() => {
                setMuted(ctxMenu.conv.id, !ctxMenu.conv.muted);
                setCtxMenu(null);
              }}
            />
            <CtxItem
              icon={Check}
              label="Выбрать"
              onClick={() => {
                enterSelect(ctxMenu.conv.id);
              }}
            />
            <CtxItem
              icon={Trash}
              label="Удалить чат"
              danger
              onClick={() => {
                const id = ctxMenu.conv.id;
                setCtxMenu(null);
                deleteChat(id);
              }}
            />
          </div>
        </>
      )}

      <ConfirmSheet config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

/** Кнопка действия в нижней панели режима выбора. */
function ActionBtn({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: typeof Archive;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-w-[56px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition active:scale-90 disabled:opacity-40"
    >
      <Icon
        size={24}
        weight="regular"
        className={danger ? "text-red-500" : "text-accent"}
      />
      <span
        className={cn(
          "text-[11px] font-medium",
          danger ? "text-red-500" : "text-muted"
        )}
      >
        {label}
      </span>
    </button>
  );
}

/** Пункт контекстного меню чата. */
function CtxItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Archive;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2"
    >
      <Icon
        size={20}
        weight="regular"
        className={danger ? "text-red-500" : "text-foreground"}
      />
      <span className={danger ? "text-[15px] text-red-500" : "text-[15px] text-foreground"}>
        {label}
      </span>
    </button>
  );
}

/** Секция результатов поиска по сообщениям. */
function MessagesSection({
  matches,
  query,
  onOpen,
}: {
  matches: { conv: Conversation; msg: Message }[];
  query: string;
  onOpen: (chatId: string) => void;
}) {
  return (
    <div className="pb-4">
      <p className="px-4 pb-1 pt-3 text-[13px] font-semibold uppercase tracking-wide text-muted-2">
        Сообщения
      </p>
      {matches.map(({ conv, msg }) => (
        <button
          key={`${conv.id}:${msg.id}`}
          type="button"
          onClick={() => onOpen(conv.id)}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/70 active:bg-surface-2"
        >
          <Avatar
            initials={conv.initials}
            color={conv.color}
            size={48}
            src={conv.avatar || undefined}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-[15px] font-semibold text-foreground">
              <span className="truncate">{conv.title}</span>
            </span>
            <span className="block truncate text-[13px] text-muted">
              {highlightSnippet(msg.text ?? "", query)}
            </span>
          </span>
          <ChatText size={18} weight="regular" className="shrink-0 text-muted-2" />
        </button>
      ))}
    </div>
  );
}

/** Обрезает текст вокруг найденного фрагмента и подсвечивает его. */
function highlightSnippet(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  const start = Math.max(0, idx - 20);
  const prefix = start > 0 ? "…" : "";
  const before = text.slice(start, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <>
      {prefix}
      {before}
      <span className="font-semibold text-accent">{match}</span>
      {after}
    </>
  );
}

function EmptyChats({ hasQuery, filter }: { hasQuery: boolean; filter: ChatFilter }) {
  const emptyText =
    filter === "new"
      ? "Нет непрочитанных"
      : filter === "channels"
        ? "Нет каналов"
        : "Пока нет чатов";
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-10 py-24 text-center">
      <motion.div
        initial={ { scale: 0.8, opacity: 0 } } 
        animate={ { scale: 1, opacity: 1 } } 
        transition={ { type: "spring", stiffness: 300, damping: 22 } } 
        className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-2"
      >
        <ChatsCircle size={44} weight="duotone" className="text-accent" />
      </motion.div>
      <div className="space-y-1.5">
        <p className="text-lg font-semibold text-foreground">
          {hasQuery ? "Ничего не найдено" : emptyText}
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
