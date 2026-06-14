"use client";

import { Prohibit } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Group, GroupHint } from "@/components/settings-ui";
import { Avatar } from "@/components/Avatar";
import { useChats } from "@/lib/chat-store";
import { useT } from "@/lib/i18n";

/**
 * Список заблокированных пользователей.
 * Настройки «последний визит» и «отчёты о прочтении» находятся
 * в разделе «Безопасность» (/settings/security).
 */
export default function BlockedUsersPage() {
  const t = useT();
  const { conversations, toggleBlock } = useChats();
  const blocked = conversations.filter((c) => c.blocked);

  return (
    <SubScreen title={t("blockedUsers")}>
      <div className="pt-4" />
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
                {t("unblock")}
              </button>
            </div>
          ))}
        </Group>
      ) : (
        <Group>
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-muted">
            <Prohibit size={36} weight="light" />
            <span className="text-[15px]">{t("noBlocked")}</span>
          </div>
        </Group>
      )}
      <GroupHint>{t("blockedHint")}</GroupHint>
    </SubScreen>
  );
}
