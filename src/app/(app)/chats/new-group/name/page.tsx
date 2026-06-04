"use client";

import { useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretLeft, Camera } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Avatar } from "@/components/Avatar";
import { useChats } from "@/lib/chat-store";
import { uploadImage } from "@/lib/storage";
import { useToast } from "@/components/Toast";

function NameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createGroup } = useChats();
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [avatar, setAvatar] = useState("");
  const [creating, setCreating] = useState(false);

  const members = (searchParams.get("members") ?? "")
    .split(",")
    .filter(Boolean);

  const canCreate = title.trim().length > 0;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return show("Выберите изображение");
    if (file.size > 3 * 1024 * 1024) return show("Файл больше 3 МБ");
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    let avatarUrl = avatar;
    if (avatar && avatar.startsWith("data:")) {
      avatarUrl = await uploadImage(avatar, "group");
    }
    const id = createGroup(title, members, avatarUrl);
    show("Группа создана");
    router.replace(`/chats/${id}`);
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
          Новая группа
        </h1>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate || creating}
          className="shrink-0 px-2 text-[16px] font-semibold text-accent transition disabled:opacity-40"
        >
          {creating ? "Создание…" : "Создать"}
        </button>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        <p className="px-8 pt-6 text-center text-[15px] leading-relaxed text-muted">
          Добавьте фото, чтобы чат узнавали с первого взгляда
        </p>

        <div className="flex justify-center py-6">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => fileRef.current?.click()}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-2 text-muted-2 transition hover:bg-separator"
          >
            {avatar ? (
              <Avatar initials="" color="#ccc" size={96} src={avatar} />
            ) : (
              <Camera size={34} weight="regular" />
            )}
          </motion.button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
        </div>

        <div className="px-3">
          <div className="rounded-2xl bg-surface px-4 py-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              autoFocus
              placeholder="Название группы"
              className="w-full bg-transparent text-[16px] text-foreground placeholder:text-muted-2 focus:outline-none"
            />
          </div>
        </div>

        {members.length > 0 && (
          <p className="px-5 pt-3 text-[13px] text-muted">
            Участников: {members.length}. Их можно будет добавить и позже.
          </p>
        )}
      </div>
    </div>
  );
}

export default function NewGroupNamePage() {
  return (
    <Suspense fallback={null}>
      <NameForm />
    </Suspense>
  );
}
