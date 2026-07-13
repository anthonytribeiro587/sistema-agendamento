import DisponibilidadeCalendarClient, {
  type WeekendItem,
  type WeekendStatus,
} from "@/components/DisponibilidadeCalendarClient";
import { createSupabaseAdminClient } from "@/lib/server/booking-api";

export const revalidate = 60;

type AvailabilityRow = {
  weekend_start: string | null;
  status: "PENDING" | "RESERVED" | "BLOCKED" | null;
};

type BookingRow = {
  weekend_start: string | null;
  status: "PENDING" | "CONFIRMED" | string | null;
};

type BlockRow = {
  weekend_start: string | null;
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

  while (cursor.getDay() !== 5) cursor.setDate(cursor.getDate() + 1);

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

async function loadAvailability(fromISO: string, toISO: string) {
  const supabase = createSupabaseAdminClient();

  const rpcResult = await supabase.rpc("get_public_weekend_availability", {
    p_from: fromISO,
    p_to: toISO,
  });

  if (!rpcResult.error) {
    return { data: (rpcResult.data as AvailabilityRow[] | null) ?? [], error: null };
  }

  console.warn("Availability RPC unavailable, using protected table fallback:", rpcResult.error.message);

  const [blocksResult, bookingsResult] = await Promise.all([
    supabase.from("blocks").select("weekend_start").gte("weekend_start", fromISO).lte("weekend_start", toISO),
    supabase
      .from("bookings")
      .select("weekend_start, status")
      .gte("weekend_start", fromISO)
      .lte("weekend_start", toISO)
      .in("status", ["PENDING", "CONFIRMED"]),
  ]);

  if (blocksResult.error || bookingsResult.error) {
    return {
      data: [] as AvailabilityRow[],
      error: blocksResult.error?.message || bookingsResult.error?.message || "Erro ao consultar agenda.",
    };
  }

  const statusByDate = new Map<string, AvailabilityRow["status"]>();

  for (const row of (bookingsResult.data as BookingRow[] | null) ?? []) {
    if (!row.weekend_start) continue;
    const current = statusByDate.get(row.weekend_start);
    if (row.status === "CONFIRMED") statusByDate.set(row.weekend_start, "RESERVED");
    else if (row.status === "PENDING" && current !== "RESERVED") statusByDate.set(row.weekend_start, "PENDING");
  }

  for (const row of (blocksResult.data as BlockRow[] | null) ?? []) {
    if (row.weekend_start) statusByDate.set(row.weekend_start, "BLOCKED");
  }

  return {
    data: Array.from(statusByDate, ([weekend_start, status]) => ({ weekend_start, status })),
    error: null,
  };
}

export default async function DisponibilidadePage() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 18, 0);
  const fromISO = toISODate(from);
  const toISO = toISODate(to);
  const baseWeekends = generateWeekendsBetween(fromISO, toISO);

  let result: Awaited<ReturnType<typeof loadAvailability>>;
  try {
    result = await loadAvailability(fromISO, toISO);
  } catch (error) {
    console.error("Availability configuration error:", error);
    result = { data: [], error: "Configuração do banco indisponível." };
  }

  if (result.error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/80">Agenda</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Disponibilidade</h1>
        <div className="mt-7 rounded-3xl border border-rose-400/20 bg-rose-400/10 p-6">
          <p className="font-medium text-rose-100">Não foi possível carregar a agenda agora.</p>
          <p className="mt-2 text-sm leading-6 text-rose-50/70">Atualize a página em alguns instantes ou fale com a equipe pelo WhatsApp.</p>
        </div>
      </main>
    );
  }

  const statusByWeekend = new Map<string, WeekendStatus>();
  for (const row of result.data) {
    if (!row.weekend_start) continue;
    const status = normalizeStatus(row.status);
    if (status) statusByWeekend.set(row.weekend_start, status);
  }

  const weekends = baseWeekends.map((weekend) => ({
    ...weekend,
    status: statusByWeekend.get(weekend.weekendStartISO) ?? "AVAILABLE",
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/80">Agenda de reservas</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Encontre o fim de semana ideal.</h1>
        <p className="mt-4 text-base leading-7 text-white/62">
          Datas verdes estão livres. Datas amarelas já possuem uma solicitação em análise, mas ainda aceitam novos pedidos.
        </p>
      </div>

      <div className="mt-7 grid gap-3 rounded-3xl border border-white/9 bg-white/[0.035] p-5 text-sm text-white/62 sm:grid-cols-3">
        <p><strong className="block text-white">1. Escolha</strong> Selecione um período verde ou amarelo.</p>
        <p><strong className="block text-white">2. Solicite</strong> Informe os dados do seu grupo.</p>
        <p><strong className="block text-white">3. Confirme</strong> Aguarde o retorno da equipe.</p>
      </div>

      <DisponibilidadeCalendarClient weekends={weekends} />
    </main>
  );
}
