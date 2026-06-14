"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  X,
  DotsThreeVertical,
  DownloadSimple,
  Gear,
  SpeakerHigh,
  SpeakerSimpleX,
  Play,
  Pause,
  Check,
} from "@phosphor-icons/react";

export interface MediaViewerItem {
  url: string;
  kind: "image" | "video";
  name?: string;
}

// Пять вариантов скорости воспроизведения (как в Telegram).
const SPEED_OPTIONS = [0.5, 1, 1.5, 2, 3];
const SPEED_KEY = "housegramx.video.speed";
const MIN_SCALE = 1;
const MAX_SCALE = 5;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const pad = sec < 10 ? "0" : "";
  return `${m}:${pad}${sec}`;
}

function readRememberedSpeed(): number | null {
  try {
    const raw = window.localStorage.getItem(SPEED_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

async function saveMedia(url: string, name: string): Promise<void> {
  const filename = name && name.length > 0 ? name : "media";
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(objUrl), 4000);
  } catch {
    // Фолбэк: просто открываем в новой вкладке.
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

interface ViewState {
  scale: number;
  tx: number;
  ty: number;
  animate: boolean;
}

const REST: ViewState = { scale: 1, tx: 0, ty: 0, animate: true };

// Просмотр фото с зумом (колёсиком, щипком, двойным тапом) и панорамированием.
function ImageStage({ url, alt }: { url: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<ViewState>(REST);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastDist = useRef(0);
  const panning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);
  const moved = useRef(false);

  const zoomAt = useCallback((factor: number, clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ox = clientX - (rect.left + rect.width / 2);
    const oy = clientY - (rect.top + rect.height / 2);
    setView((v) => {
      const next = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
      if (next <= MIN_SCALE + 0.001) return REST;
      const ratio = next / v.scale;
      return {
        scale: next,
        tx: ox - (ox - v.tx) * ratio,
        ty: oy - (oy - v.ty) * ratio,
        animate: false,
      };
    });
  }, []);

  const toggleZoom = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ox = clientX - (rect.left + rect.width / 2);
    const oy = clientY - (rect.top + rect.height / 2);
    setView((v) => {
      if (v.scale > 1) return REST;
      const next = 2.5;
      return { scale: next, tx: -ox * (next - 1), ty: -oy * (next - 1), animate: true };
    });
  }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    const target = e.target as Element;
    if (target.setPointerCapture) target.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      lastDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    } else {
      panning.current = true;
      lastPan.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointers.current.values());
    if (pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      if (lastDist.current > 0) zoomAt(dist / lastDist.current, midX, midY);
      lastDist.current = dist;
      panning.current = false;
      moved.current = true;
    } else if (pts.length === 1 && panning.current) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      lastPan.current = { x: e.clientX, y: e.clientY };
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved.current = true;
      setView((v) => (v.scale <= 1 ? v : { scale: v.scale, tx: v.tx + dx, ty: v.ty + dy, animate: false }));
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastDist.current = 0;
    if (pointers.current.size > 0) return;
    panning.current = false;
    if (moved.current) return;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      toggleZoom(e.clientX, e.clientY);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const onWheel = (e: ReactWheelEvent) => {
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomAt(factor, e.clientX, e.clientY);
  };

  const imgStyle: CSSProperties = {
    transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
    transition: view.animate ? "transform 0.2s ease-out" : "none",
    transformOrigin: "center center",
    touchAction: "none",
    willChange: "transform",
    cursor: view.scale > 1 ? "grab" : "zoom-in",
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full touch-none items-center justify-center overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        draggable={false}
        className="max-h-full max-w-full select-none object-contain"
        style={imgStyle}
      />
    </div>
  );
}

// Проигрыватель видео со звуком, громкостью, скоростью и памятью скорости.
function VideoStage({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [savedHint, setSavedHint] = useState(false);

  useEffect(() => {
    const remembered = readRememberedSpeed();
    if (remembered) setRate(remembered);
  }, []);

  const onLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    setDur(v.duration);
    v.playbackRate = rate;
    v.volume = volume;
    v.muted = muted;
  };
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (v) setCur(v.currentTime);
  };
  const onPlayEvt = () => setPlaying(true);
  const onPauseEvt = () => setPlaying(false);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const onSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCur(val);
    const v = videoRef.current;
    if (v) v.currentTime = val;
  };

  const onVolume = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    const isMuted = val <= 0;
    setMuted(isMuted);
    const v = videoRef.current;
    if (v) {
      v.volume = val;
      v.muted = isMuted;
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    setMuted(next);
    v.muted = next;
    if (!next && volume <= 0) {
      setVolume(1);
      v.volume = 1;
    }
  };

  const applyRate = (r: number) => {
    setRate(r);
    const v = videoRef.current;
    if (v) v.playbackRate = r;
  };

  const rememberRate = () => {
    try {
      window.localStorage.setItem(SPEED_KEY, String(rate));
    } catch {
      // localStorage может быть недоступен — не критично.
    }
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 1600);
  };

  const stop = (e: ReactMouseEvent) => e.stopPropagation();

  const speedPanelStyle: CSSProperties = { minWidth: "11rem" };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <video
        ref={videoRef}
        src={url}
        className="max-h-full max-w-full"
        playsInline
        onClick={togglePlay}
        onLoadedMetadata={onLoaded}
        onTimeUpdate={onTimeUpdate}
        onPlay={onPlayEvt}
        onPause={onPauseEvt}
        onEnded={onPauseEvt}
      />

      {/* Большая кнопка play по центру, когда пауза. */}
      {!playing && (
        <button
          type="button"
          aria-label="Воспроизвести"
          onClick={togglePlay}
          className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition active:scale-95"
        >
          <Play size={32} weight="fill" />
        </button>
      )}

      {/* Панель управления. */}
      <div
        onClick={stop}
        className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-5 pt-10 text-white"
      >
        <div className="flex items-center gap-2 text-[12px] tabular-nums">
          <span>{fmtTime(cur)}</span>
          <input
            type="range"
            min={0}
            max={dur || 0}
            step={0.1}
            value={cur}
            onChange={onSeek}
            className="h-1 flex-1 cursor-pointer accent-white"
            aria-label="Перемотка"
          />
          <span>{fmtTime(dur)}</span>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" aria-label="Пауза/воспроизведение" onClick={togglePlay} className="transition active:opacity-60">
            {playing ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" />}
          </button>

          <button type="button" aria-label="Звук" onClick={toggleMute} className="transition active:opacity-60">
            {muted || volume <= 0 ? <SpeakerSimpleX size={22} /> : <SpeakerHigh size={22} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={onVolume}
            className="h-1 w-24 cursor-pointer accent-white"
            aria-label="Громкость"
          />

          <div className="relative ml-auto">
            <button
              type="button"
              aria-label="Скорость"
              onClick={() => setShowSpeed((s) => !s)}
              className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[13px] font-semibold transition active:opacity-60"
            >
              <Gear size={18} />
              {rate}x
            </button>

            {showSpeed && (
              <div
                style={speedPanelStyle}
                className="absolute bottom-11 right-0 overflow-hidden rounded-2xl bg-[#2b2b2b] py-1 text-[14px] shadow-xl ring-1 ring-white/10"
              >
                <p className="px-4 py-1.5 text-[12px] uppercase tracking-wide text-white/50">Скорость</p>
                {SPEED_OPTIONS.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => applyRate(sp)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left transition active:bg-white/10"
                  >
                    <span>{sp}x</span>
                    {rate === sp && <Check size={16} weight="bold" />}
                  </button>
                ))}
                <div className="my-1 h-px bg-white/10" />
                <button
                  type="button"
                  onClick={rememberRate}
                  className="w-full px-4 py-2 text-left text-accent transition active:bg-white/10"
                >
                  {savedHint ? "Сохранено ✓" : "Запомнить для всех видео"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Полноэкранный просмотрщик фото/видео.
export function MediaViewer({ item, onClose }: { item: MediaViewerItem; onClose: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const stop = (e: ReactMouseEvent) => e.stopPropagation();

  const onSave = () => {
    setMenuOpen(false);
    const fallback = item.kind === "image" ? "photo.jpg" : "video.mp4";
    void saveMedia(item.url, item.name && item.name.length > 0 ? item.name : fallback);
  };

  const overlayStyle: CSSProperties = {
    paddingTop: "env(safe-area-inset-top)",
    paddingBottom: "env(safe-area-inset-bottom)",
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-black/95 backdrop-blur-sm"
      style={overlayStyle}
      onClick={onClose}
    >
      {/* Шапка: закрыть + меню «три точки» с кнопкой «Сохранить». */}
      <div onClick={stop} className="flex shrink-0 items-center justify-between px-2 py-2 text-white">
        <button
          type="button"
          aria-label="Закрыть"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full transition active:bg-white/10"
        >
          <X size={26} />
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label="Ещё"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition active:bg-white/10"
          >
            <DotsThreeVertical size={26} weight="bold" />
          </button>
          {menuOpen && (
            <div className="absolute right-1 top-11 overflow-hidden rounded-2xl bg-[#2b2b2b] py-1 text-[15px] text-white shadow-xl ring-1 ring-white/10">
              <button
                type="button"
                onClick={onSave}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-white/10"
              >
                <DownloadSimple size={20} />
                Сохранить
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Сцена. */}
      <div onClick={stop} className="flex min-h-0 flex-1 items-center justify-center">
        {item.kind === "image" ? (
          <ImageStage url={item.url} alt={item.name ?? "фото"} />
        ) : (
          <VideoStage url={item.url} />
        )}
      </div>
    </div>
  );
}
