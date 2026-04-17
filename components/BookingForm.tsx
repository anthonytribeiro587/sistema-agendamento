"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Props = {
  weekendStartISO: string;
  weekendEndISO: string;
};

type FormState = {
  churchName: string;
  contactName: string;
  phone: string;
  email: string;
  peopleCount: string;
  notes: string;
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function formatDateBR(iso: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;

  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("pt-BR");
}

export default function BookingForm({ weekendStartISO, weekendEndISO }: Props) {
  const [form, setForm] = useState<FormState>({
    churchName: "",
    contactName: "",
    phone: "",
    email: "",
    peopleCount: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [whatsAppUrl, setWhatsAppUrl] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!form.churchName.trim()) return false;
    if (!form.contactName.trim()) return false;
    if (!form.phone.trim()) return false;
    if (!isEmail(form.email)) return false;

    const n = Number(form.peopleCount);
    if (!n || n < 40 || n > 140) return false;

    return true;
  }, [form]);

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOkMsg(null);
    setErrMsg(null);

    if (!canSubmit) {
      setErrMsg(
        "Preencha os campos corretamente. A quantidade deve ser entre 40 e 140 pessoas."
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        weekendStartISO,
        weekendEndISO,
        churchName: form.churchName.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        peopleCount: Number(form.peopleCount),
        notes: form.notes.trim(),
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrMsg(data?.error || "Erro ao enviar solicitação.");
        return;
      }

      const telefoneDestino = "5551995092781";

      const mensagem = `Olá! Gostaria de solicitar uma reserva no Sítio Emanuel.

*Dados da solicitação*
• Igreja: ${form.churchName}
• Responsável: ${form.contactName}
• WhatsApp: ${form.phone}
• E-mail: ${form.email}
• Quantidade de pessoas: ${form.peopleCount}
• Data: ${formatDateBR(weekendStartISO)} até ${formatDateBR(weekendEndISO)}
• Observações: ${form.notes || "Nenhuma"}`;

      const url = `https://wa.me/${telefoneDestino}?text=${encodeURIComponent(
        mensagem
      )}`;

      setWhatsAppUrl(url);

      setOkMsg(
        "Sua solicitação foi enviada com sucesso. Agora nossa equipe irá analisar os dados e confirmar a reserva."
      );

      setForm({
        churchName: "",
        contactName: "",
        phone: "",
        email: "",
        peopleCount: "",
        notes: "",
      });
    } catch (err: any) {
      setErrMsg(err?.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  if (okMsg) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200">
            ✓
          </div>

          <div className="flex-1">
            <h4 className="text-lg font-semibold text-emerald-100">
              Solicitação enviada
            </h4>

            <p className="mt-2 text-sm text-emerald-50/90">
              {okMsg}
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-medium text-white">
                Próximo passo
              </p>
              <p className="mt-2 text-sm text-white/75">
                Você pode continuar pelo WhatsApp para agilizar o atendimento.
                Sua solicitação já foi registrada no sistema e ficará como{" "}
                <span className="font-semibold text-amber-200">PENDENTE</span>{" "}
                até confirmação da equipe.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {whatsAppUrl ? (
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Falar no WhatsApp
                </a>
              ) : null}

              <Link
                href="/disponibilidade"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10"
              >
                Voltar para disponibilidade
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4"
    >
      <div>
        <label className="text-sm text-white/80">Nome da igreja *</label>
        <input
          value={form.churchName}
          onChange={(e) => onChange("churchName", e.target.value)}
          placeholder="Ex: Igreja Batista Central"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
        />
      </div>

      <div>
        <label className="text-sm text-white/80">Responsável *</label>
        <input
          value={form.contactName}
          onChange={(e) => onChange("contactName", e.target.value)}
          placeholder="Ex: Pr. João Silva"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm text-white/80">WhatsApp *</label>
          <input
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="Ex: (51) 99999-9999"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
          />
          <p className="mt-1 text-xs text-white/50">
            Usaremos este número para confirmar sua reserva.
          </p>
        </div>

        <div>
          <label className="text-sm text-white/80">E-mail *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="Ex: contato@igreja.com"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-white/80">Quantidade de pessoas *</label>
        <input
          type="number"
          min={40}
          max={140}
          value={form.peopleCount}
          onChange={(e) => onChange("peopleCount", e.target.value)}
          placeholder="Ex: 80"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
        />
        <p className="mt-1 text-xs text-white/50">
          Permitido entre 40 e 140 pessoas.
        </p>
      </div>

      <div>
        <label className="text-sm text-white/80">Observações</label>
        <textarea
          rows={5}
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Preferências, horários, necessidades especiais..."
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
        />
      </div>

      {errMsg ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errMsg}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="rounded-2xl bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar solicitação"}
        </button>

        <p className="text-sm text-white/70">
          Sua solicitação ficará como{" "}
          <b className="text-amber-200">PENDENTE</b> até confirmação.
        </p>
      </div>
    </form>
  );
}