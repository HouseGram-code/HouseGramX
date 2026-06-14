"use client";

import { useEffect, type CSSProperties } from "react";

/**
 * Error-boundary уровня сегмента. Показывает аккуратный экран при ошибке
 * рендера внутри страниц и предлагает перезагрузку. При устаревших чанках
 * после деплоя один раз перезагружает страницу автоматически.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const msg = String((error && (error.message || error.name)) || "");
    const isChunk =
      (error && error.name === "ChunkLoadError") ||
      /chunk/i.test(msg) ||
      /loading[\s\S]*failed/i.test(msg) ||
      /importing a module script failed/i.test(msg);
    if (isChunk && typeof window !== "undefined") {
      const KEY = "hgx.reloadedOnce";
      try {
        if (!window.sessionStorage.getItem(KEY)) {
          window.sessionStorage.setItem(KEY, "1");
          window.location.reload();
        }
      } catch {
        /* ignore */
      }
    }
  }, [error]);

  const wrap: CSSProperties = {
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--background, #0b0b0c)",
    color: "inherit",
    padding: "24px",
    textAlign: "center",
  };
  const title: CSSProperties = {
    fontSize: "20px",
    fontWeight: 600,
    margin: "0 0 8px",
  };
  const text: CSSProperties = { fontSize: "15px", opacity: 0.7, margin: 0 };
  const row: CSSProperties = {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    marginTop: "20px",
  };
  const btn: CSSProperties = {
    padding: "10px 18px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "15px",
    cursor: "pointer",
  };
  const ghost: CSSProperties = {
    padding: "10px 18px",
    borderRadius: "10px",
    background: "transparent",
    border: "1px solid rgba(127,127,127,0.4)",
    color: "inherit",
    fontSize: "15px",
    cursor: "pointer",
  };

  const goBack = () => {
    if (typeof window !== "undefined") window.history.back();
  };

  return (
    <div style={wrap}>
      <div>
        <h2 style={title}>Не удалось загрузить страницу</h2>
        <p style={text}>Попробуйте перезагрузить или вернуться назад.</p>
        <div style={row}>
          <button type="button" style={btn} onClick={() => reset()}>
            Перезагрузить
          </button>
          <button type="button" style={ghost} onClick={goBack}>
            Назад
          </button>
        </div>
      </div>
    </div>
  );
}
