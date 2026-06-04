"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { useChats } from "@/lib/chat-store";

interface ForwardSheetProps {
  open: boolean;
  /** Чат-источник исключаем из списка (необязательно). */
  excludeId?: string;
  onClose: () => void;
  onPick: (chatId: string) => void;
}

/** Нижний лист выбора чата для пересылки. */
export function ForwardSheet({
  open,
  excludeId,
  onClose,
  onPick,
}: ForwardSheetProps) {
  const { conversations } = useChats();
  const list = conversations.filter((c) => c.id !== excludeId);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[70dvh] max-w-2xl overflow-hidden rounded-t-3xl bg-surface"
          >
            <div className="flex items-center justify-between border-b border-separator px-4 py-3">
              <h2 className="text-[17px] font-semibold text-foreground">
                Переслать
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="text-muted transition active:opacity-60"
              >
                <X size={22} weight="bold" />
              </button>
            </div>

            <div className="no-scrollbar max-h-[55dvh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),8px)]">
              {list.length > 0 ? (
                list.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onPick(c.id);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
                  >
                    <Avatar initials={c.initials} color={c.color} size={46} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-foreground">
                        {c.title}
                      </span>
                      <span className="block text-[13px] text-muted">
                        {c.kind === "channel"
                          ? "Канал"
                          : c.kind === "bot"
                            ? "Бот"
                            : "Личный чат"}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-5 py-10 text-center text-sm text-muted">
                  Нет других чатов для пересылки
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
