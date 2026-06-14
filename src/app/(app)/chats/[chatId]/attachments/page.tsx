"use client";

import { use, useMemo, useState } from "react";
import {
  FileArrowDown,
  MusicNotes,
  PlayCircle,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { useChats, type Message, type MediaKind } from "@/lib/chat-store";

type Tab = "media" | "files" | "audio";

function formatSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-muted">
      {icon}
      <p className="text-[15px]">{text}</p>
    </div>
  );
}

export default function ChatAttachmentsPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const { getConversation } = useChats();
  const [tab, setTab] = useState<Tab>("media");

  const conv = getConversation(chatId);

  const media = useMemo(() => {
    const msgs = conv?.messages ?? [];
    const withMedia = msgs.filter(
      (m): m is Message => m.kind === "media" && !!m.mediaUrl && !!m.mediaKind
    );
    const by = (k: MediaKind[]) =>
      withMedia
        .filter((m) => k.includes(m.mediaKind as MediaKind))
        .sort((a, b) => b.ts - a.ts);
    return {
      visual: by(["image", "video"]),
      files: by(["file"]),
      audio: by(["audio"]),
    };
  }, [conv]);

  if (!conv) {
    return (
      <SubScreen title="Вложения">
        <p className="px-4 py-10 text-center text-[15px] text-muted">
          Чат не найден
        </p>
      </SubScreen>
    );
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "media", label: "Медиа", count: media.visual.length },
    { id: "files", label: "Файлы", count: media.files.length },
    { id: "audio", label: "Аудио", count: media.audio.length },
  ];

  return (
    <SubScreen title="Вложения">
      <div className="sticky top-0 z-10 flex gap-1 border-b border-separator bg-background/90 px-3 py-2 backdrop-blur-xl">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-1.5 text-[14px] font-medium transition-colors ${
              tab === t.id
                ? "bg-accent/15 text-accent"
                : "text-muted hover:bg-surface-2/60"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1 text-[12px] opacity-70">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "media" && (
        <div className="p-3">
          {media.visual.length === 0 ? (
            <EmptyState
              icon={<ImageIcon size={40} weight="thin" />}
              text="Нет фото и видео"
            />
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {media.visual.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => window.open(m.mediaUrl, "_blank")}
                  className="relative aspect-square overflow-hidden rounded-lg bg-surface-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.mediaUrl}
                    alt={m.mediaName || "вложение"}
                    className="h-full w-full object-cover"
                  />
                  {m.mediaKind === "video" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                      <PlayCircle size={32} weight="fill" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "files" && (
        <div className="p-3">
          {media.files.length === 0 ? (
            <EmptyState
              icon={<FileArrowDown size={40} weight="thin" />}
              text="Нет файлов"
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-separator bg-surface">
              {media.files.map((m, i) => (
                <a
                  key={m.id}
                  href={m.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60 active:bg-surface-2 ${
                    i < media.files.length - 1
                      ? "border-b border-separator"
                      : ""
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <FileArrowDown size={22} weight="regular" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-foreground">
                      {m.mediaName || "Файл"}
                    </span>
                    <span className="block text-[13px] text-muted">
                      {formatSize(m.mediaSize)}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "audio" && (
        <div className="p-3">
          {media.audio.length === 0 ? (
            <EmptyState
              icon={<MusicNotes size={40} weight="thin" />}
              text="Нет аудио"
            />
          ) : (
            <div className="flex flex-col gap-3">
              {media.audio.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-separator bg-surface p-3"
                >
                  <p className="mb-2 truncate text-[14px] font-medium text-foreground">
                    {m.mediaName || "Аудиозапись"}
                  </p>
                  <audio controls src={m.mediaUrl} className="w-full" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SubScreen>
  );
}
