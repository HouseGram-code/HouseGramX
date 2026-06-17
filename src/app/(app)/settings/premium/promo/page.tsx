"use client";

import { useState } from "react";
import { Ticket, Sparkle, CheckCircle } from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { useToast } from "@/components/Toast";
import { redeemPromoCode } from "@/lib/promo";
import { formatPremiumUntil } from "@/lib/premium";

export default function PromoCodePage() {
  const { show } = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ until: string; days: number } | null>(null);

  const activate = async () => {
    const c = code.trim();
    if (!c) {
      show("Введите промокод");
      return;
    }
    setBusy(true);
    try {
      const res = await redeemPromoCode(c);
      setDone({ until: res.premiumUntil, days: res.days });
      show("Промокод активирован");
      setCode("");
    } catch (e) {
      show(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SubScreen title="Промокод">
      <div className="flex flex-col px-4 pt-6">
        {/* Иконка */}
        <div className="flex justify-center py-2">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-accent-press text-white shadow-lg shadow-accent/30">
            <Ticket size={40} weight="fill" />
          </span>
        </div>

        <h1 className="mt-4 text-center text-[24px] font-extrabold tracking-tight text-foreground">
          Активировать промокод
        </h1>
        <p className="mx-auto mt-1.5 max-w-xs text-center text-[14px] leading-relaxed text-muted">
          Введите промокод, чтобы получить HouseGram Premium со скидкой или
          бесплатно.
        </p>

        {done ? (
          /* Успех */
          <div className="mt-7 overflow-hidden rounded-[var(--radius-card)] bg-green-500/10 p-5 text-center ring-1 ring-green-500/30">
            <CheckCircle
              size={44}
              weight="fill"
              className="mx-auto text-green-600"
            />
            <p className="mt-2 text-[16px] font-bold text-foreground">
              Premium активирован
            </p>
            <p className="mt-1 text-[14px] text-muted">
              {done.days > 0 && `+${done.days} дн. · `}
              Активен до {formatPremiumUntil(done.until)}
            </p>
            <button
              type="button"
              onClick={() => setDone(null)}
              className="mt-4 inline-flex items-center justify-center rounded-2xl bg-surface-2 px-5 py-2.5 text-[15px] font-semibold text-accent transition active:scale-[0.98]"
            >
              Ввести ещё один
            </button>
          </div>
        ) : (
          /* Ввод кода */
          <div className="mt-7">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") void activate();
              }}
              placeholder="ВАШ ПРОМОКОД"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-2xl bg-surface px-4 py-4 text-center text-[18px] font-bold uppercase tracking-[0.15em] text-foreground placeholder:tracking-normal placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
              disabled={busy}
              onClick={activate}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-accent-press py-4 text-[17px] font-bold text-white shadow-lg shadow-accent/30 transition active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Sparkle size={22} weight="fill" />
                  Активировать
                </>
              )}
            </button>
          </div>
        )}

        <p className="mx-auto mt-4 max-w-xs pb-2 text-center text-[12px] leading-relaxed text-muted">
          Промокод можно активировать один раз. После активации Premium
          продлевается от текущей даты окончания.
        </p>
      </div>
    </SubScreen>
  );
}
