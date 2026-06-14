"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  MagnifyingGlass,
  UserPlus,
  Trash,
  UsersThree,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { useContacts, type Contact } from "@/lib/contacts-store";
import { useToast } from "@/components/Toast";

export default function ContactsPage() {
  const router = useRouter();
  const { contacts, removeContact } = useContacts();
  const { show } = useToast();
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    if (!query.trim()) return contacts;
    const q = query.toLowerCase();
    return contacts.filter((c) => c.name.toLowerCase().includes(q));
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface">
      <header className="z-10 bg-surface px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">
            Контакты
          </h1>
          <button
            type="button"
            aria-label="Добавить контакт"
            onClick={() => router.push("/contacts/new")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-sm transition active:scale-90"
          >
            <UserPlus size={20} weight="bold" />
          </button>
        </div>

        {contacts.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5">
            <MagnifyingGlass size={18} weight="bold" className="text-muted-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-2 focus:outline-none"
            />
          </div>
        )}
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto border-t border-separator">
        {contacts.length === 0 ? (
          <EmptyContacts onAdd={() => router.push("/contacts/new")} />
        ) : groups.length === 0 ? (
          <p className="px-5 pt-10 text-center text-sm text-muted">
            Ничего не найдено
          </p>
        ) : (
          groups.map(([letter, items]) => (
            <div key={letter}>
              <p className="bg-background/60 px-5 py-1 text-xs font-medium text-muted">
                {letter}
              </p>
              <AnimatePresence>
                {items.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 overflow-hidden px-4 py-2"
                  >
                    <Avatar initials={c.initials} color={c.color} size={48} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-foreground">
                        {c.name}
                      </span>
                      <span className="block truncate text-[13px] text-muted">
                        {c.phone ?? c.status}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        removeContact(c.id);
                        show("Контакт удалён");
                      }}
                      aria-label="Удалить"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-2 transition hover:bg-surface-2 hover:text-accent"
                    >
                      <Trash size={18} weight="regular" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyContacts({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-10 py-24 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-2">
        <UsersThree size={44} weight="duotone" className="text-accent" />
      </div>
      <div className="space-y-1.5">
        <p className="text-lg font-semibold text-foreground">Нет контактов</p>
        <p className="text-sm leading-relaxed text-muted">
          Добавьте людей, чтобы быстро начинать чаты и собирать группы.
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="rounded-2xl bg-accent px-5 py-3 text-[15px] font-semibold text-white shadow-sm transition active:scale-95"
      >
        Добавить контакт
      </button>
    </div>
  );
}
