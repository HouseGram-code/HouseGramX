"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useCloudPersistence } from "./sync";

export type Theme = "light" | "dark" | "system";

/** Кто видит время моей активности (последний визит). */
export type LastSeenVisibility = "everyone" | "contacts" | "nobody";

export interface SettingsState {
  theme: Theme;
  // Уведомления
  notificationsEnabled: boolean;
  sound: boolean;
  vibration: boolean;
  messagePreview: boolean;
  // Безопасность
  passcode: boolean;
  twoFactor: boolean;
  readReceipts: boolean;
  // Кто видит мой статус (время последней активности)
  lastSeenVisibility: LastSeenVisibility;
  // Сообщения
  enterToSend: boolean;
  largeEmoji: boolean;
  fontSize: number; // 14..20
  // Стикеры
  stickersEnabled: boolean;
  suggestStickers: boolean;
  loopStickers: boolean;
  // Быстрая реакция (одинарный тап двойным нажатием по сообщению)
  quickReactionEnabled: boolean;
  quickReaction: string;
  // Обои чата: "" — без обоев, иначе путь к изображению.
  wallpaper: string;
}

const DEFAULTS: SettingsState = {
  theme: "system",
  notificationsEnabled: true,
  sound: true,
  vibration: true,
  messagePreview: true,
  passcode: false,
  twoFactor: false,
  readReceipts: true,
  lastSeenVisibility: "everyone",
  enterToSend: true,
  largeEmoji: true,
  fontSize: 16,
  stickersEnabled: true,
  suggestStickers: true,
  loopStickers: true,
  quickReactionEnabled: true,
  quickReaction: "👍",
  wallpaper: "",
};

const STORAGE_KEY = "messenger.settings.v1";

interface SettingsContextValue extends SettingsState {
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  toggle: (key: BooleanKeys) => void;
  reset: () => void;
}

type BooleanKeys = {
  [K in keyof SettingsState]: SettingsState[K] extends boolean ? K : never;
}[keyof SettingsState];

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Применяет тему к <html data-theme>. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SettingsState>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  // Загрузка из кэша/облака + синхронизация
  useCloudPersistence<Partial<SettingsState>>({
    key: STORAGE_KEY,
    snapshot: state,
    hydrated,
    setHydrated,
    applyData: (data) => {
      setState((s) => ({ ...s, ...data }));
      if (data.theme) applyTheme(data.theme);
    },
  });

  // Реакция на смену системной темы, когда выбран режим «system»
  useEffect(() => {
    if (state.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [state.theme]);

  const set: SettingsContextValue["set"] = (key, value) => {
    setState((s) => ({ ...s, [key]: value }));
    if (key === "theme") applyTheme(value as Theme);
  };

  const toggle: SettingsContextValue["toggle"] = (key) => {
    setState((s) => ({ ...s, [key]: !s[key] }));
  };

  const reset = () => {
    setState(DEFAULTS);
    applyTheme(DEFAULTS.theme);
  };

  return (
    <SettingsContext.Provider value={{ ...state, set, toggle, reset }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings должен использоваться внутри SettingsProvider");
  }
  return ctx;
}
