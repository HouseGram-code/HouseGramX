"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useCloudPersistence } from "./sync";

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  color: string;
  initials: string;
  /** Статус последнего визита. */
  status: string;
}

interface ContactsContextValue {
  contacts: Contact[];
  getContact: (id: string) => Contact | undefined;
  addContact: (name: string, phone?: string) => string;
  removeContact: (id: string) => void;
}

const ContactsContext = createContext<ContactsContextValue | null>(null);

const STORAGE_KEY = "messenger.contacts.v1";

const COLORS = [
  "#e84393",
  "#0984e3",
  "#00b894",
  "#6c5ce7",
  "#e67e22",
  "#16a085",
  "#9b59b6",
  "#2c3e50",
  "#c0392b",
  "#fd79a8",
];

function uid() {
  return "c_" + Math.random().toString(36).slice(2, 10);
}

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useCloudPersistence<Contact[]>({
    key: STORAGE_KEY,
    snapshot: contacts,
    hydrated,
    setHydrated,
    applyData: (data) => {
      if (Array.isArray(data)) setContacts(data);
    },
  });

  const addContact = (name: string, phone?: string) => {
    const id = uid();
    const color = COLORS[contacts.length % COLORS.length];
    const contact: Contact = {
      id,
      name: name.trim(),
      phone: phone?.trim() || undefined,
      color,
      initials: makeInitials(name),
      status: "недавно добавлен",
    };
    setContacts((cs) =>
      [...cs, contact].sort((a, b) => a.name.localeCompare(b.name, "ru"))
    );
    return id;
  };

  const removeContact = (id: string) =>
    setContacts((cs) => cs.filter((c) => c.id !== id));

  const getContact = (id: string) => contacts.find((c) => c.id === id);

  return (
    <ContactsContext.Provider
      value={{ contacts, getContact, addContact, removeContact }}
    >
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error("useContacts должен быть внутри ContactsProvider");
  return ctx;
}
