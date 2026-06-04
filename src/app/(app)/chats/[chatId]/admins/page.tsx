"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  UserPlus,
  X,
  DotsThreeVertical,
  MagnifyingGlass,
  UsersThree,
  ShieldCheck,
} from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Avatar } from "@/components/Avatar";
import { PopoverMenu } from "@/components/PopoverMenu";
import { ConfirmSheet, type ConfirmConfig } from "@/components/ConfirmSheet";
import { useProfile } from "@/lib/profile-store";
import { useContacts } from "@/lib/contacts-store";
import { useChats } from "@/lib/chat-store";
import { useToast } from "@/components/Toast";

export default function AdminsPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const { getConversation, removeAdmin } = useChats();
  const { profile, initials } = useProfile();
  const { getContact } = useContacts();
  const { show } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);
  const conv = getConversation(chatId);

  // Управлять администраторами может только владелец группы.
  useEffect(() => {
    if (conv && !conv.isOwner) router.replace(`/chats/${chatId}/group`);
  }, [conv, chatId, router]);

  if (!conv) return <SubScreen title="Не найдено">{null}</SubScreen>;
  if (!conv.isOwner) return null;

  const adminIds = conv.adminIds ?? [];

  return (
    <SubScreen
      title="Администраторы"
      action={
        <div className="relative">
          <button
            type="button"
            aria-label="Меню"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-surface-2"
          >
            <DotsThreeVertical size={24} weight="bold" />
          </button>
          <PopoverMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            items={[
              {
                label: "Поиск",
                icon: MagnifyingGlass,
                onClick: () => show("Поиск по администраторам"),
              },
              {
                label: "Добавить администратора",
                icon: UserPlus,
                onClick: () => router.push(`/chats/${chatId}/admins/add`),
              },
              {
                label: "Права по умолчанию",
                icon: ShieldCheck,
                onClick: () => show("Права назначаются для каждого админа"),
              },
              {
                label: "Убрать всех администраторов",
                icon: UsersThree,
                danger: true,
                onClick: () => {
                  if (adminIds.length === 0) {
                    show("Других администраторов нет");
                    return;
                  }
                  setConfirm({
                    title: "Снять права у всех администраторов?",
                    message: "Вы останетесь единственным администратором",
                    confirmLabel: "Снять у всех",
                    danger: true,
                    onConfirm: () => {
                      adminIds.forEach((id) => removeAdmin(chatId, id));
                      show("Все администраторы сняты");
                    },
                  });
                },
              },
            ]}
          />
        </div>
      }
    >
      <button
        type="button"
        onClick={() => router.push(`/chats/${chatId}/admins/add`)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-accent transition-colors hover:bg-surface-2/60 active:bg-surface-2"
      >
        <UserPlus size={26} weight="regular" />
        <span className="text-[15px] font-medium">Добавить администратора</span>
      </button>

      {/* Владелец */}
      <button
        type="button"
        onClick={() => router.push(`/chats/${chatId}/admins/me`)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
      >
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
          <span className="block text-[13px] text-muted">Это вы</span>
        </span>
        <span className="shrink-0 text-[13px] text-muted">владелец</span>
      </button>

      {/* Назначенные администраторы */}
      <AnimatePresence>
        {adminIds.map((id) => {
          const c = getContact(id);
          if (!c) return null;
          return (
            <motion.div
              key={id}
              layout
              exit={{ opacity: 0, height: 0 }}
              className="flex w-full items-center overflow-hidden"
            >
              <button
                type="button"
                onClick={() => router.push(`/chats/${chatId}/admins/${id}`)}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
              >
                <Avatar initials={c.initials} color={c.color} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">
                    {c.name}
                  </span>
                  <span className="block text-[13px] text-muted">
                    Администратор
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  removeAdmin(chatId, id);
                  show("Права администратора сняты");
                }}
                aria-label="Снять права"
                className="mr-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent transition active:scale-90"
              >
                <X size={16} weight="bold" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <ConfirmSheet config={confirm} onClose={() => setConfirm(null)} />
    </SubScreen>
  );
}
