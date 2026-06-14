"use client";

import { motion } from "motion/react";
import type { Icon } from "@phosphor-icons/react";

interface EmptyScreenProps {
  title: string;
  icon: Icon;
  hint?: string;
}

/** Заглушка для ещё не реализованных разделов. */
export function EmptyScreen({ title, icon: Icon, hint }: EmptyScreenProps) {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <header className="bg-surface px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">
          {title}
        </h1>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-2"
        >
          <Icon size={44} weight="duotone" className="text-accent" />
        </motion.div>
        <p className="text-[15px] text-muted">
          {hint ?? "Раздел в разработке"}
        </p>
      </div>
    </div>
  );
}
