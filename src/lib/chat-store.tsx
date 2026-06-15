"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSyncUser, onSyncUserChange, readCache, writeCache } from "./sync";
import { isSupabaseConfigured, getSupabase } from "./supabase";
import { notify, setActiveChat } from "./notify";
import { setRealtimeState, setUpdating } from "./connection-store";
import { uploadMedia, detectMediaKind } from "./storage";
import {
  loadMyChats,
  loadChatById,
  createChatRemote,
  updateChatRemote,
  deleteChatRemote,
  insertMessageRemote,
  updateMessageRemote,
  deleteMessagesRemote,
  clearMessagesRemote,
  joinChatRemote,
  openDirectChat,
  addUsersToChatRemote,
  markChatReadRemote,
  setBlockedRemote,
  rowToMessage,
  loadScheduledRemote,
  insertScheduledRemote,
  deleteScheduledRemote,
  type MessageRow,
  type FoundUser,
} from "./chat-remote";

export type MessageKind = "text" | "sticker" | "system" | "media";
export type ChatKind = "bot" | "private" | "channel" | "group";
/** Тип вложения. */
export type MediaKind = "image" | "video" | "audio" | "file";
/** Текущая активность собеседника. */
export type Activity = "typing" | "sticker" | null;

/** Инициалы из имени (для аватарки отправителя в группах). */
function senderInitialsFrom(name: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Данные текущего пользователя для подписи сообщения в группе. */
function mySenderInfo(): {
  name: string;
  color: string;
  initials: string;
} | null {
  try {
    const raw = localStorage.getItem("messenger.profile.v1");
    if (!raw) return null;
    const p = JSON.parse(raw) as {
      name?: string;
      username?: string;
      color?: string;
    };
    const name = p.name || p.username || "Вы";
    return {
      name,
      color: p.color || "#888",
      initials: senderInitialsFrom(name),
    };
  } catch {
    return null;
  }
}

export interface Message {
  id: string;
  author: "me" | "them";
  kind: MessageKind;
  text?: string;
  stickerSrc?: string;
  stickerEmoji?: string;
  /** Идентификатор набора стикеров (для открытия набора по тапу). */
  stickerSetId?: string;
  /** Вложение (фото/видео/аудио/файл). */
  mediaKind?: MediaKind;
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: number;
  /** Локально: прогресс загрузки 0..100 (пока грузится). */
  uploadProgress?: number;
  reaction?: string | null;
  time: string;
  ts: number;
  read?: boolean;
  /** Сообщение отредактировано. */
  edited?: boolean;
  /** Локально: отправляется (ещё не подтверждено сервером). */
  pending?: boolean;
  /** Локально: ошибка отправки. */
  failed?: boolean;
  /** Закреплено. */
  pinned?: boolean;
  /** Ответ на сообщение: id и краткий текст исходного. */
  replyToId?: string;
  replyToText?: string;
  replyToAuthor?: string;
  /** Переслано из (название источника). */
  forwardedFrom?: string;
  /** Имя отправителя (для групп — показывается над сообщением). */
  senderName?: string;
  senderColor?: string;
  senderInitials?: string;
}

export interface Conversation {
  id: string;
  kind: ChatKind;
  title: string;
  color: string;
  initials: string;
  /** Загруженное фото (data-URL) — приоритетнее цвета/инициалов. */
  avatar?: string;
  online?: boolean;
  /** Время последнего визита (ts), если не в сети. */
  lastSeen?: number;
  /** Для личных чатов (DM): auth-id собеседника. */
  peerId?: string;
  /** Собеседник — официальный (верифицированный) аккаунт. */
  peerOfficial?: boolean;
  /** Бейдж собеседника (напр. "bug_hunter"). Пусто/undefined — нет бейджа. */
  peerBadge?: string;
  /** Текущая активность собеседника (печатает/выбирает стикер). */
  activity?: Activity;
  verified?: boolean;
  /** Каналы: описание и число подписчиков. */
  description?: string;
  subscribers?: number;
  /** id нового владельца после передачи прав (если владелец — не вы). */
  ownerId?: string;
  /** Вы владелец канала. */
  isOwner?: boolean;
  /** Вы присоединились (подписаны/состоите). Владелец — всегда true. */
  joined?: boolean;
  /** Реакции в канале включены. */
  reactionsEnabled?: boolean;
  /** Сколько реакций разрешено (1..8). */
  reactionsCount?: number;
  /** Заявки на вступление (премодерация). */
  joinRequests?: boolean;
  /** id участников-подписчиков (кроме владельца). */
  memberIds?: string[];
  /** id администраторов (кроме владельца). */
  adminIds?: string[];
  /** id ожидающих одобрения заявок. */
  pendingIds?: string[];
  /** Права каждого администратора: userId -> набор прав. */
  adminRights?: Record<string, AdminRights>;
  /** Разрешения участников группы. */
  memberPerms?: MemberPerms;
  /** Уведомления отключены. */
  muted?: boolean;
  /** До какого времени отключены (ts), либо 0 — навсегда. */
  mutedUntil?: number;
  /** Собеседник заблокирован мной (для личных чатов). */
  blocked?: boolean;
  /** Собеседник заблокировал МЕНЯ (для личных чатов). */
  peerBlockedMe?: boolean;
  /** Время последнего прочтения чата мной (ts). Для счётчика непрочитанных. */
  lastReadTs?: number;
  /** Чат скрыт в архиве (локальная настройка устройства). */
  archived?: boolean;
  /** Чат закреплён вверху списка (локальная настройка устройства). */
  pinned?: boolean;
  /** Порядок среди закреплённых (меньше — выше). */
  pinnedAt?: number;
  /** Таймер автоудаления сообщений в секундах (0/undefined — выключено). */
  ttlSeconds?: number;
  /** Особый чат «Избранное» (Saved Messages). Локальный, без облака. */
  saved?: boolean;
  messages: Message[];
}

/** Что разрешено обычным участникам группы. */
export interface MemberPerms {
  editInfo: boolean;
  addMembers: boolean;
  pinMessages: boolean;
  call: boolean;
  invite: boolean;
}

export const DEFAULT_MEMBER_PERMS: MemberPerms = {
  editInfo: true,
  addMembers: true,
  pinMessages: true,
  call: true,
  invite: true,
};

/**
 * Может ли текущий пользователь выполнить действие обычного участника.
 * Владельцу разрешено всё; остальным — согласно разрешениям участников группы.
 */
export function canMemberDo(
  conv: Pick<Conversation, "isOwner" | "memberPerms">,
  key: keyof MemberPerms
): boolean {
  if (conv.isOwner) return true;
  return (conv.memberPerms ?? DEFAULT_MEMBER_PERMS)[key];
}

/** Права администратора канала. */
export interface AdminRights {
  edit: boolean;
  post: boolean;
  editPosts: boolean;
  deletePosts: boolean;
  pin: boolean;
  members: boolean;
  admins: boolean;
}

export const DEFAULT_ADMIN_RIGHTS: AdminRights = {
  edit: true,
  post: true,
  editPosts: true,
  deletePosts: true,
  pin: true,
  members: true,
  admins: false,
};

/**
 * Может ли пользователь выполнить действие администратора канала.
 * Владельцу разрешено всё; админам — согласно их правам; остальным — нет.
 */
export function canAdminDo(
  conv: Pick<Conversation, "isOwner" | "adminIds" | "adminRights">,
  userId: string,
  key: keyof AdminRights
): boolean {
  if (conv.isOwner) return true;
  if (!(conv.adminIds ?? []).includes(userId)) return false;
  const rights = conv.adminRights?.[userId] ?? DEFAULT_ADMIN_RIGHTS;
  return rights[key];
}

interface ChatState {
  conversations: Record<string, Conversation>;
  /** Порядок отображения (новые сверху по ts последнего сообщения). */
  order: string[];
}

/** Активный групповой аудио-звонок. */
export interface ActiveCall {
  chatId: string;
  startedAt: number;
  /** Участники (id из контактов + "me"). */
  participantIds: string[];
  muted: boolean;
  speaker: boolean;
}

/** Запланированное (отложенное) сообщение. */
export interface ScheduledMessage {
  id: string;
  chatId: string;
  text: string;
  /** Когда отправить (Date.now() ms). */
  fireAt: number;
}

interface ChatContextValue {
  conversations: Conversation[];
  hydrated: boolean;
  getConversation: (id: string) => Conversation | undefined;
  sendText: (
    chatId: string,
    text: string,
    opts?: { replyTo?: Message }
  ) => void;
  sendSticker: (
    chatId: string,
    src: string,
    emoji: string,
    setId?: string
  ) => void;
  /** Отправить вложение (фото/видео/аудио/файл) с загрузкой в Storage. */
  sendMedia: (chatId: string, file: File) => void;
  setReaction: (chatId: string, messageId: string, emoji: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  deleteMessages: (chatId: string, messageIds: string[]) => void;
  editMessage: (chatId: string, messageId: string, text: string) => void;
  togglePin: (chatId: string, messageId: string) => void;
  markUnread: (chatId: string, messageId: string) => void;
  /** Отметить весь чат прочитанным (сбрасывает счётчик непрочитанных). */
  markChatRead: (chatId: string) => void;
  /** Заблокировать/разблокировать собеседника (личный чат). */
  toggleBlock: (chatId: string) => void;
  /** Включить/вы��лючить уведомления чата. durationMs — временное отключение. */
  setMuted: (chatId: string, muted: boolean, durationMs?: number) => void;
  forwardMessage: (
    fromChatId: string,
    messageId: string,
    toChatId: string
  ) => void;
  createChannel: (title: string, description?: string, avatar?: string) => string;
  createGroup: (title: string, memberIds?: string[], avatar?: string) => string;
  /** Присоединиться к каналу/группе по ссылке (демо: создаёт превью-чат). */
  joinByLink: (code: string, kind: "channel" | "group") => string;
  /** Вступить в открытый канал/группу (кнопка «Присоединиться»). */
  joinChat: (chatId: string, displayName: string) => void;
  /** Открыть/создать личный чат с ��айденным пользователем. Возвращает id. */
  startDirectChat: (user: FoundUser) => Promise<string>;
  updateChannel: (chatId: string, patch: Partial<Conversation>) => void;
  addMembers: (chatId: string, ids: string[]) => void;
  /** Добавить реальных зарегистрированных пользователей в чат. */
  addRealUsers: (chatId: string, users: FoundUser[]) => Promise<void>;
  removeMember: (chatId: string, id: string) => void;
  addAdmins: (chatId: string, ids: string[]) => void;
  removeAdmin: (chatId: string, id: string) => void;
  setAdminRight: (
    chatId: string,
    userId: string,
    key: keyof AdminRights,
    value: boolean
  ) => void;
  setMemberPerm: (
    chatId: string,
    key: keyof MemberPerms,
    value: boolean
  ) => void;
  approveJoin: (chatId: string, id: string) => void;
  declineJoin: (chatId: string, id: string) => void;
  /** Передать права владельца другому участнику чата. */
  transferOwnership: (chatId: string, newOwnerId: string) => void;
  clearHistory: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  /** Архивировать/разархивировать чат (локально для устройства). */
  setArchived: (chatId: string, archived: boolean) => void;
  /** Закрепить/открепить чат вверху списка (локально для устройства). */
  setPinned: (chatId: string, pinned: boolean) => void;
  /** Установить таймер исчезающих сообщений (секунды; 0 — выключить). */
  setChatTtl: (chatId: string, ttlSeconds: number) => void;
  /** Список запланированных сообщений (отложенная отправка). */
  scheduled: ScheduledMessage[];
  /** Запланировать отправку текста в чат на момент fireAt (ms). */
  scheduleMessage: (chatId: string, text: string, fireAt: number) => void;
  /** Отменить запланированное сообщение. */
  cancelScheduled: (id: string) => void;
  // Групповой аудио-звонок
  activeCall: ActiveCall | null;
  startGroupCall: (chatId: string) => void;
  joinGroupCall: (chatId: string, memberId: string) => void;
  leaveGroupCall: (memberId: string) => void;
  endGroupCall: () => void;
  toggleCallMute: () => void;
  toggleCallSpeaker: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

const STORAGE_KEY = "messenger.chats.v2";

function nowTime() {
  return new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Единственный стартовый чат — тестовый бот.
const SEED_BOT: Conversation = {
  id: "test_bot",
  kind: "bot",
  title: "Тест-бот",
  color: "linear-gradient(135deg,#9b59b6,#6c5ce7)",
  initials: "🤖",
  verified: true,
  online: true,
  messages: [
    {
      id: uid(),
      author: "them",
      kind: "text",
      text:
        "Привет! Я тестовый бот 🤖\n\nНапиши что-нибудь — я отвечу. Доступные команды:\n/help — помощь\n/time — текущее время\n/sticker — пришлю стикер",
      time: nowTime(),
      ts: Date.now() - 60000,
      reaction: null,
    },
  ],
};

const SAVED_ID = "saved_messages";
const SEED_SAVED: Conversation = {
  id: SAVED_ID,
  kind: "private",
  saved: true,
  title: "Избранное",
  color: "linear-gradient(135deg,#2d9cff,#6c5ce7)",
  initials: "🔖",
  joined: true,
  messages: [],
};

/** Гарантирует наличие чата «Избранное» в состоянии. */
function ensureSaved(s: ChatState): ChatState {
  if (s.conversations[SAVED_ID]) return s;
  return {
    conversations: { [SAVED_ID]: SEED_SAVED, ...s.conversations },
    order: [SAVED_ID, ...s.order.filter((x) => x !== SAVED_ID)],
  };
}

function makeSeed(): ChatState {
  return {
    conversations: { [SAVED_ID]: SEED_SAVED, test_bot: SEED_BOT },
    order: [SAVED_ID, "test_bot"],
  };
}

/** Создаёт персональный чат с тест-б��том (уникальный id на пользователя). */
function makeBotSeed(id: string): Conversation {
  return {
    ...SEED_BOT,
    id,
    messages: [
      {
        id: uid(),
        author: "them",
        kind: "text",
        text:
          "Привет! Я тестовый бот 🤖\n\nНапиши что-нибудь — я отвечу. Доступные команды:\n/help — помощь\n/time — текущее время\n/sticker — пришлю стикер",
        time: nowTime(),
        ts: Date.now(),
        reaction: null,
      },
    ],
  };
}

/** ts последнего сообщения для сортировки списка чатов. */
function lastTs(c: Conversation): number {
  return c.messages.length ? c.messages[c.messages.length - 1].ts : 0;
}

/** Предопределённые таймеры исчезающих сообщений (секунды). */
export const TTL_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Выключено" },
  { value: 30, label: "30 секунд" },
  { value: 300, label: "5 минут" },
  { value: 3600, label: "1 час" },
  { value: 86400, label: "1 день" },
  { value: 604800, label: "1 неделя" },
];

/** Человекочитаемый таймер автоудаления. */
export function formatTtl(seconds: number): string {
  const opt = TTL_OPTIONS.find((o) => o.value === seconds);
  if (opt) return opt.label.toLowerCase();
  if (seconds % 86400 === 0) return `${seconds / 86400} дн.`;
  if (seconds % 3600 === 0) return `${seconds / 3600} ч.`;
  if (seconds % 60 === 0) return `${seconds / 60} мин.`;
  return `${seconds} сек.`;
}

/** Читает настройки уведомлений из кэша (декаплинг от SettingsProvider). */
function readNotifSettings(): {
  notificationsEnabled: boolean;
  sound: boolean;
  vibration: boolean;
  messagePreview: boolean;
} {
  const def = {
    notificationsEnabled: true,
    sound: true,
    vibration: true,
    messagePreview: true,
  };
  try {
    const raw = localStorage.getItem("messenger.settings.v1");
    if (!raw) return def;
    const p = JSON.parse(raw) as Partial<typeof def>;
    return {
      notificationsEnabled: p.notificationsEnabled ?? def.notificationsEnabled,
      sound: p.sound ?? def.sound,
      vibration: p.vibration ?? def.vibration,
      messagePreview: p.messagePreview ?? def.messagePreview,
    };
  } catch {
    return def;
  }
}

/** Логика ответа тест-бота. Возвращает массив сообщений-ответов. */
function botReply(input: string): Omit<Message, "id" | "time" | "ts">[] {
  const text = input.trim().toLowerCase();

  if (text === "/help") {
    return [
      {
        author: "them",
        kind: "text",
        text:
          "Я умею:\n/time — показать время\n/sticker — отправить стикер\nА ещё повторю любое твоё сообщение 🙂",
        reaction: null,
      },
    ];
  }
  if (text === "/time") {
    return [
      {
        author: "them",
        kind: "text",
        text: `Сейчас ${new Date().toLocaleTimeString("ru-RU")} 🕐`,
        reaction: null,
      },
    ];
  }
  if (text === "/sticker") {
    return [
      {
        author: "them",
        kind: "sticker",
        stickerSrc: "/stickers/gifts/g3.png",
        stickerEmoji: "🧸",
        stickerSetId: "gifts-8march",
        reaction: null,
      },
    ];
  }
  if (/^(привет|здравствуй|hi|hello|хай)/.test(text)) {
    return [
      {
        author: "them",
        kind: "text",
        text: "Привет! 👋 Чем могу помочь? Напиши /help",
        reaction: null,
      },
    ];
  }
  return [
    {
      author: "them",
      kind: "text",
      text: `Ты написал: «${input.trim()}» 🔁`,
      reaction: null,
    },
  ];
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChatState>(makeSeed);
  const [hydrated, setHydrated] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([]);
  const scheduledRef = useRef<ScheduledMessage[]>([]);
  const sendTextRef = useRef<ChatContextValue["sendText"] | null>(null);
  const timers = useRef<number[]>([]);

  // Синхронный доступ к актуальному состоянию для realtime/remote-операций.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // ─── Загрузка чатов: кэш → облако, плюс realtime-подписка ──────────────────
  useEffect(() => {
    let active = true;
    const CACHE_KEY = STORAGE_KEY;

    // 1. Мгновенно показываем кэш (или сид).
    const cached = readCache<ChatState>(CACHE_KEY);
    if (cached?.conversations && cached.order) setState(ensureSaved(cached));
    setHydrated(true);

    // Без Supabase работаем как локальное демо (на одном устройстве).
    if (!isSupabaseConfigured) {
      setRealtimeState("connected");
      return;
    }

    const sb = getSupabase();

    // Грузит чаты текущего пользователя из БД и сливает с состоянием.
    const loadForUser = async (userId: string) => {
      setUpdating(true);
      // Гарантируем наличие персонального чата с ботом.
      const botId = `bot_${userId.slice(0, 8)}`;
      let remote = await loadMyChats(userId);
      if (!active) {
        setUpdating(false);
        return;
      }
      if (!remote.some((c) => c.kind === "bot")) {
        const bot = makeBotSeed(botId);
        createChatRemote(bot, userId);
        remote = [bot, ...remote];
      }
      // Гарантируем наличие реального чата «Избранное» (самочат в облаке).
      if (!remote.some((c) => c.saved)) {
        const savedConv: Conversation = {
          id: `saved_${userId.slice(0, 8)}`,
          kind: "private",
          saved: true,
          title: "Избранное",
          color: "linear-gradient(135deg,#2d9cff,#6c5ce7)",
          initials: "🔖",
          joined: true,
          isOwner: true,
          messages: [],
        };
        createChatRemote(savedConv, userId);
        remote = [savedConv, ...remote];
      }
      setState((prev) => {
        const conversations: Record<string, Conversation> = {};
        for (const c of remote) conversations[c.id] = c;
        // Сохраняем локально открытые превью каналов/групп (по ссылке),
        // которых ещё нет в облаке. Боты и личные чаты не дублируем.
        for (const id of Object.keys(prev.conversations)) {
          const pc = prev.conversations[id];
          if (
            !conversations[id] &&
            !pc.isOwner &&
            (pc.kind === "channel" || pc.kind === "group")
          ) {
            conversations[id] = pc;
          }
        }
        const order = Object.values(conversations)
          .sort((a, b) => lastTs(b) - lastTs(a))
          .map((c) => c.id);
        return { conversations, order };
      });
      setUpdating(false);
    };

    const uid0 = getSyncUser();
    if (uid0) void loadForUser(uid0);

    const off = onSyncUserChange((id) => {
      if (id) void loadForUser(id);
      else setState(makeSeed());
    });

    // 2. Realtime: новые/изменённые/удалённые сообщения.
    const applyIncomingMessage = (row: MessageRow, isInsert = false) => {
      const meId = getSyncUser();
      const msg = rowToMessage(row, meId);
      // Снимок чата ДО обновления — для решения об уведомлении.
      const prevConv = stateRef.current.conversations[row.chat_id];
      const alreadyExists =
        prevConv?.messages.some((m) => m.id === msg.id) ?? false;

      setState((s) => {
        const conv = s.conversations[row.chat_id];
        if (!conv) return s; // чат не в списке — игнорируем
        const exists = conv.messages.some((m) => m.id === msg.id);
        const messages = exists
          ? conv.messages.map((m) => (m.id === msg.id ? msg : m))
          : [...conv.messages, msg];
        return {
          conversations: {
            ...s.conversations,
            [row.chat_id]: { ...conv, messages },
          },
          order: bump(s.order, row.chat_id),
        };
      });

      // Уведомление: только новое чужое сообщение (не системное, не моё).
      if (
        isInsert &&
        prevConv &&
        !alreadyExists &&
        msg.author !== "me" &&
        msg.kind !== "system"
      ) {
        const st = readNotifSettings();
        if (st.notificationsEnabled) {
          const preview =
            msg.kind === "sticker"
              ? `Стикер ${msg.stickerEmoji ?? "🙂"}`
              : msg.kind === "media"
                ? msg.mediaKind === "image"
                  ? "📷 Фото"
                  : msg.mediaKind === "video"
                    ? "🎬 Видео"
                    : msg.mediaKind === "audio"
                      ? "🎵 Аудио"
                      : "📎 Файл"
                : st.messagePreview
                  ? (msg.text ?? "")
                  : "Новое сообщение";
          const senderPrefix =
            prevConv.kind === "group" && msg.senderName
              ? `${msg.senderName}: `
              : "";
          notify({
            title: prevConv.title || "Новое сообщение",
            body: `${senderPrefix}${preview}`.slice(0, 140),
            tag: row.chat_id,
            url: `/chats/${row.chat_id}`,
            sound: st.sound,
            vibration: st.vibration,
          });
        }
      }
    };

    const channel = sb
      .channel("messages-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (p) => applyIncomingMessage(p.new as MessageRow, true)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (p) => applyIncomingMessage(p.new as MessageRow)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (p) => {
          const old = p.old as Partial<MessageRow>;
          if (!old.id) return;
          setState((s) => {
            const next = { ...s.conversations };
            for (const [cid, conv] of Object.entries(next)) {
              if (conv.messages.some((m) => m.id === old.id)) {
                next[cid] = {
                  ...conv,
                  messages: conv.messages.filter((m) => m.id !== old.id),
                };
              }
            }
            return { conversations: next, order: s.order };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_members" },
        (p) => {
          const row = p.new as { chat_id: string; user_id: string };
          const meId = getSyncUser();
          // Меня добавили в новый чат (например, собеседник создал DM) —
          // перезагружаем список, если этого чата ещё нет.
          if (
            row.user_id === meId &&
            !stateRef.current.conversations[row.chat_id]
          ) {
            void loadForUser(meId);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_members" },
        (p) => {
          const row = p.new as {
            chat_id: string;
            user_id: string;
            blocked?: boolean;
          };
          const meId = getSyncUser();
          // Собеседник изменил блокировку в нашем общем чате — обновляем
          // peerBlockedMe, чтобы у меня сразу скрылся/вернулся аватар и статус.
          if (
            row.user_id !== meId &&
            stateRef.current.conversations[row.chat_id]?.kind === "private"
          ) {
            setState((s) => {
              const conv = s.conversations[row.chat_id];
              if (!conv) return s;
              return {
                ...s,
                conversations: {
                  ...s.conversations,
                  [row.chat_id]: { ...conv, peerBlockedMe: !!row.blocked },
                },
              };
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (p) => {
          // Собеседник обновил профиль (аватар/имя/цвет/галочка) —
          // обновляем все наши личные чаты с ним «вживую», без
          // перезагрузки страницы.
          const row = p.new as {
            id?: string;
            name?: string;
            avatar?: string;
            color?: string;
            official?: boolean;
            badge?: string;
          };
          const meId = getSyncUser();
          if (!row.id || row.id === meId) return;
          setState((s) => {
            let changed = false;
            const next = { ...s.conversations };
            for (const [cid, conv] of Object.entries(next)) {
              if (conv.kind === "private" && conv.peerId === row.id) {
                changed = true;
                next[cid] = {
                  ...conv,
                  title: row.name || "Без имени",
                  avatar: row.avatar || undefined,
                  color: row.color || conv.color,
                  initials: senderInitialsFrom(row.name || "?"),
                  peerOfficial: !!row.official,
                  peerBadge: row.badge || undefined,
                };
              }
            }
            return changed ? { conversations: next, order: s.order } : s;
          });
        }
      )
      .subscribe((status) => {
        // Статус realtime-канала → индикатор соединения в шапке.
        if (status === "SUBSCRIBED") setRealtimeState("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          setRealtimeState("error");
        else setRealtimeState("connecting");
      });

    return () => {
      active = false;
      off();
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Кэшируем состояние локально при изменениях (быстрый старт + оффлайн).
  useEffect(() => {
    if (!hydrated) return;
    writeCache(STORAGE_KEY, state);
  }, [state, hydrated]);

  // Исчезающие сообщения: периодически удаляем устаревшие сообщения
  // в чатах с включённым таймером. Системные сообщения сохраняются.
  useEffect(() => {
    const prune = () => {
      setState((s) => {
        let changed = false;
        const conversations = { ...s.conversations };
        const now = Date.now();
        for (const id of Object.keys(conversations)) {
          const c = conversations[id];
          if (!c.ttlSeconds) continue;
          const cutoff = now - c.ttlSeconds * 1000;
          const kept = c.messages.filter(
            (m) => m.kind === "system" || m.ts >= cutoff
          );
          if (kept.length !== c.messages.length) {
            conversations[id] = { ...c, messages: kept };
            changed = true;
          }
        }
        return changed ? { ...s, conversations } : s;
      });
    };
    const iv = window.setInterval(prune, 15000);
    prune();
    return () => window.clearInterval(iv);
  }, []);

  // Запланированные сообщения: гидрация, сохранение и отправка по времени.
  useEffect(() => {
    scheduledRef.current = scheduled;
  });
  // Очередь отложенных сообщений хранится в Supabase (scheduled_messages)
  // и синхронизируется между устройствами через realtime. Локально не кэшируем.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    const load = async (uid: string | null) => {
      if (!uid) {
        if (active) setScheduled([]);
        return;
      }
      const list = await loadScheduledRemote(uid);
      if (active) setScheduled(list);
    };
    void load(getSyncUser());
    const off = onSyncUserChange((id) => void load(id));
    const sb = getSupabase();
    const ch = sb
      .channel("scheduled-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduled_messages" },
        () => void load(getSyncUser())
      )
      .subscribe();
    return () => {
      active = false;
      off();
      sb.removeChannel(ch);
    };
  }, []);
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const due = scheduledRef.current.filter((s) => s.fireAt <= now);
      if (due.length === 0) return;
      const send = sendTextRef.current;
      for (const s of due) {
        if (send) send(s.chatId, s.text);
        deleteScheduledRemote(s.id);
      }
      setScheduled((list) => list.filter((s) => s.fireAt > Date.now()));
    };
    const iv = window.setInterval(tick, 5000);
    tick();
    return () => window.clearInterval(iv);
  }, []);

  // Очистка отложенных таймеров (ответы бота) при размонтировании.
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  /** id текущего auth-пользователя (или null в демо-режиме). */
  const me = () => getSyncUser();

  const bump = (order: string[], id: string) => [
    id,
    ...order.filter((x) => x !== id),
  ];

  const update = (
    chatId: string,
    updater: (c: Conversation) => Conversation
  ) => {
    setState((s) => {
      const conv = s.conversations[chatId];
      if (!conv) return s;
      return {
        conversations: { ...s.conversations, [chatId]: updater(conv) },
        order: bump(s.order, chatId),
      };
    });
  };

  /** Как update, но дополнительно зеркалит chat-поля в облако. */
  const updateAndSync = (
    chatId: string,
    updater: (c: Conversation) => Conversation
  ) => {
    let result: Conversation | null = null;
    setState((s) => {
      const conv = s.conversations[chatId];
      if (!conv) return s;
      result = updater(conv);
      return {
        conversations: { ...s.conversations, [chatId]: result },
        order: bump(s.order, chatId),
      };
    });
    const userId = me();
    if (userId && result) {
      const c = result as Conversation;
      updateChatRemote(
        chatId,
        {
          memberIds: c.memberIds,
          adminIds: c.adminIds,
          pendingIds: c.pendingIds,
          adminRights: c.adminRights,
          memberPerms: c.memberPerms,
          subscribers: c.subscribers,
        },
        userId
      );
    }
  };

  const appendMessages = (
    chatId: string,
    msgs: Omit<Message, "id" | "time" | "ts">[]
  ) => {
    const userId = me();
    const useCloud = !!userId && isSupabaseConfigured;
    // Подпись отправителя (имя/инициалы/цвет) для групп — чтобы у участников
    // показывались имя и аватарка, а не «?».
    const sender = mySenderInfo();
    const built: Message[] = msgs.map((m) => ({
      ...m,
      senderName:
        m.author === "me" && !m.senderName && sender
          ? sender.name
          : m.senderName,
      senderColor:
        m.author === "me" && !m.senderColor && sender
          ? sender.color
          : m.senderColor,
      senderInitials:
        m.author === "me" && !m.senderInitials && sender
          ? sender.initials
          : m.senderInitials,
      id: uid(),
      time: nowTime(),
      ts: Date.now(),
      // Мои сообщения в облачном режиме сначала «отправляются».
      pending: useCloud && m.author === "me" ? true : m.pending,
    }));
    update(chatId, (c) => ({
      ...c,
      messages: [...c.messages, ...built],
    }));

    // Зеркалим в облако и обновляем статус доставки.
    for (const m of built) {
      void insertMessageRemote(chatId, m, userId).then((ok) => {
        if (m.author !== "me" || !useCloud) return;
        update(chatId, (c) => ({
          ...c,
          messages: c.messages.map((x) =>
            x.id === m.id
              ? { ...x, pending: false, failed: ok ? false : true }
              : x
          ),
        }));
      });
    }
  };

  const scheduleBotReply = (chatId: string, userText: string) => {
    const willSticker = userText.trim().toLowerCase() === "/sticker";
    // Сначала показы����аем активность «печатает...» / «выбирает стикер...»
    const setActivity = (activity: Activity) => {
      setState((s) => {
        const conv = s.conversations[chatId];
        if (!conv) return s;
        return {
          ...s,
          conversations: {
            ...s.conversations,
            [chatId]: { ...conv, activity },
          },
        };
      });
    };

    setActivity(willSticker ? "sticker" : "typing");
    const t = window.setTimeout(() => {
      setActivity(null);
      appendMessages(chatId, botReply(userText));
    }, 1400);
    timers.current.push(t);
  };

  const sendText: ChatContextValue["sendText"] = (chatId, text, opts) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const conv = state.conversations[chatId];
    const reply = opts?.replyTo;
    appendMessages(chatId, [
      {
        author: "me",
        kind: "text",
        text: trimmed,
        read: conv?.kind === "channel",
        reaction: null,
        replyToId: reply?.id,
        replyToText: reply
          ? reply.kind === "sticker"
            ? `Стикер ${reply.stickerEmoji ?? ""}`
            : reply.text
          : undefined,
        replyToAuthor: reply
          ? reply.author === "me"
            ? "Вы"
            : conv?.title
          : undefined,
      },
    ]);
    if (conv?.kind === "bot") scheduleBotReply(chatId, trimmed);
  };

  // Держим актуальную ссылку на sendText для планировщика.
  useEffect(() => {
    sendTextRef.current = sendText;
  });

  const sendSticker: ChatContextValue["sendSticker"] = (
    chatId,
    src,
    emoji,
    setId
  ) => {
    appendMessages(chatId, [
      {
        author: "me",
        kind: "sticker",
        stickerSrc: src,
        stickerEmoji: emoji,
        stickerSetId: setId,
        read: false,
        reaction: null,
      },
    ]);
    const conv = state.conversations[chatId];
    if (conv?.kind === "bot") {
      setState((s) => {
        const c = s.conversations[chatId];
        if (!c) return s;
        return {
          ...s,
          conversations: { ...s.conversations, [chatId]: { ...c, activity: "typing" } },
        };
      });
      const t = window.setTimeout(() => {
        setState((s) => {
          const c = s.conversations[chatId];
          if (!c) return s;
          return {
            ...s,
            conversations: {
              ...s.conversations,
              [chatId]: { ...c, activity: null },
            },
          };
        });
        appendMessages(chatId, [
          {
            author: "them",
            kind: "text",
            text: "Классный стикер! 😍",
            reaction: null,
          },
        ]);
      }, 1400);
      timers.current.push(t);
    }
  };

  const sendMedia: ChatContextValue["sendMedia"] = (chatId, file) => {
    const id = uid();
    const localPreview =
      file.type.startsWith("image/") || file.type.startsWith("video/")
        ? URL.createObjectURL(file)
        : undefined;
    const mediaKind = detectMediaKind(file);

    // Оптимистично показываем сообщение с прогрессом загрузки.
    const optimistic: Message = {
      id,
      author: "me",
      kind: "media",
      mediaKind,
      mediaUrl: localPreview,
      mediaName: file.name,
      mediaSize: file.size,
      uploadProgress: 0,
      pending: true,
      read: false,
      reaction: null,
      time: nowTime(),
      ts: Date.now(),
    };
    update(chatId, (c) => ({ ...c, messages: [...c.messages, optimistic] }));

    const setProgress = (p: number) => {
      update(chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === id ? { ...m, uploadProgress: p } : m
        ),
      }));
    };

    const userId = me();
    void uploadMedia(file, setProgress).then((res) => {
      if (!res) {
        update(chatId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === id
              ? { ...m, pending: false, failed: true, uploadProgress: undefined }
              : m
          ),
        }));
        return;
      }
      // Финализируем сообщение реальным URL.
      const finalMsg: Message = {
        ...optimistic,
        mediaUrl: res.url,
        mediaName: res.name,
        mediaSize: res.size,
        mediaKind: res.kind,
        uploadProgress: undefined,
        pending: false,
        failed: false,
      };
      update(chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === id ? finalMsg : m)),
      }));
      // Пишем в облако.
      insertMessageRemote(chatId, finalMsg, userId);
    });
  };

  const setReaction: ChatContextValue["setReaction"] = (
    chatId,
    messageId,
    emoji
  ) => {
    let next: string | null = null;
    update(chatId, (c) => ({
      ...c,
      messages: c.messages.map((m) => {
        if (m.id !== messageId) return m;
        next = m.reaction === emoji ? null : emoji;
        return { ...m, reaction: next };
      }),
    }));
    updateMessageRemote(messageId, { reaction: next });
  };

  const deleteMessage: ChatContextValue["deleteMessage"] = (
    chatId,
    messageId
  ) => {
    update(chatId, (c) => ({
      ...c,
      messages: c.messages.filter((m) => m.id !== messageId),
    }));
    deleteMessagesRemote([messageId]);
  };

  const deleteMessages: ChatContextValue["deleteMessages"] = (
    chatId,
    messageIds
  ) => {
    const set = new Set(messageIds);
    update(chatId, (c) => ({
      ...c,
      messages: c.messages.filter((m) => !set.has(m.id)),
    }));
    deleteMessagesRemote(messageIds);
  };

  const editMessage: ChatContextValue["editMessage"] = (
    chatId,
    messageId,
    text
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    update(chatId, (c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === messageId ? { ...m, text: trimmed, edited: true } : m
      ),
    }));
    updateMessageRemote(messageId, { text: trimmed, edited: true });
  };

  const togglePin: ChatContextValue["togglePin"] = (chatId, messageId) => {
    let pinned = false;
    update(chatId, (c) => ({
      ...c,
      messages: c.messages.map((m) => {
        if (m.id !== messageId) return m;
        pinned = !m.pinned;
        return { ...m, pinned };
      }),
    }));
    updateMessageRemote(messageId, { pinned });
  };

  const markUnread: ChatContextValue["markUnread"] = (chatId, messageId) => {
    update(chatId, (c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === messageId ? { ...m, read: false } : m
      ),
    }));
    updateMessageRemote(messageId, { read: false });
  };

  const markChatRead: ChatContextValue["markChatRead"] = (chatId) => {
    setState((s) => {
      const conv = s.conversations[chatId];
      if (!conv) return s;
      // Локально сдвигаем отметку прочтения на «сейчас».
      return {
        ...s,
        conversations: {
          ...s.conversations,
          [chatId]: { ...conv, lastReadTs: Date.now() },
        },
      };
    });
    const userId = me();
    if (userId) markChatReadRemote(chatId, userId);
  };

  const toggleBlock: ChatContextValue["toggleBlock"] = (chatId) => {
    // «Избранное» (Saved Messages) — это чат с самим собой, его нельзя
    // блокировать.
    if (state.conversations[chatId]?.saved) return;
    let next = false;
    update(chatId, (c) => {
      next = !c.blocked;
      return { ...c, blocked: next };
    });
    const userId = me();
    if (userId) setBlockedRemote(chatId, userId, next);
  };

  const setMuted: ChatContextValue["setMuted"] = (
    chatId,
    muted,
    durationMs
  ) => {
    // Отключение уведомлений — локальная настройка устройства.
    update(chatId, (c) => ({
      ...c,
      muted,
      mutedUntil:
        muted && durationMs ? Date.now() + durationMs : undefined,
    }));
  };

  const setArchived: ChatContextValue["setArchived"] = (chatId, archived) => {
    // Архив — локальное состояние устройства, в облако не зеркалится.
    update(chatId, (c) => ({ ...c, archived }));
  };

  const setPinned: ChatContextValue["setPinned"] = (chatId, pinned) => {
    // Закрепление — локальное состояние устройства, в облако не зеркалится.
    update(chatId, (c) => ({
      ...c,
      pinned,
      pinnedAt: pinned ? Date.now() : undefined,
    }));
  };

  const setChatTtl: ChatContextValue["setChatTtl"] = (chatId, ttlSeconds) => {
    const next = ttlSeconds > 0 ? ttlSeconds : undefined;
    update(chatId, (c) => ({ ...c, ttlSeconds: next }));
    appendMessages(chatId, [
      {
        author: "them",
        kind: "system",
        text: next
          ? `Исчезающие сообщения включены · ${formatTtl(next)}`
          : "Исчезающие сообщения выключены",
        reaction: null,
      },
    ]);
  };

  const scheduleMessage: ChatContextValue["scheduleMessage"] = (
    chatId,
    text,
    fireAt
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const item = { id: uid(), chatId, text: trimmed, fireAt };
    setScheduled((list) => [...list, item]);
    const userId = me();
    if (userId) void insertScheduledRemote(userId, item);
  };

  const cancelScheduled: ChatContextValue["cancelScheduled"] = (id) => {
    setScheduled((list) => list.filter((s) => s.id !== id));
    deleteScheduledRemote(id);
  };

  const forwardMessage: ChatContextValue["forwardMessage"] = (
    fromChatId,
    messageId,
    toChatId
  ) => {
    const src = state.conversations[fromChatId];
    const orig = src?.messages.find((m) => m.id === messageId);
    if (!orig) return;
    appendMessages(toChatId, [
      {
        author: "me",
        kind: orig.kind === "system" ? "text" : orig.kind,
        text: orig.text,
        stickerSrc: orig.stickerSrc,
        stickerEmoji: orig.stickerEmoji,
        stickerSetId: orig.stickerSetId,
        read: false,
        reaction: null,
        forwardedFrom: src?.title,
      },
    ]);
  };

  const createChannel: ChatContextValue["createChannel"] = (
    title,
    description,
    avatar
  ) => {
    const id = "ch_" + uid();
    const channel: Conversation = {
      id,
      kind: "channel",
      title: title.trim(),
      description: description?.trim() || undefined,
      color: "linear-gradient(135deg,#ff7aa2,#ff5e3a)",
      initials: title.trim().charAt(0).toUpperCase() || "К",
      avatar: avatar || undefined,
      subscribers: 1,
      isOwner: true,
      joined: true,
      reactionsEnabled: true,
      reactionsCount: 8,
      joinRequests: false,
      memberIds: [],
      adminIds: [],
      pendingIds: [],
      messages: [
        {
          id: uid(),
          author: "them",
          kind: "system",
          text: "Канал создан",
          time: nowTime(),
          ts: Date.now(),
          reaction: null,
        },
      ],
    };
    setState((s) => ({
      conversations: { ...s.conversations, [id]: channel },
      order: [id, ...s.order],
    }));
    const userId = me();
    if (userId) createChatRemote(channel, userId);
    return id;
  };

  const createGroup: ChatContextValue["createGroup"] = (
    title,
    memberIds,
    avatar
  ) => {
    const id = "gr_" + uid();
    const members = memberIds ?? [];
    const group: Conversation = {
      id,
      kind: "group",
      title: title.trim(),
      color: "linear-gradient(135deg,#8e7cff,#6c5ce7)",
      initials: title.trim().charAt(0).toUpperCase() || "Г",
      avatar: avatar || undefined,
      subscribers: 1 + members.length,
      isOwner: true,
      joined: true,
      memberIds: members,
      adminIds: [],
      pendingIds: [],
      memberPerms: { ...DEFAULT_MEMBER_PERMS },
      messages: [
        {
          id: uid(),
          author: "them",
          kind: "system",
          text: "Вы создали чат",
          time: nowTime(),
          ts: Date.now(),
          reaction: null,
        },
      ],
    };
    setState((s) => ({
      conversations: { ...s.conversations, [id]: group },
      order: [id, ...s.order],
    }));
    const userId = me();
    if (userId) createChatRemote(group, userId);
    return id;
  };

  const updateChannel: ChatContextValue["updateChannel"] = (chatId, patch) => {
    update(chatId, (c) => ({ ...c, ...patch }));
    const userId = me();
    if (userId) updateChatRemote(chatId, patch, userId);
  };

  const joinChat: ChatContextValue["joinChat"] = (chatId, displayName) => {
    const sysMsg: Message = {
      id: uid(),
      author: "them",
      kind: "system",
      text: "",
      time: nowTime(),
      ts: Date.now(),
      reaction: null,
    };
    let newSubs = 1;
    let pushSys = false;
    update(chatId, (c) => {
      const isGroup = c.kind === "group";
      newSubs = (c.subscribers ?? 1) + 1;
      if (isGroup) {
        pushSys = true;
        sysMsg.text = `${displayName} присоединился к группе`;
        return {
          ...c,
          joined: true,
          subscribers: newSubs,
          messages: [...c.messages, sysMsg],
        };
      }
      // Канал: подписка анонимна — имя подписчика не раскрываем.
      return { ...c, joined: true, subscribers: newSubs };
    });
    // Реальное членство + общие данные в облаке.
    const userId = me();
    if (userId) {
      joinChatRemote(chatId, userId);
      updateChatRemote(chatId, { subscribers: newSubs }, userId);
      if (pushSys) insertMessageRemote(chatId, sysMsg, null);
    }
  };

  const startDirectChat: ChatContextValue["startDirectChat"] = async (user) => {
    const userId = me();
    // Демо-режим без Supabase: создаём локальный личный чат.
    if (!userId || !isSupabaseConfigured) {
      const localId = `dm_${user.id}`;
      setState((s) => {
        if (s.conversations[localId]) {
          return {
            conversations: s.conversations,
            order: bump(s.order, localId),
          };
        }
        const conv: Conversation = {
          id: localId,
          kind: "private",
          title: user.name,
          color: user.color,
          initials: user.initials,
          avatar: user.avatar || undefined,
          peerId: user.id,
          peerOfficial: user.official,
          peerBadge: user.badge,
          joined: true,
          messages: [],
        };
        return {
          conversations: { ...s.conversations, [localId]: conv },
          order: [localId, ...s.order],
        };
      });
      return localId;
    }

    const conv = await openDirectChat(userId, user);
    if (!conv) return `dm_${user.id}`;
    setState((s) => ({
      conversations: { ...s.conversations, [conv.id]: conv },
      order: s.order.includes(conv.id)
        ? bump(s.order, conv.id)
        : [conv.id, ...s.order],
    }));
    return conv.id;
  };

  const joinByLink: ChatContextValue["joinByLink"] = (code, kind) => {
    // Если code — это id уже существующего чата (своя ссылка), открываем его.
    if (state.conversations[code]) {
      setState((s) => ({
        conversations: s.conversations,
        order: s.order.includes(code) ? s.order : [code, ...s.order],
      }));
      return code;
    }

    // Пытаемся загрузить реальный чат из облака по его id.
    if (isSupabaseConfigured) {
      const userId = me();
      void loadChatById(code, userId).then((remote) => {
        if (!remote) return;
        setState((s) => ({
          conversations: { ...s.conversations, [remote.id]: remote },
          order: s.order.includes(remote.id)
            ? s.order
            : [remote.id, ...s.order],
        }));
      });
      return code;
    }

    const id = `${kind === "channel" ? "ch" : "gr"}_join_${code}`;

    const title = kind === "channel" ? "Канал" : "��руппа";
    setState((s) => {
      // Уже открыт этот превью-чат
      if (s.conversations[id]) {
        return {
          conversations: s.conversations,
          order: s.order.includes(id) ? s.order : [id, ...s.order],
        };
      }
      const conv: Conversation = {
        id,
        kind,
        title: `${title} ${code}`,
        color:
          kind === "channel"
            ? "linear-gradient(135deg,#ff7aa2,#ff5e3a)"
            : "linear-gradient(135deg,#8e7cff,#6c5ce7)",
        initials:
          code.charAt(0).toUpperCase() || (kind === "channel" ? "К" : "Г"),
        subscribers: 1,
        isOwner: false,
        joined: false,
        reactionsEnabled: true,
        reactionsCount: 8,
        memberIds: [],
        adminIds: [],
        pendingIds: [],
        messages: [],
      };
      return {
        conversations: { ...s.conversations, [id]: conv },
        order: [id, ...s.order.filter((x) => x !== id)],
      };
    });
    return id;
  };

  const addMembers: ChatContextValue["addMembers"] = (chatId, ids) => {
    updateAndSync(chatId, (c) => {
      const members = Array.from(new Set([...(c.memberIds ?? []), ...ids]));
      return { ...c, memberIds: members, subscribers: 1 + members.length };
    });
  };

  const addRealUsers: ChatContextValue["addRealUsers"] = async (
    chatId,
    users
  ) => {
    if (users.length === 0) return;
    const userId = me();
    // Реальное членство в облаке.
    if (userId && isSupabaseConfigured) {
      await addUsersToChatRemote(
        chatId,
        users.map((u) => u.id)
      );
    }
    // Системные сообщения + счётчик подписчиков.
    let newSubs = 1;
    update(chatId, (c) => {
      newSubs = (c.subscribers ?? 1) + users.length;
      const sys: Message[] = users.map((u) => ({
        id: uid(),
        author: "them" as const,
        kind: "system" as const,
        text: `${u.name} добавлен(а) в чат`,
        time: nowTime(),
        ts: Date.now(),
        reaction: null,
      }));
      return { ...c, subscribers: newSubs, messages: [...c.messages, ...sys] };
    });
    if (userId && isSupabaseConfigured) {
      updateChatRemote(chatId, { subscribers: newSubs }, userId);
      // Системные сообщения видны всем (author = null).
      const conv = stateRef.current.conversations[chatId];
      const sysMsgs = conv?.messages.slice(-users.length) ?? [];
      for (const m of sysMsgs) {
        if (m.kind === "system") insertMessageRemote(chatId, m, null);
      }
    }
  };

  const removeMember: ChatContextValue["removeMember"] = (chatId, id) => {
    updateAndSync(chatId, (c) => {
      const members = (c.memberIds ?? []).filter((x) => x !== id);
      return {
        ...c,
        memberIds: members,
        adminIds: (c.adminIds ?? []).filter((x) => x !== id),
        subscribers: 1 + members.length,
      };
    });
  };

  const addAdmins: ChatContextValue["addAdmins"] = (chatId, ids) => {
    updateAndSync(chatId, (c) => {
      // Назначаемые админы автоматически становятся участниками.
      const members = Array.from(new Set([...(c.memberIds ?? []), ...ids]));
      const admins = Array.from(new Set([...(c.adminIds ?? []), ...ids]));
      const rights = { ...(c.adminRights ?? {}) };
      for (const id of ids) {
        if (!rights[id]) rights[id] = { ...DEFAULT_ADMIN_RIGHTS };
      }
      return {
        ...c,
        memberIds: members,
        adminIds: admins,
        adminRights: rights,
        subscribers: 1 + members.length,
      };
    });
  };

  const removeAdmin: ChatContextValue["removeAdmin"] = (chatId, id) => {
    updateAndSync(chatId, (c) => {
      const rights = { ...(c.adminRights ?? {}) };
      delete rights[id];
      return {
        ...c,
        adminIds: (c.adminIds ?? []).filter((x) => x !== id),
        adminRights: rights,
      };
    });
  };

  const setAdminRight: ChatContextValue["setAdminRight"] = (
    chatId,
    userId,
    key,
    value
  ) => {
    updateAndSync(chatId, (c) => {
      const current = c.adminRights?.[userId] ?? { ...DEFAULT_ADMIN_RIGHTS };
      return {
        ...c,
        adminRights: {
          ...(c.adminRights ?? {}),
          [userId]: { ...current, [key]: value },
        },
      };
    });
  };

  const setMemberPerm: ChatContextValue["setMemberPerm"] = (
    chatId,
    key,
    value
  ) => {
    updateAndSync(chatId, (c) => ({
      ...c,
      memberPerms: { ...(c.memberPerms ?? DEFAULT_MEMBER_PERMS), [key]: value },
    }));
  };

  const transferOwnership: ChatContextValue["transferOwnership"] = (
    chatId,
    newOwnerId
  ) => {
    updateAndSync(chatId, (c) => {
      // Новый владелец обязан быть участником; снимаем с него админ-метку
      // (владелец и так обладает всеми правами).
      const members = Array.from(
        new Set([...(c.memberIds ?? []), newOwnerId])
      );
      const adminIds = (c.adminIds ?? []).filter((x) => x !== newOwnerId);
      const rights = { ...(c.adminRights ?? {}) };
      delete rights[newOwnerId];
      return {
        ...c,
        ownerId: newOwnerId,
        isOwner: false,
        memberIds: members,
        adminIds,
        adminRights: rights,
        subscribers: 1 + members.length,
      };
    });
    appendMessages(chatId, [
      {
        author: "them",
        kind: "system",
        text: "Права владельца переданы",
        reaction: null,
      },
    ]);
  };

  const approveJoin: ChatContextValue["approveJoin"] = (chatId, id) => {
    updateAndSync(chatId, (c) => {
      const members = Array.from(new Set([...(c.memberIds ?? []), id]));
      return {
        ...c,
        memberIds: members,
        pendingIds: (c.pendingIds ?? []).filter((x) => x !== id),
        subscribers: 1 + members.length,
      };
    });
  };

  const declineJoin: ChatContextValue["declineJoin"] = (chatId, id) => {
    updateAndSync(chatId, (c) => ({
      ...c,
      pendingIds: (c.pendingIds ?? []).filter((x) => x !== id),
    }));
  };

  const clearHistory: ChatContextValue["clearHistory"] = (chatId) => {
    update(chatId, (c) => ({ ...c, messages: [] }));
    clearMessagesRemote(chatId);
  };

  const deleteChat: ChatContextValue["deleteChat"] = (chatId) => {
    const conv = stateRef.current.conversations[chatId];
    setState((s) => {
      const next = { ...s.conversations };
      delete next[chatId];
      return {
        conversations: next,
        order: s.order.filter((x) => x !== chatId),
      };
    });
    setActiveCall((c) => (c?.chatId === chatId ? null : c));
    // Владелец — удаляет чат целиком; иначе просто выходим (удаляем своё членство).
    const userId = me();
    if (userId) {
      if (conv?.isOwner) {
        deleteChatRemote(chatId);
      } else if (isSupabaseConfigured) {
        void getSupabase()
          .from("chat_members")
          .delete()
          .eq("chat_id", chatId)
          .eq("user_id", userId);
      }
    }
  };

  // ===== Групповой аудио-звонок =====
  const startGroupCall: ChatContextValue["startGroupCall"] = (chatId) => {
    setActiveCall({
      chatId,
      startedAt: Date.now(),
      participantIds: ["me"],
      muted: false,
      speaker: false,
    });
    appendMessages(chatId, [
      {
        author: "them",
        kind: "system",
        text: "Аудиозвонок начался",
        reaction: null,
      },
    ]);
  };

  const joinGroupCall: ChatContextValue["joinGroupCall"] = (
    chatId,
    memberId
  ) => {
    setActiveCall((c) => {
      if (!c || c.chatId !== chatId) return c;
      if (c.participantIds.includes(memberId)) return c;
      return { ...c, participantIds: [...c.participantIds, memberId] };
    });
  };

  const leaveGroupCall: ChatContextValue["leaveGroupCall"] = (memberId) => {
    setActiveCall((c) =>
      c
        ? {
            ...c,
            participantIds: c.participantIds.filter((x) => x !== memberId),
          }
        : c
    );
  };

  const endGroupCall: ChatContextValue["endGroupCall"] = () => {
    setActiveCall((c) => {
      if (c) {
        const dur = Math.round((Date.now() - c.startedAt) / 1000);
        appendMessages(c.chatId, [
          {
            author: "them",
            kind: "system",
            text: `Аудиозвонок завершён · ${Math.floor(dur / 60)} мин ${
              dur % 60
            } с`,
            reaction: null,
          },
        ]);
      }
      return null;
    });
  };

  const toggleCallMute: ChatContextValue["toggleCallMute"] = () => {
    setActiveCall((c) => (c ? { ...c, muted: !c.muted } : c));
  };

  const toggleCallSpeaker: ChatContextValue["toggleCallSpeaker"] = () => {
    setActiveCall((c) => (c ? { ...c, speaker: !c.speaker } : c));
  };

  const ordered = Array.from(new Set(state.order))
    .map((id) => state.conversations[id])
    .filter(Boolean);

  return (
    <ChatContext.Provider
      value={{
        conversations: ordered,
        hydrated,
        getConversation: (id) => state.conversations[id],
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
        setMuted,
        forwardMessage,
        createChannel,
        createGroup,
        joinByLink,
        joinChat,
        startDirectChat,
        updateChannel,
        addMembers,
        addRealUsers,
        removeMember,
        addAdmins,
        removeAdmin,
        setAdminRight,
        setMemberPerm,
        approveJoin,
        declineJoin,
        transferOwnership,
        clearHistory,
        deleteChat,
        setArchived,
        setPinned,
        setChatTtl,
        scheduled,
        scheduleMessage,
        cancelScheduled,
        activeCall,
        startGroupCall,
        joinGroupCall,
        leaveGroupCall,
        endGroupCall,
        toggleCallMute,
        toggleCallSpeaker,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChats() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChats должен быть внутри ChatProvider");
  return ctx;
}
