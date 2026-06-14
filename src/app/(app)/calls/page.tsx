"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneX,
  VideoCamera,
  Trash,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { useCalls, type CallRecord } from "@/lib/calls-store";
import { useToast } from "@/components/Toast";

function formatDuration(sec: number) {
  if (sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} мин ${s} с` : `${s} с`;
}

function formatWhen(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return `сегодня, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `вчера, ${time}`;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function CallIcon({ call }: { call: CallRecord }) {
  if (call.direction === "missed")
    return <PhoneX size={16} weight="bold" className="text-accent" />;
  if (call.direction === "incoming")
    return <PhoneIncoming size={16} weight="bold" className="text-green-500" />;
  return <PhoneOutgoing size={16} weight="bold" className="text-muted" />;
}

export default function CallsPage() {
  const { calls, clearCalls, removeCall } = useCalls();
  const { show } = useToast();

  const grouped = useMemo(() => calls, [calls]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface">
      <header className="z-10 bg-surface px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">
            Звонки
          </h1>
          {calls.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearCalls();
                show("История звонков очищена");
              }}
              className="text-[15px] font-medium text-accent transition active:opacity-60"
            >
              Очистить
            </button>
          )}
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto border-t border-separator">
        {grouped.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-10 py-24 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-2">
              <Phone size={44} weight="duotone" className="text-accent" />
            </div>
            <div className="space-y-1.5">
              <p className="text-lg font-semibold text-foreground">
                Нет звонков
              </p>
              <p className="text-sm leading-relaxed text-muted">
                Здесь появится история ваших аудио- и видеозвонков.
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {grouped.map((call) => (
              <motion.div
                key={call.id}
                layout
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 overflow-hidden px-4 py-2.5"
              >
                <Avatar initials={call.initials} color={call.color} size={48} />
                <div className="min-w-0 flex-1 border-b border-separator pb-2.5">
                  <p
                    className={`truncate text-[15px] font-semibold ${
                      call.direction === "missed"
                        ? "text-accent"
                        : "text-foreground"
                    }`}
                  >
                    {call.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
                    <CallIcon call={call} />
                    {call.direction === "missed"
                      ? "Пропущенный"
                      : call.direction === "incoming"
                        ? "Входящий"
                        : "Исходящий"}
                    {call.duration > 0 && ` · ${formatDuration(call.duration)}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-[12px] text-muted">
                    {formatWhen(call.ts)}
                  </span>
                  {call.type === "video" ? (
                    <VideoCamera size={20} weight="regular" className="text-muted-2" />
                  ) : (
                    <Phone size={18} weight="regular" className="text-muted-2" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeCall(call.id)}
                    aria-label="Удалить"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-2 transition hover:bg-surface-2 hover:text-accent"
                  >
                    <Trash size={16} weight="regular" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
