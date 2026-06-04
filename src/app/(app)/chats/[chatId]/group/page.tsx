"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  CaretLeft,
  GearSix,
  Phone,
  BellSimple,
  BellSlash,
  MagnifyingGlass,
  DotsThree,
  UserCircleGear,
  Images,
  UserPlus,
  LinkSimple,
  CaretRight,
  FolderSimplePlus,
  ClockCounterClockwise,
  SignOut,
  Trash,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { ConfirmSheet, type ConfirmConfig } from "@/components/ConfirmSheet";
import { PopoverMenu } from "@/components/PopoverMenu";
import { useProfile } from "@/lib/profile-store";
import { useContacts } from "@/lib/contacts-store";
import { useChats, canMemberDo } from "@/lib/chat-store";
import { useFolders } from "@/lib/folders-store";
import {
  loadChatMembers,
  removeUserFromChatRemote,
  type ChatMemberProfile,
} from "@/lib/chat-remote";
import { useAuth } from "@/lib/auth-store";
import { useToast } from "@/components/Toast";

function membersLabel(n: number) {
  if (n === 1) return "Тут только вы";
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} участник`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20))
    return `${n} участника`;
  return `${n} участников`;
}

export default function GroupInfoPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const { folders, createFolder, toggleChatInFolder, isInFolder } =
    useFolders();
  const { getConversation, removeMember, clearHistory, deleteChat, setMuted } =
    useChats();
  const { profile, initials } = useProfile();
  const { getContact } = useContacts();
  const { user } = useAuth();
  const { show } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);
  const [realMembers, setRealMembers] = useState<ChatMemberProfile[]>([]);

  // Реальные участники из Supabase (зарегистрированные пользователи).
  useEffect(() => {
    let active = true;
    loadChatMembers(chatId).then((m) => {
      if (active) setRealMembers(m);
    });
    return () => {
      active = false;
    };
  }, [chatId]);

  const conv = getConversation(chatId);
  if (!conv) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-background">
        <p className="text-foreground">Группа не найдена</p>
      </div>
    );
  }

  const memberIds = conv.memberIds ?? [];
  const count = 1 + memberIds.length;
  const adminsCount = 1 + (conv.adminIds?.length ?? 0);
  // Если права переданы другому участнику — показываем его как владельца.
  const owner = conv.ownerId ? getContact(conv.ownerId) : undefined;
  const canEditInfo = canMemberDo(conv, "editInfo");
  const canAddMembers = canMemberDo(conv, "addMembers");
  const canInvite = canMemberDo(conv, "invite");

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <header className="z-30 flex items-center justify-between border-b border-separator bg-surface/90 px-3 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2.5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Назад"
          className="text-foreground transition active:opacity-60"
        >
          <CaretLeft size={26} weight="bold" />
        </button>
        <div className="relative">
          {canEditInfo && (
            <button
              type="button"
              aria-label="Настройки чата"
              onClick={() => router.push(`/chats/${chatId}/group/edit`)}
              className="text-foreground transition active:opacity-60"
            >
              <GearSix size={24} weight="regular" />
            </button>
          )}
          <PopoverMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            items={[
              {
                label: "Добавить в папку",
                icon: FolderSimplePlus,
                onClick: () => {
                  setMenuOpen(false);
                  setConfirm({
                    title: "Добавить в папку",
                    message: folders.length
                      ? "Выберите папку для этого чата"
                      : "Создайте первую папку",
                    actions: [
                      ...folders.map((fl) => ({
                        label: `${isInFolder(fl.id, chatId) ? "✓ " : ""}${fl.name}`,
                        onClick: () => {
                          const was = isInFolder(fl.id, chatId);
                          toggleChatInFolder(fl.id, chatId);
                          show(
                            was
                              ? `Убрано из «${fl.name}»`
                              : `Добавлено в «${fl.name}»`
                          );
                        },
                      })),
                      {
                        label: "Создать папку…",
                        onClick: () => {
                          const name = window.prompt("Название папки");
                          if (name && name.trim()) {
                            const id = createFolder(name.trim());
                            toggleChatInFolder(id, chatId);
                            show(`Добавлено в «${name.trim()}»`);
                          }
                        },
                      },
                    ],
                  });
                },
              },
              {
                label: "Очистить историю",
                icon: ClockCounterClockwise,
                onClick: () =>
                  setConfirm({
                    title: "Очистить историю чата?",
                    message: "Восстановить сообщения не получится",
                    confirmLabel: "Очистить у всех",
                    danger: true,
                    onConfirm: () => {
                      clearHistory(chatId);
                      show("История очищена");
                    },
                  }),
              },
              {
                label: "Выйти из чата",
                icon: SignOut,
                danger: true,
                onClick: () =>
                  setConfirm({
                    title: "Выйти из чата?",
                    message: "Вы покинете группу",
                    confirmLabel: "Выйти из чата",
                    danger: true,
                    onConfirm: () => {
                      deleteChat(chatId);
                      show("Вы вышли из чата");
                      router.replace("/chats");
                    },
                  }),
              },
              {
                label: "Удалить чат",
                icon: Trash,
                danger: true,
                onClick: () =>
                  setConfirm({
                    title: "Удалить чат?",
                    confirmLabel: "Удалить чат",
                    danger: true,
                    onConfirm: () => {
                      deleteChat(chatId);
                      show("Чат удалён");
                      router.replace("/chats");
                    },
                  }),
              },
            ]}
          />
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto pb-8">
        {/* Профиль группы */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center px-4 pb-5 pt-4"
        >
          <Avatar
            initials={conv.initials}
            color={conv.color}
            size={96}
            src={conv.avatar || undefined}
            className="text-4xl shadow-md"
          />
          <h1 className="mt-3 text-center text-[22px] font-bold text-foreground">
            {conv.title}
          </h1>
          <p className="mt-0.5 text-[14px] text-muted">
            {membersLabel(count)}
          </p>
        </motion.div>

        {/* Быстрые действия */}
        <div className="grid grid-cols-4 gap-2 px-3">
          <QuickAction
            icon={Phone}
            label="Звонок"
            onClick={() => router.push(`/chats/${chatId}/call?type=audio`)}
          />
          <QuickAction
            icon={conv.muted ? BellSlash : BellSimple}
            label={conv.muted ? "Вкл. звук" : "Выкл. звук"}
            onClick={() =>
              setConfirm(
                conv.muted
                  ? {
                      title: "Уведомления отключены",
                      actions: [
                        {
                          label: "Включить уведомления",
                          onClick: () => {
                            setMuted(chatId, false);
                            show("Уведомления включены");
                          },
                        },
                      ],
                    }
                  : {
                      title: "Отключить уведомления",
                      actions: [
                        {
                          label: "На 1 час",
                          onClick: () => {
                            setMuted(chatId, true, 3600000);
                            show("Уведомления отключены на 1 час");
                          },
                        },
                        {
                          label: "На 4 часа",
                          onClick: () => {
                            setMuted(chatId, true, 4 * 3600000);
                            show("Уведомления отключены на 4 часа");
                          },
                        },
                        {
                          label: "На 24 часа",
                          onClick: () => {
                            setMuted(chatId, true, 24 * 3600000);
                            show("Уведомления отключены на 24 часа");
                          },
                        },
                        {
                          label: "Навсегда",
                          danger: true,
                          onClick: () => {
                            setMuted(chatId, true);
                            show("Уведомления отключены");
                          },
                        },
                      ],
                    }
              )
            }
          />
          <QuickAction
            icon={MagnifyingGlass}
            label="Найти"
            onClick={() => router.push(`/chats/${chatId}?search=1`)}
          />
          <QuickAction
            icon={DotsThree}
            label="Ещё"
            onClick={() => setMenuOpen(true)}
          />
        </div>

        {/* Администраторы */}
        <div className="mt-4 px-3">
          <Card>
            <Row
              icon={UserCircleGear}
              title="Администраторы"
              value={String(adminsCount)}
              onClick={() => router.push(`/chats/${chatId}/admins`)}
              last
            />
          </Card>
        </div>

        {/* Вло��ения */}
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

        {/* Участники */}
        <p className="px-5 pb-2 pt-5 text-xs font-medium uppercase tracking-wide text-muted">
          Участники
        </p>
        <Card>
          {canAddMembers && (
            <>
              <button
                type="button"
                onClick={() => router.push(`/chats/${chatId}/members/add`)}
                className="flex w-full items-center gap-3 border-b border-separator px-4 py-3 text-left text-accent transition-colors hover:bg-surface-2/60 active:bg-surface-2"
              >
                <UserPlus size={24} weight="regular" />
                <span className="text-[15px] font-medium">Добавить участника</span>
              </button>
              <button
                type="button"
                onClick={() => router.push(`/chats/${chatId}/members/search`)}
                className="flex w-full items-center gap-3 border-b border-separator px-4 py-3 text-left text-accent transition-colors hover:bg-surface-2/60 active:bg-surface-2"
              >
                <MagnifyingGlass size={24} weight="regular" />
                <span className="text-[15px] font-medium">Найти людей</span>
              </button>
            </>
          )}
          {canInvite && (
            <button
              type="button"
              onClick={() => router.push(`/chats/${chatId}/invite`)}
              className="flex w-full items-center gap-3 border-b border-separator px-4 py-3 text-left text-accent transition-colors hover:bg-surface-2/60 active:bg-surface-2"
            >
              <LinkSimple size={24} weight="regular" />
              <span className="text-[15px] font-medium">Пригласить по ссылке</span>
            </button>
          )}

          {/* Владелец */}
          {owner ? (
            <div className="flex items-center gap-3 px-4 py-2.5">
              <Avatar initials={owner.initials} color={owner.color} size={46} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-foreground">
                  {owner.name}
                </span>
              </span>
              <span className="shrink-0 text-[13px] text-muted">владелец</span>
            </div>
          ) : conv.isOwner ? (
            <div className="flex items-center gap-3 px-4 py-2.5">
              <Avatar
                initials={initials}
                color={profile.color}
                size={46}
                src={profile.avatar || undefined}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-foreground">
                  {profile.name}
                </span>
                <span className="block text-[13px] text-muted">Вы</span>
              </span>
              <span className="shrink-0 text-[13px] text-muted">владелец</span>
            </div>
          ) : null}

          {/* Вы — обычный участник (если вы не владелец группы) */}
          {!conv.isOwner && (
            <div className="flex items-center gap-3 border-t border-separator px-4 py-2.5">
              <Avatar
                initials={initials}
                color={profile.color}
                size={46}
                src={profile.avatar || undefined}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-foreground">
                  {profile.name}
                </span>
                <span className="block text-[13px] text-muted">Вы</span>
              </span>
              <span className="shrink-0 text-[13px] text-muted">участник</span>
            </div>
          )}

          {/* Участники */}
          {memberIds.map((id) => {
            const c = getContact(id);
            if (!c) return null;
            const isAdmin = (conv.adminIds ?? []).includes(id);
            return (
              <div
                key={id}
                className="flex items-center gap-3 border-t border-separator px-4 py-2.5"
              >
                <Avatar initials={c.initials} color={c.color} size={46} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">
                    {c.name}
                  </span>
                  <span className="block text-[13px] text-muted">
                    {isAdmin ? "Администратор" : c.status}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    removeMember(chatId, id);
                    show("Участник удалён");
                  }}
                  className="shrink-0 text-[13px] font-medium text-accent transition active:opacity-60"
                >
                  Удалить
                </button>
              </div>
            );
          })}

          {/* Реальные пользователи Supabase (кроме вас) */}
          {realMembers
            .filter((m) => m.userId !== user?.id)
            .map((m) => (
              <div
                key={m.userId}
                className="flex items-center gap-3 border-t border-separator px-4 py-2.5"
              >
                <Avatar
                  initials={m.initials}
                  color={m.color}
                  size={46}
                  src={m.avatar || undefined}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">
                    {m.name}
                  </span>
                  <span className="block text-[13px] text-muted">
                    {m.role === "owner"
                      ? "Владелец"
                      : m.role === "admin"
                        ? "Администратор"
                        : m.username
                          ? `@${m.username}`
                          : "Участник"}
                  </span>
                </span>
                {m.role !== "owner" && (
                  <button
                    type="button"
                    onClick={async () => {
                      await removeUserFromChatRemote(chatId, m.userId);
                      setRealMembers((prev) =>
                        prev.filter((x) => x.userId !== m.userId)
                      );
                      show("Участник удалён");
                    }}
                    className="shrink-0 text-[13px] font-medium text-accent transition active:opacity-60"
                  >
                    Удалить
                  </button>
                )}
              </div>
            ))}
        </Card>
      </div>

      <ConfirmSheet config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Phone;
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
    <div className="mx-3 overflow-hidden rounded-[var(--radius-card)] bg-surface">
      {children}
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
