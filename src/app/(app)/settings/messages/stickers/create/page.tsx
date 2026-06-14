"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Sticker as StickerIcon, ShareNetwork } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { useStickers } from "@/lib/stickers-store";
import { useProfile } from "@/lib/profile-store";
import { useToast } from "@/components/Toast";
import { uploadImage } from "@/lib/storage";
import { buildShareUrl } from "@/lib/sticker-share";

/** Набор быстрых эмодзи для привязки к стикеру. */
const QUICK_EMOJI = [
  "😍", "😂", "🔥", "❤️", "👍", "🙏", "🎉", "✨",
  "😎", "🥲", "😢", "😡", "👀", "💯", "🌸", "⭐️",
];

const tileHidden = { scale: 0.6, opacity: 0 };
const tileShown = { scale: 1, opacity: 1 };
const tileExit = { scale: 0.6, opacity: 0 };
const tapScale = { scale: 0.95 };
const overlayHidden = { opacity: 0 };
const overlayShown = { opacity: 1 };
const sheetHidden = { y: "100%" };
const sheetShown = { y: 0 };
const sheetTransition = { type: "spring" as const, stiffness: 380, damping: 38 };

interface Draft {
  uid: string;
  src: string;
  emoji: string;
}

/**
 * Преобразует картинку в квадратный PNG 512×512 с прозрачным фоном
 * (вписывает целиком, contain) — как Telegram-стикеры.
 */
function fileToStickerDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const SIZE = 512;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        const scale = Math.min(SIZE / img.width, SIZE / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function CreateStickerSetPage() {
  const router = useRouter();
  const { createSet } = useStickers();
  const { profile } = useProfile();
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const added: Draft[] = [];
      for (const file of Array.from(files).slice(0, 30)) {
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await fileToStickerDataUrl(file);
        const src = await uploadImage(dataUrl, "sticker");
        added.push({ uid: uid(), src, emoji: "⭐️" });
      }
      if (added.length === 0) {
        show("Нужны изображения");
      } else {
        setDrafts((d) => [...d, ...added]);
      }
    } catch {
      show("Не удалось обработать фото");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeDraft = (id: string) =>
    setDrafts((d) => d.filter((x) => x.uid !== id));

  const setEmoji = (id: string, emoji: string) => {
    setDrafts((d) => d.map((x) => (x.uid === id ? { ...x, emoji } : x)));
    setEmojiFor(null);
  };

  const canCreate = title.trim().length > 0 && drafts.length > 0 && !busy;

  const handleCreate = () => {
    if (!canCreate || creating) return;
    setCreating(true);
    const set = createSet({
      title: title.trim(),
      author: profile.name || profile.username,
      stickers: drafts.map((d) => ({
        src: d.src,
        emoji: d.emoji,
        name: title.trim(),
      })),
    });
    show(`Набор «${set.title}» создан`);
    try {
      navigator.clipboard?.writeText(buildShareUrl(set));
    } catch {
      /* ignore */
    }
    router.replace(`/settings/messages/stickers/${set.id}`);
  };

  return (
    <SubScreen title="Новый набор">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />

      <div className="px-4 pb-28 pt-5">
        {/* Шаг 1 — название */}
        <p className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted">
          Название набора
        </p>
        <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-separator">
          <StickerIcon size={22} weight="duotone" className="shrink-0 text-accent" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={48}
            placeholder="Например, Мои мемы"
            className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-2 focus:outline-none"
          />
        </div>

        {/* Шаг 2 — фото */}
        <p className="mb-1.5 mt-6 px-1 text-xs font-medium uppercase tracking-wide text-muted">
          Стикеры{drafts.length > 0 ? ` · ${drafts.length}` : ""}
        </p>
        <div className="grid grid-cols-4 gap-2">
          <AnimatePresence>
            {drafts.map((d) => (
              <motion.div
                key={d.uid}
                layout
                initial={tileHidden}
                animate={tileShown}
                exit={tileExit}
                className="relative flex aspect-square items-center justify-center rounded-2xl bg-surface ring-1 ring-separator"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.src}
                  alt="стикер"
                  className="max-h-[80%] max-w-[80%] object-contain"
                />
                <button
                  type="button"
                  onClick={() => setEmojiFor(emojiFor === d.uid ? null : d.uid)}
                  className="absolute bottom-1 left-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-surface-2 px-1 text-[15px] shadow-sm"
                  aria-label="Выбрать эмодзи"
                >
                  {d.emoji}
                </button>
                <button
                  type="button"
                  onClick={() => removeDraft(d.uid)}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow"
                  aria-label="Удалить"
                >
                  <X size={13} weight="bold" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.button
            type="button"
            whileTap={tapScale}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-separator text-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {busy ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-transparent" />
            ) : (
              <>
                <Plus size={26} weight="bold" />
                <span className="text-[11px] font-medium">Фото</span>
              </>
            )}
          </motion.button>
        </div>

        <p className="mt-3 px-1 text-[13px] leading-relaxed text-muted">
          Загрузите картинки — каждая станет стикером (512×512, прозрачный фон). Нажмите на эмодзи в углу, чтобы связать стикер с эмодзи.
        </p>
      </div>

      {/* Пикер эмодзи */}
      <AnimatePresence>
        {emojiFor && (
          <>
            <motion.div
              initial={overlayHidden}
              animate={overlayShown}
              exit={overlayHidden}
              onClick={() => setEmojiFor(null)}
              className="fixed inset-0 z-50 bg-black/40"
            />
            <motion.div
              initial={sheetHidden}
              animate={sheetShown}
              exit={sheetHidden}
              transition={sheetTransition}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-3xl bg-surface p-4 pb-[max(env(safe-area-inset-bottom),16px)]"
            >
              <p className="mb-3 text-center text-[15px] font-semibold text-foreground">
                Эмодзи стикера
              </p>
              <div className="grid grid-cols-8 gap-1">
                {QUICK_EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(emojiFor, e)}
                    className="flex aspect-square items-center justify-center rounded-xl text-[24px] transition hover:bg-surface-2"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Создать */}
      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-2xl border-t border-separator bg-surface/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-40"
        >
          <ShareNetwork size={20} weight="bold" />
          Создать набор
        </button>
      </div>
    </SubScreen>
  );
}
