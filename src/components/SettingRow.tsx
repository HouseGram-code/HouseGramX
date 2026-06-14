"use client";

import { motion } from "motion/react";
import { CaretRight, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SettingRowProps {
  icon: Icon;
  label: string;
  /** Цвет иконки. По умолчанию приглушённый. */
  iconColor?: string;
  /** Скрыть нижний разделитель (для последней строки в группе). */
  last?: boolean;
  index?: number;
}

export function SettingRow({
  icon: Icon,
  label,
  iconColor = "var(--muted)",
  last,
  index = 0,
}: SettingRowProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      whileTap={{ backgroundColor: "rgba(120,120,128,0.12)" }}
      className="flex w-full items-center gap-3 pl-4 text-left"
    >
      <Icon size={22} weight="regular" style={{ color: iconColor }} className="shrink-0" />
      <div
        className={cn(
          "flex flex-1 items-center justify-between py-3.5 pr-4",
          !last && "border-b border-separator"
        )}
      >
        <span className="text-[15px] text-foreground">{label}</span>
        <CaretRight size={18} weight="bold" className="text-muted-2" />
      </div>
    </motion.button>
  );
}
