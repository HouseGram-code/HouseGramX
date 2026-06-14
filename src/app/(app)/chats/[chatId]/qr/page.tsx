"use client";

import { use, useEffect, useState } from "react";
import QRCode from "qrcode";
import { motion } from "motion/react";
import { Copy } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Avatar } from "@/components/Avatar";
import { useChats } from "@/lib/chat-store";
import { useToast } from "@/components/Toast";

export default function ChannelQrPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const { getConversation } = useChats();
  const { show } = useToast();
  const conv = getConversation(chatId);
  const [dataUrl, setDataUrl] = useState("");
  const [link, setLink] = useState("");

  useEffect(() => {
    const type = conv?.kind === "group" ? "group" : "channel";
    const url = `${window.location.origin}/join/${chatId}?type=${type}`;
    setLink(url);
    QRCode.toDataURL(url, {
      width: 520,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H",
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [chatId, conv?.kind]);

  if (!conv) return <SubScreen title="Не найдено">{null}</SubScreen>;

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(link);
      show("Ссылка скопирована");
    } catch {
      show("Не удалось скопировать");
    }
  };

  return (
    <SubScreen title="QR-код">
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
              alt="QR-код приглашения"
              width={260}
              height={260}
              className="h-[260px] w-[260px]"
            />
          ) : (
            <div className="h-[260px] w-[260px] animate-pulse rounded-xl bg-zinc-200" />
          )}
          {/* Аватар канала в центре QR */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-full bg-white p-1.5">
              <Avatar initials={conv.initials} color={conv.color} size={48} />
            </div>
          </div>
        </motion.div>

        <h2 className="mt-5 text-[20px] font-bold text-foreground">
          {conv.title}
        </h2>
        <p className="mt-1 max-w-xs text-center text-[14px] leading-relaxed text-muted">
          Наведите камеру на код, чтобы присоединиться к каналу
        </p>

        <button
          type="button"
          onClick={copy}
          className="mt-6 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-accent transition hover:bg-surface-2"
        >
          <Copy size={18} weight="bold" />
          <span className="text-[15px] font-medium">{link}</span>
        </button>
      </div>
    </SubScreen>
  );
}
