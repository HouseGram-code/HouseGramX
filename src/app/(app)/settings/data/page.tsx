"use client";

import { useEffect, useState } from "react";
import { ChatCircle, Sticker, Broom } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Group, GroupHint, SectionTitle } from "@/components/settings-ui";
import { ConfirmSheet, type ConfirmConfig } from "@/components/ConfirmSheet";

const STORES: { key: string; label: string }[] = [
  { key: "messenger.chats.v2", label: "Чаты и сообщения" },
  { key: "messenger.stickers.v1", label: "Стикеры" },
  { key: "messenger.profile.v1", label: "Профиль" },
  { key: "messenger.contacts.v1", label: "Контакты" },
  { key: "messenger.calls.v1", label: "Звонки" },
  { key: "messenger.settings.v1", label: "Настройки" },
  { key: "messenger.folders.v1", label: "Папки" },
];

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

export default function DataPage() {
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  const measure = () => {
    if (typeof window === "undefined") return;
    const next: Record<string, number> = {};
    for (const st of STORES) {
      const v = window.localStorage.getItem(st.key);
      next[st.key] = v ? new Blob([v]).size : 0;
    }
    setSizes(next);
  };

  useEffect(() => {
    measure();
  }, []);

  const total = Object.values(sizes).reduce((a, b) => a + b, 0);

  const clearKeys = (keys: string[], reload: boolean) => {
    for (const k of keys) window.localStorage.removeItem(k);
    if (reload) window.location.reload();
    else measure();
  };

  return (
    <SubScreen title="Данные и память">
      <SectionTitle>Использование памяти</SectionTitle>
      <Group>
        {STORES.map((st, i) => (
          <div
            key={st.key}
            className={
              "flex items-center justify-between px-4 py-3" +
              (i !== STORES.length - 1 ? " border-b border-separator" : "")
            }
          >
            <span className="text-[15px] text-foreground">{st.label}</span>
            <span className="text-[14px] text-muted">{fmt(sizes[st.key] ?? 0)}</span>
          </div>
        ))}
      </Group>
      <GroupHint>Всего занято на этом устройстве: {fmt(total)}.</GroupHint>

      <SectionTitle>Очистка</SectionTitle>
      <Group>
        <button
          type="button"
          onClick={() =>
            setConfirm({
              title: "Очистить кэш чатов?",
              message: "Сообщения будут повторно загружены из облака.",
              confirmLabel: "Очистить",
              danger: true,
              onConfirm: () => clearKeys(["messenger.chats.v2"], true),
            })
          }
          className="flex w-full items-center gap-3 border-b border-separator px-4 py-3.5 text-left transition-colors active:bg-surface-2"
        >
          <ChatCircle size={22} className="shrink-0 text-muted" />
          <span className="flex-1 text-[15px] text-foreground">
            Очистить кэш чатов
          </span>
        </button>
        <button
          type="button"
          onClick={() =>
            setConfirm({
              title: "Очистить стикеры?",
              confirmLabel: "Очистить",
              danger: true,
              onConfirm: () => clearKeys(["messenger.stickers.v1"], false),
            })
          }
          className="flex w-full items-center gap-3 border-b border-separator px-4 py-3.5 text-left transition-colors active:bg-surface-2"
        >
          <Sticker size={22} className="shrink-0 text-muted" />
          <span className="flex-1 text-[15px] text-foreground">
            Очистить кэш стикеров
          </span>
        </button>
        <button
          type="button"
          onClick={() =>
            setConfirm({
              title: "Очистить все данные?",
              message:
                "Все локальные данные приложения будут удалены с этого устройства. Аккаунт и облачные данные не пострадают.",
              confirmLabel: "Очистить всё",
              danger: true,
              onConfirm: () => clearKeys(STORES.map((st) => st.key), true),
            })
          }
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-surface-2"
        >
          <Broom size={22} className="shrink-0 text-red-500" />
          <span className="flex-1 text-[15px] font-medium text-red-500">
            Очистить все данные
          </span>
        </button>
      </Group>
      <GroupHint>
        Очистка удаляет только локальный кэш на этом устройстве. Данные в облаке
        сохраняются.
      </GroupHint>

      <ConfirmSheet config={confirm} onClose={() => setConfirm(null)} />
    </SubScreen>
  );
}
