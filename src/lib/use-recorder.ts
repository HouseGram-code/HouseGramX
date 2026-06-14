"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Запись голоса/видео через MediaRecorder. Возвращает управление и таймер.
 * onComplete получает готовый File (audio/webm или video/webm).
 */

export type RecordMode = "audio" | "video";

interface UseRecorderResult {
  recording: boolean;
  mode: RecordMode | null;
  seconds: number;
  /** Поток для предпросмотра видео (или null). */
  stream: MediaStream | null;
  start: (mode: RecordMode) => Promise<boolean>;
  stop: () => void;
  cancel: () => void;
}

export function useRecorder(
  onComplete: (file: File) => void
): UseRecorderResult {
  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState<RecordMode | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    recRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setMode(null);
    setSeconds(0);
  }, []);

  const start = useCallback(async (m: RecordMode) => {
    if (recording) return false;
    try {
      const constraints: MediaStreamConstraints =
        m === "video"
          ? { audio: true, video: { facingMode: "user" } }
          : { audio: true };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      setStream(s);
      cancelledRef.current = false;
      chunksRef.current = [];

      const mime =
        m === "video"
          ? pickMime(["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"])
          : pickMime(["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]);

      const rec = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
      recRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const type = rec.mimeType || (m === "video" ? "video/webm" : "audio/webm");
        const blob = new Blob(chunksRef.current, { type });
        const wasCancelled = cancelledRef.current;
        cleanup();
        if (!wasCancelled && blob.size > 0) {
          const ext = type.includes("mp4") ? "mp4" : "webm";
          const name =
            m === "video" ? `Видео-${Date.now()}.${ext}` : `Голос-${Date.now()}.${ext}`;
          onCompleteRef.current(new File([blob], name, { type }));
        }
      };

      rec.start();
      setRecording(true);
      setMode(m);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((x) => x + 1), 1000);
      return true;
    } catch (e) {
      console.warn("[recorder] start failed:", e);
      cleanup();
      return false;
    }
  }, [recording, cleanup]);

  const stop = useCallback(() => {
    cancelledRef.current = false;
    if (recRef.current && recRef.current.state !== "inactive") {
      recRef.current.stop();
    } else {
      cleanup();
    }
  }, [cleanup]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (recRef.current && recRef.current.state !== "inactive") {
      recRef.current.stop();
    } else {
      cleanup();
    }
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return { recording, mode, seconds, stream, start, stop, cancel };
}

function pickMime(candidates: string[]): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}
