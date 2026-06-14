"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  ShareNetwork,
  Plus,
  Check,
  Trash,
  PaperPlaneRight,
} from "@phosphor-icons/react";
import { StickerImage } from "@/components/StickerImage";
import { useStickers, type Sticker, type StickerSet } from "@/lib/stickers-store";
import { buildShareUrl } from "@/lib/sticker-share";
import { useToast } from "@/components/Toast";

interface StickerSetSheetProps {
  open: boolean;
  /** Набор для показа (может быть ещё не установлен). */
  set: StickerSet | null;
  onClose: () => void;
  /** Отправить стикер в текущий чат (если открыто из чата). */
  onSend?: (sticker: Sticker) => void;
}

const overlayHidden = { opacity: 0 };
const overlayShown = { opacity: 1 };
const sheetHidden = { y: "100%" };
const sheetShown = { y: 0 };
const sheetTransition = { type: "spring" as const, stiffness: 380, damping: 38 };
const tileHidden = { scale: 0.6, opacity: 0 };
const tileShown = { scale: 1, opacity: 1 };
const tapScale = { scale: 0.9 };
const tileTransition = (i: number) => ({ delay: Math.min(i * 0.015, 0.3) });

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}

/**
 * Нижний лист набора стикеров (Telegram-стиль).
 * Появляется при тапе по присланному стикеру: превью + «Взять» / «Поделиться».
 */
export function StickerSetSheet({
  open,
  set,
  onClose,
  onSend,
}: StickerSetSheetProps) {
  const { addSet, removeSet, isSetInstalled } = useStickers();
  const { show } = useToast();
  const [justAdded, setJustAdded] = useState(false);

  const installed = set ? isSetInstalled(set.id) || justAdded : false;
  const count = set?.stickers.length ?? 0;

  const handleShare = async () => {
    if (!set) return;
    const url = buildShareUrl(set);
    try {
      if (navigator.share) {
        await navigator.share({ title: set.title, url });
        return;
      }
    } catch {
      /* пользователь отменил — не критично */
    }
    try {
      await navigator.clipboard?.writeText(url);
      show("Ссылка на набор скопирована");
    } catch {
      show("Не удалось скопировать ссылку");
    }
  };

  const handleAdd = () => {
    if (!set) return;
    addSet(set);
    setJustAdded(true);
    show(`Набор «${set.title}» добавлен`);
  };

  const handleRemove = () => {
    if (!set) return;
    removeSet(set.id);
    setJustAdded(false);
    show("Набор убран");
  };

  return (
    <AnimatePresence onExitComplete={() => setJustAdded(false)}>
      {open && set && (
        <>
          <motion.div
            initial={overlayHidden}
            animate={overlayShown}
            exit={overlayHidden}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40"
          />
          <motion.div
            initial={sheetHidden}
            animate={sheetShown}
            exit={sheetHidden}
            transition={sheetTransition}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[82dvh] max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-surface"
          >
            {/* Шапка */}
            <div className="flex items-center gap-3 border-b border-separator px-4 py-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-2">
                {set.stickers[0] ? (
                  <StickerImage sticker={set.stickers[0]} size={34} />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[16px] font-semibold text-foreground">
                  {set.title}
                </h2>
                <p className="truncate text-[13px] text-muted">
                  {plural(count, "стикер", "стикера", "стикеров")}
                  {set.author ? ` · ${set.author}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="shrink-0 text-muted transition active:opacity-60"
              >
                <X size={22} weight="bold" />
              </button>
            </div>

            {/* Сетка стикеров */}
            <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
              <div className="grid grid-cols-4 gap-2">
                {set.stickers.map((sticker, i) => (
                  <motion.button
                    key={sticker.id}
                    type="button"
                    initial={tileHidden}
                    animate={tileShown}
                    transition={tileTransition(i)}
                    whileTap={tapScale}
                    onClick={() => {
                      if (onSend) {
                        onSend({ ...sticker, setId: set.id });
                        onClose();
                      }
                    }}
                    className="flex aspect-square items-center justify-center rounded-2xl transition-colors hover:bg-surface-2"
                    aria-label={sticker.name}
                  >
                    <StickerImage sticker={sticker} size={72} />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex items-center gap-2 border-t border-separator px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
              <button
                type="button"
                onClick={handleShare}
                aria-label="Поделиться"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-foreground transition active:scale-95"
              >
                <ShareNetwork size={22} weight="bold" />
              </button>

              {installed ? (
                set.custom ? (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-surface-2 text-[15px] font-semibold text-accent transition active:scale-[0.99]"
                  >
                    <Trash size={20} weight="bold" />
                    Удалить набор
                  </button>
                ) : (
                  <div className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-surface-2 text-[15px] font-semibold text-muted">
                    <Check size={20} weight="bold" />
                    Набор добавлен
                  </div>
                )
              ) : (
                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-semibold text-white shadow-sm transition active:scale-[0.99]"
                >
                  <Plus size={20} weight="bold" />
                  Взять {plural(count, "стикер", "стикера", "стикеров")}
                </button>
              )}

              {onSend && (
                <button
                  type="button"
                  onClick={() => {
                    if (set.stickers[0]) {
                      onSend({ ...set.stickers[0], setId: set.id });
                      onClose();
                    }
                  }}
                  aria-label="Отправить"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-foreground transition active:scale-95"
                >
                  <PaperPlaneRight size={22} weight="bold" />
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
