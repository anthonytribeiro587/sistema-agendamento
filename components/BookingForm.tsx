"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

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
  website: string;
};

const INITIAL_FORM: FormState = {
  churchName: "",
  contactName: "",
  phone: "",
  email: "",
  peopleCount: "",
  notes: "",
  website: "",
};

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function formatDateBR(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

function readErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const payload = data as {
    message?: unknown;
    error?: unknown | { message?: unknown };
  };

  if (
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  if (typeof payload.error === "string") return payload.error;
  if (typeof payload.message === "string") return payload.message;
  return null;
}

export default function BookingForm({ weekendStartISO, weekendEndISO }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [whatsAppUrl, setWhatsAppUrl] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const peopleCount = Number(form.peopleCount);
    return (
      form.churchName.trim().length >= 2 &&
      form.contactName.trim().length >= 2 &&
      form.phone.replace(/\D/g, "").length >= 10 &&
      isEmail(form.email) &&
      Number.isInteger(peopleCount) &&
      peopleCount >= 40 &&
      peopleCount <= 140
    );
  }, [form]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!canSubmit) {
      setErrorMessage(
        "Preencha os campos obrigatórios. A quantidade deve ser entre 40 e 140 pessoas."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekendStartISO,
          churchName: form.churchName.trim(),
          contactName: form.contactName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          peopleCount: Number(form.peopleCount),
          notes: form.notes.trim(),
          website: form.website,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setErrorMessage(
          readErrorMessage(data) || "Não foi possível enviar a solicitação."
        );
        return;
      }

      const destination =
        process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5551995092781";
      const message = `Olá! Enviei uma solicitação de reserva no Sítio Emanuel.

*Dados da solicitação*
• Igreja/grupo: ${form.churchName}
• Responsável: ${form.contactName}
• WhatsApp: ${form.phone}
• E-mail: ${form.email}
• Quantidade de pessoas: ${form.peopleCount}
• Data: ${formatDateBR(weekendStartISO)} até ${formatDateBR(weekendEndISO)}
• Observações: ${form.notes || "Nenhuma"}`;

      setWhatsAppUrl(
        `https://wa.me/${destination}?text=${encodeURIComponent(message)}`
      );
      setSuccessMessage(
        "Sua solicitação foi registrada e ficará em análise até a confirmação da equipe."
      );
      setForm(INITIAL_FORM);
      router.refresh();
    } catch (error) {
      console.error("Booking form submit failed:", error);
      setErrorMessage("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (successMessage) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-100">
            ✓
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-lg font-semibold text-emerald-100">
              Solicitação enviada
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-emerald-50/90">
              {successMessage}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              O WhatsApp abaixo é opcional, mas ajuda a equipe a localizar seu pedido
              mais rapidamente.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {whatsAppUrl ? (
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Continuar pelo WhatsApp
                </a>
              ) : null}
              <Link
                href="/disponibilidade"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10"
              >
                Ver outras datas
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          value={form.website}
          onChange={(event) => updateField("website", event.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="churchName" className="text-sm text-white/80">
          Nome da igreja ou grupo *
        </label>
        <input
          id="churchName"
          value={form.churchName}
          onChange={(event) => updateField("churchName", event.target.value)}
          placeholder="Ex.: Igreja Batista Central"
          autoComplete="organization"
          maxLength={120}
          required
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />
      </div>

      <div>
        <label htmlFor="contactName" className="text-sm text-white/80">
          Responsável *
        </label>
        <input
          id="contactName"
          value={form.contactName}
          onChange={(event) => updateField("contactName", event.target.value)}
          placeholder="Ex.: João Silva"
          autoComplete="name"
          maxLength={120}
          required
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="text-sm text-white/80">
            WhatsApp *
          </label>
          <input
            id="phone"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="(51) 99999-9999"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/30"
          />
        </div>

        <div>
          <label htmlFor="email" className="text-sm text-white/80">
            E-mail *
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="contato@igreja.com"
            autoComplete="email"
            maxLength={160}
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/30"
          />
        </div>
      </div>

      <div>
        <label htmlFor="peopleCount" className="text-sm text-white/80">
          Quantidade de pessoas *
        </label>
        <input
          id="peopleCount"
          type="number"
          min={40}
          max={140}
          value={form.peopleCount}
          onChange={(event) => updateField("peopleCount", event.target.value)}
          placeholder="Ex.: 80"
          required
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />
        <p className="mt-1 text-xs text-white/50">Capacidade permitida: 40 a 140 pessoas.</p>
      </div>

      <div>
        <label htmlFor="notes" className="text-sm text-white/80">
          Observações
        </label>
        <textarea
          id="notes"
          rows={4}
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Horários, necessidades especiais ou outras informações..."
          maxLength={1000}
          className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {loading ? "Enviando..." : "Enviar solicitação"}
      </button>

      <p className="text-xs leading-relaxed text-white/55">
        O envio não garante a reserva. A data será confirmada pela equipe após a análise.
      </p>
    </form>
  );
}
