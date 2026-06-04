"use client";

import { AnimatePresence, motion } from "motion/react";
import { useConnection, connLabel } from "@/lib/connection-store";

/**
 * Заголовок раздела «Чаты», который как в Telegram превращается в
 * «Соединение… / Обновление… / Ожидание сети…» с анимацией при проблемах.
 */
export function ConnectionTitle() {
  const { state } = useConnection();
  const connecting = state !== "connected";
  const label = connLabel(state);

  return (
    <div className="flex min-h-[34px] items-center">
      <AnimatePresence mode="wait" initial={false}>
        {connecting ? (
          <motion.div
            key="connecting"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2.5"
          >
            <Spinner waiting={state === "waiting"} />
            <span className="text-[19px] font-semibold tracking-tight text-foreground">
              {label}
            </span>
          </motion.div>
        ) : (
          <motion.h1
            key="title"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="text-[28px] font-bold tracking-tight text-foreground"
          >
            Чаты
          </motion.h1>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Круговой индикатор: вращается при соединении, «дышит» при ожидании сети. */
function Spinner({ waiting }: { waiting: boolean }) {
  if (waiting) {
    return (
      <motion.span
        className="block h-[18px] w-[18px] rounded-full border-[2.5px] border-muted-2"
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
    );
  }
  return (
    <motion.span
      className="block h-[18px] w-[18px] rounded-full border-[2.5px] border-accent border-t-transparent"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
    />
  );
}
