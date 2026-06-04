"use client";

import { useState } from "react";
import Image from "next/image";
import type { Sticker } from "@/lib/stickers-store";

interface StickerImageProps {
  sticker: Sticker;
  size?: number;
}

/** Рендерит PNG-стикер; при ошибке загрузки показывает эмодзи-фолбэк. */
export function StickerImage({ sticker, size = 72 }: StickerImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <span style={{ fontSize: size * 0.8, lineHeight: 1 }}>
        {sticker.emoji}
      </span>
    );
  }

  return (
    <Image
      src={sticker.src}
      alt={sticker.name}
      width={size}
      height={size}
      onError={() => setError(true)}
      className="object-contain"
      style={{ width: size, height: size }}
      unoptimized
    />
  );
}
