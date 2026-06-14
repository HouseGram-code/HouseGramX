"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { X, MagnifyingGlass, Check, UserPlus } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { useContacts, type Contact } from "@/lib/contacts-store";
import { cn } from "@/lib/utils";

interface ContactPickerProps {
  title: string;
  /** id, которых уже нет смысла показывать (уже в чате). */
  excludeIds?: string[];
  /** Разрешить выбор нескольких. */
  multi?: boolean;
  confirmLabel?: string;
  /** Источник списка. По умолчанию — все контакты пользователя. */
  source?: Contact[];
  /** Текст, когда список пуст. */
  emptyText?: string;
  onConfirm: (ids: string[]) => void;
}

/** Модальный экран выбора контактов из реальной адресной книги. */
export function ContactPicker({
  title,
  excludeIds = [],
  multi = true,
  confirmLabel = "Добавить",
  source,
  emptyText = "У вас пока нет контактов",
  onConfirm,
}: ContactPickerProps) {
  const router = useRouter();
  const { contacts } = useContacts();
  const baseList = source ?? contacts;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const list = useMemo(() => {
    const ex = new Set(excludeIds);
    let arr = baseList.filter((c) => !ex.has(c.id));
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((c) => c.name.toLowerCase().includes(q));
    }
    return arr;
  }, [baseList, excludeIds, query]);

  const groups = useMemo(() => {
    const map = new Map<string, Contact[]>();
    for (const c of list) {
      const letter = c.name.charAt(0).toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "ru")
    );
  }, [list]);

  const toggle = (id: string) => {
    if (!multi) {
      onConfirm([id]);
      router.back();
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = () => {
    onConfirm(Array.from(selected));
    router.back();
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <header className="z-20 flex items-center gap-3 border-b border-separator bg-surface/90 px-3 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2.5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Закрыть"
          className="text-foreground transition active:opacity-60"
        >
          <X size={26} weight="bold" />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-foreground">
          {title}
        </h1>
        <span className="w-[26px]" />
      </header>

      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5">
          <MagnifyingGlass size={18} weight="bold" className="text-muted-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти по имени"
            className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-2 focus:outline-none"
          />
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto py-2">
        {groups.length > 0 ? (
          groups.map(([letter, items]) => (
            <div key={letter}>
              <p className="px-5 pb-1 pt-3 text-xs font-medium text-muted">
                {letter}
              </p>
              {items.map((c) => {
                const checked = selected.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
                  >
                    {multi && (
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition",
                          checked
                            ? "border-accent bg-accent text-white"
                            : "border-muted-2"
                        )}
                      >
                        {checked && <Check size={14} weight="bold" />}
                      </span>
                    )}
                    <Avatar initials={c.initials} color={c.color} size={46} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-foreground">
                        {c.name}
                      </span>
                      <span className="block text-[13px] text-muted">
                        {c.status}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center gap-3 px-8 pt-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-2">
              <UserPlus size={36} weight="duotone" className="text-accent" />
            </div>
            <p className="text-sm leading-relaxed text-muted">{emptyText}</p>
            <button
              type="button"
              onClick={() => router.push("/contacts/new")}
              className="mt-1 text-[15px] font-medium text-accent"
            >
              Добавить контакт
            </button>
          </div>
        )}
      </div>

      {multi && groups.length > 0 && (
        <div className="border-t border-separator bg-surface px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={confirm}
            className="w-full rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-white shadow-sm transition disabled:opacity-50"
          >
            {selected.size > 0
              ? `${confirmLabel} (${selected.size})`
              : "Пропустить"}
          </motion.button>
        </div>
      )}
    </div>
  );
}
