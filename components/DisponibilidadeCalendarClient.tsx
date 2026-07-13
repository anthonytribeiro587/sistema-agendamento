"use client";

import { useMemo, useState } from "react";
import BookingForm from "@/components/BookingForm";

export type WeekendStatus = "AVAILABLE" | "UNAVAILABLE";

export type WeekendItem = {
  weekendStartISO: string;
  weekendEndISO: string;
  status: WeekendStatus;
};

type Props = {
  weekends: WeekendItem[];
};

const STATUS_LABEL: Record<WeekendStatus, string> = {
  AVAILABLE: "Disponível",
  UNAVAILABLE: "Indisponível",
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

function formatDateBR(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

function monthTitle(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function mondayIndex(jsDay: number) {
  return (jsDay + 6) % 7;
}

function statusClasses(status: WeekendStatus) {
  if (status === "AVAILABLE") {
    return "border-emerald-400/35 bg-emerald-500/25 text-emerald-50";
  }
  return "border-white/10 bg-white/5 text-white/48";
}

function badgeClasses(status: WeekendStatus) {
  if (status === "AVAILABLE") {
    return "border-emerald-400/25 bg-emerald-500/15 text-emerald-200";
  }
  return "border-white/10 bg-white/5 text-white/65";
}

function monthKey(year: number, month: number) {
  return year * 12 + month;
}

export default function DisponibilidadeCalendarClient({ weekends }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedWeekendStart, setSelectedWeekendStart] = useState("");

  const weekendByStart = useMemo(() => {
    const map = new Map<string, WeekendItem>();
    for (const weekend of weekends) map.set(weekend.weekendStartISO, weekend);
    return map;
  }, [weekends]);

  const dayToWeekendStart = useMemo(() => {
    const map = new Map<string, string>();
    for (const weekend of weekends) {
      map.set(weekend.weekendStartISO, weekend.weekendStartISO);
      map.set(addDaysISO(weekend.weekendStartISO, 1), weekend.weekendStartISO);
      map.set(addDaysISO(weekend.weekendStartISO, 2), weekend.weekendStartISO);
    }
    return map;
  }, [weekends]);

  const dayStatus = useMemo(() => {
    const map = new Map<string, WeekendStatus>();
    for (const weekend of weekends) {
      map.set(weekend.weekendStartISO, weekend.status);
      map.set(addDaysISO(weekend.weekendStartISO, 1), weekend.status);
      map.set(addDaysISO(weekend.weekendStartISO, 2), weekend.status);
    }
    return map;
  }, [weekends]);

  const selectedWeekend = selectedWeekendStart
    ? weekendByStart.get(selectedWeekendStart) ?? null
    : null;

  const firstMonthKey = useMemo(() => {
    const first = weekends[0]?.weekendStartISO;
    if (!first) return monthKey(today.getFullYear(), today.getMonth());
    const [year, month] = first.split("-").map(Number);
    return monthKey(year, month - 1);
  }, [today, weekends]);

  const lastMonthKey = useMemo(() => {
    const last = weekends.at(-1)?.weekendStartISO;
    if (!last) return monthKey(today.getFullYear(), today.getMonth());
    const [year, month] = last.split("-").map(Number);
    return monthKey(year, month - 1);
  }, [today, weekends]);

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const start = new Date(viewYear, viewMonth, 1 - mondayIndex(firstDay.getDay()));
    const list: Array<{ iso: string; day: number; inMonth: boolean }> = [];

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      list.push({
        iso: toISODate(date),
        day: date.getDate(),
        inMonth: date.getMonth() === viewMonth,
      });
    }

    const weeks = Array.from({ length: 6 }, (_, index) =>
      list.slice(index * 7, index * 7 + 7)
    ).filter((week) => week.some((day) => day.inMonth));

    return weeks.flat();
  }, [viewMonth, viewYear]);

  const currentMonthKey = monthKey(viewYear, viewMonth);
  const cannotGoBack = currentMonthKey <= firstMonthKey;
  const cannotGoForward = currentMonthKey >= lastMonthKey;

  function changeMonth(direction: -1 | 1) {
    const date = new Date(viewYear, viewMonth + direction, 1);
    const nextKey = monthKey(date.getFullYear(), date.getMonth());
    if (nextKey < firstMonthKey || nextKey > lastMonthKey) return;

    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
    setSelectedWeekendStart("");
  }

  function selectDay(iso: string) {
    const weekendStart = dayToWeekendStart.get(iso);
    if (!weekendStart) return;

    const weekend = weekendByStart.get(weekendStart);
    if (!weekend || weekend.status !== "AVAILABLE") return;

    setSelectedWeekendStart(weekendStart);
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_LABEL) as WeekendStatus[]).map((status) => (
            <span
              key={status}
              className={`rounded-full border px-3 py-1 text-xs sm:text-sm ${badgeClasses(status)}`}
            >
              {STATUS_LABEL[status]}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold capitalize text-white sm:text-xl">
            {monthTitle(viewYear, viewMonth)}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              disabled={cannotGoBack}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Mês anterior"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              disabled={cannotGoForward}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Próximo mês"
            >
              →
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs text-white/55 sm:gap-2">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
          {cells.map((cell) => {
            const weekendStart = dayToWeekendStart.get(cell.iso);
            const status = dayStatus.get(cell.iso);
            const requestable = status === "AVAILABLE";
            const selected = Boolean(
              weekendStart && weekendStart === selectedWeekendStart
            );

            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => selectDay(cell.iso)}
                disabled={!requestable}
                aria-label={`${formatDateBR(cell.iso)}${
                  status ? ` — ${STATUS_LABEL[status]}` : ""
                }`}
                aria-pressed={selected}
                className={`relative flex h-11 items-center justify-center rounded-xl border text-sm transition sm:h-12 sm:rounded-2xl ${
                  status
                    ? statusClasses(status)
                    : "border-white/5 bg-black/20 text-white/35"
                } ${cell.inMonth ? "" : "opacity-45"} ${
                  requestable
                    ? "cursor-pointer hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    : "cursor-not-allowed"
                } ${selected ? "scale-[1.04] ring-2 ring-white" : ""}`}
              >
                {cell.day}
                {selected ? (
                  <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-white" />
                ) : null}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-white/60">
          Verde: disponível para solicitação. Cinza: indisponível no momento.
          O motivo da indisponibilidade não é exibido publicamente.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        {!selectedWeekend ? (
          <div className="min-h-48">
            <p className="text-sm text-white/60">Fim de semana selecionado</p>
            <h3 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              Selecione uma data disponível
            </h3>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/70">
              Toque em um período verde para abrir o formulário de solicitação.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-white/60">Fim de semana selecionado</p>
            <h3 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              {formatDateBR(selectedWeekend.weekendStartISO)} até{" "}
              {formatDateBR(selectedWeekend.weekendEndISO)}
            </h3>

            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-sm font-medium text-white">
                Data disponível para solicitação
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                O envio registra seu interesse. A reserva só fica garantida depois
                da confirmação da equipe.
              </p>
            </div>

            <div className="mt-5">
              <BookingForm
                key={selectedWeekend.weekendStartISO}
                weekendStartISO={selectedWeekend.weekendStartISO}
                weekendEndISO={selectedWeekend.weekendEndISO}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
