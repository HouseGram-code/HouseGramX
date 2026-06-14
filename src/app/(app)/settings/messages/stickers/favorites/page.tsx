"use client";

import { motion, AnimatePresence } from "motion/react";
import { BookmarkSimple, Heart } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { StickerImage } from "@/components/StickerImage";
import { useStickers } from "@/lib/stickers-store";

export default function FavoriteStickersPage() {
  const { favorites, getSticker, toggleFavorite } = useStickers();

  const stickers = favorites
    .map((id) => getSticker(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <SubScreen title="Избранные стикеры">
      {stickers.length > 0 ? (
        <div className="grid grid-cols-4 gap-2 p-4">
          <AnimatePresence>
            {stickers.map((sticker) => (
              <motion.button
                key={sticker.id}
                type="button"
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                onClick={() => toggleFavorite(sticker.id)}
                className="relative flex aspect-square items-center justify-center rounded-2xl hover:bg-surface-2"
              >
                <StickerImage sticker={sticker} size={72} />
                <span className="absolute right-1 top-1 text-accent">
                  <Heart size={16} weight="fill" />
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 px-10 pt-24 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-2">
            <BookmarkSimple size={44} weight="duotone" className="text-accent" />
          </div>
          <p className="text-lg font-semibold text-foreground">
            Нет избранных
          </p>
          <p className="text-sm leading-relaxed text-muted">
            Откройте набор и добавьте стикеры в избранное долгим нажатием.
          </p>
        </div>
      )}
    </SubScreen>
  );
}
