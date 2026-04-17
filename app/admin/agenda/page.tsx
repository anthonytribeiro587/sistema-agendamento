"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";
import AdminCalendarPanel, {
  AdminWeekendItem,
  AdminBooking,
} from "@/components/AdminCalendarPanel";

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

function consolidatedWeekendStatus(
  bookings: Booking[],
  hasBlock: boolean
): "AVAILABLE" | "PENDING" | "RESERVED" | "BLOCKED" {
  if (hasBlock) return "BLOCKED";

  const normalized = bookings.map((b) => (b.status || "").toUpperCase());

  if (normalized.includes("CONFIRMED")) return "RESERVED";
  if (normalized.includes("PENDING")) return "PENDING";
  return "AVAILABLE";
}

function AdminAgendaContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWeekend = searchParams.get("weekend") || "";

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [error, setError] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setError("");

    await fetch("/api/bookings/expire-pending", {
      method: "POST",
    }).catch(() => null);

    const [{ data: bookingRows, error: bookingError }, { data: blockRows, error: blockError }] =
      await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, weekend_start, weekend_end, church_name, contact_name, phone, email, people_count, status, created_at, notes"
          )
          .order("created_at", { ascending: false }),
        supabase.from("blocks").select("weekend_start, weekend_end, reason"),
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

  async function blockWeekend(weekendStartISO: string, reason: string) {
    setError("");

    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekendStartISO, reason }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.message || j?.error || "Falha ao bloquear data.");
      return;
    }

    await loadData();
  }

  async function unblockWeekend(weekendStartISO: string) {
    setError("");

    const res = await fetch("/api/blocks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekendStartISO }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.message || j?.error || "Falha ao desbloquear data.");
      return;
    }

    await loadData();
  }

  async function createManualBooking(payload: {
    weekendStartISO: string;
    churchName: string;
    contactName: string;
    phone: string;
    email: string;
    peopleCount: string;
    notes: string;
  }) {
    setError("");

    const res = await fetch("/api/bookings/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.message || j?.error || "Falha ao criar reserva manual.");
      return;
    }

    await loadData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function updateStatus(
    id: string,
    status: "CONFIRMED" | "REJECTED" | "PENDING"
  ) {
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

    await loadData();
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const weekends = useMemo<AdminWeekendItem[]>(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 18, 0);

    const blockMap = new Map(
      blocks.map((b) => [String(b.weekend_start).slice(0, 10), b] as const)
    );

    const bookingsByWeekend = new Map<string, AdminBooking[]>();

    for (const booking of bookings) {
      const key = String(booking.weekend_start).slice(0, 10);
      const list = bookingsByWeekend.get(key) || [];
      list.push(booking);
      bookingsByWeekend.set(key, list);
    }

    const items: AdminWeekendItem[] = [];
    const cur = new Date(from);

    while (cur.getDay() !== 5) {
      cur.setDate(cur.getDate() + 1);
    }

    while (cur <= to) {
      const start = cur.toISOString().slice(0, 10);
      const end = new Date(cur);
      end.setDate(end.getDate() + 2);

      const weekendBookings = (bookingsByWeekend.get(start) || []).sort((a, b) => {
        const aCreated = new Date(a.created_at).getTime();
        const bCreated = new Date(b.created_at).getTime();
        return bCreated - aCreated;
      });

      const block = blockMap.get(start) ?? null;

      items.push({
        weekendStartISO: start,
        weekendEndISO: end.toISOString().slice(0, 10),
        status: consolidatedWeekendStatus(weekendBookings, Boolean(block)),
        bookings: weekendBookings,
        blockReason: block?.reason ?? null,
      });

      cur.setDate(cur.getDate() + 7);
    }

    return items;
  }, [bookings, blocks]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <p className="text-white/70">Carregando agenda...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Agenda administrativa
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Logado como <span className="text-white">{userEmail}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className={`${btnBase()} border-white/15 bg-white/5 text-white/80 hover:bg-white/10`}
          >
            Voltar ao dashboard
          </button>

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
          <h2 className="text-lg font-semibold">Agenda por fim de semana</h2>
          <span className="text-sm text-white/60">{bookings.length} solicitação(ões)</span>
        </div>

        <AdminCalendarPanel
          weekends={weekends}
          initialSelectedWeekendStartISO={initialWeekend}
          savingId={savingId}
          onUpdateStatus={updateStatus}
          onBlockWeekend={blockWeekend}
          onUnblockWeekend={unblockWeekend}
          onCreateManualBooking={createManualBooking}
        />

        <p className="mt-6 text-xs text-white/50">
          Uma data pode ter várias solicitações no histórico. A agenda exibe o status consolidado
          e todas as solicitações daquele fim de semana.
        </p>
      </div>
    </main>
  );
}

export default function AdminAgendaPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
          <p className="text-white/70">Carregando agenda...</p>
        </main>
      }
    >
      <AdminAgendaContent />
    </Suspense>
  );
}