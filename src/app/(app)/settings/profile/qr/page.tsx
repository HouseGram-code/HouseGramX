"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { motion } from "motion/react";
import { Copy, ShareNetwork } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Avatar } from "@/components/Avatar";
import { useProfile } from "@/lib/profile-store";
import { useToast } from "@/components/Toast";

export default function ProfileQrPage() {
  const { profile, initials } = useProfile();
  const { show } = useToast();
  const [dataUrl, setDataUrl] = useState("");
  const [link, setLink] = useState("");

  useEffect(() => {
    const handle = profile.username || "me";
    const url = `${window.location.origin}/u/${handle}`;
    setLink(url);
    QRCode.toDataURL(url, {
      width: 520,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H",
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [profile.username]);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(link);
      show("Ссылка скопирована");
    } catch {
      show("Не удалось скопировать");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: profile.name, url: link });
        return;
      } catch {
        /* отменено */
      }
    }
    copy();
  };

  return (
    <SubScreen title="Мой QR-код">
      <div className="flex flex-col items-center px-6 pt-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
          className="relative rounded-3xl bg-white p-5 shadow-lg"
        >
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt="QR-код профиля"
              width={260}
              height={260}
              className="h-[260px] w-[260px]"
            />
          ) : (
            <div className="h-[260px] w-[260px] animate-pulse rounded-xl bg-zinc-200" />
          )}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-full bg-white p-1.5">
              <Avatar
                initials={initials}
                color={profile.color}
                size={52}
                src={profile.avatar || undefined}
              />
            </div>
          </div>
        </motion.div>

        <h2 className="mt-5 text-[20px] font-bold text-foreground">
          {profile.name}
        </h2>
        {profile.username && (
          <p className="mt-0.5 text-[14px] text-muted">@{profile.username}</p>
        )}
        <p className="mt-2 max-w-xs text-center text-[14px] leading-relaxed text-muted">
          Наведите камеру на код, чтобы открыть профиль
        </p>

        <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
          <button
            type="button"
            onClick={share}
            className="flex items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-white shadow-sm transition active:scale-[0.98]"
          >
            <ShareNetwork size={20} weight="bold" />
            Поделиться
          </button>
          <button
            type="button"
            onClick={copy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-surface py-3.5 text-[15px] font-medium text-foreground ring-1 ring-separator transition active:bg-surface-2"
          >
            <Copy size={18} weight="bold" />
            Копировать ссылку
          </button>
        </div>
      </div>
    </SubScreen>
  );
}
