"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  CaretLeft,
  DotsThreeVertical,
  Phone,
  Smiley,
  PaperPlaneRight,
  X,
  ArrowBendUpLeft,
  PushPin,
  Trash,
  ArrowBendUpRight,
  Check,
  MagnifyingGlass,
  ClockCounterClockwise,
  Info,
  Paperclip,
  Microphone,
  VideoCamera,
  Stop,
  TrashSimple,
  Prohibit,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { MessageBubble } from "@/components/MessageBubble";
import { ChannelPost } from "@/components/ChannelPost";
import { StickerPicker } from "@/components/StickerPicker";
import {
  MessageActions,
  ActionIcons,
  type MessageAction,
} from "@/components/MessageActions";
import { ForwardSheet } from "@/components/ForwardSheet";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { AttachSheet } from "@/components/AttachSheet";
import { PopoverMenu } from "@/components/PopoverMenu";
import { ActivityText, TypingBubble } from "@/components/TypingIndicator";
import { useChats, canAdminDo, type Message } from "@/lib/chat-store";
import { useGroupCall, useCallWatch } from "@/lib/group-call";
import { useSettings } from "@/lib/settings-store";
import { useStickers } from "@/lib/stickers-store";
import { useProfile } from "@/lib/profile-store";
import { usePresence } from "@/lib/presence-store";
import { setActiveChat } from "@/lib/notify";
import { useRecorder } from "@/lib/use-recorder";
import { useToast } from "@/components/Toast";
import { formatLastSeen } from "@/lib/utils";

const CHANNEL_REACTIONS = ["👍", "❤️", "😂", "🔥", "😢", "😍", "👌"];

function subsLabel(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} подписчик`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20))
    return `${n} подписчика`;
  return `${n} подписчиков`;
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    getConversation,
    sendText,
    sendSticker,
    sendMedia,
    setReaction,
    deleteMessage,
    deleteMessages,
    editMessage,
    togglePin,
    markUnread,
    markChatRead,
    toggleBlock,
    forwardMessage,
    updateChannel,
    joinChat,
    clearHistory,
  } = useChats();
  const { useSticker, useEmoji } = useStickers();
  const { show } = useToast();
  const { profile } = useProfile();
  const { isOnline } = usePresence();
  const s = useSettings();
  const callWatch = useCallWatch(chatId);
  const groupCall = useGroupCall();

  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [activeMsg, setActiveMsg] = useState<string | null>(null);
  const [muteSheet, setMuteSheet] = useState(false);
  const [headerMenu, setHeaderMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Открыть поиск, если перешли с «scan»-ссылкой ?search=1.
  useEffect(() => {
    if (searchParams.get("search") === "1") setSearchOpen(true);
  }, [searchParams]);
  const [confirm, setConfirm] = useState<import("@/components/ConfirmSheet").ConfirmConfig | null>(null);
  // Режимы композитора
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  // Пересылка
  const [forwardId, setForwardId] = useState<string | null>(null);
  // Выбор нескольких
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const conv = getConversation(chatId);

  // Запись голоса/видео-кружка. По завершении — отправляем как вложение.
  const recorder = useRecorder((file) => {
    sendMedia(chatId, file);
  });

  // Привязываем видеопоток к превью при записи видео.
  useEffect(() => {
    if (videoPreviewRef.current && recorder.stream) {
      videoPreviewRef.current.srcObject = recorder.stream;
    }
  }, [recorder.stream]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conv?.messages.length, conv?.activity, pickerOpen, replyTo]);

  // Отмечаем чат прочитанным при открытии и при поступлении новых сообщений.
  useEffect(() => {
    if (conv) markChatRead(chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, conv?.messages.length]);

  // Сообщаем системе уведомлений, какой чат сейчас открыт (по нему не уведомляем).
  useEffect(() => {
    setActiveChat(chatId);
    return () => setActiveChat(null);
  }, [chatId]);

  if (!conv) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 bg-background">
        <p className="text-lg font-semibold text-foreground">Чат не найден</p>
        <button
          type="button"
          onClick={() => router.push("/chats")}
          className="text-accent"
        >
          К списку чатов
        </button>
      </div>
    );
  }

  const isChannel = conv.kind === "channel";
  const isGroup = conv.kind === "group";
  const isBot = conv.kind === "bot";
  const isPrivate = conv.kind === "private";
  const iBlockedPeer = !!conv.blocked; // я заблокировал собеседника
  const peerBlockedMe = !!conv.peerBlockedMe; // собеседник заблокировал меня
  // Скрываем аватар/статус собеседника, только если ОН заблокировал меня.
  const peerOnline = !peerBlockedMe && (conv.online || isOnline(conv.peerId));
  // Канал/группа, в которые вы ещё не вступили (открыты по ссылке)
  const notJoined =
    (isChannel || isGroup) && conv.isOwner !== true && conv.joined === false;
  // Канал, на который вы подписаны (не владелец) — показываем панель уведомлений
  const isSubscribedChannel = isChannel && !conv.isOwner && conv.joined === true;
  // Права админа канала для текущего пользователя (ид «me»).
  const canPostChannel = isChannel && canAdminDo(conv, "me", "post");
  const canPinChannel = !isChannel || canAdminDo(conv, "me", "pin");
  const canEditPosts = canAdminDo(conv, "me", "editPosts");
  const canDeletePosts = canAdminDo(conv, "me", "deletePosts");
  // Поиск по сообщениям внутри чата.
  const searchTrim = searchOpen ? searchQuery.trim().toLowerCase() : "";
  const visibleMessages = searchTrim
    ? conv.messages.filter(
        (m) =>
          m.kind !== "system" &&
          (m.text ?? "").toLowerCase().includes(searchTrim)
      )
    : conv.messages;
  const realMessages = conv.messages.filter((m) => m.kind !== "system");
  const pinned = conv.messages.find((m) => m.pinned);

  const focusInput = () =>
    requestAnimationFrame(() => textareaRef.current?.focus());

  const handleSend = () => {
    if (!draft.trim()) return;
    if (editing) {
      editMessage(conv.id, editing.id, draft);
      setEditing(null);
      show("Сообщение изменено");
    } else {
      sendText(conv.id, draft, { replyTo: replyTo ?? undefined });
      setReplyTo(null);
    }
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setReplyTo(null);
      setEditing(null);
      setDraft("");
      return;
    }
    if (e.key === "Enter") {
      if (s.enterToSend && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      } else if (!s.enterToSend && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handlePickSticker = (src: string, emoji: string, id: string) => {
    sendSticker(conv.id, src, emoji);
    useSticker(id);
  };

  const openInfo = () => {
    if (isGroup) router.push(`/chats/${conv.id}/group`);
    else router.push(`/chats/${conv.id}/info`);
  };

  const memberCount = 1 + (conv.memberIds?.length ?? 0);
  const groupSubtitle =
    memberCount === 1
      ? "Тут только вы"
      : `${memberCount} участник${
          memberCount % 10 === 1 && memberCount % 100 !== 11
            ? ""
            : memberCount % 10 >= 2 &&
                memberCount % 10 <= 4 &&
                (memberCount % 100 < 10 || memberCount % 100 >= 20)
              ? "а"
              : "ов"
        }`;

  const startReply = (m: Message) => {
    setEditing(null);
    setReplyTo(m);
    setPickerOpen(false);
    focusInput();
  };

  const startEdit = (m: Message) => {
    setReplyTo(null);
    setEditing(m);
    setDraft(m.text ?? "");
    setPickerOpen(false);
    focusInput();
  };

  const enterSelect = (id: string) => {
    setSelectMode(true);
    setSelected(new Set([id]));
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const buildActions = (messageId: string): MessageAction[] => {
    const msg = conv.messages.find((m) => m.id === messageId);
    if (!msg) return [];
    const mine = msg.author === "me";
    const items: MessageAction[] = [];

    if ((isChannel && canEditPosts) || mine) {
      if (msg.kind === "text") {
        items.push({
          key: "edit",
          label: "Редактировать",
          icon: ActionIcons.edit,
          onClick: () => startEdit(msg),
        });
      }
    }
    items.push(
      {
        key: "reply",
        label: "Ответить",
        icon: ActionIcons.reply,
        onClick: () => startReply(msg),
      },
      {
        key: "forward",
        label: "Переслать",
        icon: ActionIcons.forward,
        onClick: () => setForwardId(messageId),
      },
      {
        key: "copy",
        label: "Скопировать текст",
        icon: ActionIcons.copy,
        onClick: async () => {
          if (msg.text) {
            try {
              await navigator.clipboard?.writeText(msg.text);
              show("Текст скопирован");
            } catch {
              show("Не удалось скопировать");
            }
          } else {
            show("Нет текста для копирования");
          }
        },
      }
    );
    if (isChannel) {
      items.push({
        key: "copyLink",
        label: "Скопировать ссылку на пост",
        icon: ActionIcons.copyLink,
        onClick: async () => {
          try {
            await navigator.clipboard?.writeText(
              `${window.location.origin}/c/${conv.id}/${messageId}`
            );
            show("Ссылка на пост скопирована");
          } catch {
            show("Не удалось скопировать");
          }
        },
      });
    }
    items.push({
      key: "unread",
      label: "Отметить непрочитанным",
      icon: ActionIcons.unread,
      onClick: () => {
        markUnread(conv.id, messageId);
        show("Отмечено непрочитанным");
      },
    });
    if (canPinChannel) {
      items.push({
        key: "pin",
        label: msg.pinned ? "Открепить" : "Закрепить",
        icon: ActionIcons.pin,
        onClick: () => {
          togglePin(conv.id, messageId);
          show(msg.pinned ? "Откреплено" : "Закреплено");
        },
      });
    }
    items.push({
      key: "select",
      label: "Выбрать",
      icon: ActionIcons.select,
      onClick: () => enterSelect(messageId),
    });
    if (mine || (isChannel && canDeletePosts)) {
      items.push({
        key: "delete",
        label: "Удалить",
        icon: ActionIcons.delete,
        danger: true,
        onClick: () => {
          deleteMessage(conv.id, messageId);
          show("Сообщение удалено");
        },
      });
    }
    return items;
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      {/* Шапка чата / шапка режима выбора */}
      {selectMode ? (
        <header className="z-20 flex items-center gap-3 border-b border-separator bg-surface/90 px-3 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={exitSelect}
            aria-label="Отмена"
            className="text-accent transition active:opacity-60"
          >
            <X size={26} weight="bold" />
          </button>
          <span className="flex-1 text-[16px] font-semibold text-foreground">
            Выбрано: {selected.size}
          </span>
          <button
            type="button"
            aria-label="Переслать выбранные"
            disabled={selected.size === 0}
            onClick={() => {
              setForwardId("__multi__");
            }}
            className="text-foreground transition active:opacity-60 disabled:opacity-30"
          >
            <ArrowBendUpRight size={24} weight="regular" />
          </button>
          <button
            type="button"
            aria-label="Удалить выбранные"
            disabled={selected.size === 0}
            onClick={() => {
              deleteMessages(conv.id, Array.from(selected));
              show(`Удалено: ${selected.size}`);
              exitSelect();
            }}
            className="text-accent transition active:opacity-60 disabled:opacity-30"
          >
            <Trash size={24} weight="regular" />
          </button>
        </header>
      ) : (
        <header className="z-20 flex items-center gap-2 border-b border-separator bg-surface/90 px-2 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => router.push("/chats")}
            aria-label="Назад"
            className="flex shrink-0 items-center text-accent transition active:opacity-60"
          >
            <CaretLeft size={26} weight="bold" />
          </button>

          <button
            type="button"
            onClick={openInfo}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <div className="relative">
              <Avatar
                initials={conv.initials}
                color={conv.color}
                size={40}
                src={peerBlockedMe ? undefined : conv.avatar || undefined}
              />
              {!isChannel && (peerOnline || isBot) && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-green-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-[16px] font-semibold text-foreground">
                <span className="truncate">{conv.title}</span>
                {(conv.peerOfficial || (isBot && conv.verified)) && (
                  <VerifiedBadge size={16} />
                )}
              </p>
              <p className="truncate text-[12px]">
                {isChannel ? (
                  <span className="text-muted">
                    {subsLabel(conv.subscribers ?? 1)}
                  </span>
                ) : isGroup ? (
                  <span className="text-muted">{groupSubtitle}</span>
                ) : isBot ? (
                  conv.activity ? (
                    <ActivityText activity={conv.activity} />
                  ) : (
                    <span className="text-green-500">бот · в сети</span>
                  )
                ) : peerBlockedMe ? (
                  <span className="text-muted">бы��(а) давно</span>
                ) : conv.activity ? (
                  <ActivityText activity={conv.activity} />
                ) : peerOnline ? (
                  <span className="text-green-500">в сети</span>
                ) : (
                  <span className="text-muted">
                    {formatLastSeen(conv.lastSeen)}
                  </span>
                )}
              </p>
            </div>
          </button>

          {/* Звонок: группа — голосовой чат, личка — 1-на-1. Боту нельзя. */}
          {(isGroup || conv.kind === "private") && (
            <button
              type="button"
              aria-label={isGroup ? "Голосовой чат" : "Позвонить"}
              onClick={() =>
                router.push(
                  isGroup
                    ? `/chats/${conv.id}/call`
                    : `/chats/${conv.id}/voicecall`
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2"
            >
              <Phone size={22} weight="regular" />
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              aria-label="Меню"
              onClick={() => {
                if (isGroup || isPrivate) setHeaderMenu((o) => !o);
                else openInfo();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2"
            >
              <DotsThreeVertical size={24} weight="bold" />
            </button>
            {isPrivate && (
              <PopoverMenu
                open={headerMenu}
                onClose={() => setHeaderMenu(false)}
                items={[
                  {
                    label: "Информация",
                    icon: Info,
                    onClick: () => router.push(`/chats/${conv.id}/info`),
                  },
                  {
                    label: "Поиск",
                    icon: MagnifyingGlass,
                    onClick: () => {
                      setHeaderMenu(false);
                      setSearchOpen(true);
                    },
                  },
                  {
                    label: iBlockedPeer ? "Разблокировать" : "Заблокировать",
                    icon: Prohibit,
                    danger: !iBlockedPeer,
                    onClick: () => {
                      toggleBlock(conv.id);
                      show(
                        iBlockedPeer
                          ? "Пользователь разблокирован"
                          : "Пользователь заблокирован"
                      );
                    },
                  },
                ]}
              />
            )}
            {isGroup && (
              <PopoverMenu
                open={headerMenu}
                onClose={() => setHeaderMenu(false)}
                items={[
                  {
                    label: "Информация о чате",
                    icon: Info,
                    onClick: () => router.push(`/chats/${conv.id}/group`),
                  },
                  {
                    label: "Поиск",
                    icon: MagnifyingGlass,
                    onClick: () => {
                      setHeaderMenu(false);
                      setSearchOpen(true);
                    },
                  },
                  // Очистить историю — только владельцу/админу
                  ...(conv.isOwner || (conv.adminIds ?? []).includes("me")
                    ? [
                        {
                          label: "Очистить историю чата",
                          icon: ClockCounterClockwise,
                          danger: true,
                          onClick: () =>
                            setConfirm({
                              title: `Очистить историю чата «${conv.title}»?`,
                              message: "Восстановить сообщения не получится",
                              actions: [
                                {
                                  label: "Очистить у себя",
                                  danger: true,
                                  onClick: () => {
                                    clearHistory(conv.id);
                                    show("История очищена");
                                  },
                                },
                                {
                                  label: "Очистить у всех",
                                  danger: true,
                                  onClick: () => {
                                    clearHistory(conv.id);
                                    show("История очищена у всех");
                                  },
                                },
                              ],
                            }),
                        },
                      ]
                    : []),
                ]}
              />
            )}
          </div>
        </header>
      )}

      {/* Строка поиска по сообщениям */}
      {searchOpen && (
        <div className="flex items-center gap-2 border-b border-separator bg-surface px-3 py-2">
          <MagnifyingGlass
            size={20}
            weight="regular"
            className="shrink-0 text-muted"
          />
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по сообщениям"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-2 focus:outline-none"
          />
          {searchTrim && (
            <span className="shrink-0 text-[12px] text-muted">
              {visibleMessages.length}
            </span>
          )}
          <button
            type="button"
            aria-label="Закрыть поиск"
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
            }}
            className="shrink-0 text-muted transition active:opacity-60"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
      )}

      {/* Закреплённое сообщение */}
      {pinned && !selectMode && (
        <button
          type="button"
          onClick={() => togglePin(conv.id, pinned.id)}
          className="flex items-center gap-2 border-b border-separator bg-surface px-4 py-2 text-left"
        >
          <PushPin size={18} weight="fill" className="shrink-0 text-accent" />
          <div className="min-w-0 flex-1 border-l-2 border-accent pl-2">
            <p className="text-[12px] font-semibold text-accent">
              Закреплённое сообщение
            </p>
            <p className="truncate text-[13px] text-muted">
              {pinned.kind === "sticker"
                ? `Стикер ${pinned.stickerEmoji ?? ""}`
                : pinned.text}
            </p>
          </div>
          <span className="text-[12px] text-muted-2">нажмите, чтобы открепить</span>
        </button>
      )}

      {/* Баннер активного звонка в этой группе */}
      {(callWatch.active || groupCall.activeChatId === conv.id) && (
        <button
          type="button"
          onClick={() => router.push(`/chats/${conv.id}/call`)}
          className="flex items-center gap-3 border-b border-separator bg-green-500/15 px-4 py-2.5 text-left"
        >
          <span className="flex items-end gap-[2px]">
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="block w-[3px] rounded-full bg-green-500"
                animate={{ height: [6, 16, 6] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.12,
                  ease: "easeInOut",
                }}
              />
            ))}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-green-600">
              Идёт аудиозвонок
            </p>
            <p className="truncate text-[12px] text-muted">
              {callWatch.count} участник(ов) · нажмите, чтобы войти
            </p>
          </div>
          <span className="rounded-full bg-green-500 px-3 py-1 text-[12px] font-semibold text-white">
            {groupCall.activeChatId === conv.id && groupCall.joined
              ? "Вернуться"
              : "Войти"}
          </span>
        </button>
      )}

      {/* Лента сообщений */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-3 py-4"
        style={
          s.wallpaper
            ? {
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0.12)), url(${s.wallpaper})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "local",
              }
            : undefined
        }
      >
        {notJoined && (
          <div className="flex flex-col items-center gap-3 py-10">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
              className="flex max-w-xs flex-col items-center gap-2 px-8 text-center"
            >
              <Avatar
                initials={conv.initials}
                color={conv.color}
                size={88}
                src={conv.avatar || undefined}
                className="text-3xl shadow-md"
              />
              <p className="mt-2 text-[18px] font-bold text-foreground">
                {conv.title}
              </p>
              <p className="text-[13px] text-muted">
                {isGroup
                  ? `${conv.subscribers ?? 1} участник(ов)`
                  : `${conv.subscribers ?? 1} подписчик(ов)`}
              </p>
              {conv.description && (
                <p className="mt-1 text-[14px] leading-relaxed text-foreground/80">
                  {conv.description}
                </p>
              )}
              <p className="mt-2 text-[13px] text-muted">
                {isGroup
                  ? "Присоединитесь, чтобы участвовать в обсуждении"
                  : "Подпишитесь, чтобы читать публикации"}
              </p>
            </motion.div>
          </div>
        )}

        {isChannel && conv.isOwner && realMessages.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-10">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
              className="flex max-w-xs flex-col items-center gap-3 rounded-3xl bg-surface px-8 py-6 text-center shadow-sm"
            >
              <Avatar initials={conv.initials} color={conv.color} size={72} src={conv.avatar || undefined} />
              <p className="text-[17px] font-semibold text-foreground">
                Канал готов
              </p>
              <p className="text-[14px] leading-relaxed text-muted">
                Добавляйте посты и приглашайте подписчиков
              </p>
            </motion.div>

            <div className="rounded-full bg-surface-2 px-3 py-1 text-[12px] text-muted">
              Сегодня
            </div>
            <div className="rounded-full bg-accent/15 px-3 py-1 text-[12px] text-accent">
              Канал создан
            </div>
          </div>
        )}

        {isGroup && conv.isOwner && realMessages.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-10">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
              className="flex max-w-xs flex-col items-center gap-3 rounded-3xl bg-surface px-8 py-6 text-center shadow-sm"
            >
              <Avatar initials={conv.initials} color={conv.color} size={72} src={conv.avatar || undefined} />
              <p className="text-[17px] font-semibold text-foreground">
                Чат готов
              </p>
              <p className="text-[14px] leading-relaxed text-muted">
                Теперь можно пригласить участников и начать общение
              </p>
            </motion.div>

            <div className="rounded-full bg-surface-2 px-3 py-1 text-[12px] text-muted">
              Сегодня
            </div>
            <div className="rounded-full bg-accent/15 px-3 py-1 text-[12px] text-accent">
              Вы создали чат
            </div>
          </div>
        )}

        {isPrivate && realMessages.length === 0 && !peerBlockedMe && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-10">
            <motion.button
              type="button"
              onClick={() => {
                sendSticker(conv.id, "/stickers/hello/wave.gif", "👋");
              }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              whileTap={{ scale: 0.92 }}
              className="transition active:opacity-80"
              aria-label="Отправить приветственный стикер"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/stickers/hello/wave.gif"
                alt="Привет"
                width={140}
                height={140}
                className="h-[140px] w-[140px] object-contain drop-shadow-md"
              />
            </motion.button>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="max-w-xs rounded-3xl bg-surface/90 px-6 py-4 text-center shadow-sm ring-1 ring-separator backdrop-blur"
            >
              <p className="text-[16px] font-semibold text-foreground">
                Пока нет сообщений
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-muted">
                Напишите сообщение или отправьте этот стикер
              </p>
            </motion.div>
          </div>
        )}

        {searchTrim && visibleMessages.length === 0 && (
          <div className="py-10 text-center text-[14px] text-muted">
            Ничего не найдено
          </div>
        )}
        {visibleMessages.map((m) => {
          if (m.kind === "system") {
            return (
              <div key={m.id} className="flex justify-center py-1">
                <span className="rounded-full bg-surface-2 px-3 py-1 text-[12px] text-muted">
                  {m.text}
                </span>
              </div>
            );
          }
          const checked = selected.has(m.id);
          const row = isChannel ? (
            <ChannelPost
              conv={conv}
              message={m}
              fontSize={s.fontSize}
              onOpenActions={() => setActiveMsg(m.id)}
            />
          ) : (
            <MessageBubble
              message={m}
              fontSize={s.fontSize}
              largeEmoji={s.largeEmoji}
              reactionsEnabled={s.quickReactionEnabled}
              onQuickReact={() => setReaction(conv.id, m.id, s.quickReaction)}
              onOpenActions={() => setActiveMsg(m.id)}
              showSender={isGroup}
            />
          );

          if (selectMode) {
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleSelect(m.id)}
                className="flex w-full items-center gap-2 text-left"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    checked
                      ? "border-accent bg-accent text-white"
                      : "border-muted-2"
                  }`}
                >
                  {checked && <Check size={14} weight="bold" />}
                </span>
                <span className="pointer-events-none min-w-0 flex-1">{row}</span>
              </button>
            );
          }

          return <div key={m.id}>{row}</div>;
        })}

        {/* Индикатор активности собеседника */}
        {!isChannel && !selectMode && (
          <AnimatePresence>
            {conv.activity && <TypingBubble activity={conv.activity} />}
          </AnimatePresence>
        )}
      </div>

      {/* Меню действий над сообщением */}
      <MessageActions
        open={activeMsg !== null}
        onClose={() => setActiveMsg(null)}
        reactions={CHANNEL_REACTIONS}
        onReact={(emoji) => {
          if (activeMsg) setReaction(conv.id, activeMsg, emoji);
        }}
        actions={activeMsg ? buildActions(activeMsg) : []}
      />

      {/* Лист пересылки */}
      <ForwardSheet
        open={forwardId !== null}
        excludeId={conv.id}
        onClose={() => setForwardId(null)}
        onPick={(toId) => {
          if (forwardId === "__multi__") {
            Array.from(selected).forEach((mid) =>
              forwardMessage(conv.id, mid, toId)
            );
            exitSelect();
          } else if (forwardId) {
            forwardMessage(conv.id, forwardId, toId);
          }
          setForwardId(null);
          show("Переслано");
        }}
      />

      {/* Лист выбора вложения */}
      <AttachSheet
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        onFiles={(files) => {
          for (const f of files) {
            if (f.size > 50 * 1024 * 1024) {
              show(`«${f.name}» больше 50 МБ`);
              continue;
            }
            sendMedia(conv.id, f);
          }
        }}
      />

      {/* Панель стикеров */}
      {!selectMode &&
        (!isSubscribedChannel || canPostChannel) &&
        !notJoined &&
        !iBlockedPeer &&
        !peerBlockedMe && (
        <StickerPicker
          open={pickerOpen}
          onPick={(st) => handlePickSticker(st.src, st.emoji, st.id)}
          onEmoji={(e) => {
            setDraft((d) => d + e);
            useEmoji(e);
          }}
        />
      )}

      {/* Кнопка «Присоединиться» для открытых по ссылке канала/группы */}
      {notJoined && !selectMode && (
        <div className="border-t border-separator bg-surface px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              joinChat(conv.id, profile.name);
              show(isGroup ? "Вы присоединились" : "Вы подписались");
            }}
            className="w-full rounded-2xl bg-accent py-3.5 text-[16px] font-semibold uppercase tracking-wide text-white shadow-sm"
          >
            {isGroup ? "Присоединиться" : "Подписаться"}
          </motion.button>
        </div>
      )}

      {/* Панель уведомлений для канала-подписки */}
      {isSubscribedChannel && !canPostChannel && !notJoined && !selectMode && (
        <div className="border-t border-separator bg-surface px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
          <button
            type="button"
            onClick={() => {
              if (conv.muted) {
                updateChannel(conv.id, { muted: false, mutedUntil: undefined });
                show("Уведомления включены");
              } else {
                setMuteSheet(true);
              }
            }}
            className="w-full text-center text-[16px] font-semibold text-accent transition active:opacity-60"
          >
            {conv.muted ? "Включить уведомления" : "Отключить уведомления"}
          </button>
        </div>
      )}

      {/* Я заблокировал собеседника: предупреждение + разблокировка */}
      {iBlockedPeer && !selectMode && (
        <div className="border-t border-separator bg-surface px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 text-center">
          <p className="text-[13px] text-muted">
            Вы заблокировали этого пользователя. Сообщения не доставляются.
          </p>
          <button
            type="button"
            onClick={() => {
              toggleBlock(conv.id);
              show("Пользователь разблокирован");
            }}
            className="mt-1 w-full text-center text-[16px] font-semibold uppercase tracking-wide text-accent transition active:opacity-60"
          >
            Разб��окировать
          </button>
        </div>
      )}

      {/* Собеседник заблокировал меня: писать нельзя */}
      {peerBlockedMe && !iBlockedPeer && !selectMode && (
        <div className="border-t border-separator bg-surface px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-3 text-center">
          <p className="text-[13px] text-muted">
            Вы не можете отправлять сообщения этому пользователю.
          </p>
        </div>
      )}

      {/* Поле ввода */}
      {!selectMode &&
        (!isSubscribedChannel || canPostChannel) &&
        !notJoined &&
        !iBlockedPeer &&
        !peerBlockedMe && (
        <div className="border-t border-separator bg-surface px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5">
          {/* Баннер ответа / редактирования */}
          <AnimatePresence>
            {(replyTo || editing) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                  {editing ? (
                    <ActionIcons.edit
                      size={18}
                      weight="regular"
                      className="shrink-0 text-accent"
                    />
                  ) : (
                    <ArrowBendUpLeft
                      size={18}
                      weight="regular"
                      className="shrink-0 text-accent"
                    />
                  )}
                  <div className="min-w-0 flex-1 border-l-2 border-accent pl-2">
                    <p className="text-[12px] font-semibold text-accent">
                      {editing
                        ? "Редактирование"
                        : `Ответ ${
                            replyTo?.author === "me" ? "себе" : conv.title
                          }`}
                    </p>
                    <p className="truncate text-[13px] text-muted">
                      {(editing ?? replyTo)?.kind === "sticker"
                        ? `Стикер ${(editing ?? replyTo)?.stickerEmoji ?? ""}`
                        : (editing ?? replyTo)?.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(null);
                      setEditing(null);
                      setDraft("");
                    }}
                    aria-label="Отменить"
                    className="shrink-0 text-muted-2 transition active:opacity-60"
                  >
                    <X size={20} weight="bold" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {recorder.recording ? (
            <RecordingBar
              mode={recorder.mode}
              seconds={recorder.seconds}
              videoRef={videoPreviewRef}
              onСancel={recorder.cancel}
              onStop={recorder.stop}
            />
          ) : (
            <div className="flex items-end gap-1">
              <button
                type="button"
                aria-label="Стикеры"
                onClick={() => setPickerOpen((o) => !o)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition active:scale-90 hover:bg-surface-2"
              >
                {pickerOpen ? (
                  <X size={25} weight="bold" />
                ) : (
                  <Smiley size={27} weight="regular" />
                )}
              </button>

              <div className="flex min-w-0 flex-1 items-end">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height =
                      Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setPickerOpen(false)}
                  rows={1}
                  placeholder={
                    editing
                      ? "Измените сообщение"
                      : isChannel
                        ? "Пост"
                        : "Сообщение"
                  }
                  className="no-scrollbar max-h-[120px] min-w-0 flex-1 resize-none bg-transparent py-2.5 text-[16px] text-foreground placeholder:text-muted-2 focus:outline-none"
                />

                {!draft.trim() && !editing && (
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      aria-label="Прикрепить"
                      onClick={() => {
                        setPickerOpen(false);
                        setAttachOpen(true);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition active:scale-90"
                    >
                      <Paperclip size={23} weight="regular" />
                    </button>
                    <button
                      type="button"
                      aria-label="Видеосообщение"
                      onClick={async () => {
                        const ok = await recorder.start("video");
                        if (!ok) show("Нет доступа к камере");
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition active:scale-90"
                    >
                      <VideoCamera size={23} weight="regular" />
                    </button>
                  </div>
                )}
              </div>

              {draft.trim() || editing ? (
                <motion.button
                  type="button"
                  aria-label={editing ? "Сохранить" : "Отправить"}
                  onClick={handleSend}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileTap={{ scale: 0.85 }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm transition"
                >
                  {editing ? (
                    <Check size={22} weight="bold" />
                  ) : (
                    <PaperPlaneRight size={20} weight="fill" />
                  )}
                </motion.button>
              ) : (
                <button
                  type="button"
                  aria-label="Голосовое сообщение"
                  onClick={async () => {
                    const ok = await recorder.start("audio");
                    if (!ok) show("Нет доступа к микрофону");
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition active:scale-90 hover:bg-surface-2"
                >
                  <Microphone size={25} weight="regular" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Лист отключения уведомлений */}
      <ConfirmSheet
        config={
          muteSheet
            ? {
                title: "Отключить уведомления",
                actions: [
                  {
                    label: "На 1 час",
                    onClick: () => {
                      updateChannel(conv.id, {
                        muted: true,
                        mutedUntil: Date.now() + 3600000,
                      });
                      show("Уведомления отключены на 1 час");
                    },
                  },
                  {
                    label: "��а 4 часа",
                    onClick: () => {
                      updateChannel(conv.id, {
                        muted: true,
                        mutedUntil: Date.now() + 4 * 3600000,
                      });
                      show("Уве��омления отключены на 4 часа");
                    },
                  },
                  {
                    label: "На 24 часа",
                    onClick: () => {
                      updateChannel(conv.id, {
                        muted: true,
                        mutedUntil: Date.now() + 24 * 3600000,
                      });
                      show("Уведомления отключены на 24 часа");
                    },
                  },
                  {
                    label: "Навсегда",
                    danger: true,
                    onClick: () => {
                      updateChannel(conv.id, { muted: true, mutedUntil: 0 });
                      show("Уведомления отключены");
                    },
                  },
                ],
              }
            : null
        }
        onClose={() => setMuteSheet(false)}
      />

      {/* Подтверждение действий из меню (очистка истории и т.п.) */}
      <ConfirmSheet config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

/** Панель активной записи голоса/видео (как в Telegram). */
function RecordingBar({
  mode,
  seconds,
  videoRef,
  onСancel,
  onStop,
}: {
  mode: "audio" | "video" | null;
  seconds: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onСancel: () => void;
  onStop: () => void;
}) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-3">
      {/* Превью видео-кружка */}
      {mode === "video" && (
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-accent">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Отмена */}
      <button
        type="button"
        aria-label="Отменить"
        onClick={onСancel}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2"
      >
        <TrashSimple size={22} weight="regular" />
      </button>

      {/* Индикатор и таймер */}
      <div className="flex flex-1 items-center gap-2.5 rounded-2xl bg-surface-2 px-4 py-2.5">
        <motion.span
          className="h-2.5 w-2.5 rounded-full bg-red-500"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="text-[15px] font-medium tabular-nums text-foreground">
          {mm}:{ss}
        </span>
        <span className="text-[13px] text-muted">
          {mode === "video" ? "Запись видео…" : "Запись голоса…"}
        </span>
      </div>

      {/* Стоп + отправка */}
      <motion.button
        type="button"
        aria-label="Остановить и отправить"
        onClick={onStop}
        whileTap={{ scale: 0.85 }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm"
      >
        <Stop size={20} weight="fill" />
      </motion.button>
    </div>
  );
}
