"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  CaretLeft,
  MagnifyingGlass,
  Check,
  UserPlus,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { useContacts, type Contact } from "@/lib/contacts-store";
import { cn } from "@/lib/utils";

export default function NewGroupSelectPage() {
  const router = useRouter();
  const { contacts } = useContacts();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const list = useMemo(() => {
    let arr = contacts;
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((c) => c.name.toLowerCase().includes(q));
    }
    return arr;
  }, [contacts, query]);

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
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const proceed = () => {
    const ids = Array.from(selected);
    const qs = ids.length ? `?members=${ids.join(",")}` : "";
    router.push(`/chats/new-group/name${qs}`);
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <header className="z-20 flex items-center gap-3 border-b border-separator bg-surface/90 px-3 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2.5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Назад"
          className="text-foreground transition active:opacity-60"
        >
          <CaretLeft size={26} weight="bold" />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-foreground">
          Выберите участников
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
          <div className="flex flex-col items-center gap-3 px-8 pt-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-2">
              <UserPlus size={36} weight="duotone" className="text-accent" />
            </div>
            <p className="text-sm leading-relaxed text-muted">
              У вас пока нет контактов. Можно создать пустую группу и пригласить
              людей по ссылке.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-separator bg-surface px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={proceed}
          className="w-full rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-white shadow-sm"
        >
          {selected.size > 0
            ? `Далее (${selected.size})`
            : "Создать пустую группу"}
        </motion.button>
      </div>
    </div>
  );
}
