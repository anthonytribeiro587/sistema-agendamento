"use client";

import { WeekendItem, WeekendStatus, generateWeekends } from "@/lib/weekends";
import { useMemo } from "react";
import Link from "next/link";

type Props = {
  // Mapa: "YYYY-MM-DD" (sexta) -> status
  statusMap?: Record<string, WeekendStatus>;
};

const STATUS_STYLE: Record<WeekendStatus, { pill: string; text: string; hint: string }> = {
  AVAILABLE: { pill: "bg-emerald-500/15 border-emerald-400/20 text-emerald-200", text: "Disponível", hint: "Pode solicitar" },
  PENDING: { pill: "bg-yellow-500/15 border-yellow-400/20 text-yellow-200", text: "Pendente", hint: "Aguardando confirmação" },
  CONFIRMED: { pill: "bg-red-500/15 border-red-400/20 text-red-200", text: "Reservado", hint: "Indisponível" },
  BLOCKED: { pill: "bg-zinc-500/20 border-white/10 text-white/70", text: "Bloqueado", hint: "Manutenção/uso interno" },
};

export default function AvailabilityGrid({ statusMap }: Props) {
  const weekends = useMemo(() => {
    const base = generateWeekends(6);
    return base.map((w) => ({
      ...w,
      status: statusMap?.[w.key] ?? "AVAILABLE",
    }));
  }, [statusMap]);

  return (
    <div className="space-y-4">
      <Legend />

      <div className="grid gap-3 md:grid-cols-2">
        {weekends.map((w) => (
          <WeekendCard key={w.key} item={w} />
        ))}
      </div>
    </div>
  );
}

function WeekendCard({ item }: { item: WeekendItem }) {
  const s = STATUS_STYLE[item.status];

  const canRequest = item.status === "AVAILABLE";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/60">Fim de semana</p>
          <p className="mt-1 font-medium">{item.label}</p>
        </div>

        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs ${s.pill}`}>
          {s.text}
        </span>
      </div>

      <p className="mt-3 text-sm text-white/60">{s.hint}</p>

      <div className="mt-4">
        {canRequest ? (
          <Link
            href={`/solicitar?data=${encodeURIComponent(item.key)}`}
            className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 transition"
          >
            Solicitar este fim de semana
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex cursor-not-allowed rounded-xl border border-white/10 px-4 py-2 text-sm text-white/40"
          >
            Indisponível para solicitação
          </button>
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-2">
      <LegendPill status="AVAILABLE" />
      <LegendPill status="PENDING" />
      <LegendPill status="CONFIRMED" />
      <LegendPill status="BLOCKED" />
    </div>
  );
}

function LegendPill({ status }: { status: WeekendStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`rounded-full border px-3 py-1 text-xs ${s.pill}`}>
      {s.text}
    </span>
  );
}
