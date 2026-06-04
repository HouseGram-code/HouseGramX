"use client";

import { BookmarkSimple } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";

export default function FavoritesPage() {
  return (
    <SubScreen title="Избранное">
      <div className="flex flex-col items-center justify-center gap-4 px-10 pt-24 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-2">
          <BookmarkSimple size={44} weight="duotone" className="text-accent" />
        </div>
        <p className="text-lg font-semibold text-foreground">Пока пусто</p>
        <p className="text-sm leading-relaxed text-muted">
          Сохраняйте важные сообщения, ссылки и файлы — они появятся здесь.
        </p>
      </div>
    </SubScreen>
  );
}
