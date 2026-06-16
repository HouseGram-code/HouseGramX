"use client";

import { getSupabase, isSupabaseConfigured } from "./supabase";
import { getSyncUser } from "./sync";

/**
 * Загрузка изображений (аватары, обложки, вложения) в Supabase Storage.
 * Bucket `avatars` публичный на чтение; запись — только в свою папку <uid>/.
 */

const BUCKET = "avatars";

/** Преобразует data-URL в Blob. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/png";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "png";
}

/**
 * Загружает изображение и возвращает публичный URL.
 * Принимает File или data-URL. Если Storage недоступен/нет пользователя —
 * возвращает исходное значение (data-URL остаётся как запасной вариант).
 *
 * @param prefix логическая папка внутри пользователя: "profile" | "chat" | ...
 */
export async function uploadImage(
  input: File | string,
  prefix = "img"
): Promise<string> {
  const uid = getSyncUser();
  if (!isSupabaseConfigured || !uid) {
    // Демо-режим: вернуть как есть (data-URL хранится локально).
    return typeof input === "string" ? input : await fileToDataUrl(input);
  }

  let blob: Blob;
  if (typeof input === "string") {
    if (!input.startsWith("data:")) return input; // уже URL — не трогаем
    blob = dataUrlToBlob(input);
  } else {
    blob = input;
  }

  const ext = extFromMime(blob.type);
  const path = `${uid}/${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  try {
    const sb = getSupabase();
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type,
      cacheControl: "3600",
    });
    if (error) {
      console.warn("[storage] upload:", error.message);
      return typeof input === "string" ? input : await fileToDataUrl(input);
    }
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn("[storage] upload failed:", e);
    return typeof input === "string" ? input : await fileToDataUrl(input);
  }
}

/** Читает File как data-URL (запасной вариант без Storage). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Вложения в чат (bucket "media") с прогрессом загрузки ───────────────────

export type MediaKind = "image" | "video" | "audio" | "file" | "circle";

export function detectMediaKind(file: File): MediaKind {
  const t = file.type;
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  return "file";
}

export interface UploadedMedia {
  url: string;
  name: string;
  size: number;
  kind: MediaKind;
}

/**
 * Загружает файл-вложение в bucket "media" с реальным прогрессом (через XHR).
 * onProgress получает 0..100. Возвращает публичный URL и метаданные.
 */
export async function uploadMedia(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedMedia | null> {
  const uid = getSyncUser();
  const kind = detectMediaKind(file);
  if (!isSupabaseConfigured || !uid) {
    // Демо-режим: вернуть data-URL (без прогресса).
    const url = await fileToDataUrl(file);
    return { url, name: file.name, size: file.size, kind };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const path = `${uid}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeName}`;

  // Берём актуальный access token пользователя (для RLS Storage).
  let token = anon;
  try {
    const { data } = await getSupabase().auth.getSession();
    if (data.session?.access_token) token = data.session.access_token;
  } catch {
    /* ignore */
  }

  return new Promise<UploadedMedia | null>((resolve) => {
    const xhr = new XMLHttpRequest();
    const endpoint = `${url}/storage/v1/object/media/${path}`;
    xhr.open("POST", endpoint, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", anon);
    xhr.setRequestHeader("x-upsert", "true");
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const pub = getSupabase().storage.from("media").getPublicUrl(path);
        resolve({
          url: pub.data.publicUrl,
          name: file.name,
          size: file.size,
          kind,
        });
      } else {
        console.warn("[storage] uploadMedia:", xhr.status, xhr.responseText);
        resolve(null);
      }
    };
    xhr.onerror = () => {
      console.warn("[storage] uploadMedia network error");
      resolve(null);
    };
    xhr.send(file);
  });
}

/** Человекочитаемый размер файла. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
