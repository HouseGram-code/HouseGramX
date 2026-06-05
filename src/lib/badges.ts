"use client";

/**
 * Метаданные бейджей профиля. Пока один тип — «Багхантер».
 * Значение хранится в profiles.badge (пустая строка = нет бейджа).
 */

export type BadgeKey = "bug_hunter";

export interface BadgeMeta {
  key: BadgeKey;
  /** Название бейджа. */
  label: string;
  /** Короткая подпись. */
  short: string;
  /** Полное описание для карточки на профиле. */
  description: string;
}

export const BADGES: Record<BadgeKey, BadgeMeta> = {
  bug_hunter: {
    key: "bug_hunter",
    label: "Багхантер",
    short: "Нашёл баги",
    description:
      "Этот пользователь нашёл баги в HouseGramX и помог сделать приложение лучше и стабильнее. Галочку выдаёт администрация.",
  },
};

/** Возвращает метаданные бейджа по ключу или null. */
export function badgeMeta(badge?: string | null): BadgeMeta | null {
  if (!badge) return null;
  return BADGES[badge as BadgeKey] ?? null;
}
