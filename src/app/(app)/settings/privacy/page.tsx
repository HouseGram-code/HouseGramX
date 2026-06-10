"use client";

import { ChatText, Prohibit } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import {
  Group,
  GroupHint,
  SectionTitle,
  ChoiceRow,
  ToggleRow,
} from "@/components/settings-ui";
import { Avatar } from "@/components/Avatar";
import { useSettings, type LastSeenVisibility } from "@/lib/settings-store";
import { useChats } from "@/lib/chat-store";

const lastSeenOptions: { value: LastSeenVisibility; label: string }[] = [
  { value: "everyone", label: "Все" },
  { value: "contacts", label: "Мои контакты" },
  { value: "nobody", label: "Никто" },
];

export default function PrivacyPage() {
  const s = useSettings();
  const { conversations, toggleBlock } = useChats();
  const blocked = conversations.filter((c) => c.blocked);

  return (
    <SubScreen title="Конфиденциальность">
      <SectionTitle>Последний раз в сети</SectionTitle>
      <Group>
        {lastSeenOptions.map((o, i) => (
          <ChoiceRow
            key={o.value}
            label={o.label}
            selected={s.lastSeenVisibility === o.value}
            onClick={() => s.set("lastSeenVisibility", o.value)}
            last={i === lastSeenOptions.length - 1}
          />
        ))}
      </Group>
      <GroupHint>Кто видит время вашего последнего посещения.</GroupHint>

      <SectionTitle>Сообщения</SectionTitle>
      <Group>
        <ToggleRow
          icon={ChatText}
          label="Отчёты о прочтении"
          checked={s.readReceipts}
          onChange={(v) => s.set("readReceipts", v)}
          last
        />
      </Group>
      <GroupHint>
        Если выключено, вы не отправляете и не видите галочки прочтения.
      </GroupHint>

      <SectionTitle>Заблокированные</SectionTitle>
      {blocked.length > 0 ? (
        <Group>
          {blocked.map((c, i) => (
            <div
              key={c.id}
              className={
                "flex items-center gap-3 px-4 py-2.5" +
                (i !== blocked.length - 1 ? " border-b border-separator" : "")
              }
            >
              <Avatar initials={c.initials} color={c.color} size={40} />
              <span className="flex-1 truncate text-[15px] text-foreground">
                {c.title}
              </span>
              <button
                type="button"
                onClick={() => toggleBlock(c.id)}
                className="rounded-full bg-surface-2 px-3 py-1.5 text-[14px] font-medium text-accent transition active:opacity-70"
              >
                Разблокировать
              </button>
            </div>
          ))}
        </Group>
      ) : (
        <Group>
          <div className="flex items-center gap-3 px-4 py-4 text-muted">
            <Prohibit size={22} />
            <span className="text-[15px]">Нет заблокированных пользователей</span>
          </div>
        </Group>
      )}
      <GroupHint>
        Заблокированные пользователи не могут писать вам и видеть ваш профиль.
      </GroupHint>
    </SubScreen>
  );
}
