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

function formatISODateBR(iso: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "-";

  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
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
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-200`;
  }
  if (up === "PENDING") {
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-200`;
  }
  if (up === "REJECTED" || up === "CANCELLED") {
    return `${base} border-rose-500/25 bg-rose-500/10 text-rose-200`;
  }

  return `${base} border-white/10 bg-white/5 text-white/80`;
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
  const [searchChurch, setSearchChurch] = useState("");

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

  const stats = useMemo(() => {
    const pending = bookings.filter((b) => b.status?.toUpperCase() === "PENDING").length;
    const confirmed = bookings.filter((b) => b.status?.toUpperCase() === "CONFIRMED").length;
    const rejected = bookings.filter((b) => b.status?.toUpperCase() === "REJECTED").length;
    const blocked = blocks.length;
    const total = bookings.length;

    return { pending, confirmed, rejected, blocked, total };
  }, [bookings, blocks]);

  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status?.toUpperCase() === "PENDING"),
    [bookings]
  );

  const upcomingConfirmed = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return bookings
      .filter(
        (b) =>
          b.status?.toUpperCase() === "CONFIRMED" &&
          String(b.weekend_start).slice(0, 10) >= today
      )
      .sort((a, b) => a.weekend_start.localeCompare(b.weekend_start))
      .slice(0, 8);
  }, [bookings]);

  const filteredChurchHistory = useMemo(() => {
    const q = searchChurch.trim().toLowerCase();
    if (!q) return bookings.slice(0, 12);

    return bookings
      .filter((b) => b.church_name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [bookings, searchChurch]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <p className="text-white/70">Carregando dashboard...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
          <p className="text-sm text-amber-200/80">Pendentes</p>
          <h2 className="mt-2 text-3xl font-semibold text-amber-100">{stats.pending}</h2>
          <p className="mt-2 text-xs text-amber-200/70">
            Solicitações aguardando ação.
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="text-sm text-emerald-200/80">Confirmadas</p>
          <h2 className="mt-2 text-3xl font-semibold text-emerald-100">{stats.confirmed}</h2>
          <p className="mt-2 text-xs text-emerald-200/70">
            Reservas já confirmadas.
          </p>
        </div>

        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5">
          <p className="text-sm text-rose-200/80">Rejeitadas</p>
          <h2 className="mt-2 text-3xl font-semibold text-rose-100">{stats.rejected}</h2>
          <p className="mt-2 text-xs text-rose-200/70">
            Solicitações encerradas sem confirmação.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-white/70">Bloqueadas</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">{stats.blocked}</h2>
          <p className="mt-2 text-xs text-white/50">
            Datas bloqueadas manualmente.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-white/70">Total</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">{stats.total}</h2>
          <p className="mt-2 text-xs text-white/50">
            Total de solicitações registradas.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Pendentes em destaque</h2>
              <p className="mt-1 text-sm text-white/60">
                Solicitações que precisam de atenção imediata.
              </p>
            </div>

            <Link
              href="/admin/agenda"
              className="rounded-2xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
            >
              Abrir agenda
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {pendingBookings.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                Nenhuma solicitação pendente no momento.
              </div>
            ) : (
              pendingBookings.slice(0, 6).map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-amber-500/15 bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{b.church_name}</p>
                      <p className="mt-1 text-sm text-white/70">
  {formatWeekendRangeShort(b.weekend_start, b.weekend_end)}
</p>
                      <p className="mt-1 text-xs text-white/50">
                        {b.contact_name} • {b.phone}
                      </p>
                    </div>

                    <span className={pillClass(b.status)}>{statusLabel(b.status)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">Próximas reservas confirmadas</h2>
          <p className="mt-1 text-sm text-white/60">
            Visão rápida dos próximos fins de semana ocupados.
          </p>

          <div className="mt-5 space-y-3">
            {upcomingConfirmed.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                Nenhuma reserva confirmada encontrada.
              </div>
            ) : (
              upcomingConfirmed.map((b) => (
                <div key={b.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{b.church_name}</p>
                      <p className="mt-1 text-sm text-white/70">
  {formatWeekendRangeShort(b.weekend_start, b.weekend_end)}
</p>
                      <p className="mt-1 text-xs text-white/50">
                        {b.people_count} pessoas
                      </p>
                    </div>

                    <span className={pillClass(b.status)}>{statusLabel(b.status)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Busca rápida por igreja</h2>
            <p className="mt-1 text-sm text-white/60">
              Encontre rapidamente reservas e solicitações pelo nome da igreja.
            </p>
          </div>

          <div className="w-full max-w-md">
            <label className="text-sm text-white/70">Nome da igreja</label>
            <input
              value={searchChurch}
              onChange={(e) => setSearchChurch(e.target.value)}
              placeholder="Ex: Igreja Batista Central"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[920px] rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 border-b border-white/10 px-4 py-3 text-xs text-white/60">
              <div className="col-span-3">Fim de semana</div>
              <div className="col-span-3">Igreja</div>
              <div className="col-span-2">Responsável</div>
              <div className="col-span-1">Pessoas</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Criado em</div>
            </div>

            {filteredChurchHistory.length === 0 ? (
              <div className="px-4 py-6 text-sm text-white/70">
                Nenhum registro encontrado.
              </div>
            ) : (
              filteredChurchHistory.map((b) => (
                <div
                  key={b.id}
                  className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 items-center"
                >
                  <div className="col-span-3 text-sm text-white/80">
                    {formatWeekendRangeShort(b.weekend_start, b.weekend_end)}
                  </div>

                  <div className="col-span-3 text-sm font-medium break-words text-white">
                    {b.church_name}
                  </div>

                  <div className="col-span-2 text-sm text-white/80">
                    <div className="break-words">{b.contact_name}</div>
                    <div className="text-xs text-white/55 break-words">{b.phone}</div>
                  </div>

                  <div className="col-span-1 text-sm text-white/80">
                    {b.people_count}
                  </div>

                  <div className="col-span-1">
                    <span className={pillClass(b.status)}>{statusLabel(b.status)}</span>
                  </div>

                  <div className="col-span-2 text-xs text-white/55">
                    {formatDateTimeBR(b.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}