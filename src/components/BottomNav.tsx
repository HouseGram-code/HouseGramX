"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn, formatCount } from "@/lib/utils";
import { navItems, isActive } from "@/lib/nav-items";
import { useChats } from "@/lib/chat-store";
import { countUnread } from "@/lib/chat-remote";

/** Нижняя навигация — только для мобильных (Android/iPhone). */
export function BottomNav() {
  const pathname = usePathname();
  const { conversations } = useChats();

  // Суммарное число непрочитанных по всем чатам.
  const totalUnread = conversations.reduce((n, c) => n + countUnread(c), 0);

  // Скрываем на экранах-«деталях» (открытый чат, подэкраны настроек).
  const isDetail =
    /^\/chats\/[^/]+/.test(pathname) ||
    /^\/settings\/.+/.test(pathname);

  if (isDetail) return null;

  return (
    <nav className="relative z-30 shrink-0 border-t border-separator bg-surface/90 backdrop-blur-2xl md:hidden">
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
                className="group relative flex flex-col items-center gap-1 py-1"
              >
                <span className="relative">
                  <Icon
                    size={27}
                    weight={active ? "fill" : "regular"}
                    className={cn(
                      "transition-colors duration-200",
                      active ? "text-accent" : "text-muted"
                    )}
                  />
                  {badge > 0 ? (
                    <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-badge px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-surface">
                      {formatCount(badge)}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium transition-colors duration-200",
                    active ? "text-accent" : "text-muted"
                  )}
                >
                  {item.label}
                </span>
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute -top-[8px] h-[3px] w-9 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
