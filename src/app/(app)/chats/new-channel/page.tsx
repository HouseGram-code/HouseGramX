"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CaretLeft, Camera } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { useChats } from "@/lib/chat-store";
import { uploadImage } from "@/lib/storage";
import { useToast } from "@/components/Toast";

const MAX_DESC = 400;

export default function NewChannelPage() {
  const router = useRouter();
  const { createChannel } = useChats();
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("");
  const [creating, setCreating] = useState(false);

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
      avatarUrl = await uploadImage(avatar, "channel");
    }
    const id = createChannel(title, description, avatarUrl);
    show("Канал создан");
    router.replace(`/chats/${id}`);
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      {/* Шапка */}
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
          Новый канал
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
          Добавьте фото, чтобы канал узнавали с первого взгляда
        </p>

        {/* Аватар-загрузка */}
        <div className="flex justify-center py-6">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => fileRef.current?.click()}
            className="relative flex h-24 w-24 items-center justify-center rounded-full bg-surface-2 text-muted-2 transition hover:bg-separator"
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

        {/* Поля */}
        <div className="space-y-3 px-3">
          <div className="rounded-2xl bg-surface px-4 py-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              autoFocus
              placeholder="Название канала"
              className="w-full bg-transparent text-[16px] text-foreground placeholder:text-muted-2 focus:outline-none"
            />
          </div>

          <div className="rounded-2xl bg-surface px-4 py-3">
            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, MAX_DESC))
              }
              rows={3}
              placeholder="Описание"
              className="no-scrollbar w-full resize-none bg-transparent text-[16px] text-foreground placeholder:text-muted-2 focus:outline-none"
            />
            <div className="text-right text-[12px] text-muted-2">
              {MAX_DESC - description.length}
            </div>
          </div>
        </div>

        <p className="px-5 pt-3 text-[13px] leading-relaxed text-muted">
          Канал — место, где вы публикуете сообщения для подписчиков. Только
          администраторы могут писать в канал.
        </p>
      </div>
    </div>
  );
}
