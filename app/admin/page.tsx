"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

type Booking = {
  id: string;
  weekend_start: string;
  weekend_end: string;
  church_name: string;
  contact_name: string;
  phone: string;
  email: string;
  people_count: number;
  status: string;
  created_at: string;
  notes?: string | null;
};

type BlockRow = {
  weekend_start: string;
  weekend_end: string;
  reason?: string | null;
  created_at?: string | null;
};

type DashboardView =
  | "pending"
  | "confirmed"
  | "rejected"
  | "blocked"
  | "total"
  | "availability";

type AvailabilityMonthSummary = {
  key: string;
  label: string;
  totalWeekends: number;
  free: number;
  pending: number;
  confirmed: number;
  blocked: number;
};

type MonthCalendarCell = {
  iso: string;
  day: number;
  inMonth: boolean;
  isWeekendManaged: boolean;
  weekendStatus: "FREE" | "PENDING" | "CONFIRMED" | "BLOCKED" | null;
};

function isAdminEmail(email: string | null | undefined) {
  const allowed = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return false;
  if (allowed.length === 0) return false;

  return allowed.includes(email.toLowerCase());
}

function btnBase() {
  return "inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium transition whitespace-nowrap";
}

function formatWeekendRangeShort(startISO: string, endISO: string) {
  if (
    !startISO ||
    !endISO ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startISO) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endISO)
  ) {
    return "-";
  }

  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];

  const [startYear, startMonth, startDay] = startISO.split("-").map(Number);
  const [endYear, endMonth, endDay] = endISO.split("-").map(Number);

  if (startYear === endYear && startMonth === endMonth) {
    return `${String(startDay).padStart(2, "0")}–${String(endDay).padStart(2, "0")} ${meses[startMonth - 1]} ${startYear}`;
  }

  return `${String(startDay).padStart(2, "0")} ${meses[startMonth - 1]} ${startYear} → ${String(endDay).padStart(2, "0")} ${meses[endMonth - 1]} ${endYear}`;
}

function formatDateTimeBR(dateLike: string) {
  try {
    const dt = new Date(dateLike);
    if (isNaN(dt.getTime())) return "-";
    return dt.toLocaleString("pt-BR");
  } catch {
    return "-";
  }
}

function statusLabel(status: string) {
  const up = (status || "").toUpperCase();
  if (up === "PENDING") return "PENDENTE";
  if (up === "CONFIRMED") return "CONFIRMADO";
  if (up === "REJECTED") return "REJEITADO";
  if (up === "CANCELLED") return "CANCELADO";
  return up || "-";
}

function pillClass(status: string) {
  const up = (status || "").toUpperCase();
  const base = "inline-flex items-center rounded-full border px-3 py-1 text-xs";

  if (up === "CONFIRMED") {
    return `${base} border-cyan-500/25 bg-cyan-500/10 text-cyan-200`;
  }

  if (up === "PENDING") {
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-200`;
  }

  if (up === "REJECTED" || up === "CANCELLED") {
    return `${base} border-rose-500/25 bg-rose-500/10 text-rose-200`;
  }

  return `${base} border-white/10 bg-white/5 text-white/80`;
}

function getMonthKeyFromISO(iso: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  return iso.slice(0, 7);
}

function formatMonthLabel(monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;

  const [year, month] = monthKey.split("-").map(Number);
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  return `${meses[month - 1]} de ${year}`;
}

function countWeekendsInMonth(monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return 0;

  const [year, month] = monthKey.split("-").map(Number);
  const dt = new Date(year, month - 1, 1);
  const month0 = dt.getMonth();

  let count = 0;

  while (dt.getMonth() === month0) {
    if (dt.getDay() === 5) {
      count += 1;
    }
    dt.setDate(dt.getDate() + 1);
  }

  return count;
}

function addDaysISO(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const dt = new Date(year, month - 1, day);
  dt.setDate(dt.getDate() + days);

  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function weekendStatusClass(
  status: "FREE" | "PENDING" | "CONFIRMED" | "BLOCKED" | null
) {
  if (status === "FREE") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "PENDING") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  }

  if (status === "CONFIRMED") {
    return "border-cyan-500/25 bg-cyan-500/10 text-cyan-200";
  }

  if (status === "BLOCKED") {
    return "border-white/15 bg-white/10 text-white/80";
  }

  return "border-white/10 bg-black/20 text-white/70";
}

function cardClass(
  active: boolean,
  tone: "amber" | "cyan" | "rose" | "neutral"
) {
  const base =
    "rounded-3xl border p-5 text-left transition cursor-pointer hover:translate-y-[-1px]";

  if (tone === "amber") {
    return active
      ? `${base} border-amber-400/40 bg-amber-500/15 ring-1 ring-amber-300/30`
      : `${base} border-amber-500/20 bg-amber-500/10`;
  }

  if (tone === "cyan") {
    return active
      ? `${base} border-cyan-400/40 bg-cyan-500/15 ring-1 ring-cyan-300/30`
      : `${base} border-cyan-500/20 bg-cyan-500/10`;
  }

  if (tone === "rose") {
    return active
      ? `${base} border-rose-400/40 bg-rose-500/15 ring-1 ring-rose-300/30`
      : `${base} border-rose-500/20 bg-rose-500/10`;
  }

  return active
    ? `${base} border-white/20 bg-white/10 ring-1 ring-white/20`
    : `${base} border-white/10 bg-white/5`;
}

function metricLabelClass(tone: "amber" | "cyan" | "rose" | "neutral") {
  if (tone === "amber") return "text-amber-200/80";
  if (tone === "cyan") return "text-cyan-200/80";
  if (tone === "rose") return "text-rose-200/80";
  return "text-white/70";
}

function metricValueClass(tone: "amber" | "cyan" | "rose" | "neutral") {
  if (tone === "amber") return "text-amber-100";
  if (tone === "cyan") return "text-cyan-100";
  if (tone === "rose") return "text-rose-100";
  return "text-white";
}

function metricDescClass(tone: "amber" | "cyan" | "rose" | "neutral") {
  if (tone === "amber") return "text-amber-200/70";
  if (tone === "cyan") return "text-cyan-200/70";
  if (tone === "rose") return "text-rose-200/70";
  return "text-white/50";
}

export default function AdminDashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState<DashboardView>("availability");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError("");

    const [{ data: bookingRows, error: bookingError }, { data: blockRows, error: blockError }] =
      await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, weekend_start, weekend_end, church_name, contact_name, phone, email, people_count, status, created_at, notes"
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("blocks")
          .select("weekend_start, weekend_end, reason, created_at")
          .order("weekend_start", { ascending: true }),
      ]);

    if (bookingError) {
      setError(bookingError.message);
      setBookings([]);
      setBlocks([]);
      return;
    }

    if (blockError) {
      setError(blockError.message);
      setBookings([]);
      setBlocks([]);
      return;
    }

    setBookings((bookingRows as Booking[]) || []);
    setBlocks((blockRows as BlockRow[]) || []);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      setError("");

      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const email = user.email ?? null;
      setUserEmail(email);

      if (!isAdminEmail(email)) {
        setError("Seu usuário não tem permissão para acessar a área administrativa.");
        setLoading(false);
        return;
      }

      await loadData();
      setLoading(false);
    }

    init();
  }, [router, supabase, loadData]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function updateBookingStatus(
    id: string,
    status: "CONFIRMED" | "REJECTED" | "PENDING" | "CANCELLED"
  ) {
    try {
      setActionLoadingId(id);
      setError("");

      const response = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Não foi possível atualizar o status.");
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar solicitação.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function unblockWeekend(weekendStartISO: string) {
    try {
      setActionLoadingId(weekendStartISO);
      setError("");

      const response = await fetch("/api/blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekendStartISO }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Não foi possível desbloquear a data.");
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desbloquear data.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const stats = useMemo(() => {
    const pending = bookings.filter((b) => b.status?.toUpperCase() === "PENDING").length;
    const confirmed = bookings.filter((b) => b.status?.toUpperCase() === "CONFIRMED").length;
    const rejected = bookings.filter((b) => {
      const up = b.status?.toUpperCase();
      return up === "REJECTED" || up === "CANCELLED";
    }).length;
    const blocked = blocks.length;
    const total = bookings.length;

    return { pending, confirmed, rejected, blocked, total };
  }, [bookings, blocks]);

  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status?.toUpperCase() === "PENDING"),
    [bookings]
  );

  const confirmedBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status?.toUpperCase() === "CONFIRMED")
        .sort((a, b) => a.weekend_start.localeCompare(b.weekend_start)),
    [bookings]
  );

  const rejectedBookings = useMemo(
    () =>
      bookings
        .filter((b) => {
          const up = b.status?.toUpperCase();
          return up === "REJECTED" || up === "CANCELLED";
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [bookings]
  );

  const totalBookings = useMemo(
    () =>
      [...bookings].sort((a, b) => {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return bDate - aDate;
      }),
    [bookings]
  );

  const availabilitySummary = useMemo<AvailabilityMonthSummary[]>(() => {
    const today = new Date();
    const monthsMap = new Map<string, AvailabilityMonthSummary>();

    for (let i = 0; i < 12; i += 1) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthsMap.set(key, {
        key,
        label: formatMonthLabel(key),
        totalWeekends: countWeekendsInMonth(key),
        free: 0,
        pending: 0,
        confirmed: 0,
        blocked: 0,
      });
    }

    const weekendStatusByMonth = new Map<
      string,
      Map<string, "FREE" | "PENDING" | "CONFIRMED" | "BLOCKED">
    >();

    function registerWeekend(
      monthKey: string,
      weekendStartISO: string,
      status: "FREE" | "PENDING" | "CONFIRMED" | "BLOCKED"
    ) {
      if (!monthsMap.has(monthKey)) return;

      if (!weekendStatusByMonth.has(monthKey)) {
        weekendStatusByMonth.set(monthKey, new Map());
      }

      const monthMap = weekendStatusByMonth.get(monthKey)!;
      const current = monthMap.get(weekendStartISO);

      const priority = {
        FREE: 0,
        PENDING: 1,
        CONFIRMED: 2,
        BLOCKED: 3,
      };

      if (!current || priority[status] > priority[current]) {
        monthMap.set(weekendStartISO, status);
      }
    }

    for (const booking of bookings) {
      const monthKey = getMonthKeyFromISO(booking.weekend_start);
      const up = booking.status?.toUpperCase();

      if (up === "CONFIRMED") {
        registerWeekend(monthKey, booking.weekend_start, "CONFIRMED");
      } else if (up === "PENDING") {
        registerWeekend(monthKey, booking.weekend_start, "PENDING");
      }
    }

    for (const block of blocks) {
      const monthKey = getMonthKeyFromISO(block.weekend_start);
      registerWeekend(monthKey, block.weekend_start, "BLOCKED");
    }

    for (const [monthKey, summary] of monthsMap.entries()) {
      const monthMap = weekendStatusByMonth.get(monthKey);

      if (!monthMap) {
        summary.free = summary.totalWeekends;
        continue;
      }

      for (const status of monthMap.values()) {
        if (status === "PENDING") summary.pending += 1;
        if (status === "CONFIRMED") summary.confirmed += 1;
        if (status === "BLOCKED") summary.blocked += 1;
      }

      summary.free = Math.max(
        0,
        summary.totalWeekends - summary.pending - summary.confirmed - summary.blocked
      );
    }

    return Array.from(monthsMap.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [bookings, blocks]);

  const currentPanelItems = useMemo(() => {
    if (activeView === "pending") return pendingBookings;
    if (activeView === "confirmed") return confirmedBookings;
    if (activeView === "rejected") return rejectedBookings;
    if (activeView === "total") return totalBookings;
    return [];
  }, [activeView, pendingBookings, confirmedBookings, rejectedBookings, totalBookings]);

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    return bookings.find((b) => b.id === selectedBookingId) ?? null;
  }, [bookings, selectedBookingId]);

  useEffect(() => {
    if (activeView === "blocked" || activeView === "availability") {
      setSelectedBookingId(null);
      return;
    }

    if (currentPanelItems.length === 0) {
      setSelectedBookingId(null);
      return;
    }

    const exists = currentPanelItems.some((item) => item.id === selectedBookingId);

    if (!selectedBookingId || !exists) {
      setSelectedBookingId(currentPanelItems[0].id);
    }
  }, [activeView, currentPanelItems, selectedBookingId]);

  useEffect(() => {
    if (!availabilitySummary.length) return;

    const exists = availabilitySummary.some((month) => month.key === selectedMonthKey);

    if (!selectedMonthKey || !exists) {
      setSelectedMonthKey(availabilitySummary[0].key);
    }
  }, [availabilitySummary, selectedMonthKey]);

  const selectedAvailabilityMonth = useMemo(
    () => availabilitySummary.find((month) => month.key === selectedMonthKey) ?? null,
    [availabilitySummary, selectedMonthKey]
  );

  const availabilityCalendar = useMemo(() => {
    if (!selectedMonthKey) {
      return {
        cells: [] as MonthCalendarCell[],
        weekends: [] as {
          weekendStartISO: string;
          weekendEndISO: string;
          status: "FREE" | "PENDING" | "CONFIRMED" | "BLOCKED";
        }[],
      };
    }

    const [year, month] = selectedMonthKey.split("-").map(Number);
    if (!year || !month) {
      return {
        cells: [] as MonthCalendarCell[],
        weekends: [] as {
          weekendStartISO: string;
          weekendEndISO: string;
          status: "FREE" | "PENDING" | "CONFIRMED" | "BLOCKED";
        }[],
      };
    }

    const weekendStatusMap = new Map<
      string,
      "FREE" | "PENDING" | "CONFIRMED" | "BLOCKED"
    >();

    function setWeekendStatus(
      weekendStartISO: string,
      status: "FREE" | "PENDING" | "CONFIRMED" | "BLOCKED"
    ) {
      if (getMonthKeyFromISO(weekendStartISO) !== selectedMonthKey) return;

      const current = weekendStatusMap.get(weekendStartISO);
      const priority = {
        FREE: 0,
        PENDING: 1,
        CONFIRMED: 2,
        BLOCKED: 3,
      };

      if (!current || priority[status] > priority[current]) {
        weekendStatusMap.set(weekendStartISO, status);
      }
    }

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const cursorFriday = new Date(year, month - 1, 1);
    while (cursorFriday.getDay() !== 5) {
      cursorFriday.setDate(cursorFriday.getDate() + 1);
    }

    while (cursorFriday <= lastDay) {
      const iso = `${cursorFriday.getFullYear()}-${String(cursorFriday.getMonth() + 1).padStart(2, "0")}-${String(cursorFriday.getDate()).padStart(2, "0")}`;
      setWeekendStatus(iso, "FREE");
      cursorFriday.setDate(cursorFriday.getDate() + 7);
    }

    for (const booking of bookings) {
      const up = booking.status?.toUpperCase();
      if (up === "CONFIRMED") {
        setWeekendStatus(booking.weekend_start, "CONFIRMED");
      } else if (up === "PENDING") {
        setWeekendStatus(booking.weekend_start, "PENDING");
      }
    }

    for (const block of blocks) {
      setWeekendStatus(block.weekend_start, "BLOCKED");
    }

    const gridStart = new Date(firstDay);
    gridStart.setDate(gridStart.getDate() - firstDay.getDay());

    const gridEnd = new Date(lastDay);
    gridEnd.setDate(gridEnd.getDate() + (6 - lastDay.getDay()));

    const cells: MonthCalendarCell[] = [];
    const cursor = new Date(gridStart);

    while (cursor <= gridEnd) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const inMonth = cursor.getMonth() === month - 1;

      let weekendStatus: "FREE" | "PENDING" | "CONFIRMED" | "BLOCKED" | null = null;
      let isWeekendManaged = false;

      const day = cursor.getDay();
      if (day === 5 || day === 6 || day === 0) {
        let fridayISO = iso;
        if (day === 6) fridayISO = addDaysISO(iso, -1);
        if (day === 0) fridayISO = addDaysISO(iso, -2);

        if (weekendStatusMap.has(fridayISO)) {
          weekendStatus = weekendStatusMap.get(fridayISO)!;
          isWeekendManaged = true;
        }
      }

      cells.push({
        iso,
        day: cursor.getDate(),
        inMonth,
        isWeekendManaged,
        weekendStatus,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    const weekends = Array.from(weekendStatusMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekendStartISO, status]) => ({
        weekendStartISO,
        weekendEndISO: addDaysISO(weekendStartISO, 2),
        status,
      }));

    return { cells, weekends };
  }, [selectedMonthKey, bookings, blocks]);

  const todayISO = new Date().toISOString().slice(0, 10);

  const isSelectedBookingFutureConfirmed =
    selectedBooking?.status?.toUpperCase() === "CONFIRMED" &&
    selectedBooking.weekend_start >= todayISO;

  const activePanelTitle =
    activeView === "pending"
      ? "Pendentes"
      : activeView === "confirmed"
        ? "Confirmadas"
        : activeView === "rejected"
          ? "Rejeitadas"
          : activeView === "blocked"
            ? "Bloqueadas"
            : activeView === "availability"
              ? "Disponibilidade mensal"
              : "Todas as solicitações";

  const activePanelDescription =
    activeView === "pending"
      ? "Solicitações aguardando decisão."
      : activeView === "confirmed"
        ? "Reservas aprovadas."
        : activeView === "rejected"
          ? "Solicitações encerradas."
          : activeView === "blocked"
            ? "Fins de semana bloqueados manualmente."
            : activeView === "availability"
              ? "Resumo de datas livres, ocupação e visualização mensal."
              : "Histórico completo das solicitações.";

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <p className="text-white/70">Carregando dashboard...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Dashboard administrativo
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Logado como <span className="text-white">{userEmail}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/agenda"
            className={`${btnBase()} border-white/15 bg-white/5 text-white/80 hover:bg-white/10`}
          >
            Ir para agenda
          </Link>

          <button
            onClick={onRefresh}
            disabled={refreshing}
            className={`${btnBase()} border-white/15 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-60`}
          >
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>

          <button
            onClick={handleLogout}
            className={`${btnBase()} border-white/15 bg-black/30 text-white/80 hover:bg-white/10`}
          >
            Sair
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Erro: {error}
        </p>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <button
          type="button"
          onClick={() => setActiveView("pending")}
          className={cardClass(activeView === "pending", "amber")}
        >
          <p className={metricLabelClass("amber")}>Pendentes</p>
          <h2 className={`mt-2 text-3xl font-semibold ${metricValueClass("amber")}`}>
            {stats.pending}
          </h2>
          <p className={`mt-2 text-xs ${metricDescClass("amber")}`}>
            Solicitações aguardando ação.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("confirmed")}
          className={cardClass(activeView === "confirmed", "cyan")}
        >
          <p className={metricLabelClass("cyan")}>Confirmadas</p>
          <h2 className={`mt-2 text-3xl font-semibold ${metricValueClass("cyan")}`}>
            {stats.confirmed}
          </h2>
          <p className={`mt-2 text-xs ${metricDescClass("cyan")}`}>
            Reservas já aprovadas.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("rejected")}
          className={cardClass(activeView === "rejected", "rose")}
        >
          <p className={metricLabelClass("rose")}>Rejeitadas</p>
          <h2 className={`mt-2 text-3xl font-semibold ${metricValueClass("rose")}`}>
            {stats.rejected}
          </h2>
          <p className={`mt-2 text-xs ${metricDescClass("rose")}`}>
            Solicitações encerradas sem confirmação.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("blocked")}
          className={cardClass(activeView === "blocked", "neutral")}
        >
          <p className={metricLabelClass("neutral")}>Bloqueadas</p>
          <h2 className={`mt-2 text-3xl font-semibold ${metricValueClass("neutral")}`}>
            {stats.blocked}
          </h2>
          <p className={`mt-2 text-xs ${metricDescClass("neutral")}`}>
            Datas bloqueadas manualmente.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("total")}
          className={cardClass(activeView === "total", "neutral")}
        >
          <p className={metricLabelClass("neutral")}>Total</p>
          <h2 className={`mt-2 text-3xl font-semibold ${metricValueClass("neutral")}`}>
            {stats.total}
          </h2>
          <p className={`mt-2 text-xs ${metricDescClass("neutral")}`}>
            Histórico completo.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("availability")}
          className={cardClass(activeView === "availability", "neutral")}
        >
          <p className={metricLabelClass("neutral")}>Disponibilidade</p>
          <h2 className={`mt-2 text-3xl font-semibold ${metricValueClass("neutral")}`}>
            {availabilitySummary.reduce((acc, month) => acc + month.free, 0)}
          </h2>
          <p className={`mt-2 text-xs ${metricDescClass("neutral")}`}>
            Datas livres nos próximos meses.
          </p>
        </button>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{activePanelTitle}</h2>
            <p className="mt-1 text-sm text-white/60">{activePanelDescription}</p>
          </div>

          <div className="text-sm text-white/50">
            {activeView === "availability"
              ? `${availabilitySummary.length} mês(es)`
              : activeView === "blocked"
                ? `${blocks.length} bloqueio(s)`
                : `${currentPanelItems.length} item(ns)`}
          </div>
        </div>

        {activeView === "blocked" ? (
          <div className="mt-5 space-y-3">
            {blocks.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                Nenhum fim de semana bloqueado.
              </div>
            ) : (
              blocks.map((block) => (
                <div
                  key={block.weekend_start}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {formatWeekendRangeShort(block.weekend_start, block.weekend_end)}
                      </p>
                      <p className="mt-2 text-sm text-white/70 break-words">
                        {block.reason?.trim() || "Sem observação informada."}
                      </p>
                      {block.created_at ? (
                        <p className="mt-2 text-xs text-white/50">
                          Bloqueado em {formatDateTimeBR(block.created_at)}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/agenda?weekend=${block.weekend_start}`}
                        className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
                      >
                        Ver na agenda
                      </Link>

                      <button
                        type="button"
                        disabled={actionLoadingId === block.weekend_start}
                        onClick={() => unblockWeekend(block.weekend_start)}
                        className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-60"
                      >
                        {actionLoadingId === block.weekend_start
                          ? "Desbloqueando..."
                          : "Desbloquear"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {activeView === "availability" ? (
          <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              {availabilitySummary.map((month) => {
                const isActive = month.key === selectedMonthKey;

                return (
                  <button
                    key={month.key}
                    type="button"
                    onClick={() => setSelectedMonthKey(month.key)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? "border-white/20 bg-white/10 ring-1 ring-white/20"
                        : "border-white/10 bg-black/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{month.label}</p>
                        <p className="mt-1 text-xs text-white/50">
                          {month.totalWeekends} fim(ns) de semana no mês
                        </p>
                      </div>

                      <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                        {month.free} livre(s)
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2 text-emerald-200">
                        Livres: {month.free}
                      </div>
                      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2 text-amber-200">
                        Pend.: {month.pending}
                      </div>
                      <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-2 text-cyan-200">
                        Conf.: {month.confirmed}
                      </div>
                      <div className="rounded-xl border border-white/15 bg-white/10 p-2 text-white/80">
                        Bloq.: {month.blocked}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              {!selectedAvailabilityMonth ? (
                <p className="text-sm text-white/70">Selecione um mês para ver o resumo.</p>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    Relatório mensal
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold text-white">
                    {selectedAvailabilityMonth.label}
                  </h3>

                  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs text-white/50">Fins de semana</p>
                      <p className="mt-1 text-2xl font-semibold text-white">
                        {selectedAvailabilityMonth.totalWeekends}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                      <p className="text-xs text-emerald-200/70">Livres</p>
                      <p className="mt-1 text-2xl font-semibold text-emerald-100">
                        {selectedAvailabilityMonth.free}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
                      <p className="text-xs text-amber-200/70">Pendentes</p>
                      <p className="mt-1 text-2xl font-semibold text-amber-100">
                        {selectedAvailabilityMonth.pending}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <p className="text-xs text-white/60">Bloqueados</p>
                      <p className="mt-1 text-2xl font-semibold text-white">
                        {selectedAvailabilityMonth.blocked}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/70">
                      Ocupação do mês:{" "}
                      <span className="font-medium text-white">
                        {selectedAvailabilityMonth.totalWeekends > 0
                          ? Math.round(
                              ((selectedAvailabilityMonth.pending +
                                selectedAvailabilityMonth.confirmed +
                                selectedAvailabilityMonth.blocked) /
                                selectedAvailabilityMonth.totalWeekends) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </p>

                    <p className="mt-2 text-sm text-white/60">
                      Visualização rápida do mês sem precisar abrir a agenda.
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">Calendário do mês</p>
                      <Link
                        href="/admin/agenda"
                        className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
                      >
                        Abrir agenda completa
                      </Link>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2 text-emerald-200">
                        Livre
                      </div>

                      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2 text-amber-200">
                        Pendente
                      </div>

                      <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-2 text-cyan-200">
                        Confirmado
                      </div>

                      <div className="rounded-xl border border-white/15 bg-white/10 p-2 text-white/80">
                        Bloqueado
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="grid grid-cols-7 gap-2 text-center text-xs text-white/50">
                        <div>D</div>
                        <div>S</div>
                        <div>T</div>
                        <div>Q</div>
                        <div>Q</div>
                        <div>S</div>
                        <div>S</div>
                      </div>

                      <div className="mt-2 grid grid-cols-7 gap-2">
                        {availabilityCalendar.cells.map((cell) => (
                          <div
                            key={cell.iso}
                            className={`rounded-xl border px-2 py-3 text-center text-sm ${
                              cell.inMonth
                                ? weekendStatusClass(cell.weekendStatus)
                                : "border-white/5 bg-black/10 text-white/25"
                            } ${
                              cell.isWeekendManaged ? "ring-1 ring-white/10" : ""
                            }`}
                            title={cell.iso}
                          >
                            {cell.day}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="text-sm font-medium text-white">
                        Resumo dos fins de semana
                      </p>

                      <div className="mt-3 space-y-2">
                        {availabilityCalendar.weekends.length === 0 ? (
                          <p className="text-sm text-white/60">
                            Nenhum fim de semana disponível neste mês.
                          </p>
                        ) : (
                          availabilityCalendar.weekends.map((weekend) => (
                            <div
                              key={weekend.weekendStartISO}
                              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="text-sm text-white">
                                  {formatWeekendRangeShort(
                                    weekend.weekendStartISO,
                                    weekend.weekendEndISO
                                  )}
                                </p>
                              </div>

                              <span
                                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${
                                  weekend.status === "FREE"
                                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                                    : weekend.status === "PENDING"
                                      ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
                                      : weekend.status === "CONFIRMED"
                                        ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-200"
                                        : "border-white/15 bg-white/10 text-white/80"
                                }`}
                              >
                                {weekend.status === "FREE"
                                  ? "LIVRE"
                                  : weekend.status === "PENDING"
                                    ? "PENDENTE"
                                    : weekend.status === "CONFIRMED"
                                      ? "CONFIRMADO"
                                      : "BLOQUEADO"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        {activeView !== "blocked" && activeView !== "availability" ? (
          <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              {currentPanelItems.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                  Nenhum item encontrado nesta categoria.
                </div>
              ) : (
                currentPanelItems.map((booking) => {
                  const isSelected = booking.id === selectedBookingId;

                  return (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => setSelectedBookingId(booking.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-white/20 bg-white/10 ring-1 ring-white/20"
                          : "border-white/10 bg-black/20 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{booking.church_name}</p>
                          <p className="mt-1 text-sm text-white/70">
                            {formatWeekendRangeShort(
                              booking.weekend_start,
                              booking.weekend_end
                            )}
                          </p>
                          <p className="mt-1 text-xs text-white/50">
                            {booking.contact_name} • {booking.phone}
                          </p>
                        </div>

                        <span className={pillClass(booking.status)}>
                          {statusLabel(booking.status)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              {!selectedBooking ? (
                <p className="text-sm text-white/70">Selecione um item para ver os detalhes.</p>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/50">Detalhes</p>
                      <h3 className="mt-1 text-2xl font-semibold text-white">
                        {selectedBooking.church_name}
                      </h3>
                      <p className="mt-1 text-sm text-white/70">
                        {formatWeekendRangeShort(
                          selectedBooking.weekend_start,
                          selectedBooking.weekend_end
                        )}
                      </p>
                    </div>

                    <span className={pillClass(selectedBooking.status)}>
                      {statusLabel(selectedBooking.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs text-white/50">Responsável</p>
                      <p className="mt-1 text-sm text-white">{selectedBooking.contact_name}</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs text-white/50">Telefone</p>
                      <p className="mt-1 text-sm text-white">{selectedBooking.phone}</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs text-white/50">E-mail</p>
                      <p className="mt-1 text-sm break-words text-white">
                        {selectedBooking.email || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs text-white/50">Quantidade de pessoas</p>
                      <p className="mt-1 text-sm text-white">
                        {selectedBooking.people_count ?? "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/50">Observações</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">
                      {selectedBooking.notes?.trim() || "Nenhuma observação informada."}
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/50">Solicitado em</p>
                    <p className="mt-1 text-sm text-white">
                      {formatDateTimeBR(selectedBooking.created_at)}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/agenda?weekend=${selectedBooking.weekend_start}`}
                      className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
                    >
                      Ver na agenda
                    </Link>

                    {selectedBooking.status?.toUpperCase() === "PENDING" ? (
                      <>
                        <button
                          type="button"
                          disabled={actionLoadingId === selectedBooking.id}
                          onClick={() =>
                            updateBookingStatus(selectedBooking.id, "CONFIRMED")
                          }
                          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
                        >
                          {actionLoadingId === selectedBooking.id
                            ? "Confirmando..."
                            : "Confirmar"}
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId === selectedBooking.id}
                          onClick={() =>
                            updateBookingStatus(selectedBooking.id, "REJECTED")
                          }
                          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-60"
                        >
                          {actionLoadingId === selectedBooking.id
                            ? "Rejeitando..."
                            : "Rejeitar"}
                        </button>
                      </>
                    ) : null}

                    {(selectedBooking.status?.toUpperCase() === "REJECTED" ||
                      selectedBooking.status?.toUpperCase() === "CANCELLED") ? (
                      <button
                        type="button"
                        disabled={actionLoadingId === selectedBooking.id}
                        onClick={() => updateBookingStatus(selectedBooking.id, "PENDING")}
                        className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-60"
                      >
                        {actionLoadingId === selectedBooking.id
                          ? "Reabrindo..."
                          : "Voltar para pendente"}
                      </button>
                    ) : null}

                    {isSelectedBookingFutureConfirmed ? (
                      <>
                        <button
                          type="button"
                          disabled={actionLoadingId === selectedBooking.id}
                          onClick={() => updateBookingStatus(selectedBooking.id, "PENDING")}
                          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-60"
                        >
                          {actionLoadingId === selectedBooking.id
                            ? "Reabrindo..."
                            : "Reabrir como pendente"}
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId === selectedBooking.id}
                          onClick={() => updateBookingStatus(selectedBooking.id, "CANCELLED")}
                          className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-60"
                        >
                          {actionLoadingId === selectedBooking.id
                            ? "Cancelando..."
                            : "Cancelar reserva"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}