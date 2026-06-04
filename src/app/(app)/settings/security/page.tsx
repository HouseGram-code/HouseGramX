"use client";

import { Password, ShieldCheck, Checks } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import {
  Group,
  GroupHint,
  SectionTitle,
  ToggleRow,
} from "@/components/settings-ui";
import { useSettings } from "@/lib/settings-store";
import { useToast } from "@/components/Toast";

export default function SecurityPage() {
  const s = useSettings();
  const { show } = useToast();

  return (
    <SubScreen title="Безопасность">
      <SectionTitle>Доступ</SectionTitle>
      <Group>
        <ToggleRow
          icon={Password}
          label="Код-пароль"
          checked={s.passcode}
          onChange={(v) => {
            s.set("passcode", v);
            show(v ? "Код-пароль включён" : "Код-пароль выключен");
          }}
        />
        <ToggleRow
          icon={ShieldCheck}
          label="Двухэтапная проверка"
          checked={s.twoFactor}
          onChange={(v) => {
            s.set("twoFactor", v);
            show(v ? "2FA включена" : "2FA выключена");
          }}
          last
        />
      </Group>
      <GroupHint>
        Двухэтапная проверка добавляет пароль при входе с нового устройства.
      </GroupHint>

      <SectionTitle>Приватность</SectionTitle>
      <Group>
        <ToggleRow
          icon={Checks}
          label="Отчёты о прочтении"
          checked={s.readReceipts}
          onChange={(v) => s.set("readReceipts", v)}
          last
        />
      </Group>
      <GroupHint>
        Если выключено, вы не будете видеть отчёты о прочтении других
        пользователей, а они — ваши.
      </GroupHint>
    </SubScreen>
  );
}
