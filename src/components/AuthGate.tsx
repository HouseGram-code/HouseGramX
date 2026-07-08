"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChatCircleDots,
  EnvelopeSimple,
  LockKey,
  User,
  At,
  Eye,
  EyeSlash,
  CheckCircle,
  ShieldCheck,
  Lightning,
  CaretLeft,
  Check,
  XCircle,
  CircleNotch,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth-store";
import { checkUsernameAvailable } from "@/lib/admin";
import { Avatar } from "@/components/Avatar";

type Mode = "signin" | "signup";

const PRESET_AVATARS = [
  "/avatars-presets/a1.jpg",
  "/avatars-presets/a2.jpg",
  "/avatars-presets/a3.jpg",
];

/** Экран входа/регистрации. Блокирует приложение, пока нет авторизации. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready, configured, signIn, signUp } = useAuth();

  if (!configured) return <>{children}</>;

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (user) return <>{children}</>;

  return <AuthForm signIn={signIn} signUp={signUp} />;
}

function passwordStrength(pw: string): { level: number; label: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-ZА-Я]/.test(pw) && /[a-zа-я]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^\w\s]/.test(pw)) score++;
  const level = Math.min(score, 4);
  const label = ["", "Слабый", "Средний", "Хороший", "Надёжный"][level];
  return { level, label };
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

function AuthForm({
  signIn,
  signUp,
}: {
  signIn: ReturnType<typeof useAuth>["signIn"];
  signUp: ReturnType<typeof useAuth>["signUp"];
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState(1); // шаг регистрации: 1 — данные, 2 — аватар
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  /** Статус проверки занятости username. */
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "free" | "taken"
  >("idle");

  const isSignup = mode === "signup";
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const nameOk = name.trim().length >= 2;
  const usernameOk = USERNAME_RE.test(username);
  const strength = passwordStrength(password);

  // Живая проверка занятости username (с debounce).
  const checkSeq = useRef(0);
  useEffect(() => {
    if (!isSignup || !usernameOk) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const seq = ++checkSeq.current;
    const t = setTimeout(async () => {
      const free = await checkUsernameAvailable(username.trim());
      // Игнорируем устаревшие ответы (пользователь продолжил печатать).
      if (seq !== checkSeq.current) return;
      setUsernameStatus(free ? "free" : "taken");
    }, 450);
    return () => clearTimeout(t);
  }, [username, usernameOk, isSignup]);

  const reset = () => {
    setError(null);
    setInfo(null);
  };

  const switchMode = () => {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setStep(1);
    reset();
  };

  // Шаг 1 регистрации → переход к выбору аватара.
  const goToAvatar = (e: FormEvent) => {
    e.preventDefault();
    if (!(emailOk && nameOk && usernameOk && password.length >= 6)) return;
    if (usernameStatus === "taken" || usernameStatus === "checking") return;
    reset();
    setStep(2);
  };

  // Вход.
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!(emailOk && password.length >= 6) || busy) return;
    setBusy(true);
    reset();
    const res = await signIn(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Не удалось войти");
  };

  // Завершение регистрации (с выбранным аватаром).
  const finishSignup = async () => {
    if (busy) return;
    setBusy(true);
    reset();
    const res = await signUp(email, password, name.trim(), {
      username: username.trim(),
      avatar,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Не удалось зарегистрироваться");
      setStep(1);
      return;
    }
    if (res.needsConfirmation) {
      setInfo("Письмо для подтверждения отправлено. Проверьте почту и войдите.");
      setMode("signin");
      setStep(1);
    }
  };

  return (
    <div className="auth-bg relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-orb absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/25 blur-3xl" />
        <div className="animate-orb-slow absolute bottom-0 right-0 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="animate-orb-slow absolute -left-10 top-1/3 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-card w-full max-w-sm rounded-[28px] p-6 sm:p-7"
      >
        {/* Логотип */}
        <div className="mb-7 flex flex-col items-center gap-3">
          <motion.div
            initial={{ scale: 0.7, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-accent to-[#7a0d0d] text-white shadow-xl"
          >
            <ChatCircleDots size={42} weight="fill" />
          </motion.div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">
            HouseGram<span className="text-accent">X</span>
          </h1>
          <p className="text-center text-[14px] text-muted">
            {!isSignup
              ? "С возвращением! Войдите в аккаунт"
              : step === 1
                ? "Создайте аккаунт за минуту"
                : "Выберите фото профиля"}
          </p>
        </div>

        {/* Переключатель — только на первом шаге */}
        {step === 1 && (
          <div className="mb-5 flex rounded-2xl bg-surface-2 p-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => mode !== m && switchMode()}
                className="relative flex-1 rounded-xl py-2.5 text-[14px] font-semibold transition-colors"
              >
                {mode === m && (
                  <motion.span
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-xl bg-surface shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className={mode === m ? "relative text-accent" : "relative text-muted"}>
                  {m === "signin" ? "Вход" : "Регистрация"}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ВХОД */}
        {!isSignup && (
          <form onSubmit={handleSignIn} className="flex flex-col gap-3">
            <Field
              icon={EnvelopeSimple}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              placeholder="E-mail"
              valid={email.length === 0 || emailOk}
            />
            <Field
              icon={LockKey}
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              placeholder="Пароль"
              trailing={<PwToggle show={showPw} onToggle={() => setShowPw((v) => !v)} />}
            />
            <Messages error={error} info={info} />
            <SubmitButton busy={busy} disabled={!(emailOk && password.length >= 6)}>
              Войти
            </SubmitButton>
          </form>
        )}

        {/* РЕГИСТРАЦИЯ — ШАГ 1 */}
        {isSignup && step === 1 && (
          <form onSubmit={goToAvatar} className="flex flex-col gap-3">
            <Field
              icon={User}
              type="text"
              autoComplete="name"
              value={name}
              onChange={setName}
              placeholder="Ваше имя"
              valid={name.length === 0 || nameOk}
            />
            <div>
              <Field
                icon={At}
                type="text"
                autoComplete="username"
                value={username}
                onChange={(v) => setUsername(v.replace(/\s/g, "").toLowerCase())}
                placeholder="username"
                valid={
                  username.length === 0 ||
                  (usernameOk && usernameStatus !== "taken")
                }
                trailing={<UsernameStatus ok={usernameOk} status={usernameStatus} />}
              />
              {username.length > 0 && !usernameOk ? (
                <p className="mt-1 px-1 text-[12px] text-accent">
                  Латиница, цифры и _, от 3 до 32 ��имволов
                </p>
              ) : usernameStatus === "taken" ? (
                <p className="mt-1 px-1 text-[12px] font-medium text-accent">
                  @{username} уже занят — выберите другой
                </p>
              ) : usernameStatus === "free" ? (
                <p className="mt-1 px-1 text-[12px] font-medium text-green-600">
                  @{username} свободен
                </p>
              ) : null}
            </div>
            <Field
              icon={EnvelopeSimple}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              placeholder="E-mail"
              valid={email.length === 0 || emailOk}
            />
            <Field
              icon={LockKey}
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              placeholder="Пароль"
              trailing={<PwToggle show={showPw} onToggle={() => setShowPw((v) => !v)} />}
            />
            {password.length > 0 && (
              <div className="px-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= strength.level
                          ? strength.level <= 1
                            ? "bg-red-500"
                            : strength.level === 2
                              ? "bg-orange-400"
                              : strength.level === 3
                                ? "bg-yellow-400"
                                : "bg-green-500"
                          : "bg-surface-2"
                      }`}
                    />
                  ))}
                </div>
                {strength.label && (
                  <p className="mt-1 text-[12px] text-muted">Надёжность: {strength.label}</p>
                )}
              </div>
            )}
            <Messages error={error} info={info} />
            <SubmitButton
              busy={usernameStatus === "checking"}
              disabled={
                !(emailOk && nameOk && usernameOk && password.length >= 6) ||
                usernameStatus === "taken" ||
                usernameStatus === "checking"
              }
            >
              Далее
            </SubmitButton>
          </form>
        )}

        {/* РЕГИСТРАЦИЯ — ШАГ 2: ВЫБОР АВАТАРА */}
        {isSignup && step === 2 && (
          <div className="flex flex-col items-center gap-5">
            <Avatar
              initials={name.trim().charAt(0).toUpperCase() || "?"}
              color="#c0392b"
              size={104}
              src={avatar || undefined}
              className="text-4xl shadow-lg"
            />

            <div className="flex items-center justify-center gap-4">
              {PRESET_AVATARS.map((src) => {
                const active = avatar === src;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setAvatar(active ? "" : src)}
                    className={`relative h-16 w-16 overflow-hidden rounded-full ring-2 transition ${
                      active ? "ring-accent" : "ring-separator"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="avatar" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    {active && (
                      <span className="absolute inset-0 flex items-center justify-center bg-accent/40">
                        <Check size={22} weight="bold" className="text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-[13px] text-muted">
              Выберите фото или пропустите — измените позже в профиле.
            </p>

            <Messages error={error} info={info} />

            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  reset();
                }}
                className="glass-field flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-foreground ring-1 ring-separator transition active:scale-95"
                aria-label="Назад"
              >
                <CaretLeft size={22} weight="bold" />
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={finishSignup}
                disabled={busy}
                className="btn-tg flex-1 py-3.5 text-[16px] disabled:opacity-40"
              >
                {busy ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Создать аккаунт"
                )}
              </motion.button>
            </div>
          </div>
        )}

        {/* Преимущества */}
        {step === 1 && (
          <div className="mt-7 flex items-center justify-center gap-5 text-muted">
            <span className="flex items-center gap-1.5 text-[12px]">
              <ShieldCheck size={16} weight="fill" className="text-accent" />
              Безопасно
            </span>
            <span className="flex items-center gap-1.5 text-[12px]">
              <Lightning size={16} weight="fill" className="text-accent" />
              Быстро
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Messages({ error, info }: { error: string | null; info: string | null }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="px-1 text-[13px] font-medium text-accent"
        >
          {error}
        </motion.p>
      )}
      {info && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 px-1 text-[13px] font-medium text-green-600"
        >
          <CheckCircle size={16} weight="fill" />
          {info}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function SubmitButton({
  busy,
  disabled,
  children,
}: {
  busy: boolean;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="submit"
      whileTap={{ scale: 0.98 }}
      disabled={disabled || busy}
      className="btn-tg mt-1 w-full py-3.5 text-[16px] disabled:opacity-40"
    >
      {busy ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        children
      )}
    </motion.button>
  );
}

function UsernameStatus({
  ok,
  status,
}: {
  ok: boolean;
  status: "idle" | "checking" | "free" | "taken";
}) {
  if (!ok || status === "idle") return null;
  if (status === "checking")
    return <CircleNotch size={20} weight="bold" className="animate-spin text-muted-2" />;
  if (status === "free")
    return <CheckCircle size={20} weight="fill" className="text-green-500" />;
  return <XCircle size={20} weight="fill" className="text-accent" />;
}

function PwToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? "Скрыть пароль" : "Показать пароль"}
      className="text-muted-2 transition active:opacity-60"
    >
      {show ? <EyeSlash size={20} /> : <Eye size={20} />}
    </button>
  );
}

function Field({
  icon: Icon,
  value,
  onChange,
  trailing,
  valid = true,
  ...rest
}: {
  icon: typeof User;
  value: string;
  onChange: (v: string) => void;
  trailing?: React.ReactNode;
  valid?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div
      className={`flex items-center gap-2.5 glass-field rounded-2xl px-3.5 ring-1 transition ${
        valid ? "ring-separator focus-within:ring-accent" : "ring-accent"
      }`}
    >
      <Icon size={20} weight="regular" className="shrink-0 text-muted-2" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent py-3.5 text-[16px] text-foreground placeholder:text-muted-2 focus:outline-none"
        {...rest}
      />
      {trailing}
    </div>
  );
}
