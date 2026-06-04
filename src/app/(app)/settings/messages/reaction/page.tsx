"use client";

import { motion } from "motion/react";
import { Check } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { GroupHint, SectionTitle } from "@/components/settings-ui";
import { AnimatedReaction } from "@/components/AnimatedReaction";
import { REACTIONS, getReaction } from "@/lib/reactions";
import { useSettings } from "@/lib/settings-store";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

export default function QuickReactionPage() {
  const s = useSettings();
  const { show } = useToast();
  const selected = getReaction(s.quickReaction);

  return (
    <SubScreen title="Быстрая реакция">
      {/* Превью выбранной — анимированная */}
      <div className="flex flex-col items-center gap-3 px-6 pt-8">
        <motion.div
          key={selected.emoji}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="flex h-28 w-28 items-center justify-center rounded-full bg-accent/10"
        >
          <AnimatedReaction reaction={selected} size={56} />
        </motion.div>
        <p className="text-sm text-muted">
          Выбрана реакция «{selected.label}»
        </p>
      </div>

      <SectionTitle>Выберите реакцию</SectionTitle>
      <div className="mx-3 grid grid-cols-4 gap-2 rounded-[var(--radius-card)] bg-surface p-3">
        {REACTIONS.map((r) => {
          const active = r.emoji === s.quickReaction;
          return (
            <motion.button
              key={r.emoji}
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                s.set("quickReaction", r.emoji);
                show(`Быстрая реакция: ${r.emoji}`);
              }}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl transition-colors",
                active
                  ? "bg-accent/10 ring-2 ring-accent"
                  : "hover:bg-surface-2"
              )}
            >
              {/* Анимируем только выбранную, остальные статичные */}
              <AnimatedReaction reaction={r} size={32} animate={active} />
              {active && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white"
                >
                  <Check size={11} weight="bold" />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
      <GroupHint>
        Быстрая реакция появляется при двойном нажатии на сообщение. Выбранная
        реакция отображается анимированной.
      </GroupHint>
    </SubScreen>
  );
}
