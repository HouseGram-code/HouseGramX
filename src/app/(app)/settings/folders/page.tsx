"use client";

import { useState } from "react";
import {
  FolderSimple,
  Plus,
  PencilSimple,
  Trash,
  Check,
} from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Group, GroupHint, SectionTitle } from "@/components/settings-ui";
import { Avatar } from "@/components/Avatar";
import { useFolders } from "@/lib/folders-store";
import { useChats } from "@/lib/chat-store";

export default function FoldersPage() {
  const {
    folders,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleChatInFolder,
    isInFolder,
  } = useFolders();
  const { conversations } = useChats();

  const [newName, setNewName] = useState("");
  const [managingId, setManagingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const chats = conversations.filter((c) => !c.saved);
  const managing = folders.find((f) => f.id === managingId) || null;

  const add = () => {
    if (!newName.trim()) return;
    createFolder(newName);
    setNewName("");
  };

  // --- Экран выбора чатов внутри папки ---
  if (managing) {
    return (
      <SubScreen title={managing.name} subtitle="Выберите чаты">
        <Group>
          {chats.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-muted">Нет чатов</p>
          )}
          {chats.map((c, i) => {
            const inside = isInFolder(managing.id, c.id);
            const last = i === chats.length - 1;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleChatInFolder(managing.id, c.id)}
                className={
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-surface-2" +
                  (!last ? " border-b border-separator" : "")
                }
              >
                <Avatar
                  initials={c.initials}
                  color={c.color}
                  size={40}
                  src={c.avatar || undefined}
                />
                <span className="flex-1 truncate text-[15px] text-foreground">
                  {c.title}
                </span>
                {inside ? (
                  <span className="text-accent">
                    <Check size={22} weight="bold" />
                  </span>
                ) : (
                  <span className="block h-[22px] w-[22px] rounded-full border-2 border-muted-2/50" />
                )}
              </button>
            );
          })}
        </Group>
        <div className="px-3 pt-4">
          <button
            type="button"
            onClick={() => setManagingId(null)}
            className="w-full rounded-[var(--radius-card)] bg-accent py-3 text-[15px] font-semibold text-white transition active:opacity-80"
          >
            Готово
          </button>
        </div>
      </SubScreen>
    );
  }

  return (
    <SubScreen title="Папки">
      <SectionTitle>Новая папка</SectionTitle>
      <Group>
        <div className="flex items-center gap-2 px-4 py-2.5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название папки"
            maxLength={32}
            className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          <button
            type="button"
            disabled={!newName.trim()}
            onClick={add}
            className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-[14px] font-medium text-white transition active:opacity-80 disabled:opacity-40"
          >
            <Plus size={16} weight="bold" /> Создать
          </button>
        </div>
      </Group>

      {folders.length > 0 ? (
        <>
          <SectionTitle>Мои папки</SectionTitle>
          <Group>
            {folders.map((f, i) => {
              const last = i === folders.length - 1;
              if (renamingId === f.id) {
                return (
                  <div
                    key={f.id}
                    className={
                      "flex items-center gap-2 px-4 py-2.5" +
                      (!last ? " border-b border-separator" : "")
                    }
                  >
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1 bg-transparent text-[15px] text-foreground outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          renameFolder(f.id, renameValue);
                          setRenamingId(null);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        renameFolder(f.id, renameValue);
                        setRenamingId(null);
                      }}
                      className="text-accent"
                    >
                      <Check size={20} weight="bold" />
                    </button>
                  </div>
                );
              }
              return (
                <div
                  key={f.id}
                  className={
                    "flex items-center gap-3 px-4 py-3" +
                    (!last ? " border-b border-separator" : "")
                  }
                >
                  <FolderSimple
                    size={22}
                    weight="regular"
                    className="shrink-0 text-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setManagingId(f.id)}
                    className="flex flex-1 flex-col items-start text-left"
                  >
                    <span className="text-[15px] text-foreground">{f.name}</span>
                    <span className="text-[13px] text-muted">
                      {f.chatIds.length} чатов
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(f.id);
                      setRenameValue(f.name);
                    }}
                    className="p-1.5 text-muted transition active:opacity-60"
                  >
                    <PencilSimple size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFolder(f.id)}
                    className="p-1.5 text-red-500 transition active:opacity-60"
                  >
                    <Trash size={20} />
                  </button>
                </div>
              );
            })}
          </Group>
          <GroupHint>
            Нажмите на папку, чтобы выбрать входящие в неё чаты. Папки помогают
            группировать диалоги по темам.
          </GroupHint>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 px-10 pt-20 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-2">
            <FolderSimple size={44} weight="duotone" className="text-accent" />
          </div>
          <p className="text-lg font-semibold text-foreground">Пока нет папок</p>
          <p className="text-sm leading-relaxed text-muted">
            Создайте папку выше, чтобы сортировать чаты по группам — работа,
            друзья, каналы.
          </p>
        </div>
      )}
    </SubScreen>
  );
}
