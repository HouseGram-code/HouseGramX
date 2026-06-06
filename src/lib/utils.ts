import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Объединяет классы Tailwind, корректно разрешая конфликты. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Форматирует большие числа счётчиков непрочитанных: 1700 -> "1,7K". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  const rounded = Math.round(k * 10) / 10;
  return `${String(rounded).replace(".", ",")}K`;
}

/** Формат «был(а) в сети» по времени последнего визита. */
export function formatLastSeen(ts?: number): string {
  if (!ts) return "был(а) недавно";
  const now = new Date();
  const seen = new Date(ts);
  const diffMs = now.getTime() - ts;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "был(а) в сети только что";
  if (diffMin < 60) return `был(а) в сети ${diffMin} мин назад`;

  const time = seen.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfSeenDay = new Date(
    seen.getFullYear(),
    seen.getMonth(),
    seen.getDate()
  ).getTime();
  const dayDiff = Math.round((startOfToday - startOfSeenDay) / 86400000);

  if (dayDiff === 0) return `был(а) в сети сегодня в ${time}`;
  if (dayDiff === 1) return `был(а) в сети вчера в ${time}`;

  const date = seen.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  return `был(а) в сети ${date}`;
}

/**
 * Детерминированное «правдоподобное» время последнего визита для случаев,
 * когда у собеседника ещё нет реального last_seen. Стабильно для
 * одного собеседника и даёт фразу вида «был(а) в сети N мин назад».
 */
export function fallbackLastSeen(seed?: string): number {
  const str = seed && seed.length > 0 ? seed : "anon";
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  const minutes = 3 + (h % 55); // 3..57 минут назад
  return Date.now() - minutes * 60_000;
}
