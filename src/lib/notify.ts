"use client";

/**
 * Реальные браузерные уведомления (Notifications API) + звук + вибрация.
 *
 * Срабатывают, когда приходит новое сообщение в любой чат (личка/группа/канал/бот),
 * если этот чат сейчас не открыт на экране, либо вкладка свёрнута/неактивна.
 *
 * Полностью «фоновые» push при закрытом приложении требуют Web Push + VAPID +
 * сервис-воркер + сервер — это отдельный слой (см. README). Здесь — рабочий
 * слой для открытого/свёрнутого приложения.
 */

let soundCtx: AudioContext | null = null;

/** Текущий открытый чат — чтобы не слать уведомление по нему. */
let activeChatId: string | null = null;
export function setActiveChat(id: string | null) {
  activeChatId = id;
}
export function getActiveChat(): string | null {
  return activeChatId;
}

/** Поддерживает ли браузер Notifications API. */
export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Текущее разрешение: "granted" | "denied" | "default". */
export function notificationPermission(): NotificationPermission {
  if (!notificationsSupported()) return "denied";
  return Notification.permission;
}

/** Запрашивает разрешение на уведомления. Возвращает true, если выдано. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

/** Короткий звук уведомления через Web Audio (без файлов). */
export function playPing() {
  try {
    if (!soundCtx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      soundCtx = new Ctor();
    }
    const ctx = soundCtx;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    // Два коротких тона — «дин-дон».
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1175, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.36);
  } catch {
    /* звук недоступен — не критично */
  }
}

/** Вибрация (на поддерживающих устройствах — Android). */
export function vibrate(pattern: number | number[] = [60, 40, 60]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

export interface NotifyOptions {
  title: string;
  body: string;
  icon?: string;
  /** Группировка по чату — новые заменяют старые от того же чата. */
  tag?: string;
  /** Куда перейти по клику. */
  url?: string;
  sound?: boolean;
  vibration?: boolean;
}

/**
 * Показывает уведомление, если вкладка скрыта ИЛИ чат не открыт.
 * Возвращает true, если уведомление показано.
 */
export function notify(opts: NotifyOptions): boolean {
  const hidden =
    typeof document !== "undefined" && document.visibilityState === "hidden";

  // Звук/вибрация — даже когда вкладка активна (если включено в настройках).
  if (opts.sound) playPing();
  if (opts.vibration) vibrate();

  if (!notificationsSupported() || Notification.permission !== "granted") {
    return false;
  }

  // Если вкладка активна и нужный чат уже открыт — системное уведомление не нужно
  // (звук уже сыграл выше для обратной связи).
  if (!hidden && opts.tag && opts.tag === activeChatId) return false;

  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      icon: opts.icon || "/next.svg",
      tag: opts.tag,
      badge: "/next.svg",
    });
    if (opts.url) {
      n.onclick = () => {
        try {
          window.focus();
          window.location.href = opts.url as string;
        } catch {
          /* ignore */
        }
        n.close();
      };
    }
    return true;
  } catch {
    return false;
  }
}
