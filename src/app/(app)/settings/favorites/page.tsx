"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  BookmarkSimple,
  ArrowRight,
  Images,
  FileText,
  ChatText,
  Play,
  FileAudio,
  type Icon,
} from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { useChats, type Message } from "@/lib/chat-store";
import { cn, formatBytes } from "@/lib/utils";

type Tab = "media" | "files" | "messages";

const tabs: { key: Tab; label: string; icon: Icon }[] = [
  { key: "media", label: "Медиа", icon: Images },
  { key: "files", label: "Файлы", icon: FileText },
  { key: "messages", label: "Сообщения", icon: ChatText },
];

export default function FavoritesPage() {
  const router = useRouter();
  const { conversations } = useChats();
  const [tab, setTab] = useState<Tab>("media");

  // Чат «Избранное» (Saved Messages) — место хранения.
  const saved = useMemo(
    () => conversations.find((c) => c.saved),
    [conversations]
  );
  const messages = saved?.messages ?? [];

  const media = messages.filter(
    (m) => m.kind === "media" && (m.mediaKind === "image" || m.mediaKind === "video")
  );
  const files = messages.filter(
    (m) => m.kind === "media" && (m.mediaKind === "file" || m.mediaKind === "audio")
  );
  const texts = messages.filter((m) => m.kind === "text" && m.text?.trim());

  const counts: Record<Tab, number> = {
    media: media.length,
    files: files.length,
    messages: texts.length,
  };

  const openSaved = () => saved && router.push(`/chats/${saved.id}`);

  return (
    <SubScreen
      title="Избранное"
      subtitle={saved ? `${messages.length} элементов` : undefined}
    >
      {/* Шапка-карточка избранного */}
      <button
        type="button"
        onClick={openSaved}
        className="group mx-3 mt-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition active:scale-[0.99]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-sm">
          <BookmarkSimple size={26} weight="fill" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold text-foreground">
            Сохранённые сообщения
          </span>
          <span className="block text-[13px] text-muted">
            Храните фото, видео, файлы и заметки в одном месте
          </span>
        </span>
        <ArrowRight
          size={20}
          weight="bold"
          className="shrink-0 text-muted-2 transition-transform group-hover:translate-x-0.5"
        />
      </button>

      {/* Вкладки-фильтры */}
      <div className="mx-3 mt-4 flex items-center gap-1.5 rounded-2xl bg-surface-2 p-1">
        {tabs.map((tb) => {
          const active = tab === tb.key;
          const TabIcon = tb.icon;
          return (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className="relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2"
            >
              {active && (
                <motion.span
                  layoutId="fav-tab"
                  className="absolute inset-0 rounded-xl bg-surface shadow-sm ring-1 ring-separator"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <TabIcon
                size={17}
                weight={active ? "fill" : "regular"}
                className={cn("relative z-10", active ? "text-accent" : "text-muted")}
              />
              <span
                className={cn(
                  "relative z-10 text-[13px] font-medium",
                  active ? "text-accent" : "text-muted"
                )}
              >
                {tb.label}
              </span>
              {counts[tb.key] > 0 && (
                <span className="relative z-10 text-[12px] font-semibold text-muted-2">
                  {counts[tb.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Содержимое вкладки */}
      <div className="mt-4 px-3">
        {tab === "media" &&
          (media.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {media.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={openSaved}
                  className="relative aspect-square overflow-hidden rounded-lg bg-surface-2"
                >
                  {m.mediaUrl &&
                    (m.mediaKind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.mediaUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <video
                          src={m.mediaUrl}
                          className="h-full w-full object-cover"
                          muted
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                          <Play size={28} weight="fill" />
                        </span>
                      </>
                    ))}
                </button>
              ))}
            </div>
          ) : (
            <EmptyTab
              icon={Images}
              text="Здесь появятся сохранённые фото и видео"
            />
          ))}

        {tab === "files" &&
          (files.length > 0 ? (
            <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              {files.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={openSaved}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2",
                    i < files.length - 1 && "border-b border-separator"
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    {m.mediaKind === "audio" ? (
                      <FileAudio size={22} weight="fill" />
                    ) : (
                      <FileText size={22} weight="fill" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-foreground">
                      {m.mediaName ?? "Файл"}
                    </span>
                    {m.mediaSize ? (
                      <span className="block text-[13px] text-muted">
                        {formatBytes(m.mediaSize)}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyTab
              icon={FileText}
              text="Здесь появятся сохранённые файлы и аудио"
            />
          ))}

        {tab === "messages" &&
          (texts.length > 0 ? (
            <div className="flex flex-col gap-2">
              {texts.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={openSaved}
                  className="rounded-[var(--radius-card)] bg-surface px-4 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition active:scale-[0.99]"
                >
                  <p className="line-clamp-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
                    {m.text}
                  </p>
                  <span className="mt-1 block text-[12px] text-muted">{m.time}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyTab
              icon={ChatText}
              text="Пересылайте сюда важные сообщения и заметки"
            />
          ))}
      </div>
    </SubScreen>
  );
}

function EmptyTab({ icon: Icon, text }: { icon: Icon; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-10 pt-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-2">
        <Icon size={36} weight="duotone" className="text-accent" />
      </div>
      <p className="text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}
