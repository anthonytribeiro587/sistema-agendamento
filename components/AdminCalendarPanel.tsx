"use client";

import { useMemo, useState } from "react";

type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
type WeekendStatus = "AVAILABLE" | "PENDING" | "RESERVED" | "BLOCKED";

export type AdminBooking = {
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

export type AdminWeekendItem = {
  weekendStartISO: string;
  weekendEndISO: string;
  status: WeekendStatus;
  booking?: AdminBooking | null;
};

type Props = {
  weekends: AdminWeekendItem[];
  savingId: string | null;
  onUpdateStatus: (id: string, status: "CONFIRMED" | "REJECTED" | "PENDING") => Promise<void> | void;
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

function formatDateTimeBR(dateLike: string) {
  try {
    const dt = new Date(dateLike);
    if (isNaN(dt.getTime())) return "-";
    return dt.toLocaleString("pt-BR");
  } catch {
    return "-";
  }
}

function monthTitle(year: number, month0: number) {
  const dt = new Date(year, month0, 1);
  return dt.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function mondayIndex(jsDay: number) {
  return (jsDay + 6) % 7;
}

function statusClasses(status: WeekendStatus) {
  if (status === "AVAILABLE") return "bg-emerald-500/25 border-emerald-400/30 text-emerald-50";
  if (status === "PENDING") return "bg-amber-500/25 border-amber-400/30 text-amber-50";
  if (status === "RESERVED") return "bg-rose-500/25 border-rose-400/30 text-rose-50";
  return "bg-white/5 border-white/10 text-white/60";
}

function badgeClasses(status: WeekendStatus) {
  if (status === "AVAILABLE") return "bg-emerald-500/20 border-emerald-400/25 text-emerald-200";
  if (status === "PENDING") return "bg-amber-500/20 border-amber-400/25 text-amber-200";
  if (status === "RESERVED") return "bg-rose-500/20 border-rose-400/25 text-rose-200";
  return "bg-white/5 border-white/10 text-white/70";
}

function statusLabel(status: string) {
  const up = (status || "").toUpperCase();
  if (up === "PENDING") return "PENDENTE";
  if (up === "CONFIRMED") return "CONFIRMADO";
  if (up === "REJECTED") return "REJEITADO";
  if (up === "CANCELLED") return "CANCELADO";
  return up || "-";
}

function adminStatusToWeekendStatus(status: string): WeekendStatus {
  const up = (status || "").toUpperCase();
  if (up === "CONFIRMED") return "RESERVED";
  if (up === "PENDING") return "PENDING";
  return "AVAILABLE";
}

export default function AdminCalendarPanel({
  weekends,
  savingId,
  onUpdateStatus,
}: Props) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth0, setViewMonth0] = useState(now.getMonth());
  const [selectedWeekendStartISO, setSelectedWeekendStartISO] = useState<string>("");

  const dayStatus = useMemo(() => {
    const map = new Map<string, WeekendStatus>();

    for (const w of weekends ?? []) {
      const fri = w.weekendStartISO;
      map.set(fri, w.status);
      map.set(addDaysISO(fri, 1), w.status);
      map.set(addDaysISO(fri, 2), w.status);
    }

    return map;
  }, [weekends]);

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
    const map = new Map<string, AdminWeekendItem>();
    for (const w of weekends ?? []) map.set(w.weekendStartISO, w);
    return map;
  }, [weekends]);

  const selectedWeekend = useMemo(() => {
    if (!selectedWeekendStartISO) return null;
    return weekendByStart.get(selectedWeekendStartISO) ?? null;
  }, [selectedWeekendStartISO, weekendByStart]);

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth0, 1);
    const startOffset = mondayIndex(first.getDay());
    const total = 42;

    const list: Array<{ iso: string; day: number; inMonth: boolean }> = [];
    const start = new Date(viewYear, viewMonth0, 1 - startOffset);

    for (let i = 0; i < total; i++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + i);

      list.push({
        iso: dt.toISOString().slice(0, 10),
        day: dt.getDate(),
        inMonth: dt.getMonth() === viewMonth0,
      });
    }

    return { list };
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
    setSelectedWeekendStartISO(weekendStart);
  }

  const dow = [
    { id: "mon", label: "S" },
    { id: "tue", label: "T" },
    { id: "wed", label: "Q" },
    { id: "thu", label: "Q" },
    { id: "fri", label: "S" },
    { id: "sat", label: "S" },
    { id: "sun", label: "D" },
  ];

  const booking = selectedWeekend?.booking ?? null;
  const bookingStatus = booking?.status?.toUpperCase() ?? "";
  const weekendStatus = selectedWeekend?.status ?? "AVAILABLE";

  const whatsappHref = booking?.phone
    ? `https://wa.me/${booking.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá, ${booking.contact_name}! Sobre sua solicitação para o Sítio Emanuel no período de ${formatDateBR(
          booking.weekend_start
        )} até ${formatDateBR(booking.weekend_end)}, gostaríamos de falar com você.`
      )}`
    : null;

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
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
          {cells.list.map((c) => {
            const st = dayStatus.get(c.iso);
            const isWeekendDay = Boolean(dayToWeekendStart.get(c.iso));
            const clickable = isWeekendDay && c.inMonth;
            const selected =
              selectedWeekendStartISO &&
              dayToWeekendStart.get(c.iso) === selectedWeekendStartISO;

            const base =
              "h-12 rounded-2xl border text-center text-sm flex items-center justify-center select-none transition";
            const faded = c.inMonth ? "" : "opacity-40";

            const cls = st
              ? `${base} ${statusClasses(st)} ${faded} ${
                  clickable ? "cursor-pointer hover:brightness-110" : "cursor-not-allowed opacity-80"
                } ${selected ? "ring-2 ring-white/70" : ""}`
              : `${base} bg-black/20 border-white/5 text-white/50 ${faded}`;

            return (
              <div
                key={c.iso}
                className={cls}
                onClick={clickable ? () => onClickDay(c.iso) : undefined}
                title={st ? `${formatDateBR(c.iso)} — ${st}` : formatDateBR(c.iso)}
              >
                {c.day}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-white/60">
          * Clique em um fim de semana para visualizar e gerenciar a solicitação.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {!selectedWeekend ? (
          <>
            <p className="text-sm text-white/70">Fim de semana selecionado</p>
            <h3 className="mt-1 text-2xl font-semibold text-white">
              Nenhum fim de semana selecionado
            </h3>
            <p className="mt-2 text-white/60">
              Clique em um fim de semana no calendário para ver os detalhes.
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">
              Use o calendário para acompanhar a agenda e gerenciar confirmações.
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-white/70">Fim de semana selecionado</p>
            <h3 className="mt-1 text-2xl font-semibold text-white">
              {formatDateBR(selectedWeekend.weekendStartISO)} → {formatDateBR(selectedWeekend.weekendEndISO)} (Sex—Dom)
            </h3>

            <p className="mt-2 text-white/70">
              Status:{" "}
              <b
                className={
                  weekendStatus === "AVAILABLE"
                    ? "text-emerald-200"
                    : weekendStatus === "PENDING"
                    ? "text-amber-200"
                    : weekendStatus === "RESERVED"
                    ? "text-rose-200"
                    : "text-white/70"
                }
              >
                {weekendStatus}
              </b>
            </p>

            {booking ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-white/50">Igreja</p>
                      <p className="mt-1 text-white font-medium break-words">{booking.church_name}</p>
                    </div>

                    <div>
                      <p className="text-xs text-white/50">Responsável</p>
                      <p className="mt-1 text-white break-words">{booking.contact_name}</p>
                    </div>

                    <div>
                      <p className="text-xs text-white/50">WhatsApp</p>
                      <p className="mt-1 text-white break-words">{booking.phone}</p>
                    </div>

                    <div>
                      <p className="text-xs text-white/50">E-mail</p>
                      <p className="mt-1 text-white break-words">{booking.email}</p>
                    </div>

                    <div>
                      <p className="text-xs text-white/50">Quantidade de pessoas</p>
                      <p className="mt-1 text-white">{booking.people_count}</p>
                    </div>

                    <div>
                      <p className="text-xs text-white/50">Criado em</p>
                      <p className="mt-1 text-white">{formatDateTimeBR(booking.created_at)}</p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs text-white/50">Observações</p>
                      <p className="mt-1 text-white/80 break-words">
                        {booking.notes?.trim() || "Nenhuma observação."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
                    >
                      WhatsApp
                    </a>
                  ) : null}

                  {bookingStatus === "PENDING" && (
                    <>
                      <button
                        disabled={savingId === booking.id}
                        onClick={() => onUpdateStatus(booking.id, "CONFIRMED")}
                        className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 transition disabled:opacity-60"
                      >
                        {savingId === booking.id ? "..." : "Confirmar"}
                      </button>

                      <button
                        disabled={savingId === booking.id}
                        onClick={() => onUpdateStatus(booking.id, "REJECTED")}
                        className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition disabled:opacity-60"
                      >
                        {savingId === booking.id ? "..." : "Rejeitar"}
                      </button>
                    </>
                  )}

                  {(bookingStatus === "CONFIRMED" || bookingStatus === "REJECTED") && (
                    <button
                      disabled={savingId === booking.id}
                      onClick={() => onUpdateStatus(booking.id, "PENDING")}
                      className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition disabled:opacity-60"
                    >
                      {savingId === booking.id ? "..." : "Reabrir"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">
                {weekendStatus === "AVAILABLE"
                  ? "Este fim de semana está livre, sem solicitação vinculada."
                  : weekendStatus === "BLOCKED"
                  ? "Este fim de semana está bloqueado."
                  : "Não há detalhes adicionais para este fim de semana."}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}