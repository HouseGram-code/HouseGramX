"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { registerSession } from "@/lib/device-sessions";

/**
 * Невидимый компонент: регистрирует текущее устройство как активный сеанс
 * и периодически обновляет last_seen, пока вкладка открыта.
 */
export function SessionTracker() {
  const { user } = useAuth();

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let active = true;

    const ping = () => {
      if (active) void registerSession(uid);
    };

    ping();
    const interval = window.setInterval(ping, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.id]);

  return null;
}
