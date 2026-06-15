"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ClockCounterClockwise,
  MagnifyingGlass,
  GearSix,
  Plus,
  Key,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import EmojiPicker, {
  EmojiStyle,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";
import { StickerImage } from "@/components/StickerImage";
import { useStickers, type Sticker } from "@/lib/stickers-store";
import { useSettings } from "@/lib/settings-store";
import { fetchMyPremium } from "@/lib/premium";
import { cn } from "@/lib/utils";

type Tab = "stickers" | "emoji";

interface StickerPickerProps {
  open: boolean;
  onPick: (sticker: Sticker) => void;
  onEmoji?: (emoji: string) => void;
}

/** Панель ввода: вкладки «Стикеры / Эмодзи» (Telegram-стиль через emoji-picker-react). */
export function StickerPicker({ open, onPick, onEmoji }: StickerPickerProps) {
  const router = useRouter();
  const { sets, recent, getSticker } = useStickers();
  const settings = useSettings();
  const [tab, setTab] = useState<Tab>("stickers");
  const [query, setQuery] = useState("");

  // Премиум-статус — для разблокировки премиум-наборов стикеров.
  const [isPremium, setIsPremium] = useState(false);
  useEffect(() => {
    let alive = true;
    fetchMyPremium().then((p) => {
      if (alive) setIsPremium(p.active);
    });
    return () => {
      alive = false;
    };
  }, []);

  const recentStickers = recent
    .map((id) => getSticker(id))
    .filter((s): s is Sticker => Boolean(s));

  // Тема пикера эмодзи под тему приложения
  const emojiTheme =
    settings.theme === "dark"
      ? Theme.DARK
      : settings.theme === "light"
        ? Theme.LIGHT
        : Theme.AUTO;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 360, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="flex flex-col overflow-hidden border-t border-separator bg-surface"
        >
          {tab === "emoji" ? (
            // Telegram-стиль: эмодзи-картинки Apple через библиотеку
            <div className="flex-1 overflow-hidden [&_.epr-main]:!border-0 [&_.epr-main]:!bg-transparent">
              <EmojiPicker
                onEmojiClick={(data: EmojiClickData) => onEmoji?.(data.emoji)}
                emojiStyle={EmojiStyle.APPLE}
                theme={emojiTheme}
                width="100%"
                height={310}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
                searchPlaceholder="Найти эмодзи"
                skinTonesDisabled
              />
            </div>
          ) : (
            <>
              {/* Категории-наборы сверху */}
              <div className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto border-b border-separator px-2 py-1.5">
                <button
                  type="button"
                  aria-label="К началу"
                  onClick={() => {
                    setTab("stickers");
                    requestAnimationFrame(() => {
                      document
                        .getElementById("pk-scroll")
                        ?.scrollTo({ top: 0, behavior: "smooth" });
                    });
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent transition active:scale-90"
                >
                  <ClockCounterClockwise size={20} weight="regular" />
                </button>
                {sets.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    aria-label={set.title}
                    onClick={() => {
                      setTab("stickers");
                      requestAnimationFrame(() => {
                        document
                          .getElementById(`pk-set-${set.id}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }}
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition hover:bg-surface-2 active:scale-90"
                  >
                    <StickerImage sticker={set.stickers[0]} size={26} />
                    {set.premium && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-white ring-1 ring-surface">
                        <Key size={9} weight="fill" />
                      </span>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    router.push("/settings/messages/stickers/create")
                  }
                  aria-label="Создать стикер"
                  className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-accent transition hover:bg-surface-2"
                >
                  <Plus size={20} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/settings/messages/stickers")}
                  aria-label="Настройки стикеров"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2"
                >
                  <GearSix size={20} weight="regular" />
                </button>
              </div>

              {/* Поиск стикеров */}
              <div className="shrink-0 px-3 pt-2">
                <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                  <MagnifyingGlass
                    size={16}
                    weight="bold"
                    className="text-muted-2"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Найти"
                    className="w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* Стикеры */}
              <div id="pk-scroll" className="no-scrollbar flex-1 overflow-y-auto px-3 py-2">
                {recentStickers.length > 0 && (
                  <>
                    <SectionLabel>Недавние</SectionLabel>
                    <div className="mb-3 grid grid-cols-5 gap-1">
                      {recentStickers.map((s) => (
                        <PickTile
                          key={`r-${s.id}`}
                          sticker={s}
                          onPick={onPick}
                        />
                      ))}
                    </div>
                  </>
                )}
                {sets.map((set) => {
                  const list = query.trim()
                    ? set.stickers.filter((s) =>
                        s.name.toLowerCase().includes(query.toLowerCase())
                      )
                    : set.stickers;
                  if (list.length === 0) return null;
                  const locked = !!set.premium && !isPremium;
                  return (
                    <div key={set.id} id={`pk-set-${set.id}`} className="mb-3">
                      <SectionLabel>
                        <span className="flex items-center gap-1.5">
                          {set.title}
                          {set.premium && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                locked
                                  ? "bg-accent/15 text-accent"
                                  : "bg-green-500/15 text-green-600"
                              )}
                            >
                              <Key size={10} weight="fill" />
                              {locked ? "Premium" : "Открыт"}
                            </span>
                          )}
                        </span>
                      </SectionLabel>
                      <div className="grid grid-cols-5 gap-1">
                        {list.map((s) => (
                          <PickTile
                            key={`${set.id}-${s.id}`}
                            sticker={s}
                            locked={locked}
                            onPick={onPick}
                            onLocked={() => router.push("/settings/premium")}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Нижние вкладки */}
          <div className="flex shrink-0 items-center justify-center gap-2 border-t border-separator px-3 py-2">
            <button
              type="button"
              onClick={() => setTab("stickers")}
              className={cn(
                "rounded-full px-4 py-1.5 text-[14px] font-medium transition",
                tab === "stickers"
                  ? "bg-surface-2 text-foreground"
                  : "text-muted"
              )}
            >
              Стикеры
            </button>
            <button
              type="button"
              onClick={() => setTab("emoji")}
              className={cn(
                "rounded-full px-4 py-1.5 text-[14px] font-medium transition",
                tab === "emoji" ? "bg-surface-2 text-foreground" : "text-muted"
              )}
            >
              Эмодзи
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-muted">
      {children}
    </div>
  );
}

function PickTile({
  sticker,
  onPick,
  locked,
  onLocked,
}: {
  sticker: Sticker;
  onPick: (s: Sticker) => void;
  locked?: boolean;
  onLocked?: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.85 }}
      onClick={() => (locked ? onLocked?.() : onPick(sticker))}
      className="relative flex aspect-square items-center justify-center rounded-xl transition-colors hover:bg-surface-2"
      aria-label={sticker.name}
    >
      <span className={cn(locked && "opacity-40 blur-[1px]")}>
        <StickerImage sticker={sticker} size={56} />
      </span>
      {locked && (
        <span className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white shadow-md">
          <Key size={15} weight="fill" />
        </span>
      )}
    </motion.button>
  );
}
