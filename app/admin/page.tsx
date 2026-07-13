"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";

type Booking = {
  id: string;
  weekend_start: string;
  weekend_end: string;
  church_name: string;
  contact_name: string;
  phone: string;
  email: string;
  people_count: number;
  status: BookingStatus | string;
  created_at: string;
  notes?: string | null;
};

type BlockRow = {
  weekend_start: string;
  weekend_end: string;
  reason?: string | null;
};

type WeekendState = "FREE" | "PENDING" | "CONFIRMED" | "BLOCKED";

type CalendarCell = {
  iso: string;
  day: number;
  inMonth: boolean;
  weekendStart: string | null;
  status: WeekendState | null;
};

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS = [
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

function formatISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function parseISO(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDaysISO(value: string, days: number) {
  const date = parseISO(value);
  date.setDate(date.getDate() + days);
  return formatISO(date);
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "-";
  return parseISO(value).toLocaleDateString(
    "pt-BR",
    options ?? { day: "2-digit", month: "short", year: "numeric" }
  );
}

function formatWeekendRange(start: string, end: string) {
  if (!start || !end) return "-";
  const startDate = parseISO(start);
  const endDate = parseISO(end);

  if (
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth()
  ) {
    return `${String(startDate.getDate()).padStart(2, "0")}–${String(endDate.getDate()).padStart(
      2,
      "0"
    )} de ${MONTHS[startDate.getMonth()].toLowerCase()} de ${startDate.getFullYear()}`;
  }

  return `${formatDate(start)} a ${formatDate(end)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function whatsappHref(booking: Booking) {
  const phone = normalizePhone(booking.phone);
  const message = `Olá, ${booking.contact_name}! Recebemos a solicitação de ${booking.church_name} para ${formatWeekendRange(
    booking.weekend_start,
    booking.weekend_end
  )}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function stateLabel(status: WeekendState) {
  if (status === "FREE") return "Livre";
  if (status === "PENDING") return "Solicitação pendente";
  if (status === "CONFIRMED") return "Reserva confirmada";
  return "Data bloqueada";
}

function stateDot(status: WeekendState) {
  if (status === "FREE") return "bg-emerald-400";
  if (status === "PENDING") return "bg-amber-400";
  if (status === "CONFIRMED") return "bg-cyan-400";
  return "bg-white/45";
}

function cellClass(status: WeekendState | null, selected: boolean, inMonth: boolean) {
  const base =
    "relative min-h-11 rounded-xl border text-sm transition sm:min-h-12 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";

  if (!inMonth) return `${base} border-white/5 bg-black/10 text-white/20`;
  if (!status) return `${base} border-white/5 bg-black/15 text-white/45`;

  const ring = selected ? " ring-2 ring-white/55" : "";

  if (status === "FREE") {
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15${ring}`;
  }
  if (status === "PENDING") {
    return `${base} border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15${ring}`;
  }
  if (status === "CONFIRMED") {
    return `${base} border-cyan-500/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15${ring}`;
  }
  return `${base} border-white/15 bg-white/10 text-white/80 hover:bg-white/15${ring}`;
}

function MetricCard({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  helper: string;
  tone?: "amber" | "cyan" | "emerald" | "neutral";
}) {
  const styles = {
    amber: "border-amber-500/20 bg-amber-500/10",
    cyan: "border-cyan-500/20 bg-cyan-500/10",
    emerald: "border-emerald-500/20 bg-emerald-500/10",
    neutral: "border-white/10 bg-white/[0.04]",
  };

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/55">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-white/55">{helper}</p>
    </div>
  );
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
  const [actionId, setActionId] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedWeekend, setSelectedWeekend] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError("");

    const [bookingResult, blockResult] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, weekend_start, weekend_end, church_name, contact_name, phone, email, people_count, status, created_at, notes"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("blocks")
        .select("weekend_start, weekend_end, reason")
        .order("weekend_start", { ascending: true }),
    ]);

    if (bookingResult.error || blockResult.error) {
      setBookings([]);
      setBlocks([]);
      setError(
        bookingResult.error?.message || blockResult.error?.message || "Não foi possível carregar o painel."
      );
      return;
    }

    setBookings((bookingResult.data as Booking[]) ?? []);
    setBlocks((blockResult.data as BlockRow[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    async function initialize() {
      setError("");

      const { data, error: userError } = await supabase.auth.getUser();
      const user = data.user;

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setUserEmail(user.email ?? null);

      const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (adminError || !adminUser) {
        setError("Seu usuário não tem permissão para acessar a área administrativa.");
        setLoading(false);
        return;
      }

      await loadData();
      setLoading(false);
    }

    void initialize();
  }, [loadData, router, supabase]);

  const todayISO = formatISO(new Date());

  const pendingBookings = useMemo(
    () =>
      bookings
        .filter((booking) => String(booking.status).toUpperCase() === "PENDING")
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [bookings]
  );

  const upcomingConfirmed = useMemo(
    () =>
      bookings
        .filter(
          (booking) =>
            String(booking.status).toUpperCase() === "CONFIRMED" &&
            booking.weekend_start >= todayISO
        )
        .sort((a, b) => a.weekend_start.localeCompare(b.weekend_start)),
    [bookings, todayISO]
  );

  const futureBlocks = useMemo(
    () => blocks.filter((block) => block.weekend_start >= todayISO),
    [blocks, todayISO]
  );

  const nextReservation = upcomingConfirmed[0] ?? null;

  const weekendStateMap = useMemo(() => {
    const map = new Map<string, WeekendState>();

    for (const booking of bookings) {
      const status = String(booking.status).toUpperCase();
      const current = map.get(booking.weekend_start);

      if (status === "CONFIRMED") {
        map.set(booking.weekend_start, "CONFIRMED");
      } else if (status === "PENDING" && current !== "CONFIRMED") {
        map.set(booking.weekend_start, "PENDING");
      }
    }

    for (const block of blocks) {
      map.set(block.weekend_start, "BLOCKED");
    }

    return map;
  }, [bookings, blocks]);

  const calendarCells = useMemo<CalendarCell[]>(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const sundayOffset = (7 - ((lastDay.getDay() + 6) % 7) - 1) % 7;

    const gridStart = new Date(firstDay);
    gridStart.setDate(gridStart.getDate() - mondayOffset);

    const gridEnd = new Date(lastDay);
    gridEnd.setDate(gridEnd.getDate() + sundayOffset);

    const cells: CalendarCell[] = [];
    const cursor = new Date(gridStart);

    while (cursor <= gridEnd) {
      const iso = formatISO(cursor);
      const dayOfWeek = cursor.getDay();
      let weekendStart: string | null = null;

      if (dayOfWeek === 5) weekendStart = iso;
      if (dayOfWeek === 6) weekendStart = addDaysISO(iso, -1);
      if (dayOfWeek === 0) weekendStart = addDaysISO(iso, -2);

      let status: WeekendState | null = null;
      if (weekendStart && addDaysISO(weekendStart, 2) >= todayISO) {
        status = weekendStateMap.get(weekendStart) ?? "FREE";
      }

      cells.push({
        iso,
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === month,
        weekendStart,
        status,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return cells;
  }, [todayISO, visibleMonth, weekendStateMap]);

  useEffect(() => {
    const firstSelectable = calendarCells.find(
      (cell) => cell.inMonth && cell.weekendStart && cell.status
    );

    if (!selectedWeekend || !calendarCells.some((cell) => cell.weekendStart === selectedWeekend)) {
      setSelectedWeekend(firstSelectable?.weekendStart ?? null);
    }
  }, [calendarCells, selectedWeekend]);

  const selectedState = selectedWeekend
    ? weekendStateMap.get(selectedWeekend) ?? "FREE"
    : null;

  const selectedBookings = useMemo(
    () => bookings.filter((booking) => booking.weekend_start === selectedWeekend),
    [bookings, selectedWeekend]
  );

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.weekend_start === selectedWeekend) ?? null,
    [blocks, selectedWeekend]
  );

  async function updateStatus(id: string, status: "CONFIRMED" | "REJECTED") {
    try {
      setActionId(id);
      setError("");

      const response = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Não foi possível atualizar a solicitação.");
      }

      await loadData();
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "Não foi possível atualizar a solicitação."
      );
    } finally {
      setActionId(null);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-[65vh] max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm text-white/65">Carregando a área administrativa...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300/75">
            Área administrativa
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Visão geral
          </h1>
          <p className="mt-2 text-sm text-white/55">
            O que precisa de atenção e os próximos compromissos do Sítio Emanuel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/agenda"
            className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
          >
            Agenda completa
          </Link>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
          >
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/45">
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
          Logado como {userEmail ?? "administrador"}
        </span>
        <Link href="/" className="px-2 py-1.5 transition hover:text-white/80">
          Ver site público
        </Link>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Novas solicitações"
          value={pendingBookings.length}
          helper={pendingBookings.length === 1 ? "pedido aguardando resposta" : "pedidos aguardando resposta"}
          tone="amber"
        />
        <MetricCard
          label="Reservas confirmadas"
          value={upcomingConfirmed.length}
          helper="compromissos futuros"
          tone="cyan"
        />
        <MetricCard
          label="Próxima reserva"
          value={nextReservation ? formatDate(nextReservation.weekend_start, { day: "2-digit", month: "short" }) : "—"}
          helper={nextReservation?.church_name ?? "nenhuma reserva futura"}
          tone="emerald"
        />
        <MetricCard
          label="Datas bloqueadas"
          value={futureBlocks.length}
          helper="bloqueios futuros na agenda"
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Solicitações que precisam de ação</h2>
              <p className="mt-1 text-sm text-white/50">
                Responda primeiro aos pedidos mais recentes.
              </p>
            </div>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
              {pendingBookings.length} pendente(s)
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {pendingBookings.length === 0 ? (
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-5">
                <p className="font-medium text-emerald-100">Nenhuma solicitação aguardando.</p>
                <p className="mt-1 text-sm text-white/50">
                  Quando alguém preencher o formulário, o pedido aparecerá aqui.
                </p>
              </div>
            ) : (
              pendingBookings.slice(0, 6).map((booking) => (
                <article
                  key={booking.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-medium text-white">{booking.church_name}</h3>
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100">
                          Nova solicitação
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-white/75">
                        {formatWeekendRange(booking.weekend_start, booking.weekend_end)}
                      </p>
                      <p className="mt-1 text-sm text-white/50">
                        {booking.contact_name} · {booking.people_count} pessoas
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        Recebida em {formatDateTime(booking.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <a
                        href={whatsappHref(booking)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/15"
                      >
                        WhatsApp
                      </a>
                      <Link
                        href={`/admin/agenda?weekend=${booking.weekend_start}`}
                        className="rounded-xl border border-white/15 px-3.5 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10"
                      >
                        Detalhes
                      </Link>
                      <button
                        type="button"
                        onClick={() => updateStatus(booking.id, "CONFIRMED")}
                        disabled={actionId === booking.id}
                        className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                      >
                        {actionId === booking.id ? "Salvando..." : "Confirmar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(booking.id, "REJECTED")}
                        disabled={actionId === booking.id}
                        className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3.5 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {pendingBookings.length > 6 ? (
            <Link
              href="/admin/agenda"
              className="mt-4 inline-flex text-sm font-medium text-emerald-200 transition hover:text-emerald-100"
            >
              Ver todas as solicitações →
            </Link>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Agenda do mês</h2>
              <p className="mt-1 text-sm text-white/50">
                {MONTHS[visibleMonth.getMonth()]} de {visibleMonth.getFullYear()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Mês anterior"
                onClick={() =>
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
                  )
                }
                className="h-10 w-10 rounded-xl border border-white/10 text-white/70 transition hover:bg-white/10"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Próximo mês"
                onClick={() =>
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
                  )
                }
                className="h-10 w-10 rounded-xl border border-white/10 text-white/70 transition hover:bg-white/10"
              >
                →
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/55">
            {(["FREE", "PENDING", "CONFIRMED", "BLOCKED"] as WeekendState[]).map((status) => (
              <span key={status} className="inline-flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${stateDot(status)}`} />
                {stateLabel(status)}
              </span>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-[11px] text-white/40 sm:gap-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarCells.map((cell) => (
              <button
                key={cell.iso}
                type="button"
                disabled={!cell.weekendStart || !cell.status}
                onClick={() => cell.weekendStart && setSelectedWeekend(cell.weekendStart)}
                className={cellClass(
                  cell.status,
                  Boolean(cell.weekendStart && cell.weekendStart === selectedWeekend),
                  cell.inMonth
                )}
                title={
                  cell.weekendStart && cell.status
                    ? `${formatWeekendRange(cell.weekendStart, addDaysISO(cell.weekendStart, 2))} — ${stateLabel(cell.status)}`
                    : cell.iso
                }
              >
                {cell.day}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            {!selectedWeekend || !selectedState ? (
              <p className="text-sm text-white/55">Selecione um fim de semana no calendário.</p>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-white/35">
                    Fim de semana selecionado
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {formatWeekendRange(selectedWeekend, addDaysISO(selectedWeekend, 2))}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-2 text-xs text-white/55">
                    <span className={`h-2 w-2 rounded-full ${stateDot(selectedState)}`} />
                    {stateLabel(selectedState)}
                    {selectedBookings.length > 1 ? ` · ${selectedBookings.length} solicitações` : ""}
                    {selectedBlock?.reason ? ` · ${selectedBlock.reason}` : ""}
                  </p>
                </div>
                <Link
                  href={`/admin/agenda?weekend=${selectedWeekend}`}
                  className="rounded-xl border border-white/15 px-3.5 py-2 text-center text-xs font-medium text-white/75 transition hover:bg-white/10"
                >
                  Abrir na agenda
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Próximas reservas</h2>
            <p className="mt-1 text-sm text-white/50">
              Compromissos confirmados em ordem de data.
            </p>
          </div>
          <Link
            href="/admin/agenda"
            className="text-sm font-medium text-emerald-200 transition hover:text-emerald-100"
          >
            Gerenciar agenda →
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {upcomingConfirmed.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/55 md:col-span-2 xl:col-span-3">
              Nenhuma reserva confirmada para os próximos meses.
            </div>
          ) : (
            upcomingConfirmed.slice(0, 6).map((booking) => (
              <article key={booking.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-cyan-200/70">
                  {formatDate(booking.weekend_start, { day: "2-digit", month: "short" })}
                </p>
                <h3 className="mt-2 truncate font-medium text-white">{booking.church_name}</h3>
                <p className="mt-1 text-sm text-white/55">
                  {booking.contact_name} · {booking.people_count} pessoas
                </p>
                <div className="mt-4 flex gap-2">
                  <a
                    href={whatsappHref(booking)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 transition hover:bg-emerald-500/15"
                  >
                    WhatsApp
                  </a>
                  <Link
                    href={`/admin/agenda?weekend=${booking.weekend_start}`}
                    className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10"
                  >
                    Ver reserva
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
