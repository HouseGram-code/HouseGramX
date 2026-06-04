"use client";

import { use, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ChatCircleDots } from "@phosphor-icons/react";
import { useChats } from "@/lib/chat-store";

function JoinView({ code }: { code: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { joinByLink, hydrated } = useChats();

  const kind = searchParams.get("type") === "group" ? "group" : "channel";

  useEffect(() => {
    // Ждём загрузки чатов из localStorage, иначе не найдём существующий канал.
    if (!hydrated) return;
    const id = joinByLink(code, kind);
    const t = setTimeout(() => router.replace(`/chats/${id}`), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, kind, hydrated]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent text-white shadow-lg"
      >
        <ChatCircleDots size={42} weight="fill" />
      </motion.div>
      <div className="space-y-1">
        <p className="text-lg font-semibold text-foreground">
          Открываем {kind === "group" ? "группу" : "канал"}…
        </p>
        <p className="text-sm text-muted">Подождите секунду</p>
      </div>
    </div>
  );
}

export default function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  return (
    <Suspense fallback={null}>
      <JoinView code={code} />
    </Suspense>
  );
}
