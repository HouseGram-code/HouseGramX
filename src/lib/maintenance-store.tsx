"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { fetchMaintenance, type Maintenance } from "./admin";

interface MaintenanceContextValue extends Maintenance {
  /** Завершена ли первичная загрузка состояния. */
  ready: boolean;
  /** Локально обновить состояние (после изменения админом). */
  apply: (value: Maintenance) => void;
}

const MaintenanceContext = createContext<MaintenanceContextValue | null>(null);

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Maintenance>({ enabled: false, message: "" });
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    fetchMaintenance().then((m) => {
      if (!active) return;
      setState(m);
      setReady(true);
    });

    // Реальное время: изменения режима техработ применяются мгновенно у всех.
    const channel = getSupabase()
      .channel("app_settings_maintenance")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
          filter: "key=eq.maintenance",
        },
        (payload) => {
          const row = payload.new as { value?: Maintenance } | null;
          if (row?.value) {
            setState({
              enabled: Boolean(row.value.enabled),
              message: row.value.message ?? "",
            });
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      getSupabase().removeChannel(channel);
    };
  }, []);

  return (
    <MaintenanceContext.Provider
      value={{ ...state, ready, apply: setState }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const ctx = useContext(MaintenanceContext);
  if (!ctx) throw new Error("useMaintenance должен быть внутри MaintenanceProvider");
  return ctx;
}
