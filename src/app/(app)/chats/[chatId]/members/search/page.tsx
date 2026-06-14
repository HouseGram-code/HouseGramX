"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CaretLeft, MagnifyingGlass, Check, At, UserPlus } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { useChats } from "@/lib/chat-store";
import { searchUsers, type FoundUser } from "@/lib/chat-remote";
import { useAuth } from "@/lib/auth-store";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

export default function AddRealMembersPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const router = useRouter();
  const { getConversation, addRealUsers } = useChats();
  const { user, configured } = useAuth();
  const { show } = useToast();

  const conv = getConversation(chatId);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Map<string, FoundUser>>(new Map());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const toggle = (u: FoundUser) => {
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(u.id)) next.delete(u.id);
      else next.set(u.id, u);
      return next;
    });
  };

  const confirm = async () => {
    const users = Array.from(picked.values());
    if (users.length === 0) return;
    setBusy(true);
    try {
      await addRealUsers(chatId, users);
      show(`Добавлено: ${users.length}`);
      router.back();
    } catch {
      show("Не удалось добавить");
      setBusy(false);
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
        <h1 className="flex-1 truncate text-center text-[17px] font-semibold text-foreground">
          Добавить людей{conv ? ` · ${conv.title}` : ""}
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
          <Hint>Поиск людей сейчас недоступен.</Hint>
        ) : loading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : results.length > 0 ? (
          results.map((u, i) => {
            const checked = picked.has(u.id);
            return (
              <motion.button
                key={u.id}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                onClick={() => toggle(u)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition",
                    checked ? "border-accent bg-accent text-white" : "border-muted-2"
                  )}
                >
                  {checked && <Check size={14} weight="bold" />}
                </span>
                <Avatar
                  initials={u.initials}
                  color={u.color}
                  size={46}
                  src={u.avatar || undefined}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">
                    {u.name}
                  </span>
                  {u.username && (
                    <span className="flex items-center gap-0.5 text-[13px] text-muted">
                      <At size={12} weight="bold" />
                      {u.username}
                    </span>
                  )}
                </span>
              </motion.button>
            );
          })
        ) : query.trim() ? (
          <Hint>Никого не найдено. Проверьте имя или @username.</Hint>
        ) : (
          <Hint>Найдите людей по имени или @username, чтобы добавить их в чат.</Hint>
        )}
      </div>

      {picked.size > 0 && (
        <div className="border-t border-separator bg-surface px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={busy}
            onClick={confirm}
            className="flex w-full items-center justify-center rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-white shadow-sm transition disabled:opacity-50"
          >
            {busy ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              `Добавить (${picked.size})`
            )}
          </motion.button>
        </div>
      )}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-8 pt-14 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-2">
        <UserPlus size={36} weight="duotone" className="text-accent" />
      </div>
      <p className="text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}
