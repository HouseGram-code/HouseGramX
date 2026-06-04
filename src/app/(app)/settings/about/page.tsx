"use client";

import { motion } from "motion/react";
import {
  ChatCircleDots,
  Lightning,
  ShieldCheck,
  Heart,
} from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Group, GroupHint, SectionTitle } from "@/components/settings-ui";

const VERSION = "0.1.0";
const STAGE = "beta";

export default function AboutPage() {
  return (
    <SubScreen title="О приложении">
      {/* Логотип и название */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center px-6 pb-2 pt-8"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 16 }}
          className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-accent to-[#7a0d0d] text-white shadow-xl"
        >
          <ChatCircleDots size={52} weight="fill" />
        </motion.div>

        <h1 className="mt-5 text-[30px] font-extrabold tracking-tight text-foreground">
          HouseGram<span className="text-accent">X</span>
        </h1>

        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[13px] font-semibold text-accent">
          Версия {VERSION} {STAGE}
        </span>

        <p className="mt-4 max-w-xs text-center text-[14px] leading-relaxed text-muted">
          Быстрый и безопасный мессенджер: личные чаты, группы, каналы и звонки в
          реальном времени.
        </p>
      </motion.div>

      {/* Преимущества */}
      <SectionTitle>Возможности</SectionTitle>
      <Group>
        <FeatureRow
          icon={Lightning}
          title="Реальное время"
          subtitle="Сообщения и статусы доставляются мгновенно"
        />
        <FeatureRow
          icon={ShieldCheck}
          title="Безопасность"
          subtitle="Доступ к данным защищён политиками на сервере"
        />
        <FeatureRow
          icon={Heart}
          title="Сделано с заботой"
          subtitle="Чистый интерфейс и плавные анимации"
          last
        />
      </Group>

      {/* Технические данные */}
      <SectionTitle>Сведения</SectionTitle>
      <Group>
        <InfoRow label="Версия" value={`${VERSION} ${STAGE}`} last />
      </Group>

      <GroupHint>
        © {new Date().getFullYear()} HouseGramX. Все права защищены.
      </GroupHint>
    </SubScreen>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  subtitle,
  last,
}: {
  icon: typeof Lightning;
  title: string;
  subtitle: string;
  last?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 pl-4">
      <Icon size={24} weight="regular" className="shrink-0 text-accent" />
      <div
        className={`flex-1 py-3 pr-4 ${
          last ? "" : "border-b border-separator"
        }`}
      >
        <p className="text-[15px] font-medium text-foreground">{title}</p>
        <p className="text-[13px] text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className="flex items-center pl-4">
      <div
        className={`flex flex-1 items-center justify-between py-3.5 pr-4 ${
          last ? "" : "border-b border-separator"
        }`}
      >
        <span className="text-[15px] text-foreground">{label}</span>
        <span className="text-[15px] text-muted">{value}</span>
      </div>
    </div>
  );
}
