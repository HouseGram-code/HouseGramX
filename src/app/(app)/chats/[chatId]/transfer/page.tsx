"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, Crown, ShieldCheck } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Avatar } from "@/components/Avatar";
import { ConfirmSheet, type ConfirmConfig } from "@/components/ConfirmSheet";
import { useProfile } from "@/lib/profile-store";
import { useContacts } from "@/lib/contacts-store";
import { useChats } from "@/lib/chat-store";
import { useToast } from "@/components/Toast";

export default function TransferOwnershipPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const { profile, initials } = useProfile();
  const { getConversation, transferOwnership } = useChats();
  const { getContact } = useContacts();
  const { show } = useToast();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  const conv = getConversation(chatId);

  // Кандидаты на роль владельца: сначала администраторы, затем участники.
  const candidates = useMemo(() => {
    if (!conv) return [];
    const adminIds = conv.adminIds ?? [];
    const memberIds = conv.memberIds ?? [];
    const ordered = [
      ...adminIds,
      ...memberIds.filter((id) => !adminIds.includes(id)),
    ];
    return ordered
      .map((id) => {
        const c = getContact(id);
        if (!c) return null;
        return { ...c, isAdmin: adminIds.includes(id) };
      })
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  }, [conv, getContact]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => c.name.toLowerCase().includes(q));
  }, [candidates, query]);

  if (!conv) {
    return <SubScreen title="Передать права">{null}</SubScreen>;
  }

  const title = conv.kind === "channel" ? "канала" : "группы";

  const ask = (id: string, name: string) =>
    setConfirm({
      title: `Назначить «${name}» владельцем?`,
      message: `Вы передадите права владельца ${title} и станете обычным участником. Это действие нельзя отменить.`,
      confirmLabel: "Передать права",
      danger: true,
      onConfirm: () => {
        transferOwnership(chatId, id);
        show(`«${name}» теперь владелец`);
        router.replace(`/chats/${chatId}/group`);
      },
    });

  return (
    <SubScreen
      title="Передать права"
      subtitle={conv.title}
      action={
        <button
          type="button"
          aria-label="Поиск"
          onClick={() => setSearching((s) => !s)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-surface-2"
        >
          <MagnifyingGlass size={22} weight="regular" />
        </button>
      }
    >
      {searching && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5">
          <MagnifyingGlass size={18} weight="regular" className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти участника"
            className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-2 focus:outline-none"
          />
        </div>
      )}

      {/* Текущий владелец — вы */}
      <p className="px-5 pb-1.5 pt-3 text-xs font-medium uppercase tracking-wide text-muted">
        Текущий владелец
      </p>
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
          <span className="block text-[13px] text-muted">Это вы</span>
        </span>
        <Crown size={20} weight="fill" className="shrink-0 text-amber-400" />
      </div>

      {candidates.length === 0 ? (
        <p className="px-5 pt-6 text-center text-[14px] leading-relaxed text-muted">
          Некому передать права — в чате пока только вы. Сначала добавьте
          участников.
        </p>
      ) : (
        <>
          <p className="px-5 pb-1.5 pt-5 text-xs font-medium uppercase tracking-wide text-muted">
            Выберите нового владельца
          </p>
          {filtered.length === 0 ? (
            <p className="px-5 pt-4 text-center text-[14px] text-muted">
              Никого не найдено
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => ask(c.id, c.name)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
              >
                <Avatar initials={c.initials} color={c.color} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">
                    {c.name}
                  </span>
                  <span className="block truncate text-[13px] text-muted">
                    {c.isAdmin ? "Администратор" : c.status}
                  </span>
                </span>
                {c.isAdmin && (
                  <ShieldCheck
                    size={20}
                    weight="fill"
                    className="shrink-0 text-accent"
                  />
                )}
              </button>
            ))
          )}
          <p className="px-5 pt-4 text-[13px] leading-relaxed text-muted">
            Новый владелец получит полные права. Вы останетесь в чате как обычный
            участник.
          </p>
        </>
      )}

      <ConfirmSheet config={confirm} onClose={() => setConfirm(null)} />
    </SubScreen>
  );
}
