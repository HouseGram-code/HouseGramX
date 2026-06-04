"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CaretLeft,
  Camera,
  X,
  Smiley,
  UsersThree,
  UserSwitch,
  ClockCounterClockwise,
  SignOut,
  Trash,
  CaretRight,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { ConfirmSheet, type ConfirmConfig } from "@/components/ConfirmSheet";
import { useChats } from "@/lib/chat-store";
import { useToast } from "@/components/Toast";

const MAX_DESC = 400;

export default function GroupEditPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const { getConversation, updateChannel, clearHistory, deleteChat } =
    useChats();
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const conv = getConversation(chatId);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  useEffect(() => {
    if (conv) {
      setTitle(conv.title);
      setDesc(conv.description ?? "");
    }
  }, [conv]);

  if (!conv) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-background">
        <p className="text-foreground">Чат не найден</p>
      </div>
    );
  }

  const save = () => {
    updateChannel(chatId, {
      title: title.trim() || conv.title,
      description: desc.trim() || undefined,
      initials: (title.trim()[0] ?? conv.initials).toUpperCase(),
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      show("Выберите изображение");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      show("Файл больше 3 МБ");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateChannel(chatId, { avatar: String(reader.result) });
      show("Фото обновлено");
    };
    reader.readAsDataURL(file);
  };

  const reactionsValue = conv.reactionsEnabled === false ? "Выкл" : "Все";

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <header className="z-20 flex items-center justify-between border-b border-separator bg-surface/90 px-3 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2.5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => {
            save();
            router.back();
          }}
          aria-label="Назад"
          className="text-foreground transition active:opacity-60"
        >
          <CaretLeft size={26} weight="bold" />
        </button>
      </header>

      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto py-5">
        {/* Аватар */}
        <div className="flex justify-center">
          <div className="relative">
            <Avatar
              initials={conv.initials}
              color={conv.color}
              size={96}
              src={conv.avatar || undefined}
              className="text-4xl"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white ring-4 ring-background"
            >
              <Camera size={16} weight="fill" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        </div>

        {/* Название */}
        <div className="mx-3 flex items-center gap-2 rounded-[var(--radius-card)] bg-surface px-4 py-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            maxLength={80}
            placeholder="Название"
            className="w-full bg-transparent text-[16px] text-foreground placeholder:text-muted-2 focus:outline-none"
          />
          {title && (
            <button
              type="button"
              onClick={() => setTitle("")}
              aria-label="Очистить"
              className="text-muted-2"
            >
              <X size={18} weight="bold" />
            </button>
          )}
        </div>

        {/* О чате */}
        <div className="mx-3 rounded-[var(--radius-card)] bg-surface px-4 py-3">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value.slice(0, MAX_DESC))}
            onBlur={save}
            rows={3}
            placeholder="О чате"
            className="no-scrollbar w-full resize-none bg-transparent text-[16px] text-foreground placeholder:text-muted-2 focus:outline-none"
          />
        </div>

        {/* Реакции */}
        <div className="mx-3 overflow-hidden rounded-[var(--radius-card)] bg-surface">
          <RowNav
            icon={Smiley}
            label="Реакции"
            value={reactionsValue}
            onClick={() => router.push(`/chats/${chatId}/reactions`)}
          />
        </div>

        {/* Разрешения участников */}
        <div className="mx-3 overflow-hidden rounded-[var(--radius-card)] bg-surface">
          <RowNav
            icon={UsersThree}
            label="Разрешения участников"
            onClick={() => router.push(`/chats/${chatId}/group/permissions`)}
          />
        </div>

        {/* Действия владельца */}
        <div className="mx-3 overflow-hidden rounded-[var(--radius-card)] bg-surface">
          <DangerRow
            icon={UserSwitch}
            label="Передать права владельца"
            onClick={() => router.push(`/chats/${chatId}/transfer`)}
          />
          <DangerRow
            icon={ClockCounterClockwise}
            label="Очистить историю"
            onClick={() =>
              setConfirm({
                title: `Вы точно хотите очистить историю чата «${conv.title}»?`,
                actions: [
                  {
                    label: "Очистить у себя",
                    danger: true,
                    onClick: () => {
                      clearHistory(chatId);
                      show("История очищена");
                    },
                  },
                  {
                    label: "Очистить у всех",
                    danger: true,
                    onClick: () => {
                      clearHistory(chatId);
                      show("История очищена у всех");
                    },
                  },
                ],
              })
            }
          />
          <DangerRow
            icon={SignOut}
            label="Выйти из чата"
            accent
            last
            onClick={() =>
              setConfirm({
                title: `Выйти из чата «${conv.title}»?`,
                actions: [
                  {
                    label: "Передать права и выйти",
                    danger: true,
                    onClick: () => router.push(`/chats/${chatId}/transfer`),
                  },
                ],
              })
            }
          />
        </div>

        {/* Удалить чат */}
        <div className="mx-3 overflow-hidden rounded-[var(--radius-card)] bg-surface">
          <DangerRow
            icon={Trash}
            label="Удалить чат"
            accent
            last
            onClick={() =>
              setConfirm({
                title: `Вы точно хотите удалить чат «${conv.title}»?`,
                message:
                  "Передайте права владельца, чтобы остальные участники могли продолжить общение",
                actions: [
                  {
                    label: "Передать права и выйти",
                    danger: true,
                    onClick: () => router.push(`/chats/${chatId}/transfer`),
                  },
                  {
                    label: "Удалить чат у всех",
                    danger: true,
                    onClick: () => {
                      deleteChat(chatId);
                      show("Чат удалён");
                      router.replace("/chats");
                    },
                  },
                ],
              })
            }
          />
        </div>
      </div>

      <ConfirmSheet config={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function RowNav({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof Smiley;
  label: string;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
    >
      <Icon size={22} weight="regular" className="text-muted" />
      <span className="flex-1 text-[15px] text-foreground">{label}</span>
      {value && <span className="text-[15px] text-muted">{value}</span>}
      <CaretRight size={18} weight="bold" className="text-muted-2" />
    </button>
  );
}

function DangerRow({
  icon: Icon,
  label,
  onClick,
  accent,
  last,
}: {
  icon: typeof Trash;
  label: string;
  onClick: () => void;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 pl-4 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
    >
      <Icon
        size={22}
        weight="regular"
        className={accent ? "text-accent" : "text-foreground"}
      />
      <span
        className={`flex-1 py-3.5 pr-4 text-[15px] ${
          accent ? "text-accent" : "text-foreground"
        } ${last ? "" : "border-b border-separator"}`}
      >
        {label}
      </span>
    </button>
  );
}
