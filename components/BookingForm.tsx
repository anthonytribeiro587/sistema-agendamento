"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function BookingForm({ weekendStartISO, weekendEndISO }: Props) {
  const router = useRouter();

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

  const canSubmit = useMemo(() => {
    if (!form.churchName.trim()) return false;
    if (!form.contactName.trim()) return false;
    if (!form.phone.trim()) return false;
    if (!isEmail(form.email)) return false;

    const n = Number(form.peopleCount);
    if (!n || n <= 0) return false;

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
      setErrMsg("Preencha os campos obrigatórios corretamente.");
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

      setOkMsg("Solicitação enviada! Status: PENDENTE.");

      // limpa o form
      setForm({
        churchName: "",
        contactName: "",
        phone: "",
        email: "",
        peopleCount: "",
        notes: "",
      });

      /**
       * ✅ ESSENCIAL:
       * força re-render do Server Component atual (rebusca do Supabase)
       * Assim o calendário muda de AVAILABLE para PENDING sem precisar F5.
       */
      router.refresh();

      /**
       * (Opcional) Se você quiser voltar automaticamente pro calendário:
       * descomente a linha abaixo.
       */
      // router.push("/disponibilidade");
    } catch (err: any) {
      setErrMsg(err?.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-white/80">WhatsApp *</label>
          <input
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="Ex: (51) 99999-9999"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
          />
          <p className="mt-1 text-xs text-white/50">
            Dica: Ex. 55 51 99999-9999
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
          min={1}
          value={form.peopleCount}
          onChange={(e) => onChange("peopleCount", e.target.value)}
          placeholder="Ex: 80"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
        />
      </div>

      <div>
        <label className="text-sm text-white/80">Observações</label>
        <textarea
          rows={5}
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Ex: preferência por quartos, horários, necessidades especiais..."
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
        />
      </div>

      {errMsg ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errMsg}
        </div>
      ) : null}

      {okMsg ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {okMsg}
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="rounded-2xl bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
