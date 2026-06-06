"use client";

import { useEffect } from "react";

/**
 * Глушит шумные ошибки от браузерных расширений (Chrome messaging),
 * которые не относятся к приложению, например:
 * "A listener indicated an asynchronous response by returning true,
 *  but the message channel closed before a response was received".
 * Такие ошибки генерируют расширения, а не код сайта, поэтому мы просто
 * подавляем их, чтобы они не засоряли консоль.
 */
const EXT_NOISE = [
  "message channel closed before a response was received",
  "A listener indicated an asynchronous response",
  "Extension context invalidated",
  "runtime.lastError",
];

function isExtensionNoise(input: unknown): boolean {
  let text = "";
  if (typeof input === "string") {
    text = input;
  } else if (input && typeof input === "object") {
    text = String((input as { message?: unknown }).message ?? "");
  }
  return EXT_NOISE.some((p) => text.includes(p));
}

export function ErrorSilencer() {
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isExtensionNoise(e.reason)) {
        e.preventDefault();
      }
    };
    const onError = (e: ErrorEvent) => {
      if (isExtensionNoise(e.message) || isExtensionNoise(e.error)) {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
