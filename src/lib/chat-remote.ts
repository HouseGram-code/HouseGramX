"use client";

import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { Conversation, Message, ChatKind } from "./chat-store";

/**
 * Слой доступа к данным чатов в Supabase.
 *
 * Чаты, участники и сообщения хранятся в реляционных таблицах
 * (chats / chat_members / messages) и расшариваются между пользователями.
 * Здесь — преобразование строк БД ↔ доменные типы и CRUD-операции.
 */

// ─── Типы строк БД ───────────────────────────────────────────────────────────

export interface ChatRow {
  id: string;
  kind: ChatKind;
  title: string;
  color: string;
  initials: string;
  avatar: string | null;
  description: string | null;
  owner_id: string;
  verified: boolean;
  reactions_enabled: boolean;
  reactions_count: number;
  join_requests: boolean;
  subscribers: number;
  member_ids: string[];
  admin_ids: string[];
  pending_ids: string[];
  admin_rights: Record<string, unknown>;
  member_perms: Conversation["memberPerms"] | null;
}

export interface MessageRow {
  id: string;
  chat_id: string;
  author_id: string | null;
  kind: Message["kind"];
  text: string | null;
  sticker_src: string | null;
  sticker_emoji: string | null;
  media_kind: string | null;
  media_url: string | null;
  media_name: string | null;
  media_size: number | null;
  reaction: string | null;
  edited: boolean;
  pinned: boolean;
  reply_to_id: string | null;
  reply_to_text: string | null;
  reply_to_author: string | null;
  forwarded_from: string | null;
  sender_name: string | null;
  sender_color: string | null;
  sender_initials: string | null;
  read: boolean;
  created_at: string;
}

export interface MemberRow {
  chat_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "pending";
  muted: boolean;
  muted_until: number | null;
  last_read?: string | null;
  blocked?: boolean;
}

export interface ProfileRow {
  id: string;
  name: string;
  username: string;
  avatar: string;
  color: string;
  bio?: string | null;
  last_seen?: string | null;
  official?: boolean | null;
  badge?: string | null;
}

/** Найденный пользователь (для поиска и старта чата). */
export interface FoundUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  color: string;
  initials: string;
  official?: boolean;
  badge?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

// ─── Преобразования ──────────────────────────────────────────────────────────

function timeFromTs(ts: number): string {
  return new Date(ts).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Строка сообщения БД → доменное сообщение (author зависит от зрителя). */
export function rowToMessage(r: MessageRow, uid: string | null): Message {
  const ts = new Date(r.created_at).getTime();
  return {
    id: r.id,
    author: r.kind === "system" ? "them" : r.author_id === uid ? "me" : "them",
    kind: r.kind,
    text: r.text ?? undefined,
    stickerSrc: r.sticker_src ?? undefined,
    stickerEmoji: r.sticker_emoji ?? undefined,
    mediaKind: (r.media_kind as Message["mediaKind"]) ?? undefined,
    mediaUrl: r.media_url ?? undefined,
    mediaName: r.media_name ?? undefined,
    mediaSize: r.media_size ?? undefined,
    reaction: r.reaction,
    time: timeFromTs(ts),
    ts,
    read: r.read,
    edited: r.edited || undefined,
    pinned: r.pinned || undefined,
    replyToId: r.reply_to_id ?? undefined,
    replyToText: r.reply_to_text ?? undefined,
    replyToAuthor: r.reply_to_author ?? undefined,
    forwardedFrom: r.forwarded_from ?? undefined,
    senderName: r.sender_name ?? undefined,
    senderColor: r.sender_color ?? undefined,
    senderInitials: r.sender_initials ?? undefined,
  };
}

/** Доменное сообщение → строка для вставки. */
export function messageToRow(
  chatId: string,
  m: Message,
  uid: string | null
): MessageRow {
  return {
    id: m.id,
    chat_id: chatId,
    author_id: m.kind === "system" || m.author === "them" ? null : uid,
    kind: m.kind,
    text: m.text ?? null,
    sticker_src: m.stickerSrc ?? null,
    sticker_emoji: m.stickerEmoji ?? null,
    media_kind: m.mediaKind ?? null,
    media_url: m.mediaUrl ?? null,
    media_name: m.mediaName ?? null,
    media_size: m.mediaSize ?? null,
    reaction: m.reaction ?? null,
    edited: m.edited ?? false,
    pinned: m.pinned ?? false,
    reply_to_id: m.replyToId ?? null,
    reply_to_text: m.replyToText ?? null,
    reply_to_author: m.replyToAuthor ?? null,
    forwarded_from: m.forwardedFrom ?? null,
    sender_name: m.senderName ?? null,
    sender_color: m.senderColor ?? null,
    sender_initials: m.senderInitials ?? null,
    read: m.read ?? false,
    created_at: new Date(m.ts).toISOString(),
  };
}

/** Строка чата БД + сообщения + членство → доменный Conversation. */
export function rowToConversation(
  r: ChatRow,
  messages: Message[],
  uid: string | null,
  membership?: MemberRow
): Conversation {
  const isOwner = r.owner_id === uid;
  const joined = isOwner || (!!membership && membership.role !== "pending");
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    color: r.color,
    initials: r.initials,
    avatar: r.avatar ?? undefined,
    description: r.description ?? undefined,
    verified: r.verified || undefined,
    reactionsEnabled: r.reactions_enabled,
    reactionsCount: r.reactions_count,
    joinRequests: r.join_requests || undefined,
    subscribers: r.subscribers,
    isOwner: isOwner || undefined,
    joined,
    memberIds: r.member_ids ?? [],
    adminIds: r.admin_ids ?? [],
    pendingIds: r.pending_ids ?? [],
    adminRights: (r.admin_rights as Conversation["adminRights"]) ?? {},
    memberPerms: r.member_perms ?? undefined,
    muted: membership?.muted || undefined,
    mutedUntil: membership?.muted_until ?? undefined,
    blocked: membership?.blocked || undefined,
    lastReadTs: membership?.last_read
      ? new Date(membership.last_read).getTime()
      : undefined,
    messages: messages.sort((a, b) => a.ts - b.ts),
  };
}

/** Доменный Conversation → строка чата для upsert. */
export function conversationToRow(c: Conversation, ownerId: string): Omit<ChatRow, never> {
  return {
    id: c.id,
    kind: c.kind,
    title: c.title,
    color: c.color,
    initials: c.initials,
    avatar: c.avatar ?? null,
    description: c.description ?? null,
    owner_id: ownerId,
    verified: c.verified ?? false,
    reactions_enabled: c.reactionsEnabled ?? true,
    reactions_count: c.reactionsCount ?? 8,
    join_requests: c.joinRequests ?? false,
    subscribers: c.subscribers ?? 1,
    member_ids: c.memberIds ?? [],
    admin_ids: c.adminIds ?? [],
    pending_ids: c.pendingIds ?? [],
    admin_rights: c.adminRights ?? {},
    member_perms: c.memberPerms ?? null,
  };
}

// ─── Чтение ──────────────────────────────────────────────────────────────────

export interface LoadResult {
  conversations: Conversation[];
}

/** Загружает все чаты пользователя (владелец + членство) с сообщениями. */
export async function loadMyChats(uid: string): Promise<Conversation[]> {
  if (!isSupabaseConfigured) return [];
  const sb = getSupabase();

  // Мои чл��нства.
  const { data: memberRows } = await sb
    .from("chat_members")
    .select("chat_id, user_id, role, muted, muted_until, last_read, blocked")
    .eq("user_id", uid);
  const memberships = (memberRows ?? []) as MemberRow[];
  const memberChatIds = memberships.map((m) => m.chat_id);

  // Чаты: где я владелец ИЛИ состою.
  const orFilter = memberChatIds.length
    ? `owner_id.eq.${uid},id.in.(${memberChatIds.join(",")})`
    : `owner_id.eq.${uid}`;
  const { data: chatRows } = await sb
    .from("chats")
    .select("*")
    .or(orFilter);
  const chats = (chatRows ?? []) as ChatRow[];
  if (chats.length === 0) return [];

  const ids = chats.map((c) => c.id);
  const { data: msgRows } = await sb
    .from("messages")
    .select("*")
    .in("chat_id", ids)
    .order("created_at", { ascending: true });
  const messages = (msgRows ?? []) as MessageRow[];

  const byChat = new Map<string, Message[]>();
  for (const r of messages) {
    const list = byChat.get(r.chat_id) ?? [];
    list.push(rowToMessage(r, uid));
    byChat.set(r.chat_id, list);
  }
  const memberByChat = new Map(memberships.map((m) => [m.chat_id, m]));

  const conversations = chats.map((c) =>
    rowToConversation(c, byChat.get(c.id) ?? [], uid, memberByChat.get(c.id))
  );

  // Для личных чатов (DM) подменяем заголовок/аватар на данные собеседника.
  await resolveDirectChats(conversations, ids, uid);

  return conversations;
}

/**
 * Для DM (kind='private') находит «другого» участника и подставляет его
 * имя/аватар/инициалы как заголовок чата (per-viewer отображение).
 */
async function resolveDirectChats(
  conversations: Conversation[],
  chatIds: string[],
  uid: string
) {
  const sb = getSupabase();
  const dms = conversations.filter((c) => c.kind === "private");
  if (dms.length === 0) return;

  // Все участники этих чатов (включая флаг блокировки).
  const { data: allMembers } = await sb
    .from("chat_members")
    .select("chat_id, user_id, blocked")
    .in("chat_id", dms.map((c) => c.id));
  const members = (allMembers ?? []) as {
    chat_id: string;
    user_id: string;
    blocked: boolean | null;
  }[];

  // id собеседников (не я) + заблокировал ли он меня.
  const otherByChat = new Map<string, string>();
  const peerBlockedByChat = new Map<string, boolean>();
  for (const m of members) {
    if (m.user_id !== uid) {
      otherByChat.set(m.chat_id, m.user_id);
      peerBlockedByChat.set(m.chat_id, !!m.blocked);
    }
  }
  const otherIds = Array.from(new Set(otherByChat.values()));
  if (otherIds.length === 0) return;

  const { data: profs } = await sb
    .from("profiles")
    .select("id, name, username, avatar, color, last_seen, official, badge")
    .in("id", otherIds);
  const profById = new Map(
    ((profs ?? []) as ProfileRow[]).map((p) => [p.id, p])
  );

  for (const c of dms) {
    const otherId = otherByChat.get(c.id);
    const p = otherId ? profById.get(otherId) : undefined;
    if (otherId) c.peerId = otherId;
    if (peerBlockedByChat.get(c.id)) c.peerBlockedMe = true;
    if (p) {
      c.title = p.name || "Без имени";
      c.avatar = p.avatar || undefined;
      c.color = p.color || c.color;
      c.initials = initialsOf(p.name || "?");
      c.peerOfficial = !!p.official;
      c.peerBadge = p.badge || undefined;
      if (p.last_seen) c.lastSeen = new Date(p.last_seen).getTime();
    }
  }
}

/** Загружает один публичный чат по id (для открытия по ссы��к��). */
export async function loadChatById(
  id: string,
  uid: string | null
): Promise<Conversation | null> {
  if (!isSupabaseConfigured) return null;
  const sb = getSupabase();
  const { data: chatRow } = await sb.from("chats").select("*").eq("id", id).maybeSingle();
  if (!chatRow) return null;
  const { data: msgRows } = await sb
    .from("messages")
    .select("*")
    .eq("chat_id", id)
    .order("created_at", { ascending: true });
  const messages = ((msgRows ?? []) as MessageRow[]).map((r) => rowToMessage(r, uid));
  return rowToConversation(chatRow as ChatRow, messages, uid);
}

// ─── Запись (fire-and-forget; ошибки логируем) ───────────────────────────────

async function run(label: string, p: PromiseLike<{ error: unknown }>) {
  try {
    const { error } = await p;
    if (error) console.warn(`[chat-remote] ${label}:`, error);
  } catch (e) {
    console.warn(`[chat-remote] ${label} failed:`, e);
  }
}

export async function createChatRemote(c: Conversation, ownerId: string) {
  const sb = getSupabase();
  // ВАЖНО: последовательно — сначала чат, потом членство, потом сообщения.
  // Иначе FK/RLS отклонят членство (409) и сообщения (403) из-за гонки.
  const { error: chatErr } = await sb
    .from("chats")
    .upsert(conversationToRow(c, ownerId));
  if (chatErr) {
    console.warn("[chat-remote] createChat:", chatErr.message);
    return;
  }

  const { error: memErr } = await sb
    .from("chat_members")
    .upsert({ chat_id: c.id, user_id: ownerId, role: "owner" });
  if (memErr) {
    console.warn("[chat-remote] ownerMembership:", memErr.message);
    return;
  }

  if (c.messages.length) {
    const { error: msgErr } = await sb
      .from("messages")
      .upsert(c.messages.map((m) => messageToRow(c.id, m, ownerId)));
    if (msgErr) console.warn("[chat-remote] seedMessages:", msgErr.message);
  }
}

export function updateChatRemote(
  id: string,
  patch: Partial<Conversation>,
  ownerId: string
) {
  const sb = getSupabase();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const map: Record<string, string> = {
    title: "title",
    color: "color",
    initials: "initials",
    avatar: "avatar",
    description: "description",
    verified: "verified",
    reactionsEnabled: "reactions_enabled",
    reactionsCount: "reactions_count",
    joinRequests: "join_requests",
    subscribers: "subscribers",
    memberIds: "member_ids",
    adminIds: "admin_ids",
    pendingIds: "pending_ids",
    adminRights: "admin_rights",
    memberPerms: "member_perms",
  };
  for (const [k, col] of Object.entries(map)) {
    if (k in patch) row[col] = (patch as Record<string, unknown>)[k] ?? null;
  }
  void ownerId;
  run("updateChat", sb.from("chats").update(row).eq("id", id));
}

export function deleteChatRemote(id: string) {
  run("deleteChat", getSupabase().from("chats").delete().eq("id", id));
}

/**
 * Вставляет сообщение в БД. Возвращает true при успехе, false при ошибке —
 * чтобы стор мог снять статус «отправляется» или показать «не доставлено».
 */
export async function insertMessageRemote(
  chatId: string,
  m: Message,
  uid: string | null
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await getSupabase()
      .from("messages")
      .upsert(messageToRow(chatId, m, uid));
    if (error) {
      console.warn("[chat-remote] insertMessage:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[chat-remote] insertMessage failed:", e);
    return false;
  }
}

export function updateMessageRemote(id: string, patch: Partial<MessageRow>) {
  run("updateMessage", getSupabase().from("messages").update(patch).eq("id", id));
}

export function deleteMessagesRemote(ids: string[]) {
  if (!ids.length) return;
  run("deleteMessages", getSupabase().from("messages").delete().in("id", ids));
}

export function clearMessagesRemote(chatId: string) {
  run("clearMessages", getSupabase().from("messages").delete().eq("chat_id", chatId));
}

export function joinChatRemote(chatId: string, uid: string) {
  run(
    "joinChat",
    getSupabase()
      .from("chat_members")
      .upsert({ chat_id: chatId, user_id: uid, role: "member" })
  );
}

// ─── Поиск пользователей и личные чаты (DM) ──────────────────────────────────

/** Ищет зарегистрированных пользователей по имени или username. */
export async function searchUsers(
  query: string,
  selfId: string
): Promise<FoundUser[]> {
  if (!isSupabaseConfigured) return [];
  const q = query.trim();
  if (!q) return [];
  const sb = getSupabase();
  const pattern = `%${q.replace(/[%_]/g, "")}%`;
  const { data, error } = await sb
    .from("profiles")
    .select("id, name, username, avatar, color, official, badge")
    .or(`name.ilike.${pattern},username.ilike.${pattern}`)
    .neq("id", selfId)
    .limit(30);
  if (error) {
    console.warn("[chat-remote] searchUsers:", error.message);
    return [];
  }
  return ((data ?? []) as ProfileRow[]).map((p) => ({
    id: p.id,
    name: p.name || "Без имени",
    username: p.username || "",
    avatar: p.avatar || "",
    color: p.color || "#6c5ce7",
    initials: initialsOf(p.name || "?"),
    official: !!p.official,
    badge: p.badge || "",
  }));
}

/** Детерминированный id личного чата между двумя пользователями. */
export function directChatId(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `dm_${x.slice(0, 8)}_${y.slice(0, 8)}`;
}

/**
 * Открывает (создаёт при необходимости) личный чат с пользователем `other`.
 * Возвращает готовый Conversation для немедленного добавления в состояние.
 */
export async function openDirectChat(
  me: string,
  other: FoundUser
): Promise<Conversation | null> {
  if (!isSupabaseConfigured) return null;
  const sb = getSupabase();
  const id = directChatId(me, other.id);

  // Создаём чат при необходимости. НЕ полагаемся на предварительный SELECT:
  // из-за RLS пользователь, который ещё не участник, НЕ видит уже
  // существующий чат и ошибочно пытается создать его заново → 409 Conflict
  // (duplicate key chats_pkey). ignoreDuplicates → ON CONFLICT DO NOTHING.
  await run(
    "createDM",
    sb.from("chats").upsert(
      {
        id,
        kind: "private",
        title: other.name,
        color: other.color,
        initials: other.initials,
        owner_id: me,
        subscribers: 2,
      },
      { onConflict: "id", ignoreDuplicates: true }
    )
  );

  // Гарантируем своё членство (owner — чтобы иметь право добавить
  // собеседника). RLS members_insert разрешает свою строку (user_id = auth.uid()).
  await run(
    "dmSelf",
    sb
      .from("chat_members")
      .upsert(
        { chat_id: id, user_id: me, role: "owner" },
        { onConflict: "chat_id,user_id" }
      )
  );

  // Добавляем собеседника, только если его ещё нет (не понижаем роль
  // существующего). Теперь мы owner → is_chat_admin = true → RLS пропускает
  // чужую строку. Это же чинит старые «битые» лички без участников.
  const { data: mem } = await sb
    .from("chat_members")
    .select("user_id")
    .eq("chat_id", id);
  const havePeer = ((mem ?? []) as { user_id: string }[]).some(
    (r) => r.user_id === other.id
  );
  if (!havePeer) {
    await run(
      "dmPeer",
      sb
        .from("chat_members")
        .upsert(
          { chat_id: id, user_id: other.id, role: "member" },
          { onConflict: "chat_id,user_id", ignoreDuplicates: true }
        )
    );
  }

  // Грузим сообщения.
  const { data: msgRows } = await sb
    .from("messages")
    .select("*")
    .eq("chat_id", id)
    .order("created_at", { ascending: true });
  const messages = ((msgRows ?? []) as MessageRow[]).map((r) =>
    rowToMessage(r, me)
  );

  return {
    id,
    kind: "private",
    title: other.name,
    color: other.color,
    initials: other.initials,
    avatar: other.avatar || undefined,
    peerId: other.id,
    peerOfficial: other.official,
    peerBadge: other.badge,
    joined: true,
    messages,
  };
}

// ─── Реальные участники чата (для групп/каналов) ─────────────────────────────

/** Участник чата с профилем (для отображения реальных людей в группе). */
export interface ChatMemberProfile {
  userId: string;
  role: "owner" | "admin" | "member" | "pending";
  name: string;
  username: string;
  avatar: string;
  color: string;
  initials: string;
}

/** Загружает реальных участников чата вместе с их профилями. */
export async function loadChatMembers(
  chatId: string
): Promise<ChatMemberProfile[]> {
  if (!isSupabaseConfigured) return [];
  const sb = getSupabase();
  const { data: rows } = await sb
    .from("chat_members")
    .select("user_id, role")
    .eq("chat_id", chatId);
  const members = (rows ?? []) as { user_id: string; role: ChatMemberProfile["role"] }[];
  if (members.length === 0) return [];

  const { data: profs } = await sb
    .from("profiles")
    .select("id, name, username, avatar, color")
    .in("id", members.map((m) => m.user_id));
  const byId = new Map(((profs ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  return members.map((m) => {
    const p = byId.get(m.user_id);
    const name = p?.name || "Пользователь";
    return {
      userId: m.user_id,
      role: m.role,
      name,
      username: p?.username || "",
      avatar: p?.avatar || "",
      color: p?.color || "#6c5ce7",
      initials: initialsOf(name),
    };
  });
}

/** Добавляет реальных пользователей в чат (как member). */
export async function addUsersToChatRemote(chatId: string, userIds: string[]) {
  if (!isSupabaseConfigured || userIds.length === 0) return;
  const rows = userIds.map((id) => ({
    chat_id: chatId,
    user_id: id,
    role: "member" as const,
  }));
  await run("addUsersToChat", getSupabase().from("chat_members").upsert(rows));
}

/** Удаляет реального пользователя из чата. */
export async function removeUserFromChatRemote(chatId: string, userId: string) {
  if (!isSupabaseConfigured) return;
  await run(
    "removeUserFromChat",
    getSupabase()
      .from("chat_members")
      .delete()
      .eq("chat_id", chatId)
      .eq("user_id", userId)
  );
}

// ─── Непрочитанные сообщения ─────────────────────────────────────────────────

/** Отмечает чат прочитанным (обновляет last_read в членстве). */
export function markChatReadRemote(chatId: string, uid: string) {
  if (!isSupabaseConfigured) return;
  run(
    "markChatRead",
    getSupabase()
      .from("chat_members")
      .update({ last_read: new Date().toISOString() })
      .eq("chat_id", chatId)
      .eq("user_id", uid)
  );
}

/**
 * Считает непрочитанные сообщения в чате для текущего зрителя:
 * чужие сообщения (author !== "me"), пришедшие после lastReadTs.
 */
export function countUnread(conv: Conversation): number {
  const since = conv.lastReadTs ?? 0;
  let n = 0;
  for (const m of conv.messages) {
    if (m.author !== "me" && m.kind !== "system" && m.ts > since) n++;
  }
  return n;
}

// ─── Профиль пользователя (для экрана информации о собеседнике) ──────────────

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  color: string;
  bio: string;
  lastSeen?: number;
  initials: string;
  official?: boolean;
  badge?: string;
}

/** Загружает полный публичный профиль пользователя по id. */
export async function loadUserProfile(
  userId: string
): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await getSupabase()
      .from("profiles")
      .select("id, name, username, avatar, color, bio, last_seen, official, badge")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return null;
    const p = data as ProfileRow;
    const name = p.name || "Пользователь";
    return {
      id: p.id,
      name,
      username: p.username || "",
      avatar: p.avatar || "",
      color: p.color || "#6c5ce7",
      bio: p.bio || "",
      lastSeen: p.last_seen ? new Date(p.last_seen).getTime() : undefined,
      initials: initialsOf(name),
      official: !!p.official,
      badge: p.badge || "",
    };
  } catch (e) {
    console.warn("[chat-remote] loadUserProfile:", e);
    return null;
  }
}

/** Загружает публичный профиль пользователя по username (без учёта регистра). */
export async function loadUserProfileByUsername(
  username: string
): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;
  const u = username.trim();
  if (!u) return null;
  try {
    const { data } = await getSupabase()
      .from("profiles")
      .select("id, name, username, avatar, color, bio, last_seen, official, badge")
      .ilike("username", u)
      .maybeSingle();
    if (!data) return null;
    const p = data as ProfileRow;
    const name = p.name || "Пользователь";
    return {
      id: p.id,
      name,
      username: p.username || "",
      avatar: p.avatar || "",
      color: p.color || "#6c5ce7",
      bio: p.bio || "",
      lastSeen: p.last_seen ? new Date(p.last_seen).getTime() : undefined,
      initials: initialsOf(name),
      official: !!p.official,
      badge: p.badge || "",
    };
  } catch (e) {
    console.warn("[chat-remote] loadUserProfileByUsername:", e);
    return null;
  }
}

/** Блокирует/разблокирует собеседника (флаг в своём членстве). */
export function setBlockedRemote(chatId: string, uid: string, blocked: boolean) {
  if (!isSupabaseConfigured) return;
  run(
    "setBlocked",
    getSupabase()
      .from("chat_members")
      .update({ blocked })
      .eq("chat_id", chatId)
      .eq("user_id", uid)
  );
}
