"use client";

import { useState } from "react";
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

interface Device {
  id: string;
  name: string;
  meta: string;
  current?: boolean;
  icon: typeof DeviceMobile;
}

const initialDevices: Device[] = [
  {
    id: "1",
    name: "iPhone 17 Pro",
    meta: "Это устройство · Москва",
    current: true,
    icon: DeviceMobile,
  },
  {
    id: "2",
    name: "MacBook Pro",
    meta: "Был в сети сегодня, 11:20",
    icon: Desktop,
  },
  {
    id: "3",
    name: "iPad Air",
    meta: "Был в сети вчера, 19:05",
    icon: DeviceTabletSpeaker,
  },
];

export default function DevicesPage() {
  const { show } = useToast();
  const [devices, setDevices] = useState(initialDevices);

  const removeDevice = (id: string) => {
    setDevices((d) => d.filter((x) => x.id !== id));
    show("Сеанс завершён");
  };

  const terminateAll = () => {
    setDevices((d) => d.filter((x) => x.current));
    show("Все прочие сеансы завершены");
  };

  const others = devices.filter((d) => !d.current);

  return (
    <SubScreen title="Устройства">
      <SectionTitle>Текущее устройство</SectionTitle>
      <Group>
        {devices
          .filter((d) => d.current)
          .map((d) => (
            <DeviceItem key={d.id} device={d} last />
          ))}
      </Group>

      {others.length > 0 && (
        <>
          <SectionTitle>Активные сеансы</SectionTitle>
          <Group>
            <AnimatePresence initial={false}>
              {others.map((d, i) => (
                <motion.div
                  key={d.id}
                  layout
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <DeviceItem
                    device={d}
                    last={i === others.length - 1}
                    onRemove={() => removeDevice(d.id)}
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

      {others.length === 0 && (
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
  device: Device;
  last?: boolean;
  onRemove?: () => void;
}) {
  const Icon = device.icon;
  return (
    <div className="flex items-center gap-3 pl-4">
      <Icon size={26} weight="regular" className="shrink-0 text-muted" />
      <div
        className={`flex flex-1 items-center justify-between py-3 pr-4 ${
          last ? "" : "border-b border-separator"
        }`}
      >
        <div className="min-w-0">
          <p className="truncate text-[15px] text-foreground">{device.name}</p>
          <p className="truncate text-[13px] text-muted">{device.meta}</p>
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
