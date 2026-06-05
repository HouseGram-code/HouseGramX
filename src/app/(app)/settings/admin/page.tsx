"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  MagnifyingGlass,
  Prohibit,
  CheckCircle,
  Users,
  ProhibitInset,
  ArrowClockwise,
  At,
  Warning,
  ChatsCircle,
  ChatText,
  UsersThree,
  Megaphone,
  DownloadSimple,
  Wrench,
  SealCheck,
} from "@phosphor-icons/react";
import { SubScreen } from "@/components/SubScreen";
import { Avatar } from "@/components/Avatar";
import { BugHunterBadge } from "@/components/BugHunterBadge";
import { ConfirmSheet, type ConfirmConfig } from "@/components/ConfirmSheet";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth-store";
import { useMaintenance } from "@/lib/maintenance-store";
import {
  fetchAllUsers,
  fetchStats,
  setBanned,
  setBadge,
  setMaintenance,
  usersToCsv,
  isAdminEmail,
  type AdminUser,
  type AdminStats,
} from "@/lib/admin";
import { formatLastSeen } from "@/lib/utils";

type Filter = "all" | "active" | "banned";

export default function AdminPage() {
  const router = useRouter();
  const { user, ready, configured } = useAuth();
  const { show } = useToast();
  const maintenance = useMaintenance();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [serverStats, setServerStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  // Состояние формы режима техработ.
  const [maintMsg, setMaintMsg] = useState("");
  const [maintBusy, setMaintBusy] = useState(false);

  const isAdmin = isAdminEmail(user?.email);

  // Доступ только админу.
  useEffect(() => {
    if (ready && configured && !isAdmin) router.replace("/settings");
  }, [ready, configured, isAdmin, router]);

  // Подхватываем текст техработ из стора при первой загрузке.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMaintMsg(maintenance.message);
  }, [maintenance.message]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, s] = await Promise.all([fetchAllUsers(), fetchStats()]);
      setUsers(u);
      setServerStats(s);
    } catch {
      setError("Не удалось загрузить пользователей");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAdmin) void load();
  }, [isAdmin]);

  const stats = useMemo(() => {
    const banned = users.filter((u) => u.banned).length;
    return { total: users.length, banned, active: users.length - banned };
  }, [users]);

  const toggleMaintenance = async (enabled: boolean) => {
    setMaintBusy(true);
    try {
      const next = { enabled, message: maintMsg.trim() };
      await setMaintenance(next);
      maintenance.apply(next);
      show(enabled ? "Техработы включены" : "Техработы выключены");
    } catch (e) {
      show(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setMaintBusy(false);
    }
  };

  const exportCsv = () => {
    if (users.length === 0) {
      show("Список пуст");
      return;
    }
    const csv = usersToCsv(users);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `housegramx-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    show("Экспортировано");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "active" && u.banned) return false;
      if (filter === "banned" && !u.banned) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
      );
    });
  }, [users, query, filter]);

  const toggleBan = (target: AdminUser) => {
    const willBan = !target.banned;
    setConfirm({
      title: willBan ? "Забанить пользователя?" : "Разблокировать пользователя?",
      message: willBan
        ? `${target.name || "@" + target.username} больше не сможет отправлять сообщения.`
        : `${target.name || "@" + target.username} снова сможет писать сообщения.`,
      actions: [
        {
          label: willBan ? "Забанить" : "Разблокировать",
          danger: willBan,
          onClick: async () => {
            setBusyId(target.id);
            try {
              await setBanned(target.id, willBan);
              setUsers((prev) =>
                prev.map((u) =>
                  u.id === target.id ? { ...u, banned: willBan } : u
                )
              );
              show(willBan ? "Пользователь забанен" : "Пользователь разблокирован");
            } catch (e) {
              show(e instanceof Error ? e.message : "Ошибка");
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    });
  };

  const toggleBadge = (target: AdminUser) => {
    const has = !!target.badge;
    setConfirm({
      title: has ? "Снять галочку?" : "Выдать галочку «Багхантер»?",
      message: has
        ? `Снять отметку «Нашёл баги» у ${target.name || "@" + target.username}.`
        : `${target.name || "@" + target.username} получит галочку «Нашёл баги» — её увидят все на его профиле.`,
      actions: [
        {
          label: has ? "Снять" : "Выдать",
          danger: has,
          onClick: async () => {
            setBusyId(target.id);
            try {
              const next = has ? "" : "bug_hunter";
              await setBadge(target.id, next);
              setUsers((prev) =>
                prev.map((u) =>
                  u.id === target.id ? { ...u, badge: next } : u
                )
              );
              show(has ? "Галочка снята" : "Галочка выдана");
            } catch (e) {
              show(e instanceof Error ? e.message : "Ошибка");
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    });
  };

  if (!isAdmin) return null;

  return (
    <SubScreen
      title="Админ-панель"
      subtitle="Управление пользователями"
      action={
        <button
          type="button"
          onClick={load}
          aria-label="Обновить"
          className="flex h-9 w-9 items-center justify-center rounded-full text-accent transition active:opacity-60"
        >
          <ArrowClockwise size={20} weight="bold" />
        </button>
      }
    >
      {/* Режим технических работ */}
      <div className="px-3 pt-3">
        <div
          className={`overflow-hidden rounded-[var(--radius-card)] ring-1 transition-colors ${
            maintenance.enabled
              ? "bg-accent/10 ring-accent/40"
              : "bg-surface ring-transparent"
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                maintenance.enabled ? "bg-accent text-white" : "bg-surface-2 text-accent"
              }`}
            >
              <Wrench size={20} weight="fill" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-foreground">
                Технические работы
              </p>
              <p className="text-[12px] text-muted">
                {maintenance.enabled
                  ? "Сайт закрыт для пользователей"
                  : "Сайт доступен всем"}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                maintenance.enabled
                  ? "bg-accent text-white"
                  : "bg-green-500/15 text-green-600"
              }`}
            >
              {maintenance.enabled ? "ВКЛ" : "ВЫКЛ"}
            </span>
          </div>

          <div className="border-t border-separator px-4 py-3">
            <textarea
              value={maintMsg}
              onChange={(e) => setMaintMsg(e.target.value)}
              rows={2}
              placeholder="Сообщение для пользователей (необязательно)"
              className="w-full resize-none rounded-xl bg-surface-2 px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="button"
              disabled={maintBusy}
              onClick={() => toggleMaintenance(!maintenance.enabled)}
              className={`mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50 ${
                maintenance.enabled ? "bg-green-600" : "bg-accent"
              }`}
            >
              {maintBusy ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : maintenance.enabled ? (
                <>
                  <CheckCircle size={18} weight="bold" />
                  Выключить техработы
                </>
              ) : (
                <>
                  <Wrench size={18} weight="bold" />
                  Включить техработы
                </>
              )}
            </button>
          </div>
        </div>
        <p className="px-2 pt-2 text-xs leading-relaxed text-muted">
          При включении все пользователи увидят экран-заглушку. Вы как
          администратор сохраните полный доступ к сайту.
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-2 px-3 pt-4">
        <StatCard
          icon={Users}
          label="Всего"
          value={stats.total}
          tone="accent"
          delay={0}
        />
        <StatCard
          icon={CheckCircle}
          label="Активны"
          value={stats.active}
          tone="green"
          delay={0.05}
        />
        <StatCard
          icon={ProhibitInset}
          label="Забанены"
          value={stats.banned}
          tone="red"
          delay={0.1}
        />
      </div>

      {/* Статистика по чатам и сообщениям (с сервера) */}
      <div className="grid grid-cols-4 gap-2 px-3 pt-2">
        <StatCard
          icon={ChatsCircle}
          label="Чаты"
          value={serverStats?.chats ?? 0}
          tone="accent"
          delay={0.12}
          compact
        />
        <StatCard
          icon={UsersThree}
          label="Группы"
          value={serverStats?.groups ?? 0}
          tone="accent"
          delay={0.16}
          compact
        />
        <StatCard
          icon={Megaphone}
          label="Каналы"
          value={serverStats?.channels ?? 0}
          tone="accent"
          delay={0.2}
          compact
        />
        <StatCard
          icon={ChatText}
          label="Сообщ."
          value={serverStats?.messages ?? 0}
          tone="accent"
          delay={0.24}
          compact
        />
      </div>

      {/* Экспорт */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={exportCsv}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface py-3 text-[14px] font-semibold text-accent ring-1 ring-separator transition active:bg-surface-2"
        >
          <DownloadSimple size={18} weight="bold" />
          Экспорт пользователей (CSV)
        </button>
      </div>

      {/* Поиск */}
      <div className="px-3 pt-4">
        <div className="flex items-center gap-2.5 rounded-2xl bg-surface px-3.5 ring-1 ring-separator focus-within:ring-accent">
          <MagnifyingGlass size={20} weight="bold" className="shrink-0 text-muted-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Имя или @username"
            className="w-full bg-transparent py-3 text-[15px] text-foreground placeholder:text-muted-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex gap-2 px-3 pt-3">
        {(
          [
            ["all", "Все"],
            ["active", "Активные"],
            ["banned", "Забаненные"],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`relative rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              filter === key ? "text-white" : "text-muted"
            }`}
          >
            {filter === key && (
              <motion.span
                layoutId="admin-filter"
                className="absolute inset-0 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {/* Список */}
      <div className="px-3 pt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <Warning size={36} weight="fill" className="text-accent" />
            <p className="text-[14px] text-muted">{error}</p>
            <button
              type="button"
              onClick={load}
              className="rounded-full bg-surface px-5 py-2 text-[14px] font-semibold text-accent ring-1 ring-separator active:bg-surface-2"
            >
              Повторить
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-muted">
            <Users size={36} weight="duotone" />
            <p className="text-[14px]">Никого не найдено</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface">
            <AnimatePresence initial={false}>
              {filtered.map((u, i) => (
                <UserRow
                  key={u.id}
                  u={u}
                  last={i === filtered.length - 1}
                  busy={busyId === u.id}
                  isSelf={u.id === user?.id}
                  onToggle={() => toggleBan(u)}
                  onBadge={() => toggleBadge(u)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <p className="px-5 pt-3 text-xs leading-relaxed text-muted">
        Забаненные пользователи не могут отправлять сообщения, но остаются в
        системе. Действие обратимо.
      </p>

      <ConfirmSheet config={confirm} onClose={() => setConfirm(null)} />
    </SubScreen>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  delay,
  compact,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: "accent" | "green" | "red";
  delay: number;
  compact?: boolean;
}) {
  const color =
    tone === "green"
      ? "text-green-500"
      : tone === "red"
        ? "text-accent"
        : "text-accent";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className={`flex flex-col items-center gap-1 rounded-2xl bg-surface ${
        compact ? "py-3" : "py-4"
      }`}
    >
      <Icon size={compact ? 18 : 22} weight="fill" className={color} />
      <span
        className={`font-bold leading-none text-foreground ${
          compact ? "text-[17px]" : "text-[22px]"
        }`}
      >
        {value}
      </span>
      <span className={`text-muted ${compact ? "text-[11px]" : "text-[12px]"}`}>
        {label}
      </span>
    </motion.div>
  );
}

function UserRow({
  u,
  last,
  busy,
  isSelf,
  onToggle,
  onBadge,
}: {
  u: AdminUser;
  last: boolean;
  busy: boolean;
  isSelf: boolean;
  onToggle: () => void;
  onBadge: () => void;
}) {
  const initials =
    (u.name || u.username || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      className={`flex items-center gap-3 px-3 py-2.5 ${
        !last ? "border-b border-separator" : ""
      }`}
    >
      <div className="relative">
        <Avatar
          initials={initials}
          color={u.color || "#c0392b"}
          size={44}
          src={u.avatar || undefined}
        />
        {u.banned && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent ring-2 ring-surface">
            <Prohibit size={11} weight="bold" className="text-white" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-[15px] font-medium text-foreground">
          <span className="truncate">{u.name || "Без имени"}</span>
          {u.badge && <BugHunterBadge size={14} />}
          {isSelf && <span className="text-[12px] text-accent">(вы)</span>}
        </p>
        <p className="flex items-center gap-0.5 truncate text-[13px] text-muted">
          {u.username ? (
            <>
              <At size={12} weight="bold" />
              {u.username}
            </>
          ) : (
            formatLastSeen(u.last_seen ? Date.parse(u.last_seen) : undefined)
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={onBadge}
        disabled={busy}
        title={u.badge ? "Снять галочку" : "Выдать галочку «Нашёл баги»"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40 ${
          u.badge ? "bg-emerald-500/15 text-emerald-500" : "bg-surface-2 text-muted"
        }`}
      >
        <SealCheck size={18} weight={u.badge ? "fill" : "regular"} />
      </button>

      <button
        type="button"
        onClick={onToggle}
        disabled={busy || isSelf}
        className={`flex h-9 min-w-[96px] items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition active:scale-95 disabled:opacity-40 ${
          u.banned
            ? "bg-green-500/15 text-green-600"
            : "bg-accent/15 text-accent"
        }`}
      >
        {busy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : u.banned ? (
          <>
            <CheckCircle size={16} weight="bold" />
            Разбан
          </>
        ) : (
          <>
            <Prohibit size={16} weight="bold" />
            Бан
          </>
        )}
      </button>
    </motion.div>
  );
}
