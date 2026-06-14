"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { motion } from "motion/react";
import { Check, Checks, Clock, WarningCircle, FileArrowDown, MusicNotes, Play } from "@phosphor-icons/react";
import { StickerImage } from "@/components/StickerImage";
import { AnimatedReaction } from "@/components/AnimatedReaction";
import { Avatar } from "@/components/Avatar";
import { RichText } from "@/components/RichText";
import { getReaction } from "@/lib/reactions";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/chat-store";
import { MediaViewer, type MediaViewerItem } from "@/components/MediaViewer";

interface MessageBubbleProps {
  message: Message;
  fontSize: number;
  largeEmoji: boolean;
  /** Двойной тап/клик — поставить быструю реакцию. */
  onQuickReact: () => void;
  reactionsEnabled: boolean;
  /** Долгое нажатие / правый клик — открыть меню действий. */
  onOpenActions?: () => void;
  /** Тап по стикеру — открыть набор стикеров. */
  onOpenSticker?: (message: Message) => void;
  /** Показывать имя и аватар отправителя (для групп). */
  showSender?: boolean;
}

const DOUBLE_TAP_MS = 280;
const HOLD_MS = 450;

export function MessageBubble({
  message,
  fontSize,
  onQuickReact,
  reactionsEnabled,
  onOpenActions,
  onOpenSticker,
  showSender,
}: MessageBubbleProps) {
  const mine = message.author === "me";
  const lastTap = useRef(0);
  const holdTimer = useRef<number | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const openViewer = (e?: ReactMouseEvent) => {
    if (e) e.stopPropagation();
    setViewerOpen(true);
  };

  const handleStickerTap = (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (onOpenSticker) onOpenSticker(message);
  };

  const handleTap = () => {
    if (!reactionsEnabled) return;
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      onQuickReact();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const startHold = () => {
    if (!onOpenActions) return;
    holdTimer.current = window.setTimeout(onOpenActions, HOLD_MS);
  };
  const cancelHold = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const isSticker = message.kind === "sticker";
  const isMedia = message.kind === "media";
  // Фото/видео — без рамки и паддингов (как стикер). Файл/аудио — в пузыре.
  const isVisualMedia =
    isMedia && (message.mediaKind === "image" || message.mediaKind === "video");
  const bare = isSticker || isVisualMedia;
  const reaction = message.reaction ? getReaction(message.reaction) : null;
  const withSender = showSender && !mine;
  const mediaItem: MediaViewerItem | null =
    isVisualMedia && message.mediaUrl
      ? {
          url: message.mediaUrl,
          kind: message.mediaKind === "video" ? "video" : "image",
          name: message.mediaName,
        }
      : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "flex w-full items-end gap-2",
        mine ? "justify-end" : "justify-start"
      )}
    >
      {withSender && (
        <Avatar
          initials={message.senderInitials ?? "?"}
          color={message.senderColor ?? "#888"}
          size={32}
          className="mb-1 shrink-0 text-xs"
        />
      )}
      <div
        onClick={isSticker && onOpenSticker ? handleStickerTap : handleTap}
        onDoubleClick={onQuickReact}
        onContextMenu={(e) => {
          if (onOpenActions) {
            e.preventDefault();
            onOpenActions();
          }
        }}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        className={cn(
          "relative max-w-[78%] cursor-pointer select-none",
          bare ? "" : "rounded-2xl px-3.5 py-2",
          bare
            ? ""
            : mine
              ? "rounded-br-md bg-accent text-white"
              : "rounded-bl-md bg-surface text-foreground ring-1 ring-separator"
        )}
      >
        {withSender && !isSticker && (
          <p
            className="mb-0.5 text-[13px] font-semibold"
            style={{ color: message.senderColor ?? "var(--accent)" }}
          >
            {message.senderName}
          </p>
        )}
        {isSticker ? (
          <StickerImage
            sticker={{
              id: message.id,
              src: message.stickerSrc ?? "",
              emoji: message.stickerEmoji ?? "🙂",
              name: "стикер",
            }}
            size={120}
          />
        ) : isMedia ? (
          <MediaContent message={message} mine={mine} onOpen={openViewer} />
        ) : (
          <>
            {/* Переслано */}
            {message.forwardedFrom && (
              <p
                className={cn(
                  "mb-0.5 text-[12px] font-medium",
                  mine ? "text-white/80" : "text-accent"
                )}
              >
                Переслано из «{message.forwardedFrom}»
              </p>
            )}
            {/* Ответ на сообщение */}
            {message.replyToText && (
              <div
                className={cn(
                  "mb-1 rounded-lg border-l-2 px-2 py-1",
                  mine
                    ? "border-white/70 bg-white/15"
                    : "border-accent bg-accent/10"
                )}
              >
                <p
                  className={cn(
                    "text-[12px] font-semibold",
                    mine ? "text-white" : "text-accent"
                  )}
                >
                  {message.replyToAuthor ?? "Сообщение"}
                </p>
                <p
                  className={cn(
                    "truncate text-[12px]",
                    mine ? "text-white/80" : "text-muted"
                  )}
                >
                  {message.replyToText}
                </p>
              </div>
            )}
            <RichText text={message.text ?? ""} fontSize={fontSize} />
          </>
        )}

        {/* Время + статус прочтения */}
        <span
          className={cn(
            "mt-0.5 flex items-center justify-end gap-0.5 text-[10px]",
            isVisualMedia
              ? "absolute bottom-1.5 right-2 rounded-full bg-black/45 px-1.5 py-0.5 text-white"
              : isSticker
                ? "text-muted"
                : mine
                  ? "text-white/70"
                  : "text-muted"
          )}
        >
          {message.edited && <span className="mr-0.5">изменено</span>}
          {message.time}
          {mine &&
            !isSticker &&
            (message.failed ? (
              <WarningCircle size={13} weight="fill" className="text-red-200" />
            ) : message.pending ? (
              <Clock size={12} weight="bold" />
            ) : message.read ? (
              <Checks size={13} weight="bold" />
            ) : (
              <Check size={13} weight="bold" />
            ))}
        </span>

        {/* Бейдж реакции */}
        {reaction && (
          <motion.span
            key={reaction.emoji}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className={cn(
              "absolute -bottom-3 flex items-center gap-0.5 rounded-full bg-surface px-1.5 py-0.5 shadow-sm ring-1 ring-separator",
              mine ? "right-2" : "left-2"
            )}
          >
            <AnimatedReaction reaction={reaction} size={14} />
          </motion.span>
        )}
      </div>
      {viewerOpen && mediaItem && (
        <MediaViewer item={mediaItem} onClose={() => setViewerOpen(false)} />
      )}
    </motion.div>
  );
}

/** Размер файла в человекочитаемом виде. */
function fmtBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/** Рендер вложения: фото, видео, аудио, файл + оверлей загрузки. */
function MediaContent({ message, mine, onOpen }: { message: Message; mine: boolean; onOpen?: () => void }) {
  const { mediaKind, mediaUrl, mediaName, mediaSize, uploadProgress } = message;
  const uploading = typeof uploadProgress === "number";

  if (mediaKind === "image") {
    return (
      <div className="relative overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt={mediaName ?? "фото"}
          onClick={onOpen}
          className="max-h-[320px] w-auto max-w-full cursor-zoom-in object-cover"
          style={{ minWidth: 160 }}
        />
        {uploading && <UploadOverlay percent={uploadProgress!} />}
      </div>
    );
  }

  if (mediaKind === "video") {
    return (
      <div onClick={onOpen} className="relative cursor-pointer overflow-hidden rounded-2xl">
        <PlayBadge />
        <video
          src={mediaUrl}
          muted
          playsInline
          preload="metadata"
          className="max-h-[320px] w-auto max-w-full"
          style={{ minWidth: 200 }}
        />
        {uploading && <UploadOverlay percent={uploadProgress!} />}
      </div>
    );
  }

  if (mediaKind === "audio") {
    return (
      <div className="flex min-w-[200px] items-center gap-3 py-1">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            mine ? "bg-white/20" : "bg-accent/15 text-accent"
          )}
        >
          <MusicNotes size={22} weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium">{mediaName ?? "Аудио"}</p>
          {uploading ? (
            <p className={cn("text-[12px]", mine ? "text-white/70" : "text-muted")}>
              Загрузка… {uploadProgress}%
            </p>
          ) : (
            <audio src={mediaUrl} controls className="mt-1 h-8 w-full" />
          )}
        </div>
      </div>
    );
  }

  // file
  return (
    <a
      href={uploading ? undefined : mediaUrl}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => uploading && e.preventDefault()}
      className="flex min-w-[200px] items-center gap-3 py-1"
    >
      <span
        className={cn(
          "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          mine ? "bg-white/20" : "bg-accent/15 text-accent"
        )}
      >
        {uploading ? (
          <span className="text-[11px] font-semibold">{uploadProgress}%</span>
        ) : (
          <FileArrowDown size={22} weight="fill" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium">{mediaName ?? "Файл"}</p>
        <p className={cn("text-[12px]", mine ? "text-white/70" : "text-muted")}>
          {uploading ? `Загрузка… ${uploadProgress}%` : fmtBytes(mediaSize)}
        </p>
      </div>
    </a>
  );
}

/** Полупрозрачный оверлей с круговым прогрессом поверх фото/видео. */
function UploadOverlay({ percent }: { percent: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const off = c - (percent / 100) * c;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[12px] font-semibold text-white">{percent}%</span>
    </div>
  );
}

/** Кружок «play» поверх превью видео в ленте сообщений. */
function PlayBadge() {
  return (
    <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
        <Play size={28} weight="fill" />
      </span>
    </span>
  );
}
