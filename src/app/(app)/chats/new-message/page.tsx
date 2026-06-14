"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CaretLeft, MagnifyingGlass, UserPlus, At } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useChats } from "@/lib/chat-store";
import { searchUsers, type FoundUser } from "@/lib/chat-remote";
import { useAuth } from "@/lib/auth-store";
import { useToast } from "@/components/Toast";

export default function NewMessagePage() {
  const router = useRouter();
  const { startDirectChat } = useChats();
  const { user, configured } = useAuth();
  const { show } = useToast();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Поиск с задержкой при вводе.
  useEffect(() => {
    if (!user) return;
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      const found = await searchUsers(q, user.id);
      setResults(found);
      setLoading(false);
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, user]);

  const open = async (u: FoundUser) => {
    setBusyId(u.id);
    try {
      const id = await startDirectChat(u);
      router.replace(`/chats/${id}`);
    } catch {
      show("Не удалось открыть чат");
      setBusyId(null);
    }
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
          Новое сообщение
        </h1>
        <span className="w-[26px]" />
      </header>

      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5">
          <MagnifyingGlass size={18} weight="bold" className="text-muted-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Имя или @username"
            className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-2 focus:outline-none"
          />
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto py-2">
        {!configured ? (
          <Hint icon={<UserPlus size={36} weight="duotone" className="text-accent" />}>
            Поиск людей сейчас недоступен.
          </Hint>
        ) : loading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : results.length > 0 ? (
          results.map((u, i) => (
            <motion.button
              key={u.id}
              type="button"
              disabled={busyId !== null}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              onClick={() => open(u)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2 disabled:opacity-50"
            >
              <Avatar
                initials={u.initials}
                color={u.color}
                size={48}
                src={u.avatar || undefined}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-[15px] font-semibold text-foreground">
                  <span className="truncate">{u.name}</span>
                  {u.official && <VerifiedBadge size={16} />}
                </span>
                {u.username && (
                  <span className="flex items-center gap-0.5 text-[13px] text-muted">
                    <At size={12} weight="bold" />
                    {u.username}
                  </span>
                )}
              </span>
              {busyId === u.id && (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              )}
            </motion.button>
          ))
        ) : query.trim() ? (
          <Hint icon={<MagnifyingGlass size={36} weight="duotone" className="text-accent" />}>
            Никого не найдено. Проверьте имя или @username.
          </Hint>
        ) : (
          <Hint icon={<UserPlus size={36} weight="duotone" className="text-accent" />}>
            Введите имя или @username, чтобы найти человека и начать переписку.
          </Hint>
        )}
      </div>
    </div>
  );
}

function Hint({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-8 pt-14 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-2">
        {icon}
      </div>
      <p className="text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}
