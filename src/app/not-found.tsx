import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-accent to-[#7a0d0d] text-3xl font-extrabold text-white shadow-xl">
        404
      </div>
      <h1 className="text-[22px] font-bold text-foreground">Страница не найдена</h1>
      <p className="max-w-xs text-[14px] leading-relaxed text-muted">
        Возможно, ссылка устарела или страница была удалена.
      </p>
      <Link
        href="/chats"
        className="mt-2 rounded-2xl bg-accent px-6 py-3 text-[15px] font-semibold text-white shadow-sm transition active:scale-95"
      >
        На главную
      </Link>
    </div>
  );
}
