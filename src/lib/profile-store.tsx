"use client";

import {
  createContext,
  useContext,
  useEffect,
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

  useCloudPersistence<Profile>({
    key: STORAGE_KEY,
    snapshot: profile,
    hydrated,
    setHydrated,
    applyData: (data) => setProfile((p) => ({ ...p, ...data })),
  });

  /** Публикуем имя/аватар в общедоступную таблицу profiles. */
  const syncPublicProfile = (p: Profile) => {
    if (!isSupabaseConfigured) return;
    const uid = getSyncUser();
    if (!uid) return;
    void getSupabase()
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
        setProfile((p) => ({
          ...p,
          name: data.name || p.name,
          username: data.username || p.username,
          avatar: data.avatar || p.avatar,
          color: data.color || p.color,
          bio: data.bio || p.bio,
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
      if (id) void syncFromCloud(id);
    });
    const cur = getSyncUser();
    if (cur) void syncFromCloud(cur);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (patch: Partial<Profile>) =>
    setProfile((p) => {
      const next = { ...p, ...patch };
      syncPublicProfile(next);
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
