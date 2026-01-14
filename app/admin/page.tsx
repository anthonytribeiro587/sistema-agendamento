"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
  status: string;
  created_at: string;
  notes?: string | null;
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

  if (up === "CONFIRMED") return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-200`;
  if (up === "PENDING") return `${base} border-amber-500/25 bg-amber-500/10 text-amber-200`;
  if (up === "REJECTED" || up === "CANCELLED")
    return `${base} border-rose-500/25 bg-rose-500/10 text-rose-200`;

  return `${base} border-white/10 bg-white/5 text-white/80`;
}

function formatBR(dateLike: string) {
  try {
    const dt = new Date(dateLike);
    if (isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString("pt-BR");
  } catch {
    return "-";
  }
}

function btnBase() {
  return "inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium transition whitespace-nowrap";
}

export default function AdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = useCallback(async () => {
    setError("");

    const { data: rows, error } = await supabase
      .from("bookings")
      .select(
        "id, weekend_start, weekend_end, church_name, contact_name, phone, email, people_count, status, created_at, notes"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setBookings([]);
      return;
    }

    setBookings((rows as Booking[]) || []);
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
        router.push("/");
        return;
      }

      await loadBookings();
      setLoading(false);
    }

    init();
  }, [router, supabase, loadBookings]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function updateStatus(id: string, status: "CONFIRMED" | "REJECTED" | "PENDING") {
    setError("");
    setSavingId(id);

    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setSavingId(null);

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.message || j?.error || "Falha ao atualizar status.");
      return;
    }

    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  }

  if (loading) return <p className="text-white/70">Carregando painel...</p>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10 space-y-6">
      {/* Topo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Área Administrativa</h1>
          <p className="mt-2 text-sm text-white/70">
            Logado como <span className="text-white">{userEmail}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

      {/* Container */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Solicitações</h2>
          <span className="text-sm text-white/60">{bookings.length} item(s)</span>
        </div>

        {/* MOBILE: cards (resolve 100% o “tudo em cima”) */}
        <div className="mt-5 space-y-3 md:hidden">
          {bookings.length === 0 ? (
            <div className="text-sm text-white/70">Nenhuma solicitação encontrada.</div>
          ) : (
            bookings.map((b) => {
              const busy = savingId === b.id;
              const up = (b.status || "").toUpperCase();

              return (
                <div key={b.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-white/60">Fim de semana</div>
                      <div className="text-base font-semibold text-white">
                        {formatBR(b.weekend_start)} → {formatBR(b.weekend_end)}
                      </div>
                      <div className="mt-1 text-xs text-white/45">
                        {b.created_at ? new Date(b.created_at).toLocaleString("pt-BR") : ""}
                      </div>
                    </div>

                    <span className={pillClass(b.status)}>{statusLabel(b.status)}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2">
                      <div className="text-xs text-white/60">Igreja</div>
                      <div className="text-white break-words font-medium">{b.church_name}</div>
                    </div>

                    <div>
                      <div className="text-xs text-white/60">Pessoas</div>
                      <div className="text-white">{b.people_count}</div>
                    </div>

                    <div>
                      <div className="text-xs text-white/60">E-mail</div>
                      <div className="text-white break-words">{b.email}</div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-xs text-white/60">Contato</div>
                      <div className="text-white break-words">
                        {b.contact_name} {b.phone ? `• ${b.phone}` : ""}
                      </div>
                    </div>

                    {b.notes ? (
                      <div className="col-span-2">
                        <div className="text-xs text-white/60">Observações</div>
                        <div className="text-white/80 break-words">{b.notes}</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {up === "PENDING" && (
                      <>
                        <button
                          disabled={busy}
                          onClick={() => updateStatus(b.id, "CONFIRMED")}
                          className={`${btnBase()} border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-60`}
                        >
                          {busy ? "..." : "Confirmar"}
                        </button>

                        <button
                          disabled={busy}
                          onClick={() => updateStatus(b.id, "REJECTED")}
                          className={`${btnBase()} border-rose-500/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15 disabled:opacity-60`}
                        >
                          {busy ? "..." : "Rejeitar"}
                        </button>
                      </>
                    )}

                    {(up === "CONFIRMED" || up === "REJECTED") && (
                      <button
                        disabled={busy}
                        onClick={() => updateStatus(b.id, "PENDING")}
                        className={`${btnBase()} border-amber-500/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15 disabled:opacity-60`}
                      >
                        {busy ? "..." : "Reabrir"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP: tabela (mantém o teu visual atual) */}
        <div className="mt-5 hidden md:block overflow-x-auto">
          <div className="min-w-[920px] rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 border-b border-white/10 px-4 py-3 text-xs text-white/60">
              <div className="col-span-3">Fim de semana</div>
              <div className="col-span-3">Igreja</div>
              <div className="col-span-2">Contato</div>
              <div className="col-span-1">Pessoas</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>

            {bookings.length === 0 ? (
              <div className="px-4 py-6 text-sm text-white/70">Nenhuma solicitação encontrada.</div>
            ) : (
              bookings.map((b) => {
                const busy = savingId === b.id;
                const up = (b.status || "").toUpperCase();

                return (
                  <div
                    key={b.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 items-center"
                  >
                    <div className="col-span-3 text-sm">
                      {formatBR(b.weekend_start)} → {formatBR(b.weekend_end)}
                      <div className="text-xs text-white/45">
                        {b.created_at ? new Date(b.created_at).toLocaleString("pt-BR") : ""}
                      </div>
                    </div>

                    <div className="col-span-3 text-sm font-medium break-words">{b.church_name}</div>

                    <div className="col-span-2 text-sm text-white/80">
                      <div className="break-words">{b.contact_name}</div>
                      <div className="text-xs text-white/55 break-words">{b.phone}</div>
                      <div className="text-xs text-white/55 break-words">{b.email}</div>
                    </div>

                    <div className="col-span-1 text-sm text-white/80">{b.people_count}</div>

                    <div className="col-span-1">
                      <span className={pillClass(b.status)}>{statusLabel(b.status)}</span>
                    </div>

                    <div className="col-span-2 flex justify-end gap-2 flex-wrap">
                      {up === "PENDING" && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => updateStatus(b.id, "CONFIRMED")}
                            className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-black hover:bg-white/90 transition disabled:opacity-60"
                          >
                            {busy ? "..." : "Confirmar"}
                          </button>

                          <button
                            disabled={busy}
                            onClick={() => updateStatus(b.id, "REJECTED")}
                            className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition disabled:opacity-60"
                          >
                            {busy ? "..." : "Rejeitar"}
                          </button>
                        </>
                      )}

                      {(up === "CONFIRMED" || up === "REJECTED") && (
                        <button
                          disabled={busy}
                          onClick={() => updateStatus(b.id, "PENDING")}
                          className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition disabled:opacity-60"
                        >
                          {busy ? "..." : "Reabrir"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-white/50">
          <b>Confirmar</b> = Reservado no calendário. <b>Rejeitar</b> marca como REJECTED.{" "}
          <b>Reabrir</b> volta para PENDENTE.
        </p>
      </div>
    </main>
  );
}
