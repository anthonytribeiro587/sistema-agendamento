"use client";

import { useMemo, useState } from "react";
import BookingForm from "@/components/BookingForm";

export type WeekendStatus = "AVAILABLE" | "PENDING" | "RESERVED" | "BLOCKED";

export type WeekendItem = {
  weekendStartISO: string; // sexta
  weekendEndISO: string;   // domingo
  status: WeekendStatus;
};

type Props = {
  weekends: WeekendItem[];
};

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

function formatDateBR(iso: string) {
  if (!iso || !isISODate(iso)) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("pt-BR");
}

function monthTitle(year: number, month0: number) {
  const dt = new Date(year, month0, 1);
  return dt.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// Segunda como início: 0=Seg ... 6=Dom
function mondayIndex(jsDay: number) {
  // jsDay: 0=Dom ... 6=Sáb
  return (jsDay + 6) % 7;
}

function statusClasses(status: WeekendStatus) {
  // mesmas cores da tua legenda
  if (status === "AVAILABLE") return "bg-emerald-500/25 border-emerald-400/30 text-emerald-50";
  if (status === "PENDING") return "bg-amber-500/25 border-amber-400/30 text-amber-50";
  if (status === "RESERVED") return "bg-rose-500/25 border-rose-400/30 text-rose-50";
  return "bg-white/5 border-white/10 text-white/60"; // BLOCKED
}

function badgeClasses(status: WeekendStatus) {
  if (status === "AVAILABLE") return "bg-emerald-500/20 border-emerald-400/25 text-emerald-200";
  if (status === "PENDING") return "bg-amber-500/20 border-amber-400/25 text-amber-200";
  if (status === "RESERVED") return "bg-rose-500/20 border-rose-400/25 text-rose-200";
  return "bg-white/5 border-white/10 text-white/70";
}

export default function DisponibilidadeCalendarClient({ weekends }: Props) {
  // mapa dia->status (pinta sexta/sábado/domingo)
  const dayStatus = useMemo(() => {
    const map = new Map<string, WeekendStatus>();

    for (const w of weekends ?? []) {
      const fri = w.weekendStartISO;
      const sat = addDaysISO(fri, 1);
      const sun = addDaysISO(fri, 2);
      
      map.set(fri, w.status);
      map.set(sat, w.status);
      map.set(sun, w.status);
    }

    return map;
  }, [weekends]);

  // mapa dia->weekendStart (pra clicar em sábado/domingo e ainda assim achar a sexta)
  const dayToWeekendStart = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of weekends ?? []) {
      const fri = w.weekendStartISO;
      map.set(fri, fri);
      map.set(addDaysISO(fri, 1), fri);
      map.set(addDaysISO(fri, 2), fri);
    }
    return map;
  }, [weekends]);

  const weekendByStart = useMemo(() => {
    const map = new Map<string, WeekendItem>();
    for (const w of weekends ?? []) map.set(w.weekendStartISO, w);
    return map;
  }, [weekends]);

  // mês atual (começa pelo mês de hoje)
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth0, setViewMonth0] = useState(now.getMonth());

  const [selectedWeekendStartISO, setSelectedWeekendStartISO] = useState<string>("");

  const selectedWeekend = useMemo(() => {
    if (!selectedWeekendStartISO) return null;
    return weekendByStart.get(selectedWeekendStartISO) ?? null;
  }, [selectedWeekendStartISO, weekendByStart]);

  const selectedTitle = useMemo(() => {
    if (!selectedWeekend) return null;
    const start = formatDateBR(selectedWeekend.weekendStartISO);
    const end = formatDateBR(selectedWeekend.weekendEndISO);
    return `${start} → ${end} (Sex—Dom)`;
  }, [selectedWeekend]);

  // montar grade do mês (42 células)
  const cells = useMemo(() => {
  const first = new Date(viewYear, viewMonth0, 1);
  const startOffset = mondayIndex(first.getDay());

  const start = new Date(viewYear, viewMonth0, 1 - startOffset);

  const list: Array<{
    iso: string;
    day: number;
    inMonth: boolean;
  }> = [];

  for (let i = 0; i < 42; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);

    list.push({
      iso: dt.toISOString().slice(0, 10),
      day: dt.getDate(),
      inMonth: dt.getMonth() === viewMonth0,
    });
  }

  const weeks: typeof list[] = [];
  for (let i = 0; i < list.length; i += 7) {
    weeks.push(list.slice(i, i + 7));
  }

  // mantém só semanas que têm pelo menos 1 dia do mês atual
  const filteredWeeks = weeks.filter((week) =>
    week.some((day) => day.inMonth)
  );

  return filteredWeeks.flat();
}, [viewYear, viewMonth0]);

  function prevMonth() {
    const dt = new Date(viewYear, viewMonth0, 1);
    dt.setMonth(dt.getMonth() - 1);
    setViewYear(dt.getFullYear());
    setViewMonth0(dt.getMonth());
  }

  function nextMonth() {
    const dt = new Date(viewYear, viewMonth0, 1);
    dt.setMonth(dt.getMonth() + 1);
    setViewYear(dt.getFullYear());
    setViewMonth0(dt.getMonth());
  }

  function onClickDay(iso: string) {
    const weekendStart = dayToWeekendStart.get(iso);
    if (!weekendStart) return;

    const w = weekendByStart.get(weekendStart);
    if (!w) return;

    // só libera clique para AVAILABLE
    if (w.status !== "AVAILABLE") return;

    setSelectedWeekendStartISO(weekendStart);
  }

  const dow = [
    { id: "mon", label: "S" }, // Seg
    { id: "tue", label: "T" },
    { id: "wed", label: "Q" },
    { id: "thu", label: "Q" },
    { id: "fri", label: "S" }, // Sex
    { id: "sat", label: "S" }, // Sáb
    { id: "sun", label: "D" }, // Dom
  ];

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      {/* ESQUERDA: calendário */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-sm ${badgeClasses("AVAILABLE")}`}>
            Disponível
          </span>
          <span className={`rounded-full border px-3 py-1 text-sm ${badgeClasses("PENDING")}`}>
            Pendente
          </span>
          <span className={`rounded-full border px-3 py-1 text-sm ${badgeClasses("RESERVED")}`}>
            Reservado
          </span>
          <span className={`rounded-full border px-3 py-1 text-sm ${badgeClasses("BLOCKED")}`}>
            Bloqueado
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white capitalize">
            {monthTitle(viewYear, viewMonth0)}
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white/80 hover:bg-black/40"
              aria-label="Mês anterior"
              type="button"
            >
              ◀
            </button>
            <button
              onClick={nextMonth}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white/80 hover:bg-black/40"
              aria-label="Próximo mês"
              type="button"
            >
              ▶
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-white/60">
          {dow.map((d) => (
            <div key={d.id} className="text-center">
              {d.label}
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2">
  {cells.map((c) => {
    const st = dayStatus.get(c.iso);
    const isWeekendDay = Boolean(dayToWeekendStart.get(c.iso));
    const clickable =
  
      isWeekendDay && st === "AVAILABLE";

    const isOtherMonth = !c.inMonth;
    const isSelected = selectedWeekendStartISO === dayToWeekendStart.get(c.iso);

    const base =
  "relative h-12 rounded-2xl border text-center text-sm flex items-center justify-center select-none transition";
    
    const monthStyle = isOtherMonth
      ? "opacity-70 text-white/70"
      : "";

    const cls = st
  ? `${base} ${statusClasses(st)} ${monthStyle} ${
      clickable
        ? "cursor-pointer hover:brightness-110"
        : "cursor-not-allowed opacity-80"
    } ${
      isSelected
        ? "ring-2 ring-white scale-105"
        : ""
    }`
  : `${base} bg-black/20 border-white/5 text-white/50 ${monthStyle}`;

    return (
      <div
        key={c.iso}
        className={cls}
        onClick={clickable ? () => onClickDay(c.iso) : undefined}
        title={st ? `${formatDateBR(c.iso)} — ${st}` : formatDateBR(c.iso)}
      >
        {c.day}

{isSelected && (
  <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-white" />
)}
      </div>
    );
  })}
</div>

        <p className="mt-3 text-xs text-white/60">
  * Escolha um fim de semana <b>disponível</b> (em verde) para iniciar sua solicitação.
</p>
      </div>

      {/* DIREITA: formulário */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {!selectedWeekend ? (
  <>
    <p className="text-sm text-white/70">Fim de semana selecionado</p>
    <h3 className="mt-1 text-2xl font-semibold text-white">
      Nenhum fim de semana selecionado
    </h3>
    <p className="mt-2 text-white/75">
      Selecione um fim de semana disponível no calendário para iniciar sua solicitação.
    </p>

    <div className="mb-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
  <p className="text-sm font-medium text-emerald-100">
    Solicitação de reserva
  </p>
  <p className="mt-2 text-sm text-emerald-50/90">
    Preencha o formulário abaixo para enviar sua solicitação. Depois disso,
    você será direcionado para o WhatsApp e nossa equipe confirmará a reserva.
  </p>
</div>
  </>
) : (
  <>
  <p className="text-sm text-white/70">Fim de semana selecionado</p>
  <h3 className="mt-1 text-2xl font-semibold text-white">
    {selectedTitle}
  </h3>

  <p className="mt-2 text-white/70">
    Status:{" "}
    <b
      className={
        selectedWeekend.status === "AVAILABLE"
          ? "text-emerald-200"
          : selectedWeekend.status === "PENDING"
            ? "text-amber-200"
            : selectedWeekend.status === "RESERVED"
              ? "text-rose-200"
              : "text-white/70"
      }
    >
      {selectedWeekend.status === "AVAILABLE"
        ? "Disponível"
        : selectedWeekend.status === "PENDING"
          ? "Pendente"
          : selectedWeekend.status === "RESERVED"
            ? "Reservado"
            : "Bloqueado"}
    </b>
  </p>

  <div className="mt-5">
    {selectedWeekend.status === "AVAILABLE" ? (
      <>
        <div className="mb-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium text-emerald-100">
            Solicitação de reserva
          </p>
          <p className="mt-2 text-sm text-emerald-50/90">
            Preencha os dados abaixo para solicitar este fim de semana. Após o envio,
            nossa equipe fará a análise e confirmará a disponibilidade.
          </p>
        </div>

        <BookingForm
          weekendStartISO={selectedWeekend.weekendStartISO}
          weekendEndISO={selectedWeekend.weekendEndISO}
        />
      </>
    ) : (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">
        Este fim de semana não está disponível para solicitação no momento.
      </div>
    )}
  </div>
</>
)}
      </div>
    </div>
  );
}
