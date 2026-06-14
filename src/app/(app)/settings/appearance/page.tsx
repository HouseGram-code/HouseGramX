"use client";

import { useRouter } from "next/navigation";
import { Image as ImageIcon } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import {
  ChoiceRow,
  Group,
  GroupHint,
  NavRow,
  SectionTitle,
} from "@/components/settings-ui";
import { useSettings, type Theme } from "@/lib/settings-store";
import { wallpaperBySrc } from "@/lib/wallpapers";

const options: { key: Theme; label: string }[] = [
  { key: "system", label: "Как в системе" },
  { key: "light", label: "Светлая" },
  { key: "dark", label: "Тёмная" },
];

export default function AppearancePage() {
  const s = useSettings();
  const router = useRouter();

  const wpLabel = s.wallpaper
    ? (wallpaperBySrc(s.wallpaper)?.name ?? "Свои")
    : "Нет";

  return (
    <SubScreen title="Оформление">
      <SectionTitle>Тема</SectionTitle>
      <Group>
        {options.map((o, i) => (
          <ChoiceRow
            key={o.key}
            label={o.label}
            selected={s.theme === o.key}
            onClick={() => s.set("theme", o.key)}
            last={i === options.length - 1}
          />
        ))}
      </Group>
      <GroupHint>
        «Как в системе» автоматически подстраивается под настройки вашего
        устройства.
      </GroupHint>

      <SectionTitle>Чат</SectionTitle>
      <Group>
        <NavRow
          icon={ImageIcon}
          label="Обои для чата"
          value={wpLabel}
          onClick={() => router.push("/settings/appearance/wallpaper")}
          last
        />
      </Group>
      <GroupHint>Выберите фон, который увидите во всех чатах.</GroupHint>
    </SubScreen>
  );
}
