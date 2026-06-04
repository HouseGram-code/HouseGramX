"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  DotsThreeVertical,
  LinkSimple,
  Trash,
  PaperPlaneRight,
  Heart,
} from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { PopoverMenu } from "@/components/PopoverMenu";
import { StickerImage } from "@/components/StickerImage";
import { useStickers } from "@/lib/stickers-store";
import { useToast } from "@/components/Toast";

export default function StickerSetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = use(params);
  const router = useRouter();
  const { show } = useToast();
  const { sets, removeSet, toggleFavorite, isFavorite, useSticker } =
    useStickers();
  const [menuOpen, setMenuOpen] = useState(false);

  const set = sets.find((s) => s.id === setId);

  if (!set) {
    return (
      <SubScreen title="Набор не найден">
        <div className="flex flex-col items-center gap-3 px-10 pt-24 text-center">
          <p className="text-lg font-semibold text-foreground">
            Набор удалён или не существует
          </p>
        </div>
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title={set.title}
      subtitle={`${set.stickers.length} стикера`}
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
                label: "Скопировать ссылку",
                icon: LinkSimple,
                onClick: async () => {
                  try {
                    await navigator.clipboard?.writeText(
                      `${window.location.origin}/addstickers/${set.id}`
                    );
                    show("Ссылка на набор скопирована");
                  } catch {
                    show("Не удалось скопировать");
                  }
                },
              },
              {
                label: "Удалить набор",
                icon: Trash,
                danger: true,
                onClick: () => {
                  removeSet(set.id);
                  show("Набор удалён");
                  router.back();
                },
              },
            ]}
          />
        </div>
      }
    >
      <div className="grid grid-cols-4 gap-2 p-4 pb-28">
        {set.stickers.map((sticker, i) => (
          <motion.button
            key={sticker.id}
            type="button"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.015 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => {
              useSticker(sticker.id);
              show(`Стикер ${sticker.emoji} отправлен`);
            }}
            onDoubleClick={() => {
              toggleFavorite(sticker.id);
              show(
                isFavorite(sticker.id)
                  ? "Убрано из избранного"
                  : "Добавлено в избранное"
              );
            }}
            className="relative flex aspect-square items-center justify-center rounded-2xl hover:bg-surface-2"
            aria-label={sticker.name}
          >
            <StickerImage sticker={sticker} size={72} />
            {isFavorite(sticker.id) && (
              <span className="absolute right-1 top-1 text-accent">
                <Heart size={14} weight="fill" />
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Кнопка «Переслать» внизу */}
      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-2xl border-t border-separator bg-surface/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => show("Выберите чат для пересылки набора")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface-2 py-3.5 text-[16px] font-semibold text-foreground transition active:scale-[0.99]"
        >
          <PaperPlaneRight size={20} weight="bold" />
          Переслать
        </button>
      </div>
    </SubScreen>
  );
}
