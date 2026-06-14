"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ImageSquare, FileArrowUp, MusicNotes } from "@phosphor-icons/react";

interface AttachSheetProps {
  open: boolean;
  onClose: () => void;
  /** Выбран один или несколько файлов. */
  onFiles: (files: File[]) => void;
}

/**
 * Нижний лист выбора вложения: Галерея (фото/видео), Файл, Музыка.
 * Открывает системный диалог выбора файлов с нужным accept.
 */
export function AttachSheet({ open, onClose, onFiles }: AttachSheetProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const pick = (ref: React.RefObject<HTMLInputElement | null>) => {
    ref.current?.click();
  };

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) {
      onFiles(files);
      onClose();
    }
  };

  const items = [
    {
      label: "Галерея",
      icon: ImageSquare,
      color: "#e84393",
      onClick: () => pick(galleryRef),
    },
    {
      label: "Файл",
      icon: FileArrowUp,
      color: "#0984e3",
      onClick: () => pick(fileRef),
    },
    {
      label: "Музыка",
      icon: MusicNotes,
      color: "#00b894",
      onClick: () => pick(audioRef),
    },
  ];

  return (
    <>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handle}
        className="hidden"
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        onChange={handle}
        className="hidden"
      />
      <input
        ref={audioRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handle}
        className="hidden"
      />

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-surface pb-[max(env(safe-area-inset-bottom),16px)] pt-3 shadow-2xl"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-2/50" />
              <h2 className="mb-4 text-center text-[16px] font-semibold text-foreground">
                Прикрепить
              </h2>
              <div className="flex items-start justify-around px-6 pb-3">
                {items.map((it) => (
                  <button
                    key={it.label}
                    type="button"
                    onClick={it.onClick}
                    className="flex flex-col items-center gap-2 transition active:scale-95"
                  >
                    <span
                      className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-md"
                      style={{ background: it.color }}
                    >
                      <it.icon size={28} weight="fill" />
                    </span>
                    <span className="text-[13px] font-medium text-foreground">
                      {it.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
