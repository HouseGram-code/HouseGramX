"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}

/** iOS-подобный переключатель. */
export function Switch({ checked, onChange, disabled, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full px-[2px] transition-colors duration-200",
        checked
          ? "bg-gradient-to-b from-green-400 to-green-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]"
          : "bg-muted-2/60",
        disabled && "opacity-40"
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 35 }}
        className={cn(
          "h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.9)]",
          checked ? "ml-auto" : "ml-0"
        )}
      />
    </button>
  );
}
