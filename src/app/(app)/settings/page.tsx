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
  Info,
  Star,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PremiumBadge } from "@/components/PremiumBadge";
import { Group, GroupHint, NavRow, SectionTitle } from "@/components/settings-ui";
import { useSettings } from "@/lib/settings-store";
import { useProfile } from "@/lib/profile-store";
import { useAuth } from "@/lib/auth-store";
import { isAdminEmail } from "@/lib/admin";
import { fetchMyPremium, type MyPremium } from "@/lib/premium";
import { useEffect, useState } from "react";
import { SignOut, ShieldStar } from "@phosphor-icons/react";
import { FolderSimple, Translate, Database } from "@phosphor-icons/react";
import { useT, type TKey } from "@/lib/i18n";

const themeLabelKey: Record<string, TKey> = {
  system: "themeSystem",
  light: "themeLight",
  dark: "themeDark",
};

// Названия языков не переводятся — каждый на своём языке.
const languageLabel: Record<string, string> = {
  ru: "Русский",
  en: "English",
  uk: "Українська",
  kk: "Қазақша",
};

export default function SettingsPage() {
  const router = useRouter();
  const s = useSettings();
  const t = useT();
  const { profile, initials } = useProfile();
  const { user, configured, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const isAdmin = isAdminEmail(user?.email);

  // Свой Premium-статус — для звезды/статуса рядом с именем.
  const [myPremium, setMyPremium] = useState<MyPremium | null>(null);
  useEffect(() => {
    let alive = true;
    fetchMyPremium().then((p) => {
      if (alive) setMyPremium(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto bg-background">
      {/* Верхняя панель */}
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <button
          type="button"
          aria-label="QR-код"
          onClick={() => router.push("/settings/profile/qr")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-foreground transition active:scale-90 active:bg-surface-2/70 md:hover:bg-surface-2/80"
        >
          <QrCode size={22} weight="regular" />
        </button>
        <button
          type="button"
          aria-label="Редактировать профиль"
          onClick={() => router.push("/settings/profile")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-foreground transition active:scale-90 active:bg-surface-2/70 md:hover:bg-surface-2/80"
        >
          <PencilSimple size={20} weight="regular" />
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
          {myPremium?.active && (
            <PremiumBadge
              name={profile.name}
              size={22}
              editable
              status={myPremium.status}
              onStatusChange={(id) =>
                setMyPremium((p) => (p ? { ...p, status: id } : p))
              }
            />
          )}
        </h1>
        <p className="mt-0.5 text-[14px] text-muted">
          {profile.username ? `@${profile.username}` : t("setUsername")}
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
          <NavRow
            icon={LinkSimple}
            iconBg="var(--accent)"
            label={t("inviteFriends")}
            last
            index={0}
            onClick={() => router.push("/settings/invite")}
          />
        </Group>

        {/* HouseGram Premium */}
        <Group>
          <NavRow
            icon={Star}
            iconBg="#FA3A3A"
            label={t("premium")}
            value="200 ₽/мес"
            last
            index={0}
            onClick={() => router.push("/settings/premium")}
          />
        </Group>

        {/* Основные настройки */}
        <Group>
          <NavRow
            icon={Bell}
            iconBg="#FF3B30"
            label={t("notifications")}
            index={0}
            onClick={() => router.push("/settings/notifications")}
          />
          <NavRow
            icon={Lock}
            iconBg="#34C759"
            label={t("security")}
            index={1}
            onClick={() => router.push("/settings/security")}
          />
          <NavRow
            icon={Devices}
            iconBg="#FF9500"
            label={t("devices")}
            index={2}
            onClick={() => router.push("/settings/devices")}
          />
          <NavRow
            icon={ChatText}
            iconBg="#007AFF"
            label={t("messages")}
            index={3}
            onClick={() => router.push("/settings/messages")}
          />
          <NavRow
            icon={Moon}
            iconBg="#5856D6"
            label={t("appearance")}
            value={t(themeLabelKey[s.theme])}
            index={4}
            onClick={() => router.push("/settings/appearance")}
          />
          <NavRow
            icon={BookmarkSimple}
            iconBg="#FFB300"
            label={t("favorites")}
            index={5}
            onClick={() => router.push("/settings/favorites")}
          />
          <NavRow
            icon={FolderSimple}
            iconBg="#32ADE6"
            label={t("folders")}
            index={6}
            onClick={() => router.push("/settings/folders")}
          />
          <NavRow
            icon={Translate}
            iconBg="#AF52DE"
            label={t("language")}
            value={languageLabel[s.language]}
            index={7}
            onClick={() => router.push("/settings/language")}
          />
          <NavRow
            icon={Database}
            iconBg="#00C7BE"
            label={t("dataStorage")}
            index={8}
            onClick={() => router.push("/settings/data")}
          />
          <NavRow
            icon={Info}
            iconBg="#8E8E93"
            label={t("about")}
            value={`${"0.1.0"} beta`}
            last
            index={9}
            onClick={() => router.push("/settings/about")}
          />
        </Group>

        {/* Админ-панель — только для супер-администратора */}
        {configured && isAdmin && (
          <>
            <SectionTitle>{t("administration")}</SectionTitle>
            <Group>
              <NavRow
                icon={ShieldStar}
                iconBg="var(--accent)"
                label={t("adminPanel")}
                value={t("adminManage")}
                last
                onClick={() => router.push("/settings/admin")}
              />
            </Group>
            <GroupHint>{t("adminHint")}</GroupHint>
          </>
        )}

        {/* Аккаунт */}
        {configured && user && (
          <>
            <SectionTitle>{t("account")}</SectionTitle>
            <Group>
              <button
                type="button"
                disabled={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  await signOut();
                }}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 px-4 py-3.5 text-center transition-colors hover:bg-surface-2/60 active:bg-surface-2 disabled:opacity-50"
              >
                <SignOut size={20} weight="bold" className="text-accent" />
                <span className="text-[15px] font-semibold text-accent">
                  {signingOut ? t("signingOut") : t("signOut")}
                </span>
              </button>
            </Group>
            <GroupHint>
              {t("signedInAs")} {user.email}. {t("syncHint")}
            </GroupHint>
          </>
        )}
      </div>
    </div>
  );
}
