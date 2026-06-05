"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Plus, Check, ShareNetwork, ArrowLeft } from "@phosphor-icons/react";
import { StickerImage } from "@/components/StickerImage";
import { useStickers, type StickerSet } from "@/lib/stickers-store";
import { decodeSet, buildShareUrl } from "@/lib/sticker-share";
import { useToast } from "@/components/Toast";

const tileHidden = { scale: 0.6, opacity: 0 };
const tileShown = { scale: 1, opacity: 1 };
const tileTransition = (i: number) => ({ delay: Math.min(i * 0.02, 0.4) });

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}

export default function AddStickersPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = use(params);
  const router = useRouter();
  const { show } = useToast();
  const { getSet, addSet, isSetInstalled } = useStickers();

  const [set, setSet] = useState<StickerSet | null>(null);
  const [ready, setReady] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    // Сначала пробуем раскодировать набор из ссылки (#d=...),
    // иначе ищем уже известный набор по id.
    let resolved: StickerSet | null = null;
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      const m = hash.match(/d=([^&]+)/);
      if (m) resolved = decodeSet(m[1]);
    }
    if (!resolved) resolved = getSet(setId) ?? null;
    setSet(resolved);
    setReady(true);
  }, [setId, getSet]);

  const installed = set ? isSetInstalled(set.id) || added : false;

  const handleAdd = () => {
    if (!set) return;
    addSet(set);
    setAdded(true);
    show(`Набор «${set.title}» добавлен`);
  };

  const handleShare = async () => {
    if (!set) return;
    const url = buildShareUrl(set);
    try {
      if (navigator.share) {
        await navigator.share({ title: set.title, url });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard?.writeText(url);
      show("Ссылка скопирована");
    } catch {
      show("Не удалось скопировать");
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col bg-background">
      {/* Шапка */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-separator bg-surface/95 px-3 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Назад"
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-surface-2"
        >
          <ArrowLeft size={22} weight="bold" />
        </button>
        <h1 className="truncate text-[17px] font-semibold text-foreground">
          {set ? set.title : "Набор стикеров"}
        </h1>
      </header>

      {!ready ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-transparent" />
        </div>
      ) : !set ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-10 text-center">
          <p className="text-lg font-semibold text-foreground">
            Набор не найден
          </p>
          <p className="text-[14px] text-muted">
            Ссылка устарела или набор был удалён.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col px-4 pb-32 pt-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-2">
                {set.stickers[0] ? (
                  <StickerImage sticker={set.stickers[0]} size={44} />
                ) : null}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-[18px] font-semibold text-foreground">
                  {set.title}
                </h2>
                <p className="truncate text-[14px] text-muted">
                  {plural(set.stickers.length, "стикер", "стикера", "стикеров")}
                  {set.author ? ` · ${set.author}` : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {set.stickers.map((sticker, i) => (
                <motion.div
                  key={sticker.id}
                  initial={tileHidden}
                  animate={tileShown}
                  transition={tileTransition(i)}
                  className="flex aspect-square items-center justify-center rounded-2xl bg-surface ring-1 ring-separator"
                >
                  <StickerImage sticker={sticker} size={72} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Кнопки */}
          <div className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-2xl items-center gap-2 border-t border-separator bg-surface/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-xl">
            <button
              type="button"
              onClick={handleShare}
              aria-label="Поделиться"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-foreground transition active:scale-95"
            >
              <ShareNetwork size={22} weight="bold" />
            </button>
            {installed ? (
              <button
                type="button"
                onClick={() =>
                  router.replace(`/settings/messages/stickers/${set.id}`)
                }
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-surface-2 text-[15px] font-semibold text-foreground transition active:scale-[0.99]"
              >
                <Check size={20} weight="bold" />
                Набор добавлен
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-semibold text-white shadow-sm transition active:scale-[0.99]"
              >
                <Plus size={20} weight="bold" />
                Добавить {plural(set.stickers.length, "стикер", "стикера", "стикеров")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
