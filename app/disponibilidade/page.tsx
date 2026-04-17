import DisponibilidadeCalendarClient, {
  WeekendItem,
  WeekendStatus,
} from "@/components/DisponibilidadeCalendarClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

type BookingRow = {
  weekend_start: string | null;
  status: string | null; // PENDING | CONFIRMED | REJECTED ...
};

type BlockRow = {
  weekend_start: string | null;
};

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toISODate(value: string | null): string {
  if (!value) return "";
  if (isISODate(value)) return value;

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

function startOfMonthISO(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toISOString().slice(0, 10);
}

function endOfMonthISO(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const dt = new Date(y, m, 0); // last day of month
  return dt.toISOString().slice(0, 10);
}

// Gera todos os "finais de semana" (sex->dom) entre start e end (inclusive)
function generateWeekendsBetween(startISO: string, endISO: string): WeekendItem[] {
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ey, em, ed] = endISO.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  // achar a primeira sexta-feira >= start
  const first = new Date(start);
  while (first.getDay() !== 5) {
    // 5 = sexta
    first.setDate(first.getDate() + 1);
  }

  const out: WeekendItem[] = [];
  const cur = new Date(first);

  while (cur <= end) {
    const startISO = cur.toISOString().slice(0, 10);
    const endISO = addDaysISO(startISO, 2);
    out.push({
      weekendStartISO: startISO,
      weekendEndISO: endISO,
      status: "AVAILABLE",
    });
    cur.setDate(cur.getDate() + 7);
  }

  return out;
}

function normalizeStatus(s: string | null): WeekendStatus | null {
  if (!s) return null;
  const up = s.toUpperCase();
  if (up === "CONFIRMED") return "RESERVED";
  if (up === "PENDING") return "PENDING";
  // rejeitado/cancelado etc: não bloqueia calendário
  return null;
}

export default async function DisponibilidadePage() {
  const supabase = await createSupabaseServerClient();

  // range grande pra sempre ter calendário preenchido (pega mês atual - 1 até + 18 meses)
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 18, 0);

  const fromISO = from.toISOString().slice(0, 10);
  const toISO = to.toISOString().slice(0, 10);

  // base: todos os fins de semana no range
  const baseWeekends = generateWeekendsBetween(fromISO, toISO);

  // buscar blocks e bookings nesse range
  // Observação: use apenas weekend_start pra mapear e definir status
  const { data: blocksData, error: blocksErr } = await supabase
    .from("blocks")
    .select("weekend_start")
    .gte("weekend_start", fromISO)
    .lte("weekend_start", toISO);

  if (blocksErr) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-4xl font-semibold text-white">Disponibilidade</h1>
        <p className="mt-3 text-white/70">
          Erro ao carregar blocks:{" "}
          <span className="text-rose-200">{blocksErr.message}</span>
        </p>
      </main>
    );
  }

  const { data: bookingsData, error: bookingsErr } = await supabase
    .from("bookings")
    .select("weekend_start, status")
    .gte("weekend_start", fromISO)
    .lte("weekend_start", toISO);

  if (bookingsErr) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-4xl font-semibold text-white">Disponibilidade</h1>
        <p className="mt-3 text-white/70">
          Erro ao carregar bookings:{" "}
          <span className="text-rose-200">{bookingsErr.message}</span>
        </p>
      </main>
    );
  }

  const blockedSet = new Set(
    ((blocksData as BlockRow[] | null) ?? [])
      .map((r) => toISODate(r.weekend_start))
      .filter(Boolean)
  );

  // Se tiver mais de um booking no mesmo fim de semana,
  // a prioridade é: CONFIRMED(RESERVED) > PENDING > null
  const bookingStatusByStart = new Map<string, WeekendStatus>();
  for (const row of ((bookingsData as BookingRow[] | null) ?? [])) {
    const start = toISODate(row.weekend_start);
    if (!start) continue;

    const st = normalizeStatus(row.status);
    if (!st) continue;

    const cur = bookingStatusByStart.get(start);
    if (cur === "RESERVED") continue; // já é o mais forte
    if (st === "RESERVED") {
      bookingStatusByStart.set(start, "RESERVED");
      continue;
    }
    if (!cur) bookingStatusByStart.set(start, st);
    if (cur === "PENDING" && st === "PENDING") bookingStatusByStart.set(start, "PENDING");
  }

  // aplicar status final
  const weekends: WeekendItem[] = baseWeekends.map((w) => {
    if (blockedSet.has(w.weekendStartISO)) {
      return { ...w, status: "BLOCKED" };
    }

    const st = bookingStatusByStart.get(w.weekendStartISO);
    if (st) return { ...w, status: st };

    return w;
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-4xl font-semibold text-white">Disponibilidade</h1>
      <p className="mt-2 text-white/70">
        Clique em um dia <b>verde</b> (Sex/Sáb/Dom) para abrir o formulário ao lado.
      </p>

      <DisponibilidadeCalendarClient weekends={weekends} />
    </main>
  );
}
