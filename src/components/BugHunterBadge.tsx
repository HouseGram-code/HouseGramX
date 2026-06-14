"use client";

import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Красивая «галочка» багхантера — выдаётся пользователям, которые
 * нашли баги в HouseGramX. Зелёный градиентный кружок с белой галочкой,
 * чтобы отличаться от официальной верификации (VerifiedBadge).
 */
export function BugHunterBadge({
  size = 18,
  className,
  title = "Нашёл баги в HouseGramX",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  const wrap = {
    width: size,
    height: size,
    background:
      "linear-gradient(135deg, #34d399 0%, #10b981 55%, #059669 100%)",
    boxShadow: "0 1px 4px rgba(16,185,129,0.45)",
  };
  return (
    <span
      title={title}
      aria-label={title}
      style={wrap}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full align-middle text-white",
        className
      )}
    >
      <Check size={Math.round(size * 0.62)} weight="bold" />
    </span>
  );
}
