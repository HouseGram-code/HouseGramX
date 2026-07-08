"use client";

import { motion } from "motion/react";
import { CaretRight, type Icon } from "@phosphor-icons/react";
import { Switch } from "@/components/Switch";
import { cn } from "@/lib/utils";

/** Заголовок-подпись над группой. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-5 pb-2 pt-5 text-xs font-medium uppercase tracking-wide text-muted">
      {children}
    </h2>
  );
}

/** Карточка-группа со скруглениями (с плавным появлением). */
export function Group({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="glass-group mx-3 overflow-hidden rounded-[var(--radius-card)] shadow-[0_10px_28px_-14px_rgba(0,0,0,0.22)]"
    >
      {children}
    </motion.div>
  );
}

/** Подпись под группой. */
export function GroupHint({ children }: { children: React.ReactNode }) {
  return <p className="px-5 pt-2 text-xs leading-relaxed text-muted">{children}</p>;
}

interface RowBaseProps {
  icon?: Icon;
  iconColor?: string;
  label: string;
  last?: boolean;
}

/** Строка-переключатель. */
export function ToggleRow({
  icon: Icon,
  iconColor = "var(--muted)",
  label,
  checked,
  onChange,
  disabled,
  last,
}: RowBaseProps & {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex w-full items-center gap-3 pl-4">
      {Icon && (
        <Icon size={22} weight="regular" style={{ color: iconColor }} className="shrink-0" />
      )}
      <div
        className={cn(
          "flex flex-1 items-center justify-between py-3 pr-4",
          !last && "border-b border-separator"
        )}
      >
        <span className="text-[15px] text-foreground">{label}</span>
        <Switch checked={checked} onChange={onChange} disabled={disabled} label={label} />
      </div>
    </div>
  );
}

/** Кликабельная строка-навигация. */
export function NavRow({
  icon: Icon,
  iconColor = "var(--muted)",
  iconBg,
  label,
  value,
  onClick,
  last,
  index = 0,
}: RowBaseProps & {
  /** Цвет квадратной плашки под иконкой (стиль iOS). Иконка станет белой. */
  iconBg?: string;
  value?: string;
  onClick?: () => void;
  index?: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      whileTap={{ scale: 0.975 }}
      className="group flex w-full items-center gap-3 pl-4 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
    >
      {Icon &&
        (iconBg ? (
          <span
            className="icon-plate flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] shadow-sm transition-transform duration-200 group-active:scale-90"
            style={{ backgroundColor: iconBg }}
          >
            <Icon size={19} weight="fill" className="text-white" />
          </span>
        ) : (
          <Icon
            size={22}
            weight="regular"
            style={{ color: iconColor }}
            className="shrink-0"
          />
        ))}
      <div
        className={cn(
          "flex min-h-[44px] flex-1 items-center justify-between py-3 pr-4",
          !last && "border-b border-separator"
        )}
      >
        <span className="text-[15px] text-foreground">{label}</span>
        <span className="flex items-center gap-1.5">
          {value && <span className="text-[15px] text-muted">{value}</span>}
          <CaretRight
            size={18}
            weight="bold"
            className="text-muted-2 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </motion.button>
  );
}

/** Строка-выбор с галочкой. */
export function ChoiceRow({
  label,
  selected,
  onClick,
  last,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center pl-4 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
    >
      <div
        className={cn(
          "flex min-h-[48px] flex-1 items-center justify-between py-3.5 pr-4",
          !last && "border-b border-separator"
        )}
      >
        <span className="text-[15px] text-foreground">{label}</span>
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-accent"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12.5l4.5 4.5L19 7"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.span>
        )}
      </div>
    </button>
  );
}
