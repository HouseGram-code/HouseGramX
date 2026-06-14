"use client";

import { SealCheck } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Значок официального/верифицированного аккаунта.
 * Используется рядом с именем разработчика и проверенных аккаунтов.
 */
export function VerifiedBadge({
  size = 18,
  className,
  title = "Официальный аккаунт",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      aria-label={title}
      className={cn("inline-flex shrink-0 align-middle text-accent", className)}
    >
      <SealCheck size={size} weight="fill" />
    </span>
  );
}
