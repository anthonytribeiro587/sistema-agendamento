import DisponibilidadeCalendarClient, {
  type WeekendItem,
  type WeekendStatus,
} from "@/components/DisponibilidadeCalendarClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

type AvailabilityRow = {
  weekend_start: string | null;
  status: "PENDING" | "RESERVED" | "BLOCKED" | null;
};

function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function addDaysISO(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function generateWeekendsBetween(startISO: string, endISO: string): WeekendItem[] {
  const [startYear, startMonth, startDay] = startISO.split("-").map(Number);
  const [endYear, endMonth, endDay] = endISO.split("-").map(Number);
  const cursor = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  while (cursor.getDay() !== 5) {
    cursor.setDate(cursor.getDate() + 1);
  }

  const weekends: WeekendItem[] = [];
  while (cursor <= end) {
    const weekendStartISO = toISODate(cursor);
    weekends.push({
      weekendStartISO,
      weekendEndISO: addDaysISO(weekendStartISO, 2),
      status: "AVAILABLE",
    });
    cursor.setDate(cursor.getDate() + 7);
  }

  return weekends;
}

function normalizeStatus(status: AvailabilityRow["status"]): WeekendStatus | null {
  if (status === "PENDING") return "PENDING";
  if (status === "RESERVED") return "RESERVED";
  if (status === "BLOCKED") return "BLOCKED";
  return null;
}

export default async function DisponibilidadePage() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 18, 0);
  const fromISO = toISODate(from);
  const toISO = toISODate(to);
  const baseWeekends = generateWeekendsBetween(fromISO, toISO);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_public_weekend_availability", {
    p_from: fromISO,
    p_to: toISO,
  });

  if (error) {
    console.error("Availability RPC failed:", error.message);

    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Disponibilidade
        </h1>
        <div className="mt-6 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-5">
          <p className="font-medium text-rose-100">Não foi possível carregar a agenda.</p>
          <p className="mt-2 text-sm text-rose-50/80">
            Atualize a página em alguns instantes ou entre em contato pelo WhatsApp.
          </p>
        </div>
      </main>
    );
  }

  const statusByWeekend = new Map<string, WeekendStatus>();
  for (const row of (data as AvailabilityRow[] | null) ?? []) {
    if (!row.weekend_start) continue;
    const status = normalizeStatus(row.status);
    if (status) statusByWeekend.set(row.weekend_start, status);
  }

  const weekends = baseWeekends.map((weekend) => ({
    ...weekend,
    status: statusByWeekend.get(weekend.weekendStartISO) ?? "AVAILABLE",
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Disponibilidade
      </h1>

      <p className="mt-2 max-w-3xl text-white/80">
        Escolha um fim de semana em verde ou amarelo. Datas amarelas já possuem uma
        solicitação em análise, mas você ainda pode enviar a sua.
      </p>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
        <p className="font-medium text-white">Como funciona</p>
        <div className="mt-2 space-y-1">
          <p>1. Escolha um fim de semana disponível ou em análise.</p>
          <p>2. Preencha os dados da sua igreja ou grupo.</p>
          <p>3. A equipe avaliará as solicitações e confirmará uma reserva.</p>
        </div>
      </div>

      <DisponibilidadeCalendarClient weekends={weekends} />
    </main>
  );
}
