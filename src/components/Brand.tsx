import { cn } from "@/lib/utils";

/**
 * Текстовый логотип HouseGramX: «HouseGram» — цветом текста (чёрный),
 * «X» — акцентным красным. Используется в навигации, входе и т.п.
 */
export function Brand({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn(
        "font-bold tracking-tight text-foreground select-none",
        className
      )}
      style={{ fontSize: size }}
    >
      HouseGram<span className="text-accent">X</span>
    </span>
  );
}
