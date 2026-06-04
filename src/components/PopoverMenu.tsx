"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon: Icon;
  onClick: () => void;
  danger?: boolean;
}

interface PopoverMenuProps {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  /** Выравнивание по правому краю триггера. */
  align?: "left" | "right";
}

/** Контекстное меню-поповер (как в MAX: «Изменить / Очистить»). */
export function PopoverMenu({
  open,
  onClose,
  items,
  align = "right",
}: PopoverMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.92, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -6 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "absolute top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-2xl bg-surface py-1 shadow-xl ring-1 ring-separator",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  item.onClick();
                  onClose();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2"
              >
                <Icon
                  size={20}
                  weight="regular"
                  className={item.danger ? "text-accent" : "text-foreground"}
                />
                <span
                  className={cn(
                    "text-[15px]",
                    item.danger ? "text-accent" : "text-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
