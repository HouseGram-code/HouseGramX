"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Check, LinkSimple, Users } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { useContacts } from "@/lib/contacts-store";

interface CallInviteSheetProps {
  open: boolean;
  /** id участников группы, которых можно позвать (ещё не в звонке). */
  candidateIds: string[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
  onCopyLink: () => void;
}

/** Нижний лист «Добавить в звонок»: выбор участников или ссылка. */
export function CallInviteSheet({
  open,
  candidateIds,
  onClose,
  onAdd,
  onCopyLink,
}: CallInviteSheetProps) {
  const { getContact } = useContacts();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const candidates = candidateIds
    .map((id) => getContact(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const confirm = () => {
    if (selected.size) onAdd(Array.from(selected));
    setSelected(new Set());
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[75dvh] max-w-2xl flex-col rounded-t-3xl bg-surface"
          >
            <div className="flex items-center justify-between border-b border-separator px-4 py-3">
              <h2 className="text-[17px] font-semibold text-foreground">
                Добавить в звонок
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

            {/* Поделиться ссылкой */}
            <button
              type="button"
              onClick={() => {
                onCopyLink();
                onClose();
              }}
              className="flex items-center gap-3 border-b border-separator px-4 py-3 text-left text-accent transition-colors hover:bg-surface-2/60 active:bg-surface-2"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10">
                <LinkSimple size={22} weight="regular" />
              </span>
              <span className="text-[15px] font-medium">
                Пригласить по ссылке
              </span>
            </button>

            <div className="no-scrollbar flex-1 overflow-y-auto pb-2">
              {candidates.length > 0 ? (
                candidates.map((c) => {
                  const checked = selected.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          checked
                            ? "border-accent bg-accent text-white"
                            : "border-muted-2"
                        }`}
                      >
                        {checked && <Check size={14} weight="bold" />}
                      </span>
                      <Avatar initials={c.initials} color={c.color} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-foreground">
                          {c.name}
                        </span>
                        <span className="block text-[13px] text-muted">
                          {c.status}
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center gap-2 px-8 py-10 text-center">
                  <Users size={36} weight="duotone" className="text-muted-2" />
                  <p className="text-sm text-muted">
                    Все участники уже в звонке. Пригласите новых по ссылке.
                  </p>
                </div>
              )}
            </div>

            {candidates.length > 0 && (
              <div className="border-t border-separator px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={confirm}
                  disabled={selected.size === 0}
                  className="w-full rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-white shadow-sm transition disabled:opacity-40"
                >
                  {selected.size > 0
                    ? `Добавить (${selected.size})`
                    : "Выберите участников"}
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
