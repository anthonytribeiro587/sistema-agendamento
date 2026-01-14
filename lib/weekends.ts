export type WeekendStatus = "AVAILABLE" | "PENDING" | "CONFIRMED" | "BLOCKED";

export type WeekendItem = {
  key: string; // ex: 2026-01-16
  start: Date; // sexta
  end: Date;   // domingo
  label: string;
  status: WeekendStatus;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatWeekendLabel(start: Date, end: Date) {
  const startStr = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const endStr = end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${startStr} → ${endStr} (Sex–Dom)`;
}

function nextFriday(from: Date) {
  const d = startOfDay(from);
  const day = d.getDay(); // 0 dom ... 5 sex
  const diff = (5 - day + 7) % 7; // até sexta
  return addDays(d, diff);
}

/**
 * Gera fins de semana (sex-dom) a partir da próxima sexta,
 * por "monthsAhead" meses (~26 semanas dá ~6 meses).
 */
export function generateWeekends(monthsAhead = 6): WeekendItem[] {
  const weeks = Math.max(8, Math.min(40, monthsAhead * 4 + 2));
  const first = nextFriday(new Date());
  const items: WeekendItem[] = [];

  for (let i = 0; i < weeks; i++) {
    const start = addDays(first, i * 7);
    const end = addDays(start, 2); // domingo
    const key = toISODate(start);
    items.push({
      key,
      start,
      end,
      label: formatWeekendLabel(start, end),
      status: "AVAILABLE",
    });
  }

  return items;
}
