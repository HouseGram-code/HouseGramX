"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, Prohibit, UploadSimple } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { GroupHint, SectionTitle } from "@/components/settings-ui";
import { useSettings } from "@/lib/settings-store";
import { useToast } from "@/components/Toast";
import { uploadImage } from "@/lib/storage";
import { WALLPAPERS } from "@/lib/wallpapers";
import { cn } from "@/lib/utils";

export default function WallpaperPage() {
  const s = useSettings();
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = (src: string, label: string) => {
    s.set("wallpaper", src);
    show(src ? `Обои: ${label}` : "Обои отключены");
  };

  // Своё изображение: показываем сразу (data-URL), затем грузим в Storage.
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return show("Выберите изображение");
    if (file.size > 8 * 1024 * 1024) return show("Файл больше 8 МБ");
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => s.set("wallpaper", String(reader.result));
      reader.readAsDataURL(file);
      const url = await uploadImage(file, "wallpaper");
      s.set("wallpaper", url);
      show("Свои обои установлены");
    } catch {
      show("Не удалось загрузить");
    } finally {
      setUploading(false);
    }
  };

  // Является ли текущий выбор пользовательским (не из набора, не пусто).
  const isCustom =
    !!s.wallpaper && !WALLPAPERS.some((w) => w.src === s.wallpaper);

  return (
    <SubScreen title="Обои для чата">
      <SectionTitle>Выбор обоев</SectionTitle>

      <div className="grid grid-cols-3 gap-2.5 px-3">
        {/* Без обоев */}
        <button
          type="button"
          onClick={() => pick("", "Без обоев")}
          className={cn(
            "relative flex aspect-[9/16] items-center justify-center overflow-hidden rounded-2xl border-2 bg-surface-2 transition",
            s.wallpaper === "" ? "border-accent" : "border-transparent"
          )}
        >
          <Prohibit size={28} weight="regular" className="text-muted-2" />
          {s.wallpaper === "" && <SelectedBadge />}
          <span className="absolute bottom-1.5 left-0 right-0 text-center text-[11px] font-medium text-muted">
            Без обоев
          </span>
        </button>

        {/* Обои из набора */}
        {WALLPAPERS.map((w) => {
          const active = s.wallpaper === w.src;
          return (
            <motion.button
              key={w.id}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => pick(w.src, w.name)}
              className={cn(
                "relative aspect-[9/16] overflow-hidden rounded-2xl border-2 transition",
                active ? "border-accent" : "border-transparent"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={w.src}
                alt={w.name}
                className="h-full w-full object-cover"
              />
              {active && <SelectedBadge />}
              <span className="absolute bottom-1 left-0 right-0 text-center text-[11px] font-semibold text-white drop-shadow">
                {w.name}
              </span>
            </motion.button>
          );
        })}

        {/* Свои обои: превью, если выбраны */}
        {isCustom && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative aspect-[9/16] overflow-hidden rounded-2xl border-2 border-accent transition"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.wallpaper}
              alt="Свои обои"
              className="h-full w-full object-cover"
            />
            <SelectedBadge />
            <span className="absolute bottom-1 left-0 right-0 text-center text-[11px] font-semibold text-white drop-shadow">
              Свои
            </span>
          </button>
        )}

        {/* Кнопка загрузки */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex aspect-[9/16] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-separator bg-surface-2 text-muted transition active:scale-95 disabled:opacity-50"
        >
          {uploading ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          ) : (
            <UploadSimple size={26} weight="regular" className="text-accent" />
          )}
          <span className="px-1 text-center text-[11px] font-medium">
            {uploading ? "Загрузка…" : "Загрузить своё"}
          </span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      <GroupHint>
        Выберите готовые обои или загрузите своё фото. Применяется ко всем чатам.
      </GroupHint>
    </SubScreen>
  );
}

function SelectedBadge() {
  return (
    <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow">
      <Check size={15} weight="bold" />
    </span>
  );
}
