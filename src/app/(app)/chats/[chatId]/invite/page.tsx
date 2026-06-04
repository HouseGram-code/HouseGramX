"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  DotsThreeVertical,
  ShareNetwork,
  QrCode,
  UserCheck,
} from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Avatar } from "@/components/Avatar";
import { Group, GroupHint, SectionTitle } from "@/components/settings-ui";
import { Switch } from "@/components/Switch";
import { useContacts } from "@/lib/contacts-store";
import { useChats } from "@/lib/chat-store";
import { useToast } from "@/components/Toast";

export default function ChannelInvitePage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const { getConversation, updateChannel, approveJoin, declineJoin } =
    useChats();
  const { getContact } = useContacts();
  const { show } = useToast();
  const [link, setLink] = useState("");

  const conv = getConversation(chatId);

  useEffect(() => {
    const type = conv?.kind === "group" ? "group" : "channel";
    setLink(`${window.location.origin}/join/${chatId}?type=${type}`);
  }, [chatId, conv?.kind]);

  if (!conv) return <SubScreen title="Не найдено">{null}</SubScreen>;

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(link);
      show("Ссылка скопирована");
    } catch {
      show("Не удалось скопировать");
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: conv.title, url: link });
        return;
      } catch {
        /* отменено */
      }
    }
    copy();
  };

  const pending = (conv.pendingIds ?? [])
    .map((id) => getContact(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <SubScreen title="Пригласить по ссылке">
      <SectionTitle>Ссылка-приглашение</SectionTitle>
      <Group>
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar initials={conv.initials} color={conv.color} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] text-foreground">{link}</p>
            <p className="text-[13px] text-muted">{conv.title}</p>
          </div>
          <button
            type="button"
            onClick={copy}
            aria-label="Копировать"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2"
          >
            <Copy size={20} weight="regular" />
          </button>
          <button
            type="button"
            aria-label="QR-код"
            onClick={() => router.push(`/chats/${chatId}/qr`)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2"
          >
            <DotsThreeVertical size={22} weight="bold" />
          </button>
        </div>
      </Group>
      <GroupHint>Вы можете пригласить любого человека по этой ссылке</GroupHint>

      <div className="mt-4 px-3">
        <Group>
          <ActionRow
            icon={ShareNetwork}
            label="Поделиться ссылкой"
            onClick={shareLink}
          />
          <ActionRow
            icon={QrCode}
            label="Показать QR-код"
            onClick={() => router.push(`/chats/${chatId}/qr`)}
            last
          />
        </Group>
      </div>

      <div className="mt-4 px-3">
        <Group>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px] text-foreground">
              Заявки на вступление
            </span>
            <Switch
              checked={conv.joinRequests ?? false}
              onChange={(v) => updateChannel(chatId, { joinRequests: v })}
            />
          </div>
        </Group>
      </div>
      <GroupHint>
        Подписаться на канал получится только после одобрения заявки
        администратором
      </GroupHint>

      {/* Список заявок */}
      {conv.joinRequests && pending.length > 0 && (
        <>
          <SectionTitle>Ожидают одобрения</SectionTitle>
          <Group>
            {pending.map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  i < pending.length - 1 ? "border-b border-separator" : ""
                }`}
              >
                <Avatar initials={c.initials} color={c.color} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">
                    {c.name}
                  </span>
                  <span className="block text-[13px] text-muted">
                    Хочет вступить
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    approveJoin(chatId, c.id);
                    show(`${c.name} принят(а)`);
                  }}
                  aria-label="Принять"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white transition active:scale-90"
                >
                  <UserCheck size={18} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    declineJoin(chatId, c.id);
                    show("Заявка отклонена");
                  }}
                  aria-label="Отклонить"
                  className="text-[14px] font-medium text-muted transition active:opacity-60"
                >
                  Откл.
                </button>
              </div>
            ))}
          </Group>
        </>
      )}

    </SubScreen>
  );
}

function ActionRow({
  icon: Icon,
  label,
  onClick,
  last,
}: {
  icon: typeof ShareNetwork;
  label: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 pl-4 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
    >
      <Icon size={22} weight="regular" className="shrink-0 text-foreground" />
      <span
        className={`flex-1 py-3.5 pr-4 text-[15px] text-foreground ${
          last ? "" : "border-b border-separator"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
