import { BottomNav } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";
import { IncomingCall } from "@/components/IncomingCall";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Глобальный оверлей входящего/активного звонка */}
      <IncomingCall />

      {/* Боковая навигация — ПК/планшет */}
      <SideNav />

      {/* Контентная область */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Ограничиваем ширину контента на больших экранах для удобства чтения */}
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden md:border-x md:border-separator">
          <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
        </div>

        {/* Нижняя навигация — мобильные */}
        <BottomNav />
      </div>
    </div>
  );
}
