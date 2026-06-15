"use client";

import { useRef } from "react";
import { motion, useSpring } from "motion/react";
import {
  Check,
  Sparkle,
  Smiley,
  FolderSimple,
  CloudArrowUp,
  ShieldCheck,
  Confetti,
} from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";

/** Ссылка на реальную оплату (DonatePay). */
const DONATE_URL = "https://donatepay.ru/don/1506094";

/** Путь пятиконечной звезды (viewBox 0 0 100 100). */
const STAR_PATH =
  "M50 3 L63.5 37.5 L100 39.5 L71 63 L80.5 98 L50 78 L19.5 98 L29 63 L0 39.5 L36.5 37.5 Z";

const features: { icon: typeof Sparkle; title: string; desc: string }[] = [
  {
    icon: Smiley,
    title: "Анимированные эмодзи",
    desc: "Премиум-эмодзи и уникальные реакции в чатах",
  },
  {
    icon: FolderSimple,
    title: "Больше папок и стикеров",
    desc: "Расширенные лимиты на папки, чаты и наборы стикеров",
  },
  {
    icon: CloudArrowUp,
    title: "Файлы до 4 ГБ",
    desc: "Отправляйте большие файлы и медиа без сжатия",
  },
  {
    icon: ShieldCheck,
    title: "Значок Premium",
    desc: "Особый значок у имени и приоритетная поддержка",
  },
  {
    icon: Confetti,
    title: "Без рекламы",
    desc: "Чистый интерфейс и эксклюзивное оформление",
  },
];

/** Интерактивная 3D-звезда: вращается перетаскиванием (как в Telegram). */
function PremiumStar() {
  const rotateX = useSpring(-12, { stiffness: 90, damping: 12 });
  const rotateY = useSpring(0, { stiffness: 90, damping: 12 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    rotateY.set(rotateY.get() + dx * 0.7);
    rotateX.set(Math.max(-80, Math.min(80, rotateX.get() - dy * 0.7)));
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  // Слои для эффекта объёма (экструзия по оси Z).
  const layers = 12;

  return (
    <div
      className="flex items-center justify-center py-2 select-none"
      style={{ perspective: 900 }}
    >
      {/* Свечение под звездой */}
      <div className="relative">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30 blur-3xl" />
        <motion.div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          animate={{ y: [0, -10, 0] }}
          transition={{ y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" } }}
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
            width: 168,
            height: 168,
          }}
          className="relative cursor-grab touch-none active:cursor-grabbing"
        >
          {Array.from({ length: layers }).map((_, i) => {
            const top = i === layers - 1;
            return (
              <svg
                key={i}
                viewBox="0 0 100 100"
                width={168}
                height={168}
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: `translateZ(${(i - (layers - 1)) * 2}px)`,
                }}
              >
                {top && (
                  <defs>
                    <linearGradient id="starGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff6a5e" />
                      <stop offset="55%" stopColor="#fa3a3a" />
                      <stop offset="100%" stopColor="#d11f1f" />
                    </linearGradient>
                    <linearGradient id="starShine" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
                      <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                )}
                <path
                  d={STAR_PATH}
                  fill={top ? "url(#starGrad)" : "#a31616"}
                />
                {top && <path d={STAR_PATH} fill="url(#starShine)" />}
              </svg>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

export default function PremiumPage() {
  return (
    <SubScreen title="HouseGram Premium">
      <div className="flex flex-col px-4 pt-6">
        <PremiumStar />

        <h1 className="mt-4 text-center text-[26px] font-extrabold tracking-tight text-foreground">
          HouseGram Premium
        </h1>
        <p className="mx-auto mt-1.5 max-w-xs text-center text-[14px] leading-relaxed text-muted">
          Покрутите звезду пальцем или мышью. Откройте эксклюзивные
          возможности и поддержите проект.
        </p>

        {/* Список преимуществ */}
        <div className="mt-6 overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i < features.length - 1 ? "border-b border-separator" : ""
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-press text-white shadow-sm">
                  <Icon size={22} weight="fill" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-foreground">
                    {f.title}
                  </span>
                  <span className="block text-[13px] leading-snug text-muted">
                    {f.desc}
                  </span>
                </span>
                <Check size={18} weight="bold" className="shrink-0 text-accent" />
              </motion.div>
            );
          })}
        </div>

        {/* Цена */}
        <div className="mt-5 flex items-end justify-center gap-1.5">
          <span className="text-[40px] font-extrabold leading-none text-foreground">
            200 ₽
          </span>
          <span className="pb-1 text-[15px] font-medium text-muted">/ месяц</span>
        </div>

        {/* Кнопка покупки — реальная оплата через DonatePay */}
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="premium-btn group mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-accent-press px-6 py-4 text-[17px] font-bold text-white shadow-lg shadow-accent/30 transition active:scale-[0.98]"
        >
          <Sparkle size={22} weight="fill" className="transition-transform group-hover:rotate-12" />
          Купить премиум — 200 ₽
        </a>

        <p className="mx-auto mt-3 max-w-xs text-center text-[12px] leading-relaxed text-muted">
          Оплата проходит на защищённой странице DonatePay. После оплаты
          premium активируется на 1 месяц.
        </p>
      </div>
    </SubScreen>
  );
}
