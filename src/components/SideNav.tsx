"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ChatCircleDots } from "@phosphor-icons/react";
import { cn, formatCount } from "@/lib/utils";
import { navItems, isActive } from "@/lib/nav-items";
import { Avatar } from "@/components/Avatar";
import { Brand } from "@/components/Brand";
import { useProfile } from "@/lib/profile-store";
import { useChats } from "@/lib/chat-store";
import { countUnread } from "@/lib/chat-remote";
import { useT } from "@/lib/i18n";

/** Боковая навигация — только для ПК/планшетов (md+). */
export function SideNav() {
  const pathname = usePathname();
  const { profile, initials } = useProfile();
  const { conversations } = useChats();
  const t = useT();
  const totalUnread = conversations.reduce((n, c) => n + countUnread(c), 0);

  return (
    <aside className="hidden w-[88px] shrink-0 flex-col items-center gap-1 border-r border-separator bg-surface py-5 md:flex lg:w-[260px] lg:items-stretch lg:px-3">
      {/* Логотип */}
      <div className="mb-4 flex items-center gap-3 px-2 lg:px-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-white">
          <ChatCircleDots size={24} weight="fill" />
        </span>
        <span className="hidden text-lg font-bold tracking-tight text-foreground lg:inline">
          <Brand size={20} />
        </span>
      </div>

      <nav className="flex w-full flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const badge =
            item.href === "/chats" ? totalUnread : item.badge ?? 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors",
                "justify-center lg:justify-start",
                active
                  ? "bg-gradient-to-r from-accent/15 to-accent/5 text-accent ring-1 ring-accent/15"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <motion.span
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.08 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="relative"
              >
                <motion.span
                  initial={false}
                  animate={
                    active
                      ? { scale: [1, 1.2, 1], rotate: [0, -8, 0] }
                      : { scale: 1, rotate: 0 }
                  }
                  transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  className="block"
                >
                  <Icon size={26} weight={active ? "fill" : "regular"} />
                </motion.span>
                {badge > 0 ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-badge px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-surface"
                  >
                    {formatCount(badge)}
                  </motion.span>
                ) : null}
              </motion.span>
              <span
                className={cn(
                  "hidden text-[15px] font-medium lg:inline",
                  active ? "text-accent" : ""
                )}
              >
                {t(item.labelKey)}
              </span>
              {active && (
                <motion.span
                  layoutId="sidenav-active"
                  className="absolute left-0 top-1/2 hidden h-7 w-[3px] -translate-y-1/2 rounded-full bg-accent lg:block"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Профиль внизу */}
      <Link
        href="/settings"
        className="mt-auto flex w-full items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-surface-2 lg:px-3"
      >
        <Avatar
          initials={initials}
          color={profile.color}
          size={40}
          src={profile.avatar || undefined}
        />
        <span className="hidden min-w-0 flex-col lg:flex">
          <span className="truncate text-[14px] font-semibold text-foreground">
            {profile.name}
          </span>
          <span className="text-xs text-muted">{t("online")}</span>
        </span>
      </Link>
    </aside>
  );
}
