"use client";

import { useRouter } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react";
import { motion } from "motion/react";

/** Обёртка подэкрана настроек с шапкой и кнопкой «Назад». */
export function SubScreen({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Слот справа в шапке (например, меню «три точки»). */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="settings-bg flex h-full flex-1 flex-col">
      <header className="glass-header sticky top-0 z-20 flex items-center gap-1 border-b border-separator px-2 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2.5">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex shrink-0 items-center gap-0.5 rounded-lg pr-2 text-accent transition active:opacity-60"
        >
          <CaretLeft size={24} weight="bold" />
          <span className="text-[16px]">Назад</span>
        </button>

        <div className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center">
          <h1 className="text-[17px] font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <span className="text-[12px] text-muted">{subtitle}</span>
          )}
        </div>

        {action && <div className="ml-auto shrink-0">{action}</div>}
      </header>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="no-scrollbar flex-1 overflow-y-auto pb-8"
      >
        {children}
      </motion.div>
    </div>
  );
}
