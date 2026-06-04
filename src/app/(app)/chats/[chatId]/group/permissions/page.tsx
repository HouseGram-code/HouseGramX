"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MagicWand,
  UserPlus,
  PushPin,
  Phone,
  LinkSimple,
} from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Group, GroupHint, SectionTitle, ToggleRow } from "@/components/settings-ui";
import {
  useChats,
  DEFAULT_MEMBER_PERMS,
  type MemberPerms,
} from "@/lib/chat-store";

const ROWS: {
  key: keyof MemberPerms;
  label: string;
  icon: typeof MagicWand;
}[] = [
  { key: "editInfo", label: "Изменять название, фото и описание чата", icon: MagicWand },
  { key: "addMembers", label: "Добавлять участников", icon: UserPlus },
  { key: "pinMessages", label: "Закреплять сообщения", icon: PushPin },
  { key: "call", label: "Звонить в чат", icon: Phone },
  { key: "invite", label: "Приглашать по ссылке", icon: LinkSimple },
];

export default function MemberPermissionsPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const { getConversation, setMemberPerm } = useChats();
  const conv = getConversation(chatId);

  // Настраивать разрешения участников может только владелец.
  useEffect(() => {
    if (conv && !conv.isOwner) router.replace(`/chats/${chatId}/group`);
  }, [conv, chatId, router]);

  if (!conv) return <SubScreen title="Не найдено">{null}</SubScreen>;
  if (!conv.isOwner) return null;

  const perms = conv.memberPerms ?? DEFAULT_MEMBER_PERMS;

  return (
    <SubScreen title="Разрешения участников">
      <SectionTitle>Возможности в чате</SectionTitle>
      <Group>
        {ROWS.map((r, i) => (
          <ToggleRow
            key={r.key}
            icon={r.icon}
            label={r.label}
            checked={perms[r.key]}
            onChange={(v) => setMemberPerm(chatId, r.key, v)}
            last={i === ROWS.length - 1}
          />
        ))}
      </Group>
      <GroupHint>
        Настройте, что могут делать обычные участники. У администраторов права
        задаются отдельно.
      </GroupHint>
    </SubScreen>
  );
}
