import {
  UsersThree,
  Phone,
  ChatCircleDots,
  GearSix,
  type Icon,
} from "@phosphor-icons/react";
import type { TKey } from "./i18n";

export interface NavItem {
  href: string;
  /** Ключ перевода подписи (см. src/lib/i18n.ts). */
  labelKey: TKey;
  icon: Icon;
  badge?: number;
}

export const navItems: NavItem[] = [
  { href: "/contacts", labelKey: "navContacts", icon: UsersThree },
  { href: "/calls", labelKey: "navCalls", icon: Phone },
  { href: "/chats", labelKey: "navChats", icon: ChatCircleDots },
  { href: "/settings", labelKey: "navSettings", icon: GearSix },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
