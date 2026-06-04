import { cn } from "@/lib/utils";

interface AvatarProps {
  initials: string;
  color: string;
  size?: number;
  className?: string;
  /** Если задано — показываем изображение вместо инициалов. */
  src?: string;
}

/** Круглый аватар: фото (если есть) или инициалы на цветном фоне. */
export function Avatar({
  initials,
  color,
  size = 54,
  className,
  src,
}: AvatarProps) {
  if (src) {
    return (
      <div
        className={cn("shrink-0 overflow-hidden rounded-full", className)}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={initials}
          className="h-full w-full object-cover"
          style={{ width: size, height: size }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none",
        className
      )}
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  );
}
