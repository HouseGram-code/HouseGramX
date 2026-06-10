"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  QrCode,
  PencilSimple,
  LinkSimple,
  Bell,
  Lock,
  Devices,
  ChatText,
  BookmarkSimple,
  Moon,
  CaretRight,
  Info,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Group, GroupHint, NavRow, SectionTitle } from "@/components/settings-ui";
import { useSettings } from "@/lib/settings-store";
import { useProfile } from "@/lib/profile-store";
import { useAuth } from "@/lib/auth-store";
import { isAdminEmail } from "@/lib/admin";
import { useState } from "react";
import { SignOut, ShieldStar } from "@phosphor-icons/react";
import {
  FolderSimple,
  ShieldCheck,
  Translate,
  Database,
} from "@phosphor-icons/react";

const themeLabel: Record<string, string> = {
  system: "Как в системе",
  light: "Светлая",
  dark: "Тёмная",
};

const languageLabel: Record<string, string> = {
  ru: "Русский",
  en: "English",
  uk: "Українська",
  kk: "Қазақша",
};

export default function SettingsPage() {
  const router = useRouter();
  const s = useSettings();
  const { profile, initials } = useProfile();
  const { user, configured, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const isAdmin = isAdminEmail(user?.email);

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto bg-background">
      {/* Верхняя панель */}
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <button
          type="button"
          aria-label="QR-код"
          onClick={() => router.push("/settings/profile/qr")}
          className="text-foreground transition active:opacity-60"
        >
          <QrCode size={24} weight="regular" />
        </button>
        <button
          type="button"
          aria-label="Редактировать профиль"
          onClick={() => router.push("/settings/profile")}
          className="text-foreground transition active:opacity-60"
        >
          <PencilSimple size={22} weight="regular" />
        </button>
      </div>

      {/* Профиль */}
      <motion.button
        type="button"
        onClick={() => router.push("/settings/profile")}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex w-full flex-col items-center px-4 pb-6 pt-2"
      >
        <Avatar
          initials={initials}
          color={profile.color}
          size={100}
          src={profile.avatar || undefined}
          className="text-4xl shadow-md"
        />
        <h1 className="mt-3 flex items-center justify-center gap-1.5 text-[22px] font-bold text-foreground">
          {profile.name}
          {isAdmin && <VerifiedBadge size={20} />}
        </h1>
        <p className="mt-0.5 text-[14px] text-muted">
          {profile.username ? `@${profile.username}` : "задать имя пользователя"}
        </p>
        {profile.bio && (
          <p className="mt-1 max-w-xs text-center text-[14px] leading-relaxed text-foreground/80">
            {profile.bio}
          </p>
        )}
      </motion.button>

      <div className="flex flex-col gap-4 pb-8">
        {/* Пригласить друзей */}
        <Group>
          <button
            type="button"
            onClick={() => router.push("/settings/invite")}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
          >
            <span className="flex w-7 justify-center">
              <LinkSimple size={22} weight="regular" className="text-muted" />
            </span>
            <span className="flex-1 text-[15px] text-foreground">
              Пригласить друзей
            </span>
            <CaretRight size={18} weight="bold" className="text-muted-2" />
          </button>
        </Group>

        {/* Основные настройки */}
        <Group>
          <NavRow
            icon={Bell}
            label="Уведомления и звук"
            index={0}
            onClick={() => router.push("/settings/notifications")}
          />
          <NavRow
            icon={Lock}
            label="Безопасность"
            index={1}
            onClick={() => router.push("/settings/security")}
          />
          <NavRow
            icon={Devices}
            label="Устройства"
            index={2}
            onClick={() => router.push("/settings/devices")}
          />
          <NavRow
            icon={ChatText}
            label="Сообщения"
            index={3}
            onClick={() => router.push("/settings/messages")}
          />
          <NavRow
            icon={Moon}
            label="Оформление"
            value={themeLabel[s.theme]}
            index={4}
            onClick={() => router.push("/settings/appearance")}
          />
          <NavRow
            icon={BookmarkSimple}
            label="Избранное"
            index={5}
            onClick={() => router.push("/settings/favorites")}
          />
          <NavRow
            icon={FolderSimple}
            label="Папки"
            index={6}
            onClick={() => router.push("/settings/folders")}
          />
          <NavRow
            icon={ShieldCheck}
            label="Конфиденциальность"
            index={7}
            onClick={() => router.push("/settings/privacy")}
          />
          <NavRow
            icon={Translate}
            label="Язык"
            value={languageLabel[s.language]}
            index={8}
            onClick={() => router.push("/settings/language")}
          />
          <NavRow
            icon={Database}
            label="Данные и память"
            index={9}
            onClick={() => router.push("/settings/data")}
          />
          <NavRow
            icon={Info}
            label="О приложении"
            value={`${"0.1.0"} beta`}
            last
            index={10}
            onClick={() => router.push("/settings/about")}
          />
        </Group>

        {/* Админ-панель — только для супер-администратора */}
        {configured && isAdmin && (
          <>
            <SectionTitle>Администрирование</SectionTitle>
            <Group>
              <NavRow
                icon={ShieldStar}
                iconColor="var(--accent)"
                label="Админ-панель"
                value="Управление"
                last
                onClick={() => router.push("/settings/admin")}
              />
            </Group>
            <GroupHint>
              Просмотр всех пользователей, поиск и блокировка нарушителей.
            </GroupHint>
          </>
        )}

        {/* Аккаунт */}
        {configured && user && (
          <>
            <SectionTitle>Аккаунт</SectionTitle>
            <Group>
              <button
                type="button"
                disabled={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  await signOut();
                }}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2 disabled:opacity-50"
              >
                <span className="flex w-7 justify-center">
                  <SignOut size={22} weight="regular" className="text-accent" />
                </span>
                <span className="flex-1 text-[15px] font-medium text-accent">
                  {signingOut ? "Выходим…" : "Выйти из аккаунта"}
                </span>
              </button>
            </Group>
            <GroupHint>
              Вы вошли как {user.email}. Данные синхронизируются между вашими
              устройствами.
            </GroupHint>
          </>
        )}
      </div>
    </div>
  );
}
