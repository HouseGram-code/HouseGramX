"use client";

/** Ссылка-приглашение. В реальном приложении — персональный реферальный код. */
export const INVITE_CODE = "chico-ruv-tb";

export function getInviteLink(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/i/${INVITE_CODE}`;
  }
  return `https://messenger.app/i/${INVITE_CODE}`;
}

export const INVITE_TEXT =
  "Привет! Присоединяйся ко мне в HouseGramX 👋";

type ShareResult = "shared" | "copied" | "failed";

/** Делится ссылкой через системное окно (Web Share API) или копирует в буфер. */
export async function shareInvite(): Promise<ShareResult> {
  const url = getInviteLink();

  // 1) Нативный share — телефоны и часть десктопов
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: "HouseGramX",
        text: INVITE_TEXT,
        url,
      });
      return "shared";
    } catch (e) {
      // Пользователь мог отменить — это не ошибка
      if (e instanceof DOMException && e.name === "AbortError") {
        return "failed";
      }
    }
  }

  // 2) Фолбэк — копирование ссылки
  return (await copyInvite()) ? "copied" : "failed";
}

/** Копирует ссылку-приглашение в буфер обмена. */
export async function copyInvite(): Promise<boolean> {
  const text = `${INVITE_TEXT} ${getInviteLink()}`;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // переходим к legacy-способу
  }

  // Legacy-фолбэк через скрытый textarea
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Готовые ссылки для шеринга в популярных сервисах. */
export interface ShareTarget {
  key: string;
  label: string;
  href: string;
  color: string;
}

export function buildShareTargets(): ShareTarget[] {
  const url = getInviteLink();
  const text = `${INVITE_TEXT} ${url}`;
  const eUrl = encodeURIComponent(url);
  const eText = encodeURIComponent(text);
  return [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${eText}`,
      color: "#25D366",
    },
    {
      key: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${eUrl}&text=${encodeURIComponent(
        INVITE_TEXT
      )}`,
      color: "#229ED9",
    },
    {
      key: "email",
      label: "Почта",
      href: `mailto:?subject=${encodeURIComponent(
        "Приглашение в HouseGramX"
      )}&body=${eText}`,
      color: "#8e8e93",
    },
    {
      key: "sms",
      label: "SMS",
      href: `sms:?&body=${eText}`,
      color: "#34C759",
    },
  ];
}
