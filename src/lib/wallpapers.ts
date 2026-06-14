/** Готовые обои для фона чата (изображения лежат в /public/wallpapers). */
export interface Wallpaper {
  id: string;
  /** Путь к изображению. */
  src: string;
  /** Название для подписи. */
  name: string;
}

export const WALLPAPERS: Wallpaper[] = [
  { id: "wp1", src: "/wallpapers/wp1.jpg", name: "Горы" },
  { id: "wp2", src: "/wallpapers/wp2.jpg", name: "Портрет" },
  { id: "wp3", src: "/wallpapers/wp3.jpg", name: "Природа" },
  { id: "wp4", src: "/wallpapers/wp4.jpg", name: "Поле" },
  { id: "wp5", src: "/wallpapers/wp5.jpg", name: "Город" },
];

export function wallpaperBySrc(src: string): Wallpaper | undefined {
  return WALLPAPERS.find((w) => w.src === src);
}
