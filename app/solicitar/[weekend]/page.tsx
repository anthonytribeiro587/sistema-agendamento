import Link from "next/link";
import BookingForm from "@/components/BookingForm";

function extractISODate(input: string) {
  const m = (input || "").match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : "";
}

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("pt-BR");
}

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);

  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export default async function SolicitarPage({
  params,
}: {
  params: Promise<{ weekend: string }>;
}) {
  // ✅ Next 16.1: params pode vir como Promise -> precisa await
  const { weekend } = await params;

  const weekendStartISO = extractISODate(weekend);
  const valid = Boolean(weekendStartISO);

  const weekendEndISO = valid ? addDaysISO(weekendStartISO, 2) : "";
  const weekendLabel = valid
    ? `${formatDateBR(weekendStartISO)} → ${formatDateBR(weekendEndISO)} (Sex–Dom)`
    : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Solicitar agendamento
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Preencha os dados da igreja. WhatsApp e e-mail são obrigatórios.
          </p>
        </div>

        <Link
          href="/disponibilidade"
          className="rounded-2xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
        >
          Voltar para disponibilidade
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-xs text-white/60">Fim de semana selecionado</div>

        {valid ? (
          <div className="mt-1 text-lg font-semibold">{weekendLabel}</div>
        ) : (
          <div className="mt-1 text-lg font-semibold text-rose-200">
            Fim de semana inválido (volte e selecione novamente)
          </div>
        )}
      </div>

      {valid ? (
        <BookingForm
          weekendStartISO={weekendStartISO}
          weekendEndISO={weekendEndISO}
        />
      ) : null}
    </div>
  );
}
