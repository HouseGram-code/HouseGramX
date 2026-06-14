"use client";

import { motion } from "motion/react";

interface ReactionBarProps {
  reactions: string[];
  onPick: (emoji: string) => void;
  onMore?: () => void;
}

/** Горизонтальная панель быстрых реакций (как в MAX над меню). */
export function ReactionBar({ reactions, onPick, onMore }: ReactionBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className="flex items-center gap-1 rounded-full bg-surface px-2 py-1.5 shadow-xl ring-1 ring-separator"
    >
      {reactions.map((emoji, i) => (
        <motion.button
          key={emoji}
          type="button"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.03, type: "spring", stiffness: 500 }}
          whileHover={{ scale: 1.3, y: -2 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => onPick(emoji)}
          className="flex h-9 w-9 items-center justify-center text-2xl"
        >
          {emoji}
        </motion.button>
      ))}
      {onMore && (
        <button
          type="button"
          onClick={onMore}
          aria-label="Ещё реакции"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </motion.div>
  );
}
