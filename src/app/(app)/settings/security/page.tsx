"use client";

import { useEffect, useState } from "react";
import {
  Password,
  ShieldCheck,
  Checks,
  Eye,
  Prohibit,
  LockKey,
  Star,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { SubScreen } from "@/components/SubScreen";
import {
  Group,
  GroupHint,
  NavRow,
  SectionTitle,
  ToggleRow,
} from "@/components/settings-ui";
import { useSettings } from "@/lib/settings-store";
import { useChats } from "@/lib/chat-store";
import { useToast } from "@/components/Toast";
import { useT, type TKey } from "@/lib/i18n";
import { fetchMyPremium, setDmClosed, type MyPremium } from "@/lib/premium";

const LAST_SEEN_KEYS: Record<string, TKey> = {
  everyone: "lastSeenEveryone",
  contacts: "lastSeenContacts",
  nobody: "lastSeenNobody",
};

export default function SecurityPage() {
  const s = useSettings();
  const t = useT();
  const { show } = useToast();
  const { conversations } = useChats();
  const router = useRouter();
  const blockedCount = conversations.filter((c) => c.blocked).length;

  // Premium-статус (для «Запрета личных сообщений»).
  const [premium, setPremium] = useState<MyPremium | null>(null);
  const [dmBusy, setDmBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchMyPremium().then((p) => {
      if (alive) setPremium(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  const premiumActive = premium?.active ?? false;
  const dmClosed = premium?.dmClosed ?? false;

  const onToggleDmLock = async (next: boolean) => {
    if (!premiumActive) {
      show(t("dmLockPremiumOnly"));
      router.push("/settings/premium");
      return;
    }
    setDmBusy(true);
    setPremium((p) => (p ? { ...p, dmClosed: next } : p));
    try {
      await setDmClosed(next);
      show(next ? t("dmLockOn") : t("dmLockOff"));
    } catch (e) {
      setPremium((p) => (p ? { ...p, dmClosed: !next } : p));
      show(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setDmBusy(false);
    }
  };

  return (
    <SubScreen title={t("security")}>
      <SectionTitle>{t("access")}</SectionTitle>
      <Group>
        <ToggleRow
          icon={Password}
          label={t("passcode")}
          checked={s.passcode}
          onChange={(v) => {
            s.set("passcode", v);
            show(v ? t("passcodeOn") : t("passcodeOff"));
          }}
        />
        <ToggleRow
          icon={ShieldCheck}
          label={t("twoFactor")}
          checked={s.twoFactor}
          onChange={(v) => {
            s.set("twoFactor", v);
            show(v ? t("twoFaOn") : t("twoFaOff"));
          }}
          last
        />
      </Group>
      <GroupHint>{t("twoFactorHint")}</GroupHint>

      <SectionTitle>{t("privacySection")}</SectionTitle>
      <Group>
        <NavRow
          icon={Eye}
          label={t("whoSeesMyStatus")}
          value={t(LAST_SEEN_KEYS[s.lastSeenVisibility])}
          onClick={() => router.push("/settings/security/last-seen")}
        />
        <NavRow
          icon={Prohibit}
          label={t("blockedUsers")}
          value={blockedCount > 0 ? String(blockedCount) : undefined}
          onClick={() => router.push("/settings/privacy")}
        />
        <ToggleRow
          icon={Checks}
          label={t("readReceipts")}
          checked={s.readReceipts}
          onChange={(v) => s.set("readReceipts", v)}
          last
        />
      </Group>
      <GroupHint>{t("readReceiptsHint")}</GroupHint>

      {/* Запрет личных сообщений — премиум-функция */}
      <SectionTitle>HouseGram Premium</SectionTitle>
      <Group>
        <ToggleRow
          icon={premiumActive ? LockKey : Star}
          label={t("dmLock")}
          checked={dmClosed}
          onChange={onToggleDmLock}
          disabled={dmBusy}
          last
        />
      </Group>
      <GroupHint>
        {premiumActive ? t("dmLockHint") : t("dmLockPremiumOnly")}
      </GroupHint>
    </SubScreen>
  );
}
