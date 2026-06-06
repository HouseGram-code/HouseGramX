"use client";

import { SubScreen } from "@/components/SubScreen";
import {
  ChoiceRow,
  Group,
  GroupHint,
  SectionTitle,
} from "@/components/settings-ui";
import { useSettings, type LastSeenVisibility } from "@/lib/settings-store";
import { useToast } from "@/components/Toast";

const OPTIONS: {
  value: LastSeenVisibility;
  label: string;
  toast: string;
}[] = [
  { value: "everyone", label: "Все", toast: "Статус виден всем" },
  {
    value: "contacts",
    label: "Мои контакты",
    toast: "Статус виден только контактам",
  },
  { value: "nobody", label: "Никто", toast: "Статус скрыт от всех" },
];

export default function LastSeenPrivacyPage() {
  const s = useSettings();
  const { show } = useToast();

  return (
    <SubScreen title="Кто видит мой статус">
      <SectionTitle>Кто видит время моей активности</SectionTitle>
      <Group>
        {OPTIONS.map((o, i) => (
          <ChoiceRow
            key={o.value}
            label={o.label}
            selected={s.lastSeenVisibility === o.value}
            onClick={() => {
              s.set("lastSeenVisibility", o.value);
              show(o.toast);
            }}
            last={i === OPTIONS.length - 1}
          />
        ))}
      </Group>
      <GroupHint>
        Если выбрано «Все», другие видят точное время вашей
        активности (например, «был(а) в сети 5 мин назад»). Иначе
        вместо точного времени показывается «был(а) недавно».
      </GroupHint>
    </SubScreen>
  );
}
