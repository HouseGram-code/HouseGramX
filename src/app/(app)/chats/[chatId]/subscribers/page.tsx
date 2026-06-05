"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { UserPlus, LinkSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Avatar } from "@/components/Avatar";
import { useProfile } from "@/lib/profile-store";
import { useContacts } from "@/lib/contacts-store";
import { useChats } from "@/lib/chat-store";
import { useAuth } from "@/lib/auth-store";

function subsLabel(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} подписчик`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20))
    return `${n} подписчика`;
  return `${n} подписчиков`;
}

export default function SubscribersPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const { getConversation, removeMember } = useChats();
  const { profile, initials } = useProfile();
  const { getContact } = useContacts();
  const { user } = useAuth();
  const conv = getConversation(chatId);
  const [editing, setEditing] = useState(false);

  if (!conv) return <SubScreen title="Не найдено">{null}</SubScreen>;

  // Подписчики канала анонимны: список доступен только владельцу и админам.
  const isStaff =
    conv.isOwner === true ||
    (!!user && (conv.adminIds ?? []).includes(user.id));
  if (!isStaff) {
    return (
      <SubScreen title="Подписчики">
        <p className="px-6 py-12 text-center text-[14px] leading-relaxed text-muted">
          Список подписчиков канала виден только владельцу и администраторам.
        </p>
      </SubScreen>
    );
  }

  const memberIds = conv.memberIds ?? [];
  // Создатель тоже считается подписчиком (как в Telegram).
  const subs = conv.subscribers ?? 1;
  const isAdmin = (id: string) => (conv.adminIds ?? []).includes(id);

  return (
    <SubScreen
      title="Подписчики"
      subtitle={subsLabel(subs)}
      action={
        <button
          type="button"
          aria-label={editing ? "Готово" : "Поиск"}
          onClick={() => setEditing((e) => !e)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-surface-2"
        >
          {editing ? (
            <span className="text-[15px] font-medium text-accent">Готово</span>
          ) : (
            <MagnifyingGlass size={22} weight="regular" />
          )}
        </button>
      }
    >
      <button
        type="button"
        onClick={() => router.push(`/chats/${chatId}/subscribers/add`)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-accent transition-colors hover:bg-surface-2/60 active:bg-surface-2"
      >
        <UserPlus size={26} weight="regular" />
        <span className="text-[15px] font-medium">Добавить подписчика</span>
      </button>

      <button
        type="button"
        onClick={() => router.push(`/chats/${chatId}/invite`)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-accent transition-colors hover:bg-surface-2/60 active:bg-surface-2"
      >
        <LinkSimple size={26} weight="regular" />
        <span className="text-[15px] font-medium">Пригласить по ссылке</span>
      </button>

      {/* Владелец */}
      <div className="flex w-full items-center gap-3 px-4 py-2.5">
        <Avatar
          initials={initials}
          color={profile.color}
          size={48}
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

      {/* Участники */}
      <AnimatePresence>
        {memberIds.map((id) => {
          const c = getContact(id);
          if (!c) return null;
          return (
            <motion.div
              key={id}
              layout
              exit={{ opacity: 0, height: 0 }}
              className="flex w-full items-center gap-3 overflow-hidden px-4 py-2.5"
            >
              <Avatar initials={c.initials} color={c.color} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-foreground">
                  {c.name}
                </span>
                <span className="block text-[13px] text-muted">
                  {isAdmin(id) ? "Администратор" : c.status}
                </span>
              </span>
              {editing ? (
                <button
                  type="button"
                  onClick={() => removeMember(chatId, id)}
                  aria-label="Удалить"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent transition active:scale-90"
                >
                  <X size={16} weight="bold" />
                </button>
              ) : isAdmin(id) ? (
                <span className="shrink-0 text-[13px] text-muted">админ</span>
              ) : null}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </SubScreen>
  );
}
