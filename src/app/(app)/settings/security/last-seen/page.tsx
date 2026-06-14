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
import { useT, type TKey } from "@/lib/i18n";

const OPTIONS: {
  value: LastSeenVisibility;
  labelKey: TKey;
  toast: string;
}[] = [
  { value: "everyone", labelKey: "lastSeenEveryone", toast: "Статус виден всем" },
  {
    value: "contacts",
    labelKey: "lastSeenContacts",
    toast: "Статус виден только контактам",
  },
  { value: "nobody", labelKey: "lastSeenNobody", toast: "Статус скрыт от всех" },
];

export default function LastSeenPrivacyPage() {
  const s = useSettings();
  const t = useT();
  const { show } = useToast();

  return (
    <SubScreen title={t("whoSeesMyStatus")}>
      <SectionTitle>{t("whoSeesMyStatus")}</SectionTitle>
      <Group>
        {OPTIONS.map((o, i) => (
          <ChoiceRow
            key={o.value}
            label={t(o.labelKey)}
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
