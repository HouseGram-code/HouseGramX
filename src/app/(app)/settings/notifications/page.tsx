"use client";

import { useEffect, useState } from "react";
import {
  SpeakerHigh,
  Vibrate,
  Eye,
  BellRinging,
  DeviceMobile,
} from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Group, GroupHint, SectionTitle, ToggleRow } from "@/components/settings-ui";
import { useSettings } from "@/lib/settings-store";
import { useToast } from "@/components/Toast";
import {
  notificationsSupported,
  notificationPermission,
  requestNotificationPermission,
  notify,
} from "@/lib/notify";
import {
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
} from "@/lib/push";

export default function NotificationsPage() {
  const s = useSettings();
  const { show } = useToast();
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    setPerm(notificationPermission());
    isPushSubscribed().then(setPushOn);
  }, []);

  // При включении уведомлений просим разрешение браузера.
  const handleToggle = async (v: boolean) => {
    if (v && !notificationsSupported()) {
      show("Ваш браузер не поддерживает уведомления");
      return;
    }
    s.set("notificationsEnabled", v);
    if (v) {
      const ok = await requestNotificationPermission();
      setPerm(notificationPermission());
      if (ok) {
        show("Уведомления включены");
      } else if (notificationPermission() === "denied") {
        show("Уведомления заблокированы в настройках браузера");
      } else {
        show("Разрешите уведомления, чтобы получать оповещения");
      }
    }
  };

  // Фоновые push: подписка/отписка.
  const handlePushToggle = async (v: boolean) => {
    setPushBusy(true);
    try {
      if (v) {
        if (!s.notificationsEnabled) s.set("notificationsEnabled", true);
        const granted = await requestNotificationPermission();
        setPerm(notificationPermission());
        if (!granted) {
          show("Сначала разрешите уведомления в браузере");
          return;
        }
        const ok = await subscribeToPush();
        setPushOn(ok);
        show(
          ok
            ? "Фоновые уведомления включены"
            : "Не удалось включить push. Попробуйте перезагрузить страницу и повторить"
        );
      } else {
        await unsubscribeFromPush();
        setPushOn(false);
        show("Фоновые уведомления выключены");
      }
    } finally {
      setPushBusy(false);
    }
  };

  const testNotification = () => {
    const shown = notify({
      title: "Проверка уведомлений 🔔",
      body: "Так будут выглядеть уведомления о новых сообщениях.",
      tag: "__test__",
      sound: s.sound,
      vibration: s.vibration,
    });
    if (!shown) show("Разрешите уведомления в браузере");
  };

  return (
    <SubScreen title="Уведомления и звук">
      <SectionTitle>Уведомления</SectionTitle>
      <Group>
        <ToggleRow
          icon={BellRinging}
          label="Показывать уведомления"
          checked={s.notificationsEnabled}
          onChange={handleToggle}
          last
        />
      </Group>
      <GroupHint>
        {!notificationsSupported() ? (
          "Ваш браузер не поддерживает уведомления."
        ) : perm === "granted" ? (
          "Браузер разрешил уведомления — всё готово."
        ) : perm === "denied" ? (
          <span className="text-accent">
            Уведомления заблокированы в настройках браузера. Разрешите их для
            этого сайта, чтобы получать оповещения.
          </span>
        ) : (
          "Включите, чтобы получать оповещения о новых сообщениях."
        )}
      </GroupHint>

      {pushSupported() && (
        <>
          <SectionTitle>Фоновые уведомления</SectionTitle>
          <Group>
            <ToggleRow
              icon={DeviceMobile}
              label="Push при закрытом приложении"
              checked={pushOn}
              onChange={handlePushToggle}
              disabled={pushBusy}
              last
            />
          </Group>
          <GroupHint>
            Уведомления будут приходить, даже когда вкладка закрыта. Требуется
            один раз разрешить уведомления в браузере.
          </GroupHint>
        </>
      )}

      <SectionTitle>Оповещения</SectionTitle>
      <Group>
        <ToggleRow
          icon={SpeakerHigh}
          label="Звук"
          checked={s.sound}
          onChange={(v) => s.set("sound", v)}
          disabled={!s.notificationsEnabled}
        />
        <ToggleRow
          icon={Vibrate}
          label="Вибрация"
          checked={s.vibration}
          onChange={(v) => s.set("vibration", v)}
          disabled={!s.notificationsEnabled}
        />
        <ToggleRow
          icon={Eye}
          label="Предпросмотр текста"
          checked={s.messagePreview}
          onChange={(v) => s.set("messagePreview", v)}
          disabled={!s.notificationsEnabled}
          last
        />
      </Group>
      <GroupHint>
        Превью показывает текст сообщения прямо в уведомлении на экране
        блокировки.
      </GroupHint>

      <div className="px-3 pt-4">
        <button
          type="button"
          onClick={testNotification}
          disabled={!s.notificationsEnabled}
          className="w-full rounded-2xl bg-surface py-3.5 text-[15px] font-medium text-accent transition active:opacity-60 disabled:opacity-40"
        >
          Проверить уведомление
        </button>
      </div>
    </SubScreen>
  );
}
