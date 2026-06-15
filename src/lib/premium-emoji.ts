/**
 * Кастомные премиум-эмодзи HouseGram Premium (инлайн в тексте, как в Telegram).
 * В тексте хранятся токеном вида `{pe:id}` и рендерятся картинкой/гифкой.
 */

export interface PremiumEmoji {
  id: string;
  src: string;
  /** Подпись/фолбэк-эмодзи. */
  label: string;
  emoji: string;
  animated?: boolean;
}

export const PREMIUM_EMOJIS: PremiumEmoji[] = [
  { id: "crown", src: "/premium/redcrown.gif", label: "Корона", emoji: "👑", animated: true },
  { id: "booster", src: "/premium/booster.png", label: "Бустер", emoji: "🚀" },
  { id: "moon", src: "/premium/moon.png", label: "Луна", emoji: "🌙" },
  { id: "stars", src: "/premium/stars.png", label: "Звёзды", emoji: "✨" },
];

/** Регэксп токена премиум-эмодзи в тексте: {pe:crown}. */
export const PE_TOKEN_RE = /\{pe:([a-z0-9_-]+)\}/gi;

/** Токен для вставки в текст. */
export function premiumEmojiToken(id: string): string {
  return `{pe:${id}}`;
}

/** Находит премиум-эмодзи по id. */
export function getPremiumEmoji(id: string): PremiumEmoji | undefined {
  return PREMIUM_EMOJIS.find((e) => e.id === id);
}

/** Есть ли в тексте хотя бы один премиум-эмодзи. */
export function hasPremiumEmoji(text?: string): boolean {
  if (!text) return false;
  PE_TOKEN_RE.lastIndex = 0;
  return PE_TOKEN_RE.test(text);
}

/** Заменяет токены премиум-эмодзи на обычный эмодзи-фолбэк (для превью). */
export function stripPremiumEmoji(text?: string): string {
  if (!text) return "";
  return text.replace(PE_TOKEN_RE, (_full, id: string) => {
    const pe = getPremiumEmoji(id);
    return pe ? pe.emoji : "";
  });
}
