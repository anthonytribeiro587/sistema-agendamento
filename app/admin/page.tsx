"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import AdminCalendarPanel, { AdminWeekendItem } from "@/components/AdminCalendarPanel";

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

function btnBase() {
  return "inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium transition whitespace-nowrap";
}

function adminStatusToWeekendStatus(
  status: string
): "AVAILABLE" | "PENDING" | "RESERVED" | "BLOCKED" {
  const up = (status || "").toUpperCase();
  if (up === "CONFIRMED") return "RESERVED";
  if (up === "PENDING") return "PENDING";
  return "AVAILABLE";
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
        setError("Seu usuário não tem permissão para acessar a área administrativa.");
        setLoading(false);
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

  const weekends = useMemo<AdminWeekendItem[]>(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 18, 0);

    const items: AdminWeekendItem[] = [];
    const cur = new Date(from);

    while (cur.getDay() !== 5) {
      cur.setDate(cur.getDate() + 1);
    }

    while (cur <= to) {
      const start = cur.toISOString().slice(0, 10);
      const end = new Date(cur);
      end.setDate(end.getDate() + 2);

      const booking =
        bookings.find((b) => b.weekend_start?.slice(0, 10) === start) ?? null;

      items.push({
        weekendStartISO: start,
        weekendEndISO: end.toISOString().slice(0, 10),
        status: booking ? adminStatusToWeekendStatus(booking.status) : "AVAILABLE",
        booking,
      });

      cur.setDate(cur.getDate() + 7);
    }

    return items;
  }, [bookings]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <p className="text-white/70">Carregando painel...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Área Administrativa
          </h1>
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

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Agenda administrativa</h2>
          <span className="text-sm text-white/60">{bookings.length} solicitação(ões)</span>
        </div>

        <AdminCalendarPanel
          weekends={weekends}
          savingId={savingId}
          onUpdateStatus={updateStatus}
        />

        <p className="mt-6 text-xs text-white/50">
          <b>Confirmar</b> = Reservado no calendário. <b>Rejeitar</b> marca como
          {" "}REJECTED. <b>Reabrir</b> volta para PENDENTE.
        </p>
      </div>
    </main>
  );
}