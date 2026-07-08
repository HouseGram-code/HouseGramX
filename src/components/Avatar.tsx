"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { User } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  initials: string;
  color: string;
  size?: number;
  className?: string;
  /** Если задано — показываем изображение вместо инициалов. */
  src?: string;
}

/**
 * Круглый аватар: фото (если задано и оно успешно грузится), иначе —
 * инициалы на цветном фоне, а если имени/инициалов нет — иконка-силуэт.
 * Если картинка не загрузилась (битый/недоступный URL), вместо «сломанной
 * картинки» автоматически показываем запасной вариант.
 */
export function Avatar({
  initials,
  color,
  size = 54,
  className,
  src,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);

  // При смене src снова пробуем загрузить картинку.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const boxStyle: CSSProperties = { width: size, height: size };
  const trimmed = (initials || "").trim();
  const hasInitials = trimmed !== "" && trimmed !== "?";

  if (src && !failed) {
    return (
      <div
        className={cn(
          "shrink-0 overflow-hidden rounded-full bg-surface-2",
          className
        )}
        style={boxStyle}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={hasInitials ? trimmed : "avatar"}
          className="h-full w-full object-cover"
          style={boxStyle}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  const fallbackStyle: CSSProperties = {
    width: size,
    height: size,
    background: color || "#6c5ce7",
    fontSize: Math.round(size * 0.4),
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none",
        className
      )}
      style={fallbackStyle}
    >
      {hasInitials ? (
        trimmed
      ) : (
        <User size={Math.round(size * 0.55)} weight="fill" />
      )}
    </div>
  );
}
