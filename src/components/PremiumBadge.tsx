"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Star, X, Sparkle, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  PREMIUM_STATUSES,
  getPremiumStatus,
  type PremiumStatus,
} from "@/lib/premium-status";
import { setPremiumStatus } from "@/lib/premium";

/** Ссылка на реальную оплату (DonatePay). */
const DONATE_URL = "https://donatepay.ru/don/1506094";

/** Путь пятиконечной звезды (viewBox 0 0 100 100). */
const STAR_PATH =
  "M50 3 L63.5 37.5 L100 39.5 L71 63 L80.5 98 L50 78 L19.5 98 L29 63 L0 39.5 L36.5 37.5 Z";

/** Рисует статус (gif/эмодзи) или красную звезду по умолчанию. */
function StatusGlyph({
  status,
  size,
}: {
  status: PremiumStatus | null;
  size: number;
}) {
  if (status?.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={status.src}
        alt={status.label}
        width={size}
        height={size}
        className="inline-block object-contain align-middle"
        style={{ width: size, height: size }}
      />
    );
  }
  if (status?.emoji) {
    return (
      <span style={{ fontSize: size, lineHeight: 1 }} className="leading-none">
        {status.emoji}
      </span>
    );
  }
  return <Star size={size} weight="fill" />;
}

/**
 * Значок HouseGram Premium рядом с именем пользователя.
 * - По умолчанию — красная звезда; если задан статус, показывает его (gif/эмодзи).
 * - editable: по клику открывает выбор эмодзи-статуса (для своего профиля).
 * - иначе: по клику открывает окно с информацией о Premium и статусом.
 */
export function PremiumBadge({
  name,
  size = 18,
  className,
  status,
  editable = false,
  onStatusChange,
}: {
  name?: string;
  size?: number;
  className?: string;
  /** id выбранного статуса (из каталога). */
  status?: string;
  /** Режим своего профиля — открывает выбор статуса. */
  editable?: boolean;
  /** Колбэк после смены статуса (id). */
  onStatusChange?: (id: string) => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const current = getPremiumStatus(status);

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
          if (editable) setPickerOpen(true);
          else setInfoOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (editable) setPickerOpen(true);
            else setInfoOpen(true);
          }
        }}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center align-middle text-accent transition active:scale-90",
          className
        )}
      >
        <StatusGlyph status={current} size={size} />
      </span>

      <PremiumInfoSheet
        name={name}
        status={current}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
      <StatusPickerSheet
        current={status ?? ""}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onStatusChange={onStatusChange}
      />
    </>
  );
}

/** Нижнее окно с информацией о Premium (для чужого профиля). */
function PremiumInfoSheet({
  name,
  status,
  open,
  onClose,
}: {
  name?: string;
  status: PremiumStatus | null;
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
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted transition active:scale-90"
            >
              <X size={20} weight="bold" />
            </button>

            <div className="flex flex-col items-center px-6 pt-8 text-center">
              <div className="relative flex items-center justify-center">
                <div className="pointer-events-none absolute h-32 w-32 rounded-full bg-accent/30 blur-3xl" />
                {status?.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={status.src}
                    alt={status.label}
                    width={120}
                    height={120}
                    className="relative object-contain drop-shadow-[0_6px_16px_rgba(250,58,58,0.45)]"
                  />
                ) : status?.emoji ? (
                  <span className="relative text-[96px] leading-none drop-shadow-lg">
                    {status.emoji}
                  </span>
                ) : (
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
                )}
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
                дополнительных функций: анимированный статус, закрытая личка,
                расширенные лимиты, особый значок у имени и многое другое.
              </p>

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

/** Выбор эмодзи-статуса (для своего профиля). */
function StatusPickerSheet({
  current,
  open,
  onClose,
  onStatusChange,
}: {
  current: string;
  open: boolean;
  onClose: () => void;
  onStatusChange?: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const pick = async (id: string) => {
    setBusy(true);
    try {
      await setPremiumStatus(id);
      onStatusChange?.(id);
      onClose();
    } catch {
      /* ignore — статус не критичен */
    } finally {
      setBusy(false);
    }
  };

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
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md overflow-hidden rounded-t-3xl bg-surface pb-[max(env(safe-area-inset-bottom),16px)]"
          >
            <div className="flex items-center justify-between border-b border-separator px-4 py-3">
              <h2 className="text-[17px] font-semibold text-foreground">
                Статус Premium
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="text-muted transition active:opacity-60"
              >
                <X size={22} weight="bold" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 p-4">
              {/* Снять статус */}
              <button
                type="button"
                disabled={busy}
                onClick={() => pick("")}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl transition active:scale-90 disabled:opacity-50",
                  current === "" ? "bg-accent/15 ring-1 ring-accent" : "bg-surface-2"
                )}
              >
                <X size={26} weight="bold" className="text-muted" />
                <span className="text-[10px] text-muted">Нет</span>
              </button>

              {PREMIUM_STATUSES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  disabled={busy}
                  onClick={() => pick(st.id)}
                  aria-label={st.label}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-2xl transition active:scale-90 disabled:opacity-50",
                    current === st.id
                      ? "bg-accent/15 ring-1 ring-accent"
                      : "bg-surface-2"
                  )}
                >
                  {st.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={st.src}
                      alt={st.label}
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-[30px] leading-none">{st.emoji}</span>
                  )}
                  {current === st.id && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white">
                      <Check size={11} weight="bold" />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="px-5 pb-2 text-center text-[12px] leading-relaxed text-muted">
              Анимированный статус увидят все рядом с вашим именем.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
