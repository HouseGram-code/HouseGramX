"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ClockCounterClockwise, BookmarkSimple, List } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Group, NavRow, SectionTitle } from "@/components/settings-ui";
import { useStickers } from "@/lib/stickers-store";

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}

export default function StickerSettingsPage() {
  const router = useRouter();
  const { recent, favorites, sets } = useStickers();

  return (
    <SubScreen title="Настройки стикеров">
      <div className="pt-4">
        <Group>
          <NavRow
            icon={ClockCounterClockwise}
            label="Недавние"
            value={plural(recent.length, "стикер", "стикера", "стикеров")}
            onClick={() => router.push("/settings/messages/stickers/recent")}
          />
          <NavRow
            icon={BookmarkSimple}
            label="Избранные"
            value={
              favorites.length > 0
                ? plural(favorites.length, "стикер", "стикера", "стикеров")
                : undefined
            }
            onClick={() => router.push("/settings/messages/stickers/favorites")}
            last
          />
        </Group>
      </div>

      <SectionTitle>Мои наборы</SectionTitle>
      <Group>
        {sets.map((set, i) => (
          <button
            key={set.id}
            type="button"
            onClick={() =>
              router.push(`/settings/messages/stickers/${set.id}`)
            }
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2 ${
              i < sets.length - 1 ? "border-b border-separator" : ""
            }`}
          >
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-surface-2">
              <Image
                src={set.cover}
                alt={set.title}
                width={36}
                height={36}
                unoptimized
                className="object-contain"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] text-foreground">
                {set.title}
              </span>
              <span className="block text-[13px] text-muted">
                {plural(set.stickers.length, "стикер", "стикера", "стикеров")}
              </span>
            </span>
            <List size={22} weight="bold" className="shrink-0 text-muted-2" />
          </button>
        ))}
      </Group>
    </SubScreen>
  );
}
