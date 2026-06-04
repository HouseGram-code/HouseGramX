"use client";

import { AnimatePresence, motion } from "motion/react";

export interface ConfirmAction {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

export interface ConfirmConfig {
  title: string;
  message?: string;
  /** Один основной вариант (упрощённая форма). */
  confirmLabel?: string;
  danger?: boolean;
  onConfirm?: () => void;
  /** Несколько вариантов действий (как в MAX). */
  actions?: ConfirmAction[];
}

interface ConfirmSheetProps {
  config: ConfirmConfig | null;
  onClose: () => void;
}

/** Нижний лист-подтверждение с одним или несколькими действиями. */
export function ConfirmSheet({ config, onClose }: ConfirmSheetProps) {
  const actions: ConfirmAction[] =
    config?.actions ??
    (config?.confirmLabel
      ? [
          {
            label: config.confirmLabel,
            danger: config.danger,
            onClick: config.onConfirm ?? (() => {}),
          },
        ]
      : []);

  return (
    <AnimatePresence>
      {config && (
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
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl"
          >
            <div className="mx-2 mb-2 overflow-hidden rounded-3xl bg-surface">
              <div className="px-6 py-5 text-center">
                <p className="text-[16px] font-semibold text-foreground">
                  {config.title}
                </p>
                {config.message && (
                  <p className="mt-1 text-[14px] leading-relaxed text-muted">
                    {config.message}
                  </p>
                )}
              </div>
              {actions.map((a, i) => (
                <div key={i}>
                  <div className="h-px bg-separator" />
                  <button
                    type="button"
                    onClick={() => {
                      a.onClick();
                      onClose();
                    }}
                    className={`w-full py-4 text-[16px] font-semibold transition active:bg-surface-2 ${
                      a.danger ? "text-accent" : "text-foreground"
                    }`}
                  >
                    {a.label}
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mx-2 mb-[max(env(safe-area-inset-bottom),8px)] w-[calc(100%-1rem)] rounded-3xl bg-surface py-4 text-[16px] font-semibold text-foreground transition active:bg-surface-2"
            >
              Отменить
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
