"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useCloudPersistence } from "./sync";

/** Папка чатов: имя + список id чатов, входящих в неё. */
export interface ChatFolder {
  id: string;
  name: string;
  chatIds: string[];
}

interface FoldersState {
  folders: ChatFolder[];
}

const DEFAULTS: FoldersState = { folders: [] };

const STORAGE_KEY = "messenger.folders.v1";

interface FoldersContextValue {
  folders: ChatFolder[];
  /** Создать папку и вернуть её id. */
  createFolder: (name: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  /** Добавить/убрать чат из папки. */
  toggleChatInFolder: (folderId: string, chatId: string) => void;
  /** Входит ли чат в папку. */
  isInFolder: (folderId: string, chatId: string) => boolean;
}

const FoldersContext = createContext<FoldersContextValue | null>(null);

function makeId() {
  return `f_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function FoldersProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FoldersState>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useCloudPersistence<Partial<FoldersState>>({
    key: STORAGE_KEY,
    snapshot: state,
    hydrated,
    setHydrated,
    applyData: (data) => {
      setState((s) => ({ ...s, ...data }));
    },
  });

  const createFolder: FoldersContextValue["createFolder"] = (name) => {
    const id = makeId();
    const folder: ChatFolder = {
      id,
      name: name.trim() || "Новая папка",
      chatIds: [],
    };
    setState((s) => ({ ...s, folders: [...s.folders, folder] }));
    return id;
  };

  const renameFolder: FoldersContextValue["renameFolder"] = (id, name) => {
    setState((s) => ({
      ...s,
      folders: s.folders.map((f) =>
        f.id === id ? { ...f, name: name.trim() || f.name } : f
      ),
    }));
  };

  const deleteFolder: FoldersContextValue["deleteFolder"] = (id) => {
    setState((s) => ({ ...s, folders: s.folders.filter((f) => f.id !== id) }));
  };

  const toggleChatInFolder: FoldersContextValue["toggleChatInFolder"] = (
    folderId,
    chatId
  ) => {
    setState((s) => ({
      ...s,
      folders: s.folders.map((f) => {
        if (f.id !== folderId) return f;
        const has = f.chatIds.includes(chatId);
        return {
          ...f,
          chatIds: has
            ? f.chatIds.filter((c) => c !== chatId)
            : [...f.chatIds, chatId],
        };
      }),
    }));
  };

  const isInFolder: FoldersContextValue["isInFolder"] = (folderId, chatId) =>
    state.folders.find((f) => f.id === folderId)?.chatIds.includes(chatId) ??
    false;

  const ctxValue: FoldersContextValue = {
    folders: state.folders,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleChatInFolder,
    isInFolder,
  };

  return (
    <FoldersContext.Provider value={ctxValue}>
      {children}
    </FoldersContext.Provider>
  );
}

export function useFolders() {
  const ctx = useContext(FoldersContext);
  if (!ctx) {
    throw new Error(
      "useFolders должен использоваться внутри FoldersProvider"
    );
  }
  return ctx;
}
