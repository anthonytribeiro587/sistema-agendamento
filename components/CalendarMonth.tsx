"use client";

import { useMemo, useState } from "react";

export type WeekendStatus = "AVAILABLE" | "PENDING" | "CONFIRMED" | "BLOCKED";

export type WeekendItem = {
  weekend_start: string; // YYYY-MM-DD (sexta)
  weekend_end: string; // YYYY-MM-DD (domingo)
  status: WeekendStatus;
};

type Props = {
  weekends: WeekendItem[];
  onSelectWeekend?: (weekendStartISO: string) => void;
};

function isISODate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function parseISODateLocal(iso: string) {
  // cria Date em horário local, evitando bug de timezone
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDaysISO(iso: string, days: number) {
  const dt = parseISODateLocal(iso);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatMonthTitle(year: number, monthIndex: number) {
  const dt = new Date(year, monthIndex, 1);
  // pt-BR: "janeiro de 2026"
  const s = dt.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  // capitaliza a primeira letra
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// 0..6 (Seg..Dom)
function weekdayIndexMon0(dt: Date) {
  // Date.getDay(): Dom=0 ... Sáb=6
  // queremos Seg=0 ... Dom=6
  return (dt.getDay() + 6) % 7;
}

type Cell = {
  iso: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
};

export default function CalendarMonth({ weekends, onSelectWeekend }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0..11

  const weekendDayMap = useMemo(() => {
    // Mapa: ISO do dia -> { weekendStartISO, status }
    const map = new Map<string, { weekendStartISO: string; status: WeekendStatus }>();
    for (const w of weekends) {
      if (!isISODate(w.weekend_start)) continue;
      map.set(w.weekend_start, { weekendStartISO: w.weekend_start, status: w.status });
      map.set(addDaysISO(w.weekend_start, 1), { weekendStartISO: w.weekend_start, status: w.status });
      map.set(addDaysISO(w.weekend_start, 2), { weekendStartISO: w.weekend_start, status: w.status });
    }
    return map;
  }, [weekends]);

  const cells: Cell[] = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const firstWeekdayMon0 = weekdayIndexMon0(first); // 0=Seg

    // início do grid (Segunda da semana onde cai o dia 1)
    const gridStart = new Date(viewYear, viewMonth, 1);
    gridStart.setDate(gridStart.getDate() - firstWeekdayMon0);

    const arr: Cell[] = [];
    for (let i = 0; i < 42; i++) {
      const dt = new Date(gridStart);
      dt.setDate(gridStart.getDate() + i);

      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      const iso = `${yyyy}-${mm}-${dd}`;

      arr.push({
        iso,
        day: dt.getDate(),
        inMonth: dt.getMonth() === viewMonth,
      });
    }
    return arr;
  }, [viewYear, viewMonth]);

  function goPrev() {
    const m = viewMonth - 1;
    if (m < 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth(m);
    }
  }

  function goNext() {
    const m = viewMonth + 1;
    if (m > 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth(m);
    }
  }

  function statusClasses(status: WeekendStatus) {
    // cores seguindo tua legenda (disponível/pendente/reservado/bloqueado)
    switch (status) {
      case "AVAILABLE":
        return "bg-emerald-500/20 border-emerald-400/30 text-white hover:bg-emerald-500/25";
      case "PENDING":
        return "bg-amber-500/20 border-amber-400/30 text-white/90";
      case "CONFIRMED":
        return "bg-rose-500/20 border-rose-400/30 text-white/90";
      case "BLOCKED":
        return "bg-white/10 border-white/15 text-white/60";
      default:
        return "bg-white/10 border-white/15 text-white/70";
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-semibold text-white">{formatMonthTitle(viewYear, viewMonth)}</div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white/80 hover:bg-black/30"
            aria-label="Mês anterior"
            title="Mês anterior"
          >
            ◀
          </button>

          <button
            type="button"
            onClick={goNext}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white/80 hover:bg-black/30"
            aria-label="Próximo mês"
            title="Próximo mês"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Cabeçalho da semana (Seg..Dom) */}
      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs text-white/60">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((label, i) => (
          <div key={`${label}-${i}`} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {cells.map((c, idx) => {
          const weekendInfo = weekendDayMap.get(c.iso);
          const clickable = Boolean(weekendInfo && weekendInfo.status === "AVAILABLE" && onSelectWeekend);

          const base =
            "h-12 rounded-2xl border text-sm flex items-center justify-center select-none transition";
          const faded = c.inMonth ? "" : "opacity-35";

          const cls = weekendInfo
            ? `${base} ${statusClasses(weekendInfo.status)} ${faded} ${clickable ? "cursor-pointer" : "cursor-default"}`
            : `${base} border-transparent text-white/70 ${faded}`;

          return (
            <div
              key={`${c.iso}-${idx}`}
              className={cls}
              onClick={() => {
                if (!clickable || !weekendInfo) return;
                onSelectWeekend?.(weekendInfo.weekendStartISO);
              }}
              title={weekendInfo ? `Status: ${weekendInfo.status}` : ""}
            >
              {c.day}
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-white/55">
        * Clique em <b>Sex/Sáb/Dom</b> (verde) para solicitar.
      </div>
    </div>
  );
}
