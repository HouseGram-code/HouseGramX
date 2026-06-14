"use client";

import { SubScreen } from "@/components/SubScreen";
import { Group, GroupHint, SectionTitle, ChoiceRow } from "@/components/settings-ui";
import { useSettings, type Language } from "@/lib/settings-store";
import { useT } from "@/lib/i18n";

const langs: { value: Language; label: string }[] = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "uk", label: "Українська" },
  { value: "kk", label: "Қазақша" },
];

export default function LanguagePage() {
  const s = useSettings();
  const t = useT();
  return (
    <SubScreen title={t("language")}>
      <SectionTitle>{t("interfaceLanguage")}</SectionTitle>
      <Group>
        {langs.map((l, i) => (
          <ChoiceRow
            key={l.value}
            label={l.label}
            selected={s.language === l.value}
            onClick={() => s.set("language", l.value)}
            last={i === langs.length - 1}
          />
        ))}
      </Group>
      <GroupHint>{t("languageHint")}</GroupHint>
    </SubScreen>
  );
}
