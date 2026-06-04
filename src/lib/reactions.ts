// Доступные быстрые реакции и их анимации.

export interface ReactionDef {
  emoji: string;
  label: string;
  /** Тип анимации для выбранной реакции. */
  anim: "heartbeat" | "bounce" | "spin" | "shake" | "pulse" | "tada";
}

export const REACTIONS: ReactionDef[] = [
  { emoji: "❤️", label: "Сердце", anim: "heartbeat" },
  { emoji: "👍", label: "Класс", anim: "bounce" },
  { emoji: "🔥", label: "Огонь", anim: "pulse" },
  { emoji: "😂", label: "Смех", anim: "shake" },
  { emoji: "😮", label: "Вау", anim: "tada" },
  { emoji: "😢", label: "Грусть", anim: "bounce" },
  { emoji: "🎉", label: "Праздник", anim: "spin" },
  { emoji: "👏", label: "Аплодисменты", anim: "tada" },
];

export function getReaction(emoji: string): ReactionDef {
  return REACTIONS.find((r) => r.emoji === emoji) ?? REACTIONS[0];
}
