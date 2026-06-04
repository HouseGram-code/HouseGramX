"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useCloudPersistence } from "./sync";

export type CallType = "audio" | "video";
export type CallDirection = "outgoing" | "incoming" | "missed";

export interface CallRecord {
  id: string;
  /** Кому/от кого: имя для отображения. */
  title: string;
  color: string;
  initials: string;
  type: CallType;
  direction: CallDirection;
  /** Длительность в секундах (0 для пропущенных). */
  duration: number;
  ts: number;
}

interface CallsContextValue {
  calls: CallRecord[];
  logCall: (call: Omit<CallRecord, "id" | "ts">) => void;
  clearCalls: () => void;
  removeCall: (id: string) => void;
}

const CallsContext = createContext<CallsContextValue | null>(null);

const STORAGE_KEY = "messenger.calls.v1";

function uid() {
  return "call_" + Math.random().toString(36).slice(2, 10);
}

export function CallsProvider({ children }: { children: ReactNode }) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useCloudPersistence<CallRecord[]>({
    key: STORAGE_KEY,
    snapshot: calls,
    hydrated,
    setHydrated,
    applyData: (data) => {
      if (Array.isArray(data)) setCalls(data);
    },
  });

  const logCall: CallsContextValue["logCall"] = (call) => {
    setCalls((cs) => [{ ...call, id: uid(), ts: Date.now() }, ...cs].slice(0, 100));
  };

  const clearCalls = () => setCalls([]);
  const removeCall = (id: string) =>
    setCalls((cs) => cs.filter((c) => c.id !== id));

  return (
    <CallsContext.Provider value={{ calls, logCall, clearCalls, removeCall }}>
      {children}
    </CallsContext.Provider>
  );
}

export function useCalls() {
  const ctx = useContext(CallsContext);
  if (!ctx) throw new Error("useCalls должен быть внутри CallsProvider");
  return ctx;
}
