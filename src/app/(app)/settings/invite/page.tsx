"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ShareNetwork,
  Copy,
  UserCirclePlus,
  WhatsappLogo,
  TelegramLogo,
  EnvelopeSimple,
  ChatCircle,
} from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { useToast } from "@/components/Toast";
import {
  buildShareTargets,
  copyInvite,
  getInviteLink,
  shareInvite,
  type ShareTarget,
} from "@/lib/invite";

const targetIcons: Record<string, typeof WhatsappLogo> = {
  whatsapp: WhatsappLogo,
  telegram: TelegramLogo,
  email: EnvelopeSimple,
  sms: ChatCircle,
};

export default function InvitePage() {
  const { show } = useToast();
  const [link, setLink] = useState("");
  const [targets, setTargets] = useState<ShareTarget[]>([]);

  useEffect(() => {
    setLink(getInviteLink());
    setTargets(buildShareTargets());
  }, []);

  const handleShare = async () => {
    const r = await shareInvite();
    if (r === "copied") show("Ссылка скопирована");
    else if (r === "failed") show("Не удалось поделиться");
  };

  const handleCopy = async () => {
    const ok = await copyInvite();
    show(ok ? "Ссылка скопирована" : "Не удалось скопировать");
  };

  return (
    <SubScreen title="Пригласить друзей">
      {/* Иллюстрация-герой */}
      <div className="flex flex-col items-center px-6 pt-8 text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 16 }}
          className="flex h-28 w-28 items-center justify-center rounded-full bg-accent/10"
        >
          <UserCirclePlus size={64} weight="duotone" className="text-accent" />
        </motion.div>
        <h2 className="mt-5 text-xl font-bold text-foreground">
          Зовите друзей
        </h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
          Поделитесь ссылкой — друзья смогут присоединиться к вам в HouseGramX
          за пару секунд.
        </p>
      </div>

      {/* Поле со ссылкой */}
      <div className="mx-3 mt-7 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3">
        <span className="flex-1 truncate text-[15px] text-foreground">
          {link || "…"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-accent transition active:opacity-60"
        >
          <Copy size={18} weight="bold" />
          <span className="text-sm font-medium">Копировать</span>
        </button>
      </div>

      {/* Главная кнопка «Поделиться» */}
      <div className="px-3 pt-4">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleShare}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-white shadow-sm"
        >
          <ShareNetwork size={20} weight="bold" />
          Поделиться ссылкой
        </motion.button>
      </div>

      {/* Быстрый шеринг по сервисам */}
      <p className="px-5 pb-3 pt-7 text-xs font-medium uppercase tracking-wide text-muted">
        Поделиться через
      </p>
      <div className="grid grid-cols-4 gap-2 px-3">
        {targets.map((t, i) => {
          const Icon = targetIcons[t.key] ?? ShareNetwork;
          return (
            <motion.a
              key={t.key}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col items-center gap-2 rounded-2xl bg-surface py-4 transition active:scale-95"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full text-white"
                style={{ background: t.color }}
              >
                <Icon size={26} weight="fill" />
              </span>
              <span className="text-xs text-foreground">{t.label}</span>
            </motion.a>
          );
        })}
      </div>
    </SubScreen>
  );
}
