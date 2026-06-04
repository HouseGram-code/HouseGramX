"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { Eye } from "@phosphor-icons/react";
import { StickerImage } from "@/components/StickerImage";
import { RichText } from "@/components/RichText";
import { cn } from "@/lib/utils";
import type { Conversation, Message } from "@/lib/chat-store";

interface ChannelPostProps {
  conv: Conversation;
  message: Message;
  fontSize: number;
  onOpenActions: () => void;
}

const HOLD_MS = 450;

/** Пост канала: карточка слева с названием канала, текстом и просмотрами. */
export function ChannelPost({
  conv,
  message,
  fontSize,
  onOpenActions,
}: ChannelPostProps) {
  const holdTimer = useRef<number | null>(null);

  const startHold = () => {
    holdTimer.current = window.setTimeout(onOpenActions, HOLD_MS);
  };
  const cancelHold = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const isSticker = message.kind === "sticker";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex w-full justify-start"
    >
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          onOpenActions();
        }}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        className={cn(
          "max-w-[85%] cursor-pointer select-none rounded-2xl rounded-bl-md bg-surface px-3 py-2 shadow-sm ring-1 ring-separator",
          isSticker && "bg-transparent ring-0 shadow-none px-0"
        )}
      >
        {/* Название канала */}
        {!isSticker && (
          <p className="mb-0.5 text-[13px] font-semibold text-accent">
            {conv.title}
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
        ) : (
          <div className="text-foreground">
            <RichText text={message.text ?? ""} fontSize={fontSize} />
          </div>
        )}

        {/* Просмотры + время */}
        <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted">
          <Eye size={13} weight="fill" />1 · {message.time}
        </span>

        {/* Реакция */}
        {message.reaction && (
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5">
            <span className="text-[15px]">{message.reaction}</span>
            <span className="text-[12px] font-medium text-accent">1</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
