"use client";

import { useEffect, type CSSProperties } from "react";

/**
 * Корневой error-boundary приложения (App Router).
 * Ловит ЛЮБУЮ необработанную ошибку рендера во всём дереве и показывает
 * аккуратный экран вместо системного «This page couldn't load».
 * Частая причина такой ошибки — устаревшие JS-чанки после нового деплоя;
 * в этом случае один раз автоматически перезагружаем страницу.
 */
export default function GlobalError({
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
    background: "#0b0b0c",
    color: "#ffffff",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: "24px",
    textAlign: "center",
  };
  const title: CSSProperties = {
    fontSize: "20px",
    fontWeight: 600,
    margin: "0 0 8px",
  };
  const text: CSSProperties = { fontSize: "15px", color: "#a1a1aa", margin: 0 };
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
    border: "1px solid #3f3f46",
    color: "#ffffff",
    fontSize: "15px",
    cursor: "pointer",
  };

  const goBack = () => {
    if (typeof window !== "undefined") window.history.back();
  };

  return (
    <html lang="ru">
      <body>
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
      </body>
    </html>
  );
}
