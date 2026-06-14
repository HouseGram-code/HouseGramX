"use client";

import { useRouter } from "next/navigation";
import { Sticker, Fire } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Group, NavRow, ToggleRow } from "@/components/settings-ui";
import { AnimatedReaction } from "@/components/AnimatedReaction";
import { Switch } from "@/components/Switch";
import { useSettings } from "@/lib/settings-store";
import { getReaction } from "@/lib/reactions";

export default function MessagesPage() {
  const s = useSettings();
  const router = useRouter();
  const reaction = getReaction(s.quickReaction);

  return (
    <SubScreen title="Сообщения">
      <div className="flex flex-col gap-4 pt-4">
        {/* Отправка по вводу */}
        <Group>
          <ToggleRow
            label="Отправка по вводу"
            checked={s.enterToSend}
            onChange={(v) => s.set("enterToSend", v)}
            last
          />
        </Group>

        {/* Настройки стикеров */}
        <Group>
          <NavRow
            icon={Sticker}
            label="Настройки стикеров"
            onClick={() => router.push("/settings/messages/stickers")}
            last
          />
        </Group>

        {/* Быстрая реакция + выбранная реакция */}
        <div className="flex flex-col gap-px">
          <Group>
            <div className="flex w-full items-center gap-3 pl-4">
              <Fire
                size={22}
                weight="regular"
                className="shrink-0 text-muted"
              />
              <div className="flex flex-1 items-center justify-between py-3 pr-4">
                <div className="min-w-0 pr-3">
                  <p className="text-[15px] text-foreground">Быстрая реакция</p>
                  <p className="text-[12px] leading-snug text-muted">
                    Для реакции дважды нажмите на сообщение
                  </p>
                </div>
                <Switch
                  checked={s.quickReactionEnabled}
                  onChange={(v) => s.set("quickReactionEnabled", v)}
                />
              </div>
            </div>
          </Group>

          <Group>
            <button
              type="button"
              disabled={!s.quickReactionEnabled}
              onClick={() => router.push("/settings/messages/reaction")}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2 disabled:opacity-40"
            >
              <span className="text-[15px] text-foreground">
                Выбранная реакция
              </span>
              <AnimatedReaction
                reaction={reaction}
                size={24}
                animate={s.quickReactionEnabled}
              />
            </button>
          </Group>
        </div>
      </div>
    </SubScreen>
  );
}
