"use client";

import { AnimatePresence, motion } from "motion/react";
import { Phone, PhoneX, PhoneSlash } from "@phosphor-icons/react";
import { usePeerCall } from "@/lib/peer-call";

/** Глобальный оверлей входящего и активного 1-на-1 звонка. */
export function IncomingCall() {
  const { state, peerName, seconds, muted, answer, hangup, toggleMute } =
    usePeerCall();

  const show = state === "incoming" || state === "active" || state === "calling";
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const name = peerName ?? "Контакт";

  return (
    <AnimatePresence>
      {show && state === "incoming" && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed inset-x-0 top-0 z-[60] mx-auto max-w-md px-3 pt-[max(env(safe-area-inset-top),12px)]"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-white shadow-2xl ring-1 ring-white/10">
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-green-500"
            >
              <Phone size={22} weight="fill" />
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{name}</p>
              <p className="text-[12px] text-white/60">Входящий аудиозвонок</p>
            </div>
            <button
              type="button"
              onClick={hangup}
              aria-label="Отклонить"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500"
            >
              <PhoneSlash size={20} weight="fill" />
            </button>
            <button
              type="button"
              onClick={() => answer()}
              aria-label="Принять"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-green-500"
            >
              <Phone size={20} weight="fill" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Мини-плашка активного звонка (когда не на экране звонка) */}
      {(state === "active" || state === "calling") && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="fixed inset-x-0 top-0 z-[55] mx-auto max-w-md px-3 pt-[max(env(safe-area-inset-top),10px)]"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-green-600 px-4 py-2.5 text-white shadow-lg">
            <span className="flex items-end gap-[2px]">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="block w-[2px] rounded-full bg-white"
                  animate={{ height: [4, 12, 4] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.12,
                  }}
                />
              ))}
            </span>
            <span className="flex-1 text-[14px] font-medium">
              {state === "calling" ? "Вызов…" : `Звонок · ${mm}:${ss}`}
            </span>
            <button
              type="button"
              onClick={toggleMute}
              className="text-[13px] font-medium text-white/80"
            >
              {muted ? "Вкл. звук" : "Выкл. звук"}
            </button>
            <button
              type="button"
              onClick={hangup}
              aria-label="Завершить"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500"
            >
              <PhoneX size={16} weight="fill" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
