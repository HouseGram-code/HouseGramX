"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { setSyncUser, clearAppCache } from "./sync";
import { isAdminEmail } from "./admin";

interface AuthResult {
  ok: boolean;
  error?: string;
  /** Требуется подтверждение e-mail (письмо отправлено). */
  needsConfirmation?: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** Завершена ли проверка существующей сессии. */
  ready: boolean;
  configured: boolean;
  signUp: (
    email: string,
    password: string,
    name?: string,
    extra?: { username?: string; avatar?: string }
  ) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Переводит коды ошибок Supabase в понятные русские сообщения. */
function ruError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Неверная почта или пароль";
  if (m.includes("user already registered")) return "Этот e-mail уже зарегистрирован";
  if (m.includes("email not confirmed")) return "Подтвердите e-mail по ссылке из письма";
  if (m.includes("password should be at least"))
    return "Пароль слишком короткий (минимум 6 символов)";
  if (m.includes("unable to validate email")) return "Некорректный e-mail";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Слишком много попыток. Попробуйте позже";
  return message;
}

/**
 * Записывает флаг официального аккаунта (галочку) в БД для админ-
 * аккаунта, чтобы галочку видели ВСЕ пользователи (читается из
 * profiles.official). Иначе админ видит галочку только локально
 * (isAdminEmail), а в БД она не сохраняется. Идемпотентно и безопасно:
 * никогда не роняет приложение.
 */
function syncOfficialFlag(u: User | null): void {
  if (!u || !isAdminEmail(u.email)) return;
  try {
    Promise.resolve(
      getSupabase().from("profiles").update({ official: true }).eq("id", u.id)
    ).catch(() => {});
  } catch {
    /* не критично для рендера */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setSyncUser(data.session?.user?.id ?? null);
      syncOfficialFlag(data.session?.user ?? null);
      // Пробрасываем JWT в Realtime, иначе при включённом RLS события
      // postgres_changes (живые сообщения, баннер звонка) не приходят.
      // Безопасно: этот вызов никогда не должен ронять приложение.
      const token = data.session?.access_token;
      if (token) {
        try {
          Promise.resolve(supabase.realtime?.setAuth(token)).catch(() => {});
        } catch {
          /* realtime auth не критичен для рендера */
        }
      }
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setSyncUser(newSession?.user?.id ?? null);
      syncOfficialFlag(newSession?.user ?? null);
      // Обновляем токен Realtime при любом изменении сессии (вход/рефреш).
      const t = newSession?.access_token;
      if (t) {
        try {
          Promise.resolve(supabase.realtime?.setAuth(t)).catch(() => {});
        } catch {
          /* realtime auth не критичен для рендера */
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp: AuthContextValue["signUp"] = async (email, password, name, extra) => {
    if (!isSupabaseConfigured) return { ok: false, error: "Сервис недоступен" };
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: name ? { data: { display_name: name } } : undefined,
    });
    if (error) return { ok: false, error: ruError(error.message) };

    // Если сессия сразу есть — создаём публичный профиль с данными регистрации.
    if (data.session && data.user) {
      // Финальная проверка занятости username (защита от гонки между шагами).
      if (extra?.username) {
        try {
          const { data: free } = await getSupabase().rpc("username_available", {
            _username: extra.username,
          });
          if (free === false) {
            return { ok: false, error: `@${extra.username} уже занят` };
          }
        } catch {
          /* проверка не критична — продолжаем */
        }
      }
      try {
        const { error: upsertError } = await getSupabase().from("profiles").upsert({
          id: data.user.id,
          name: name ?? "",
          username: extra?.username ?? "",
          avatar: extra?.avatar ?? "",
          official: isAdminEmail(email),
          updated_at: new Date().toISOString(),
        });
        // Нарушение уникального индекса username → имя уже занято.
        if (upsertError) {
          const m = upsertError.message.toLowerCase();
          if (
            m.includes("duplicate") ||
            m.includes("unique") ||
            m.includes("profiles_username_unique")
          ) {
            return { ok: false, error: `@${extra?.username} уже занят` };
          }
        }
        // Дублируем локально, чтобы профиль сразу был заполнен.
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              "messenger.profile.v1",
              JSON.stringify({
                name: name ?? "",
                username: extra?.username ?? "",
                avatar: extra?.avatar ?? "",
                bio: "",
                color: "#c0392b",
              })
            );
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* профиль допишется позже из ProfileProvider */
      }
    }

    // Если подтверждение e-mail включено, сессии ещё нет.
    const needsConfirmation = !data.session;
    return { ok: true, needsConfirmation };
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    if (!isSupabaseConfigured) return { ok: false, error: "Сервис недоступен" };
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { ok: false, error: ruError(error.message) };
    return { ok: true };
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    if (isSupabaseConfigured) {
      try {
        await getSupabase().auth.signOut();
      } catch {
        /* ignore */
      }
    }
    clearAppCache();
    setSyncUser(null);
    // Перезагружаем, чтобы все сторы сбросились к начальному состоянию.
    if (typeof window !== "undefined") window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        ready,
        configured: isSupabaseConfigured,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен быть внутри AuthProvider");
  return ctx;
}
