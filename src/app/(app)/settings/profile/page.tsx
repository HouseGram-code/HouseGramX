"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CaretLeft, Camera, X, At, Trash } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { Group, GroupHint, SectionTitle } from "@/components/settings-ui";
import { useProfile } from "@/lib/profile-store";
import { uploadImage } from "@/lib/storage";
import { useToast } from "@/components/Toast";

const MAX_BIO = 120;
const USERNAME_RE = /^[a-zA-Z0-9_]{0,32}$/;

export default function ProfileEditPage() {
  const router = useRouter();
  const { profile, save, initials } = useProfile();
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [saving, setSaving] = useState(false);

  const dirty =
    name !== profile.name ||
    username !== profile.username ||
    bio !== profile.bio ||
    avatar !== profile.avatar;

  const usernameValid = USERNAME_RE.test(username);
  const canSave = name.trim().length > 0 && usernameValid && dirty;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      show("Выберите изображение");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      show("Файл больше 3 МБ");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    let avatarUrl = avatar;
    // Если выбрана новая картинка (data-URL) — загружаем в Storage.
    if (avatar && avatar.startsWith("data:")) {
      avatarUrl = await uploadImage(avatar, "profile");
    }
    save({
      name: name.trim(),
      username: username.trim(),
      bio: bio.trim(),
      avatar: avatarUrl,
    });
    show("Профиль сохранён");
    router.back();
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      {/* Шапка */}
      <header className="z-20 flex items-center gap-2 border-b border-separator bg-surface/90 px-3 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2.5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Назад"
          className="flex shrink-0 items-center text-accent transition active:opacity-60"
        >
          <CaretLeft size={26} weight="bold" />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-foreground">
          Изменить профиль
        </h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="shrink-0 px-2 text-[16px] font-semibold text-accent transition disabled:opacity-40"
        >
          {saving ? "Сохр…" : "Сохранить"}
        </button>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto pb-8">
        {/* Аватар */}
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="relative">
            <Avatar
              initials={initials}
              color={profile.color}
              size={104}
              src={avatar || undefined}
              className="text-4xl shadow-md"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Загрузить фото"
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white ring-4 ring-background transition active:scale-90"
            >
              <Camera size={18} weight="fill" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
          </div>
          {avatar && (
            <button
              type="button"
              onClick={() => setAvatar("")}
              className="flex items-center gap-1 text-[13px] font-medium text-accent transition active:opacity-60"
            >
              <Trash size={15} weight="regular" />
              Удалить фото
            </button>
          )}
        </div>

        {/* Имя */}
        <SectionTitle>Имя</SectionTitle>
        <Group>
          <div className="flex items-center gap-2 px-4 py-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              placeholder="Ваше имя"
              className="w-full bg-transparent text-[16px] text-foreground placeholder:text-muted-2 focus:outline-none"
            />
            {name && (
              <button
                type="button"
                onClick={() => setName("")}
                aria-label="Очистить"
                className="text-muted-2"
              >
                <X size={18} weight="bold" />
              </button>
            )}
          </div>
        </Group>

        {/* Юзернейм */}
        <SectionTitle>Имя пользователя</SectionTitle>
        <Group>
          <div className="flex items-center gap-2 px-4 py-3">
            <At size={20} weight="bold" className="shrink-0 text-muted-2" />
            <input
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/\s/g, "").toLowerCase())
              }
              maxLength={32}
              placeholder="username"
              className="w-full bg-transparent text-[16px] text-foreground placeholder:text-muted-2 focus:outline-none"
            />
          </div>
        </Group>
        <GroupHint>
          {username && !usernameValid ? (
            <span className="text-accent">
              Только латиница, цифры и подчёркивание
            </span>
          ) : username ? (
            <span>
              Ссылка на профиль: {origin()}/u/{username}
            </span>
          ) : (
            "Можно указать имя пользователя, чтобы вас находили по ссылке."
          )}
        </GroupHint>

        {/* О себе */}
        <SectionTitle>О себе</SectionTitle>
        <Group>
          <div className="px-4 py-3">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
              rows={3}
              placeholder="Несколько слов о себе"
              className="no-scrollbar w-full resize-none bg-transparent text-[16px] text-foreground placeholder:text-muted-2 focus:outline-none"
            />
            <div className="text-right text-[12px] text-muted-2">
              {MAX_BIO - bio.length}
            </div>
          </div>
        </Group>
        <GroupHint>
          Любые сведения, например, род занятий. Их увидят те, кто открывает ваш
          профиль.
        </GroupHint>

        {/* Кнопка сохранить (дублирующая, внизу) */}
        <div className="px-3 pt-6">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-white shadow-sm transition disabled:opacity-40"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function origin() {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
