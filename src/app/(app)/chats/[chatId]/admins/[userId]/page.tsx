"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { X, UserMinus } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { Switch } from "@/components/Switch";
import { useContacts } from "@/lib/contacts-store";
import {
  useChats,
  DEFAULT_ADMIN_RIGHTS,
  type AdminRights,
} from "@/lib/chat-store";
import { useToast } from "@/components/Toast";

// Текст прав зависит от типа чата: в канале — «посты/подписчики», в группе — «сообщения/участники».
const adminRightGroups = (
  isChannel: boolean,
): { key: keyof AdminRights; label: string; hint?: string }[][] => [
  [
    {
      key: "edit",
      label: isChannel ? "Редактировать канал" : "Редактировать группу",
      hint: "Фото, название, описание",
    },
  ],
  [
    { key: "post", label: isChannel ? "Писать посты" : "Отправлять сообщения" },
    {
      key: "editPosts",
      label: isChannel ? "Редактировать чужие посты" : "Редактировать чужие сообщения",
    },
    {
      key: "deletePosts",
      label: isChannel ? "Удалять чужие посты" : "Удалять чужие сообщения",
    },
    { key: "pin", label: isChannel ? "Закреплять посты" : "Закреплять сообщения" },
  ],
  [
    {
      key: "members",
      label: isChannel ? "Добавлять и удалять подписчиков" : "Добавлять и удалять участников",
    },
  ],
  [{ key: "admins", label: "Назначать и удалять администраторов" }],
];

export default function AdminRightsPage({
  params,
}: {
  params: Promise<{ chatId: string; userId: string }>;
}) {
  const { chatId, userId } = use(params);
  const router = useRouter();
  const { getConversation, setAdminRight, removeAdmin } = useChats();
  const { getContact } = useContacts();
  const { show } = useToast();

  const conv = getConversation(chatId);
  const contact = getContact(userId);
  const rights = conv?.adminRights?.[userId] ?? DEFAULT_ADMIN_RIGHTS;
  const GROUPS = adminRightGroups(conv?.kind === "channel");

  if (!conv || !contact) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-background">
        <p className="text-foreground">Администратор не найден</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <header className="z-20 flex items-center gap-2 border-b border-separator bg-surface/90 px-3 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2.5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Закрыть"
          className="text-foreground transition active:opacity-60"
        >
          <X size={26} weight="bold" />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-foreground">
          Права администратора
        </h1>
        <span className="w-[26px]" />
      </header>

      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto py-4">
        {/* Профиль */}
        <div className="mx-3 flex items-center gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-3">
          <Avatar
            initials={contact.initials}
            color={contact.color}
            size={48}
          />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-foreground">
              {contact.name}
            </span>
            <span className="block text-[13px] text-muted">Администратор</span>
          </span>
        </div>

        {GROUPS.map((group, gi) => (
          <div
            key={gi}
            className="mx-3 overflow-hidden rounded-[var(--radius-card)] bg-surface"
          >
            {group.map((p, i) => (
              <div
                key={p.key}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < group.length - 1 ? "border-b border-separator" : ""
                }`}
              >
                <div className="min-w-0 pr-3">
                  <p className="text-[15px] text-foreground">{p.label}</p>
                  {p.hint && <p className="text-[12px] text-muted">{p.hint}</p>}
                </div>
                <Switch
                  checked={rights[p.key]}
                  onChange={(v) => setAdminRight(chatId, userId, p.key, v)}
                />
              </div>
            ))}
          </div>
        ))}

        {/* Снять права */}
        <div className="mx-3 overflow-hidden rounded-[var(--radius-card)] bg-surface">
          <button
            type="button"
            onClick={() => {
              removeAdmin(chatId, userId);
              show("Права администратора сняты");
              router.back();
            }}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-accent transition-colors hover:bg-surface-2/60 active:bg-surface-2"
          >
            <UserMinus size={22} weight="regular" />
            <span className="text-[15px]">Снять права администратора</span>
          </button>
        </div>
      </div>
    </div>
  );
}
