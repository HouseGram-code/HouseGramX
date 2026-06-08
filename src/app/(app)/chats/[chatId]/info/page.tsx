"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  CaretLeft,
  GearSix,
  BellSimple,
  BellSlash,
  MagnifyingGlass,
  DotsThree,
  Images,
  LinkSimple,
  UserCircleGear,
  UsersThree,
  CaretRight,
  At,
  Info,
  Phone,
  Robot,
  Prohibit,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { BugHunterBadge } from "@/components/BugHunterBadge";
import { badgeMeta } from "@/lib/badges";
import { useChats } from "@/lib/chat-store";
import { usePresence, useLastSeen } from "@/lib/presence-store";
import { loadUserProfile, type UserProfile } from "@/lib/chat-remote";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth-store";
import { useSettings } from "@/lib/settings-store";
import { formatLastSeen } from "@/lib/utils";

function subsLabel(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} подписчик`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20))
    return `${n} подписчика`;
  return `${n} подписчиков`;
}

export default function ChatInfoPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const { getConversation, toggleBlock, setMuted } = useChats();
  const { isOnline } = usePresence();
  const { show } = useToast();
  const { user } = useAuth();
  const s = useSettings();

  const conv = getConversation(chatId);
  const [peer, setPeer] = useState<UserProfile | null>(null);

  // Для личного чата подтягиваем полный профиль собеседника.
  useEffect(() => {
    let active = true;
    if (conv?.kind === "private" && conv.peerId) {
      loadUserProfile(conv.peerId).then((p) => {
        if (active) setPeer(p);
      });
    }
    return () => {
      active = false;
    };
  }, [conv?.kind, conv?.peerId]);

  const liveLastSeen = useLastSeen(conv?.peerId);

  if (!conv) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-background">
        <p className="text-lg font-semibold text-foreground">Не найдено</p>
      </div>
    );
  }

  const isChannel = conv.kind === "channel";
  const isBot = conv.kind === "bot";
  const isPrivate = conv.kind === "private";
  const iBlockedPeer = !!conv.blocked; // я заблокировал собеседника
  const peerBlockedMe = !!conv.peerBlockedMe; // собеседник заблокировал меня
  const subs = conv.subscribers ?? 1;
  const adminsCount = 1 + (conv.adminIds?.length ?? 0);
  // Список подписчиков виден только владельцу и администраторам канала.
  const isStaff =
    conv.isOwner === true ||
    (!!user && (conv.adminIds ?? []).includes(user.id));

  // Данные для отображения: для DM приоритет — профиль собеседника.
  // Аватар/статус скрываем, только если ОН заблокировал меня.
  const title = peer?.name ?? conv.title;
  const avatar = peerBlockedMe ? "" : peer?.avatar || conv.avatar;
  const color = peer?.color ?? conv.color;
  const initials = peer?.initials ?? conv.initials;
  const username = peerBlockedMe ? undefined : peer?.username;
  const bio = peerBlockedMe ? undefined : peer?.bio || conv.description;
  const badge = badgeMeta(peer?.badge || conv.peerBadge);
  const online = peerBlockedMe
    ? false
    : isPrivate
      ? conv.online || isOnline(conv.peerId)
      : isBot;

  const statusText = isChannel
    ? subsLabel(subs)
    : isBot
      ? "бот"
      : peerBlockedMe
        ? "был(а) давно"
        : online
          ? "в сети"
          : s.lastSeenVisibility === "everyone"
            ? formatLastSeen(liveLastSeen ?? peer?.lastSeen ?? conv.lastSeen)
            : "был(а) недавно";

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      {/* Шапка */}
      <header className="z-20 flex items-center justify-between border-b border-separator bg-surface/90 px-3 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2.5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Назад"
          className="text-foreground transition active:opacity-60"
        >
          <CaretLeft size={26} weight="bold" />
        </button>
        {isChannel && conv.isOwner && (
          <button
            type="button"
            aria-label="Настройки канала"
            onClick={() => router.push(`/chats/${chatId}/edit`)}
            className="text-foreground transition active:opacity-60"
          >
            <GearSix size={24} weight="regular" />
          </button>
        )}
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto pb-8">
        {/* Профиль */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center px-4 pb-5 pt-5"
        >
          <div className="relative">
            <Avatar
              initials={initials}
              color={color}
              size={112}
              src={avatar || undefined}
              className="text-5xl shadow-lg"
            />
            {(isPrivate || isBot) && online && (
              <span className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full border-[3px] border-background bg-green-500" />
            )}
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <h1 className="text-center text-[23px] font-bold text-foreground">
              {title}
            </h1>
            {isBot && <Robot size={20} weight="fill" className="text-accent" />}
            {(peer?.official || conv.peerOfficial) && <VerifiedBadge size={20} />}
            {badge && <BugHunterBadge size={20} />}
            {conv.verified && !peer?.official && (
              <span className="text-accent">✓</span>
            )}
          </div>

          <p
            className={`mt-0.5 text-[14px] ${
              online && !isChannel ? "text-green-500" : "text-muted"
            }`}
          >
            {statusText}
          </p>
        </motion.div>

        {badge && (
          <div className="mx-3 mb-2 rounded-2xl bg-surface p-4 ring-1 ring-separator">
            <div className="flex items-center gap-2.5">
              <BugHunterBadge size={34} />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground">
                  {badge.label}
                </p>
                <p className="text-[12px] text-muted">{badge.short}</p>
              </div>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-foreground/80">
              {badge.description}
            </p>
          </div>
        )}

        {/* Быстрые действия */}
        <div className="grid grid-cols-3 gap-2 px-3">
          {isPrivate && (
            <QuickAction
              icon={Phone}
              label="Позвонить"
              onClick={() => router.push(`/chats/${chatId}/voicecall`)}
            />
          )}
          <QuickAction
            icon={conv.muted ? BellSlash : BellSimple}
            label={conv.muted ? "Вкл. звук" : "Выкл. звук"}
            onClick={() => {
              const next = !conv.muted;
              setMuted(chatId, next);
              show(next ? "Уведомления отключены" : "Уведомления включены");
            }}
          />
          <QuickAction
            icon={MagnifyingGlass}
            label="Найти"
            onClick={() => router.push(`/chats/${chatId}?search=1`)}
          />
          {!isPrivate && (
            <QuickAction
              icon={DotsThree}
              label="Ещё"
              onClick={() => show("Дополнительно")}
            />
          )}
        </div>

        {/* Карточка сведений: юзернейм + описание */}
        {(username || bio) && (
          <div className="mt-4 px-3">
            <Card>
              {username && (
                <InfoLine
                  icon={At}
                  label="Имя пользователя"
                  value={`@${username}`}
                  last={!bio}
                />
              )}
              {bio && (
                <InfoLine
                  icon={Info}
                  label={isChannel ? "Описание" : "О себе"}
                  value={bio}
                  last
                />
              )}
            </Card>
          </div>
        )}

        {/* Управление каналом */}
        {isChannel && (
          <div className="mt-4 px-3">
            <Card>
              <Row
                icon={Images}
                title="Вложения"
                subtitle="Фото, видео, файлы и ссылки"
                onClick={() => router.push(`/chats/${chatId}/attachments`)}
                last={!isStaff}
              />
              {/* Управление каналом видно только владельцу и администраторам (как в Telegram) */}
              {isStaff && (
                <>
                  <Row
                    icon={LinkSimple}
                    title="Пригласить по ссылке"
                    onClick={() => router.push(`/chats/${chatId}/invite`)}
                  />
                  <Row
                    icon={UserCircleGear}
                    title="Администраторы"
                    value={String(adminsCount)}
                    onClick={() => router.push(`/chats/${chatId}/admins`)}
                  />
                  <Row
                    icon={UsersThree}
                    title="Подписчики"
                    value={String(subs)}
                    onClick={() => router.push(`/chats/${chatId}/subscribers`)}
                    last
                  />
                </>
              )}
            </Card>
          </div>
        )}

        {/* Вложения для лички/бота */}
        {!isChannel && (
          <div className="mt-4 px-3">
            <Card>
              <Row
                icon={Images}
                title="Вложения"
                subtitle="Фото, видео, файлы и ссылки"
                onClick={() => router.push(`/chats/${chatId}/attachments`)}
                last
              />
            </Card>
          </div>
        )}

        {/* Блокировка — только для личных чатов */}
        {isPrivate && (
          <div className="mt-4 px-3">
            <Card>
              <button
                type="button"
                onClick={() => {
                  toggleBlock(conv.id);
                  show(
                    iBlockedPeer
                      ? "Пользователь разблокирован"
                      : "Пользователь заблокирован"
                  );
                }}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
              >
                <Prohibit
                  size={22}
                  weight="regular"
                  className="text-accent"
                />
                <span className="text-[15px] font-medium text-accent">
                  {iBlockedPeer
                    ? "Разблокировать пользователя"
                    : "Заблокировать пользователя"}
                </span>
              </button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof BellSimple;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-2xl bg-surface py-3 text-accent transition hover:bg-surface-2"
    >
      <Icon size={24} weight="regular" />
      <span className="text-[13px] font-medium">{label}</span>
    </motion.button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface">
      {children}
    </div>
  );
}

/** Строка со сведениями (юзернейм/описание) — некликабельная. */
function InfoLine({
  icon: Icon,
  label,
  value,
  last,
}: {
  icon: typeof At;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 pl-4">
      <Icon size={22} weight="regular" className="mt-3.5 shrink-0 text-muted" />
      <div
        className={`flex-1 py-3 pr-4 ${
          last ? "" : "border-b border-separator"
        }`}
      >
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
          {value}
        </p>
        <p className="mt-0.5 text-[13px] text-muted">{label}</p>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  subtitle,
  value,
  onClick,
  last,
}: {
  icon: typeof Images;
  title: string;
  subtitle?: string;
  value?: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 pl-4 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
    >
      <Icon size={24} weight="regular" className="shrink-0 text-muted" />
      <div
        className={`flex flex-1 items-center justify-between py-3.5 pr-4 ${
          last ? "" : "border-b border-separator"
        }`}
      >
        <span className="min-w-0">
          <span className="block text-[15px] text-foreground">{title}</span>
          {subtitle && (
            <span className="block text-[13px] text-muted">{subtitle}</span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          {value && <span className="text-[15px] text-muted">{value}</span>}
          <CaretRight size={18} weight="bold" className="text-muted-2" />
        </span>
      </div>
    </button>
  );
}
