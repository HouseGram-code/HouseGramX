"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CaretLeft, User, Phone } from "@phosphor-icons/react";
import { useContacts } from "@/lib/contacts-store";
import { useToast } from "@/components/Toast";

export default function NewContactPage() {
  const router = useRouter();
  const { addContact } = useContacts();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    addContact(name, phone);
    show("Контакт добавлен");
    router.back();
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <header className="z-20 flex items-center gap-2 border-b border-separator bg-surface/90 px-2 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2.5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Назад"
          className="flex shrink-0 items-center text-accent transition active:opacity-60"
        >
          <CaretLeft size={26} weight="bold" />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-foreground">
          Новый контакт
        </h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="shrink-0 px-2 text-[16px] font-semibold text-accent transition disabled:opacity-40"
        >
          Готово
        </button>
      </header>

      <div className="flex-1 space-y-4 py-5">
        <div className="mx-3 overflow-hidden rounded-[var(--radius-card)] bg-surface">
          <div className="flex items-center gap-3 border-b border-separator px-4 py-3">
            <User size={22} weight="regular" className="text-muted" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={64}
              placeholder="Имя"
              className="w-full bg-transparent text-[16px] text-foreground placeholder:text-muted-2 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Phone size={22} weight="regular" className="text-muted" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              maxLength={20}
              placeholder="Телефон (необязательно)"
              className="w-full bg-transparent text-[16px] text-foreground placeholder:text-muted-2 focus:outline-none"
            />
          </div>
        </div>
        <p className="px-5 text-[13px] leading-relaxed text-muted">
          Контакт сохранится на этом устройстве. Его можно добавлять в группы и
          каналы.
        </p>
      </div>
    </div>
  );
}
