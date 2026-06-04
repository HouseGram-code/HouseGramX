"use client";

import { motion } from "motion/react";
import { Wrench, GearSix, Sparkle } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth-store";
import { useMaintenance } from "@/lib/maintenance-store";
import { isAdminEmail } from "@/lib/admin";

/**
 * Перекрывает приложение красивым экраном-заглушкой во время техработ.
 * Администратор (goh@gmail.com) сохраняет полный доступ к сайту.
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { enabled, message, ready } = useMaintenance();

  const isAdmin = isAdminEmail(user?.email);

  // Пока грузим состояние — не мигаем заглушкой.
  if (!ready || !enabled || isAdmin) return <>{children}</>;

  return <MaintenanceScreen message={message} />;
}

function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-10 text-center">
      {/* Декоративный фон */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.28, 0.18] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/25 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/15 blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex w-full max-w-sm flex-col items-center"
      >
        {/* Анимированная иконка-гаечный ключ с вращающейся шестерёнкой */}
        <div className="relative mb-8 flex h-28 w-28 items-center justify-center rounded-[34px] bg-gradient-to-br from-accent to-[#7a0d0d] text-white shadow-2xl">
          <motion.div
            animate={{ rotate: [-12, 12, -12] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Wrench size={52} weight="fill" />
          </motion.div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-accent shadow-lg"
          >
            <GearSix size={24} weight="fill" />
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-[26px] font-extrabold tracking-tight text-foreground"
        >
          Технические работы
        </motion.h1>

        <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted">
          {message?.trim()
            ? message
            : "Мы улучшаем HouseGramX. Сайт временно недоступен — загляните чуть позже, мы скоро вернёмся."}
        </p>

        {/* «Дышащий» индикатор прогресса */}
        <div className="mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-1/2 rounded-full bg-accent"
          />
        </div>

        <div className="mt-8 flex items-center gap-1.5 text-[13px] text-muted-2">
          <Sparkle size={15} weight="fill" className="text-accent" />
          HouseGramX
        </div>
      </motion.div>
    </div>
  );
}
