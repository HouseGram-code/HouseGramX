"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "@phosphor-icons/react";

const DISMISS_KEY = "housegramx.banner.create-sticker.dismissed";

/** Баннер на главном экране чатов: «Создай свой первый стикер!».
 *  Крестик скрывает баннер навсегда (как в Telegram). */
export function StickerPromoBanner() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) !== "1") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // недоступно — просто скрываем на эту сессию
    }
    setVisible(false);
  };

  return (
    <div className="px-3 pt-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => router.push("/settings/messages/stickers/create")}
        className="relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-press px-4 py-3 text-white shadow-sm transition active:scale-[0.99]"
      >
        {/* Белый блик: пробегает по баннеру 2 раза */}
        <span className="animate-sticker-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent" />
        <span className="animate-sticker-emoji relative shrink-0 text-[30px] leading-none">
          🎨
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight">
            Создай свой первый стикер!
          </p>
          <p className="text-[12.5px] leading-tight text-white/85">
            Нажми, чтобы открыть редактор
          </p>
        </div>
        <button
          type="button"
          aria-label="Скрыть"
          onClick={dismiss}
          className="relative shrink-0 rounded-full p-1 text-white/85 transition hover:bg-white/20 active:scale-90"
        >
          <X size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
}
