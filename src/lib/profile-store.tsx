"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCloudPersistence, getSyncUser, onSyncUserChange } from "./sync";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export interface Profile {
  name: string;
  username: string;
  bio: string;
  /** data-URL загруженной аватарки или пустая строка. */
  avatar: string;
  /** Цвет фона аватара-заглушки. */
  color: string;
}

const DEFAULTS: Profile = {
  name: "",
  username: "",
  bio: "",
  avatar: "",
  color: "#c0392b",
};

const STORAGE_KEY = "messenger.profile.v1";

interface ProfileContextValue {
  profile: Profile;
  save: (patch: Partial<Profile>) => void;
  initials: string;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  // Гарантия, что облачный профиль «зеркалит» локальный (один раз
  // на аккаунт за сессию) — чинит аватары, которые не доехали до облака.
  const reconciledFor = useRef<string | null>(null);

  useCloudPersistence<Profile>({
    key: STORAGE_KEY,
    snapshot: profile,
    hydrated,
    setHydrated,
    applyData: (data) => setProfile((p) => ({ ...p, ...data })),
  });

  /** Публикуем имя/аватар в общедоступную таблицу profiles. */
  const syncPublicProfile = async (p: Profile) => {
    if (!isSupabaseConfigured) return;
    const uid = getSyncUser();
    if (!uid) return;
    try {
      const { error } = await getSupabase()
        .from("profiles")
        .upsert({
          id: uid,
          name: p.name,
          username: p.username,
          avatar: p.avatar,
          color: p.color,
          bio: p.bio,
          updated_at: new Date().toISOString(),
        });
      if (error) console.warn("[profile] syncPublicProfile:", error.message);
    } catch (e) {
      console.warn("[profile] syncPublicProfile failed:", e);
    }
  };

  /**
   * При входе подтягиваем существующий публичный профиль (например, имя,
   * указанное при регистрации). Если профиля нет — создаём из локальных данных.
   */
  const syncFromCloud = async (uid: string) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data } = await getSupabase()
        .from("profiles")
        .select("name, username, avatar, color, bio")
        .eq("id", uid)
        .maybeSingle();
      if (data && (data.name || data.username || data.avatar || data.bio)) {
        // ВАЖНО: публичная таблица profiles — это лишь «зеркало» для других
        // пользователей. Она НИКОГДА не должна перетирать собственные данные
        // пользователя (иначе аватар «откатывается» на старый/чужой после
        // перезагрузки). Берём облачные значения только для ПУСТЫХ локальных полей.
        setProfile((p) => ({
          ...p,
          name: p.name || data.name || "",
          username: p.username || data.username || "",
          avatar: p.avatar || data.avatar || "",
          color: p.color || data.color || p.color,
          bio: p.bio || data.bio || "",
        }));
      } else {
        // Профиля ещё нет — создаём из текущих локальных данных.
        syncPublicProfile(profile);
      }
    } catch {
      /* ignore */
    }
  };

  // При входе синхронизируем профиль с облаком.
  useEffect(() => {
    const off = onSyncUserChange((id) => {
      reconciledFor.current = null;
      if (id) void syncFromCloud(id);
    });
    const cur = getSyncUser();
    if (cur) void syncFromCloud(cur);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Самовосстановление: как только локальный профиль загружен, один раз
  // на аккаунт пушим его в облако. Это гарантирует, что облачный профиль
  // (который видят другие) всегда соответствует тому, что пользователь
  // видит у себя — даже если предыдущая запись аватара не прошла.
  useEffect(() => {
    if (!hydrated || !isSupabaseConfigured) return;
    const uid = getSyncUser();
    if (!uid || reconciledFor.current === uid) return;
    if (profile.name || profile.avatar || profile.username || profile.bio) {
      reconciledFor.current = uid;
      void syncPublicProfile(profile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, profile]);

  const save = (patch: Partial<Profile>) =>
    setProfile((p) => {
      const next = { ...p, ...patch };
      void syncPublicProfile(next);
      return next;
    });

  return (
    <ProfileContext.Provider
      value={{ profile, save, initials: makeInitials(profile.name) }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile должен быть внутри ProfileProvider");
  return ctx;
}
