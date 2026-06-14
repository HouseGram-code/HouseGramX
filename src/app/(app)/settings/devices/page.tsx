"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  DeviceMobile,
  Desktop,
  DeviceTabletSpeaker,
  SignOut,
} from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Group, GroupHint, SectionTitle } from "@/components/settings-ui";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth-store";
import {
  listSessions,
  removeSession,
  removeOtherSessions,
  registerSession,
  type DeviceSession,
} from "@/lib/device-sessions";

const ICONS = {
  mobile: DeviceMobile,
  tablet: DeviceTabletSpeaker,
  desktop: Desktop,
} as const;

const rowMotion = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
};

function lastSeenLabel(ts: number, current: boolean): string {
  if (current) return "Это устройство";
  if (!ts) return "Активный сеанс";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 2) return "Был(а) в сети только что";
  if (min < 60) return `Был(а) в сети ${min} мин назад`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `Был(а) в сети ${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Был(а) в сети вчера";
  return `Был(а) в сети ${days} дн. назад`;
}

export default function DevicesPage() {
  const { show } = useToast();
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await listSessions(user?.id);
    setDevices(list);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (user?.id) await registerSession(user.id);
      if (!active) return;
      await refresh();
    })();
    return () => {
      active = false;
    };
  }, [user?.id, refresh]);

  const removeOne = async (sessionId: string) => {
    setDevices((d) => d.filter((x) => x.sessionId !== sessionId));
    if (user?.id) await removeSession(user.id, sessionId);
    show("Сеанс завершён");
  };

  const terminateAll = async () => {
    setDevices((d) => d.filter((x) => x.current));
    if (user?.id) await removeOtherSessions(user.id);
    show("Все прочие сеансы завершены");
  };

  const current = devices.filter((d) => d.current);
  const others = devices.filter((d) => !d.current);

  return (
    <SubScreen title="Устройства">
      <SectionTitle>Текущее устройство</SectionTitle>
      <Group>
        {current.map((d) => (
          <DeviceItem key={d.sessionId} device={d} last />
        ))}
        {current.length === 0 && (
          <div className="px-4 py-3 text-[15px] text-muted">
            {loading ? "Загрузка…" : "Текущее устройство"}
          </div>
        )}
      </Group>

      {others.length > 0 && (
        <>
          <SectionTitle>Активные сеансы</SectionTitle>
          <Group>
            <AnimatePresence initial={false}>
              {others.map((d, i) => (
                <motion.div
                  key={d.sessionId}
                  layout
                  {...rowMotion}
                  className="overflow-hidden"
                >
                  <DeviceItem
                    device={d}
                    last={i === others.length - 1}
                    onRemove={() => removeOne(d.sessionId)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </Group>

          <div className="px-3 pt-5">
            <button
              type="button"
              onClick={terminateAll}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface py-3.5 text-[15px] font-medium text-accent transition active:bg-surface-2"
            >
              <SignOut size={20} weight="bold" />
              Завершить все прочие сеансы
            </button>
          </div>
        </>
      )}

      {!loading && others.length === 0 && (
        <GroupHint>Других активных сеансов нет.</GroupHint>
      )}
    </SubScreen>
  );
}

function DeviceItem({
  device,
  last,
  onRemove,
}: {
  device: DeviceSession;
  last?: boolean;
  onRemove?: () => void;
}) {
  const Icon = ICONS[device.platform] ?? Desktop;
  return (
    <div className="flex items-center gap-3 pl-4">
      <Icon size={26} weight="regular" className="shrink-0 text-muted" />
      <div
        className={`flex flex-1 items-center justify-between py-3 pr-4 ${
          last ? "" : "border-b border-separator"
        }`}
      >
        <div className="min-w-0">
          <p className="truncate text-[15px] text-foreground">
            {device.deviceName}
          </p>
          <p className="truncate text-[13px] text-muted">
            {lastSeenLabel(device.lastSeen, device.current)}
          </p>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-3 shrink-0 text-[14px] font-medium text-accent active:opacity-60"
          >
            Выйти
          </button>
        )}
      </div>
    </div>
  );
}
