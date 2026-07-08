"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn, formatCount } from "@/lib/utils";
import { navItems, isActive } from "@/lib/nav-items";
import { useChats } from "@/lib/chat-store";
import { countUnread } from "@/lib/chat-remote";
import { useT } from "@/lib/i18n";

/** Нижняя навигация — только для мобильных (Android/iPhone). */
export function BottomNav() {
  const pathname = usePathname();
  const { conversations } = useChats();
  const t = useT();

  // Суммарное число непрочитанных по всем чатам.
  const totalUnread = conversations.reduce((n, c) => n + countUnread(c), 0);

  // Скрываем на экранах-«деталях» (открытый чат, подэкраны настроек).
  const isDetail =
    /^\/chats\/[^/]+/.test(pathname) ||
    /^\/settings\/.+/.test(pathname) ||
    /^\/addstickers\//.test(pathname);

  if (isDetail) return null;

  return (
    <nav className="glass-nav relative z-30 shrink-0 border-t border-separator md:hidden">
      <ul className="flex items-stretch justify-around px-1 pt-2 pb-[max(env(safe-area-inset-bottom),10px)]">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const badge =
            item.href === "/chats" ? totalUnread : item.badge ?? 0;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className="group relative flex flex-col items-center gap-0.5 py-0.5"
              >
                {/* Иконка с «пилюлей» подсветки и пружинной анимацией нажатия */}
                <motion.span
                  whileTap={{ scale: 0.82 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="relative flex h-[34px] w-[64px] items-center justify-center"
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-2xl bg-gradient-to-b from-accent/25 to-accent/10 ring-1 ring-accent/20 shadow-[0_6px_16px_-6px_rgba(250,58,58,0.4)]"
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 32,
                      }}
                    />
                  )}
                  <motion.span
                    key={active ? "on" : "off"}
                    initial={false}
                    animate={
                      active
                        ? { scale: [1, 1.25, 1], rotate: [0, -10, 0] }
                        : { scale: 1, rotate: 0 }
                    }
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    className="relative"
                  >
                    <Icon
                      size={26}
                      weight={active ? "fill" : "regular"}
                      className={cn(
                        "transition-colors duration-200",
                        active ? "text-accent" : "text-muted"
                      )}
                    />
                    {badge > 0 ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-badge px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-surface"
                      >
                        {formatCount(badge)}
                      </motion.span>
                    ) : null}
                  </motion.span>
                </motion.span>
                <motion.span
                  animate={{ scale: active ? 1.06 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={cn(
                    "text-[11px] transition-colors duration-200",
                    active ? "font-semibold text-accent" : "font-medium text-muted"
                  )}
                >
                  {t(item.labelKey)}
                </motion.span>
                {/* Активный индикатор-точка под подписью */}
                <motion.span
                  initial={false}
                  animate={{ scale: active ? 1 : 0, opacity: active ? 1 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="h-1 w-1 rounded-full bg-accent"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
