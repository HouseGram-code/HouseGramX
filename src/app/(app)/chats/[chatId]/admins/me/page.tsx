"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { Switch } from "@/components/Switch";
import { useProfile } from "@/lib/profile-store";

interface Perm {
  key: string;
  label: string;
  hint?: string;
}

const groups: Perm[][] = [
  [{ key: "edit", label: "Редактировать канал", hint: "Фото, название, описание" }],
  [
    { key: "post", label: "Писать посты" },
    { key: "editPosts", label: "Редактировать чужие посты" },
    { key: "deletePosts", label: "Удалять чужие посты" },
    { key: "pin", label: "Закреплять посты" },
  ],
  [{ key: "members", label: "Добавлять и удалять подписчиков" }],
  [{ key: "admins", label: "Назначать и удалять администраторов" }],
];

export default function AdminRightsPage() {
  const router = useRouter();
  const { profile, initials } = useProfile();
  // Владелец: все права включены и заблокированы для изменения.
  const [perms] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.flat().map((p) => [p.key, true]))
  );

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
            initials={initials}
            color={profile.color}
            size={48}
            src={profile.avatar || undefined}
          />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-foreground">
              {profile.name}
            </span>
            <span className="block text-[13px] text-muted">Это вы</span>
          </span>
        </div>

        {groups.map((group, gi) => (
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
                  {p.hint && (
                    <p className="text-[12px] text-muted">{p.hint}</p>
                  )}
                </div>
                {/* Владельцу нельзя снять права — переключатели заблокированы */}
                <Switch checked={perms[p.key]} onChange={() => {}} disabled />
              </div>
            ))}
          </div>
        ))}

        <p className="px-5 text-[13px] leading-relaxed text-muted">
          Вы — владелец канала, у вас есть все права.
        </p>
      </div>
    </div>
  );
}
