"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Star, X, Sparkle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/** Ссылка на реальную оплату (DonatePay). */
const DONATE_URL = "https://donatepay.ru/don/1506094";

/** Путь пятиконечной звезды (viewBox 0 0 100 100). */
const STAR_PATH =
  "M50 3 L63.5 37.5 L100 39.5 L71 63 L80.5 98 L50 78 L19.5 98 L29 63 L0 39.5 L36.5 37.5 Z";

/**
 * Красная звезда-значок HouseGram Premium рядом с именем пользователя.
 * По нажатию открывает окно с описанием подписки и кнопкой оплаты.
 *
 * Рендерится как <span role="button">, чтобы безопасно вкладываться в
 * кликабельные контейнеры (например, шапку чата) без вложенных <button>.
 */
export function PremiumBadge({
  name,
  size = 18,
  className,
}: {
  /** Имя пользователя — показывается в окне Premium. */
  name?: string;
  size?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        title="HouseGram Premium"
        aria-label="HouseGram Premium"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "inline-flex shrink-0 cursor-pointer align-middle text-accent transition active:scale-90",
          className
        )}
      >
        <Star size={size} weight="fill" />
      </span>

      <PremiumInfoSheet name={name} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Нижнее окно с информацией о Premium. */
function PremiumInfoSheet({
  name,
  open,
  onClose,
}: {
  name?: string;
  open: boolean;
  onClose: () => void;
}) {
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
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md overflow-hidden rounded-t-3xl bg-surface pb-[max(env(safe-area-inset-bottom),12px)]"
          >
            {/* Кнопка закрытия */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted transition active:scale-90"
            >
              <X size={20} weight="bold" />
            </button>

            <div className="flex flex-col items-center px-6 pt-8 text-center">
              {/* Большая красная звезда со свечением */}
              <div className="relative flex items-center justify-center">
                <div className="pointer-events-none absolute h-32 w-32 rounded-full bg-accent/30 blur-3xl" />
                <motion.svg
                  viewBox="0 0 100 100"
                  width={120}
                  height={120}
                  initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 16 }}
                  className="relative drop-shadow-[0_6px_16px_rgba(250,58,58,0.45)]"
                >
                  <defs>
                    <linearGradient id="pbStar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff6a5e" />
                      <stop offset="55%" stopColor="#fa3a3a" />
                      <stop offset="100%" stopColor="#d11f1f" />
                    </linearGradient>
                  </defs>
                  <path d={STAR_PATH} fill="url(#pbStar)" />
                </motion.svg>
              </div>

              <h2 className="mt-4 flex items-center gap-1.5 text-[22px] font-extrabold tracking-tight text-foreground">
                {name || "Пользователь"}
                <Star size={20} weight="fill" className="text-accent" />
              </h2>

              <p className="mt-2 text-[15px] font-semibold text-foreground">
                Обладатель подписки HouseGram Premium
              </p>
              <p className="mx-auto mt-1.5 max-w-xs text-[14px] leading-relaxed text-muted">
                Подписчики получают эксклюзивный доступ к множеству
                дополнительных функций: закрытая личка, расширенные лимиты,
                особый значок у имени и многое другое.
              </p>

              {/* Кнопка оплаты — сразу на страницу оплаты */}
              <a
                href={DONATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="premium-btn mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-accent-press px-6 py-4 text-[17px] font-bold text-white shadow-lg shadow-accent/30 transition active:scale-[0.98]"
              >
                <Sparkle size={22} weight="fill" />
                Подключить — 200 ₽
              </a>
              <p className="mt-2 text-[12px] text-muted">
                Оплата на защищённой странице DonatePay
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
