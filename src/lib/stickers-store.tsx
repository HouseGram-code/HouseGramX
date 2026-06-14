"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useCloudPersistence } from "./sync";

export interface Sticker {
  id: string;
  /** Путь к изображению стикера (PNG/data-URL/публичный URL). */
  src: string;
  /** Эмодзи-фолбэк, если картинка не загрузилась. */
  emoji: string;
  /** Подпись/ключевое слово. */
  name: string;
  /** id набора, которому принадлежит стикер (заполняется автоматически). */
  setId?: string;
}

export interface StickerSet {
  id: string;
  title: string;
  /** Путь к обложке набора. */
  cover: string;
  stickers: Sticker[];
  /** Пользовательский набор (создан в приложении) — можно удалять/делиться. */
  custom?: boolean;
  /** Автор набора (имя), если создан пользователем. */
  author?: string;
}

// Готовый набор «Подарки» (24 стикера) — Microsoft Fluent Emoji 3D (MIT).
const GIFTS_8MARCH: StickerSet = {
  id: "gifts-8march",
  title: "Подарки на 8 марта",
  cover: "/stickers/gifts/g1.png",
  stickers: [
    { id: "g1", src: "/stickers/gifts/g1.png", emoji: "💐", name: "букет" },
    { id: "g2", src: "/stickers/gifts/g2.png", emoji: "🎁", name: "подарок" },
    { id: "g3", src: "/stickers/gifts/g3.png", emoji: "🧸", name: "мишка" },
    { id: "g4", src: "/stickers/gifts/g4.png", emoji: "🌹", name: "роза" },
    { id: "g5", src: "/stickers/gifts/g5.png", emoji: "👠", name: "туфля" },
    { id: "g6", src: "/stickers/gifts/g6.png", emoji: "💄", name: "помада" },
    { id: "g7", src: "/stickers/gifts/g7.png", emoji: "💍", name: "кольцо" },
    { id: "g8", src: "/stickers/gifts/g8.png", emoji: "👜", name: "сумка" },
    { id: "g9", src: "/stickers/gifts/g9.png", emoji: "🕶️", name: "очки" },
    { id: "g10", src: "/stickers/gifts/g10.png", emoji: "👑", name: "корона" },
    { id: "g11", src: "/stickers/gifts/g11.png", emoji: "🎂", name: "торт" },
    { id: "g12", src: "/stickers/gifts/g12.png", emoji: "🎈", name: "шарик" },
    { id: "g13", src: "/stickers/gifts/g13.png", emoji: "🎉", name: "хлопушка" },
    { id: "g14", src: "/stickers/gifts/g14.png", emoji: "💝", name: "сердце с лентой" },
    { id: "g15", src: "/stickers/gifts/g15.png", emoji: "🍫", name: "шоколад" },
    { id: "g16", src: "/stickers/gifts/g16.png", emoji: "🍾", name: "шампанское" },
    { id: "g17", src: "/stickers/gifts/g17.png", emoji: "🥂", name: "бокалы" },
    { id: "g18", src: "/stickers/gifts/g18.png", emoji: "🌸", name: "сакура" },
    { id: "g19", src: "/stickers/gifts/g19.png", emoji: "🌷", name: "тюльпан" },
    { id: "g20", src: "/stickers/gifts/g20.png", emoji: "💎", name: "бриллиант" },
    { id: "g21", src: "/stickers/gifts/g21.png", emoji: "❤️", name: "сердце" },
    { id: "g22", src: "/stickers/gifts/g22.png", emoji: "💖", name: "сияющее сердце" },
    { id: "g23", src: "/stickers/gifts/g23.png", emoji: "✨", name: "блёстки" },
    { id: "g24", src: "/stickers/gifts/g24.png", emoji: "🤩", name: "восторг" },
  ],
};

const DEFAULT_SETS: StickerSet[] = [GIFTS_8MARCH];

interface StickersContextValue {
  /** Видимые наборы (дефолтные + пользовательские, без скрытых). */
  sets: StickerSet[];
  /** id недавних стикеров (последние использованные первыми). */
  recent: string[];
  /** id избранных стикеров. */
  favorites: string[];
  allStickers: Sticker[];
  getSticker: (id: string) => Sticker | undefined;
  useSticker: (id: string) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clearRecent: () => void;
  removeSet: (id: string) => void;
  /** Найти набор по id (включая скрытые и известные пользовательские). */
  getSet: (id: string) => StickerSet | undefined;
  /** Найти набор по пути стикера (для тапа по присланному стикеру). */
  findSetBySticker: (src?: string, setId?: string) => StickerSet | undefined;
  /** Установлен ли набор (виден в моих наборах). */
  isSetInstalled: (id: string) => boolean;
  /** Создать новый пользовательский набор. Возвращает его. */
  createSet: (args: {
    title: string;
    author?: string;
    stickers: Array<{ src: string; emoji: string; name?: string }>;
  }) => StickerSet;
  /** Добавить (установить) набор — например, полученный по ссылке. */
  addSet: (set: StickerSet) => void;
  /** Недавние эмодзи. */
  recentEmojis: string[];
  useEmoji: (emoji: string) => void;
}

const StickersContext = createContext<StickersContextValue | null>(null);

const STORAGE_KEY = "messenger.stickers.v1";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function StickersProvider({ children }: { children: ReactNode }) {
  // Пользовательские наборы (созданные/импортированные).
  const [customSets, setCustomSets] = useState<StickerSet[]>([]);
  // Скрытые наборы (удалённые пользователем — в т.ч. дефолтные).
  const [hiddenSetIds, setHiddenSetIds] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>(["g15", "g7"]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  type StickersSnapshot = {
    recent: string[];
    favorites: string[];
    recentEmojis: string[];
    customSets: StickerSet[];
    hiddenSetIds: string[];
  };

  useCloudPersistence<StickersSnapshot>({
    key: STORAGE_KEY,
    snapshot: { recent, favorites, recentEmojis, customSets, hiddenSetIds },
    hydrated,
    setHydrated,
    applyData: (p) => {
      if (p.recent) setRecent(p.recent);
      if (p.favorites) setFavorites(p.favorites);
      if (p.recentEmojis) setRecentEmojis(p.recentEmojis);
      if (p.customSets) setCustomSets(p.customSets);
      if (p.hiddenSetIds) setHiddenSetIds(p.hiddenSetIds);
    },
  });

  // Все известные наборы (для поиска), затем — только видимые.
  const knownSets: StickerSet[] = [...DEFAULT_SETS, ...customSets];
  const sets: StickerSet[] = knownSets.filter(
    (s) => !hiddenSetIds.includes(s.id)
  );

  // Стикеры получают setId автоматически из своего набора.
  const allStickers: Sticker[] = sets.flatMap((s) =>
    s.stickers.map((st) => ({ ...st, setId: s.id }))
  );

  const getSticker = (id: string) => allStickers.find((s) => s.id === id);

  const getSet = (id: string) => knownSets.find((s) => s.id === id);

  const isSetInstalled = (id: string) =>
    sets.some((s) => s.id === id);

  const findSetBySticker = (src?: string, setId?: string) => {
    if (setId) {
      const byId = getSet(setId);
      if (byId) return byId;
    }
    if (!src) return undefined;
    return knownSets.find((s) => s.stickers.some((st) => st.src === src));
  };

  const useSticker = (id: string) => {
    setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 24));
  };

  const useEmoji = (emoji: string) => {
    setRecentEmojis((r) => [emoji, ...r.filter((x) => x !== emoji)].slice(0, 24));
  };

  const toggleFavorite = (id: string) => {
    setFavorites((f) =>
      f.includes(id) ? f.filter((x) => x !== id) : [id, ...f]
    );
  };

  const isFavorite = (id: string) => favorites.includes(id);

  const clearRecent = () => setRecent([]);

  const removeSet = (id: string) => {
    // Прячем из видимых; пользовательский — удаляем полностью.
    setHiddenSetIds((h) => (h.includes(id) ? h : [...h, id]));
    setCustomSets((c) => c.filter((s) => s.id !== id));
  };

  const createSet: StickersContextValue["createSet"] = ({
    title,
    author,
    stickers,
  }) => {
    const setId = uid("set");
    const built: Sticker[] = stickers.map((s, i) => ({
      id: uid(`st${i}`),
      src: s.src,
      emoji: s.emoji || "⭐️",
      name: s.name || title,
      setId,
    }));
    const set: StickerSet = {
      id: setId,
      title: title.trim() || "Мой набор",
      cover: built[0]?.src ?? "",
      stickers: built,
      custom: true,
      author,
    };
    setCustomSets((c) => [...c, set]);
    setHiddenSetIds((h) => h.filter((x) => x !== setId));
    return set;
  };

  const addSet: StickersContextValue["addSet"] = (set) => {
    // Снимаем «скрытие», если набор был удалён ранее.
    setHiddenSetIds((h) => h.filter((x) => x !== set.id));
    setCustomSets((c) => {
      if (c.some((s) => s.id === set.id)) return c;
      // Дефолтные наборы повторно не дублируем.
      if (DEFAULT_SETS.some((s) => s.id === set.id)) return c;
      const normalized: StickerSet = {
        ...set,
        custom: true,
        stickers: set.stickers.map((st) => ({ ...st, setId: set.id })),
      };
      return [...c, normalized];
    });
  };

  const ctxValue: StickersContextValue = {
    sets,
    recent,
    favorites,
    recentEmojis,
    allStickers,
    getSticker,
    useSticker,
    useEmoji,
    toggleFavorite,
    isFavorite,
    clearRecent,
    removeSet,
    getSet,
    findSetBySticker,
    isSetInstalled,
    createSet,
    addSet,
  };

  return (
    <StickersContext.Provider value={ctxValue}>
      {children}
    </StickersContext.Provider>
  );
}

export function useStickers() {
  const ctx = useContext(StickersContext);
  if (!ctx) throw new Error("useStickers должен быть внутри StickersProvider");
  return ctx;
}
