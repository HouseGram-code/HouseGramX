import {
  UsersThree,
  Phone,
  ChatCircleDots,
  GearSix,
  type Icon,
} from "@phosphor-icons/react";

export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  badge?: number;
}

export const navItems: NavItem[] = [
  { href: "/contacts", label: "Контакты", icon: UsersThree },
  { href: "/calls", label: "Звонки", icon: Phone },
  { href: "/chats", label: "Чаты", icon: ChatCircleDots },
  { href: "/settings", label: "Настройки", icon: GearSix },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
