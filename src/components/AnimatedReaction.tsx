"use client";

import { motion, type Variants } from "motion/react";
import type { ReactionDef } from "@/lib/reactions";

const variants: Record<ReactionDef["anim"], Variants> = {
  heartbeat: {
    animate: {
      scale: [1, 1.25, 1, 1.2, 1],
      transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
    },
  },
  bounce: {
    animate: {
      y: [0, -8, 0],
      transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
    },
  },
  spin: {
    animate: {
      rotate: [0, 360],
      transition: { duration: 1.6, repeat: Infinity, ease: "linear" },
    },
  },
  shake: {
    animate: {
      rotate: [0, -12, 12, -8, 8, 0],
      transition: { duration: 1, repeat: Infinity, ease: "easeInOut" },
    },
  },
  pulse: {
    animate: {
      scale: [1, 1.18, 1],
      opacity: [1, 0.85, 1],
      transition: { duration: 1, repeat: Infinity, ease: "easeInOut" },
    },
  },
  tada: {
    animate: {
      scale: [1, 0.9, 1.15, 1.15, 1],
      rotate: [0, -6, 6, -6, 0],
      transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
    },
  },
};

interface AnimatedReactionProps {
  reaction: ReactionDef;
  size?: number;
  /** Если false — статичный эмодзи без анимации. */
  animate?: boolean;
}

/** Анимированная эмодзи-реакция (выбранная быстрая реакция «оживает»). */
export function AnimatedReaction({
  reaction,
  size = 28,
  animate = true,
}: AnimatedReactionProps) {
  return (
    <motion.span
      key={reaction.emoji + (animate ? "-a" : "")}
      style={{ fontSize: size, lineHeight: 1, display: "inline-block" }}
      variants={animate ? variants[reaction.anim] : undefined}
      animate={animate ? "animate" : undefined}
    >
      {reaction.emoji}
    </motion.span>
  );
}
