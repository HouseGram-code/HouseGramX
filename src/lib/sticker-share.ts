"use client";

import type { StickerSet } from "./stickers-store";

/**
 * Ссылки на наборы стикеров.
 *
 * Набор кодируется в base64url и кладётся в hash ссылки (#d=...).
 * Благодаря этому любой получатель может установить набор без сервера —
 * всё, что нужно, лежит в самой ссылке.
 */

/** Компактный формат набора для ссылки. */
interface PackedSet {
  i: string; // id
  t: string; // title
  a?: string; // author
  s: Array<{ s: string; e: string; n: string }>; // stickers: src, emoji, name
}

function toBase64Url(str: string): string {
  // UTF-8 safe base64
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa !== "undefined" ? btoa(bin) : "";
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url: string): string {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = typeof atob !== "undefined" ? atob(b64) : "";
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Кодирует набор в строку для ссылки. */
export function encodeSet(set: StickerSet): string {
  const packed: PackedSet = {
    i: set.id,
    t: set.title,
    a: set.author,
    s: set.stickers.map((st) => ({ s: st.src, e: st.emoji, n: st.name })),
  };
  return toBase64Url(JSON.stringify(packed));
}

/** Декодирует набор из строки ссылки. */
export function decodeSet(data: string): StickerSet | null {
  try {
    const packed = JSON.parse(fromBase64Url(data)) as PackedSet;
    if (!packed?.s?.length) return null;
    return {
      id: packed.i || `set-${Date.now()}`,
      title: packed.t || "Набор стикеров",
      author: packed.a,
      cover: packed.s[0]?.s ?? "",
      custom: true,
      stickers: packed.s.map((st, i) => ({
        id: `${packed.i || "s"}-${i}`,
        src: st.s,
        emoji: st.e || "⭐️",
        name: st.n || packed.t,
        setId: packed.i,
      })),
    };
  } catch {
    return null;
  }
}

/** Строит полную ссылку для установки набора. */
export function buildShareUrl(set: StickerSet): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/addstickers/${encodeURIComponent(set.id)}#d=${encodeSet(
    set
  )}`;
}
