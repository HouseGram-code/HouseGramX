"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  PencilSimple,
  ArrowBendUpLeft,
  ArrowBendUpRight,
  Copy,
  LinkSimple,
  Chat,
  PushPin,
  CheckCircle,
  Trash,
  type Icon,
} from "@phosphor-icons/react";
import { ReactionBar } from "@/components/ReactionBar";

export interface MessageAction {
  key: string;
  label: string;
  icon: Icon;
  danger?: boolean;
  onClick: () => void;
}

interface MessageActionsProps {
  open: boolean;
  onClose: () => void;
  reactions: string[];
  onReact: (emoji: string) => void;
  actions: MessageAction[];
}

/** Полноэкранное меню действий над сообщением (реакции + пункты). */
export function MessageActions({
  open,
  onClose,
  reactions,
  onReact,
  actions,
}: MessageActionsProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-2xl flex-col gap-3 px-3 pb-[max(env(safe-area-inset-bottom),12px)]"
          >
            {/* Панель реакций */}
            <div className="flex justify-start">
              <ReactionBar
                reactions={reactions}
                onPick={(e) => {
                  onReact(e);
                  onClose();
                }}
                onMore={onClose}
              />
            </div>

            {/* Меню действий */}
            <div className="overflow-hidden rounded-3xl bg-surface shadow-xl">
              {actions.map((a, i) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => {
                      a.onClick();
                      onClose();
                    }}
                    className={`flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors active:bg-surface-2 ${
                      i < actions.length - 1 ? "border-b border-separator" : ""
                    }`}
                  >
                    <Icon
                      size={24}
                      weight="regular"
                      className={a.danger ? "text-accent" : "text-foreground"}
                    />
                    <span
                      className={`text-[16px] ${
                        a.danger ? "text-accent" : "text-foreground"
                      }`}
                    >
                      {a.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Реэкспорт иконок для удобства формирования действий снаружи.
export const ActionIcons = {
  edit: PencilSimple,
  reply: ArrowBendUpLeft,
  forward: ArrowBendUpRight,
  copy: Copy,
  copyLink: LinkSimple,
  unread: Chat,
  pin: PushPin,
  select: CheckCircle,
  delete: Trash,
};
