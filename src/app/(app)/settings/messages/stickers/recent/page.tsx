"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DotsThreeVertical, PencilSimple, Trash, X } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { PopoverMenu } from "@/components/PopoverMenu";
import { StickerImage } from "@/components/StickerImage";
import { useStickers } from "@/lib/stickers-store";
import { useToast } from "@/components/Toast";

export default function RecentStickersPage() {
  const { recent, getSticker, clearRecent } = useStickers();
  const { show } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const stickers = recent
    .map((id) => getSticker(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <SubScreen
      title="Недавние стикеры"
      action={
        <div className="relative">
          <button
            type="button"
            aria-label="Меню"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-surface-2 active:opacity-60"
          >
            <DotsThreeVertical size={24} weight="bold" />
          </button>
          <PopoverMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            items={[
              {
                label: editing ? "Готово" : "Изменить",
                icon: editing ? X : PencilSimple,
                onClick: () => setEditing((e) => !e),
              },
              {
                label: "Очистить",
                icon: Trash,
                danger: true,
                onClick: () => {
                  clearRecent();
                  setEditing(false);
                  show("Недавние стикеры очищены");
                },
              },
            ]}
          />
        </div>
      }
    >
      {stickers.length > 0 ? (
        <div className="grid grid-cols-4 gap-2 p-4">
          <AnimatePresence>
            {stickers.map((sticker) => (
              <motion.div
                key={sticker.id}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                className="relative flex aspect-square items-center justify-center rounded-2xl"
              >
                <StickerImage sticker={sticker} size={72} />
                {editing && (
                  <button
                    type="button"
                    onClick={() => show("В демо удаление одного стикера не сохраняется")}
                    className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow"
                  >
                    <X size={14} weight="bold" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 px-10 pt-24 text-center">
          <p className="text-lg font-semibold text-foreground">Пусто</p>
          <p className="text-sm text-muted">
            Отправленные стикеры будут появляться здесь.
          </p>
        </div>
      )}
    </SubScreen>
  );
}
