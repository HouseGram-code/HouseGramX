"use client";

import { motion } from "motion/react";
import type { Activity } from "@/lib/chat-store";

/** Текстовый индикатор активности в шапке: «печатает...» / «выбирает стикер...».
 * Для групп можно передать name — тогда показывается «Имя печатает…». */
export function ActivityText({
  activity,
  name,
}: {
  activity: Activity;
  name?: string;
}) {
  if (!activity) return null;
  if (activity === "sticker") {
    return (
      <span className="flex items-center gap-1.5 text-accent">
        <AnimatedEyes size={14} />
        {name ? `${name} выбирает стикер` : "выбирает стикер"}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-accent">
      {name ? `${name} печатает` : "печатает"}
      <Dots />
    </span>
  );
}

/** Три прыгающие точки. */
function Dots() {
  return (
    <span className="inline-flex items-end gap-[2px] pb-[2px]">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-[3px] w-[3px] rounded-full bg-accent"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

/** Пузырёк активности в ленте сообщений. Для групп можно передать name. */
export function TypingBubble({
  activity,
  name,
}: {
  activity: Activity;
  name?: string;
}) {
  if (!activity) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex justify-start"
    >
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-surface px-4 py-3 ring-1 ring-separator">
        {activity === "sticker" ? (
          <AnimatedEyes />
        ) : (
          <span className="flex items-end gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block h-2 w-2 rounded-full bg-muted-2"
                animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </span>
        )}
        <span className="text-[12px] text-muted">
          {activity === "sticker"
            ? name
              ? `${name} выбирает стикер…`
              : "выбирает стикер…"
            : name
              ? `${name} печатает…`
              : "печатает…"}
        </span>
      </div>
    </motion.div>
  );
}

/** Пара анимированных глаз: зрачки бегают и моргают. */
export function AnimatedEyes({ size = 22 }: { size?: number }) {
  // Зрачки двигаются по сторонам — будто высматривают стикер.
  const pupil = {
    animate: {
      x: [0, 4, 4, -4, -4, 0],
      y: [0, -2, 2, 2, -2, 0],
    },
    transition: {
      duration: 2.4,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  };

  return (
    <span className="flex items-center gap-[3px]">
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="relative block overflow-hidden rounded-full bg-white ring-1 ring-black/10"
          style={{ width: size, height: size }}
          // Моргание: периодически «схлопываем» глаз по вертикали
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            times: [0, 0.45, 0.5, 0.55, 1],
            delay: i * 0.08,
          }}
        >
          <motion.span
            className="absolute left-1/2 top-1/2 block rounded-full bg-zinc-900"
            style={{
              width: size * 0.42,
              height: size * 0.42,
              marginLeft: -(size * 0.21),
              marginTop: -(size * 0.21),
            }}
            animate={pupil.animate}
            transition={{ ...pupil.transition, delay: i * 0.05 }}
          >
            {/* Блик */}
            <span
              className="absolute rounded-full bg-white/80"
              style={{
                width: size * 0.12,
                height: size * 0.12,
                top: size * 0.05,
                right: size * 0.05,
              }}
            />
          </motion.span>
        </motion.span>
      ))}
    </span>
  );
}
