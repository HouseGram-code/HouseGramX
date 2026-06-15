/**
 * Каталог эмодзи-статусов HouseGram Premium (как у Telegram).
 * Анимированные статусы используют gif из /public/premium, остальные — эмодзи.
 */

export interface PremiumStatus {
  /** Уникальный id (хранится в profiles.premium_status). */
  id: string;
  label: string;
  /** Путь к анимированному gif (приоритетнее emoji). */
  src?: string;
  /** Обычный эмодзи-символ. */
  emoji?: string;
  /** Анимированный статус. */
  animated?: boolean;
}

export const PREMIUM_STATUSES: PremiumStatus[] = [
  { id: "redcrown", label: "Корона", src: "/premium/redcrown.gif", animated: true },
  { id: "crown", label: "Корона", emoji: "👑" },
  { id: "star", label: "Звезда", emoji: "⭐" },
  { id: "diamond", label: "Алмаз", emoji: "💎" },
  { id: "fire", label: "Огонь", emoji: "🔥" },
  { id: "heart", label: "Сердце", emoji: "❤️" },
  { id: "rocket", label: "Ракета", emoji: "🚀" },
  { id: "lightning", label: "Молния", emoji: "⚡" },
];

/** Находит статус по id. */
export function getPremiumStatus(id?: string | null): PremiumStatus | null {
  if (!id) return null;
  return PREMIUM_STATUSES.find((s) => s.id === id) ?? null;
}
