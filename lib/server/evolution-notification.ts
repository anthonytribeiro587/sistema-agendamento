import type { BookingInput } from "@/lib/server/booking-api";

type NotificationStatus =
  | { status: "disabled" }
  | { status: "skipped"; reason: "missing_configuration" }
  | { status: "sent" }
  | { status: "failed"; reason: string };

type BookingNotificationInput = BookingInput & {
  bookingId?: string | null;
};

function normalizePhone(value: string | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function formatDateBR(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

function addDaysISO(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function cleanLine(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function buildMessage(input: BookingNotificationInput) {
  const weekendEndISO = addDaysISO(input.weekendStartISO, 2);
  const notes = input.notes ? cleanLine(input.notes) : "Nenhuma";

  return [
    "🧪 *TESTE — NOVA SOLICITAÇÃO DO SÍTIO EMANUEL*",
    "",
    `*Igreja/grupo:* ${cleanLine(input.churchName)}`,
    `*Responsável:* ${cleanLine(input.contactName)}`,
    `*WhatsApp:* ${cleanLine(input.phone)}`,
    `*E-mail:* ${cleanLine(input.email)}`,
    `*Quantidade:* ${input.peopleCount} pessoas`,
    `*Data solicitada:* ${formatDateBR(input.weekendStartISO)} até ${formatDateBR(weekendEndISO)}`,
    "",
    "*Observações:*",
    notes,
    ...(input.bookingId ? ["", `*Código da solicitação:* ${input.bookingId}`] : []),
    "",
    "A solicitação já foi salva no sistema e está aguardando análise.",
  ].join("\n");
}

export async function notifySecretaryAboutBooking(
  input: BookingNotificationInput
): Promise<NotificationStatus> {
  const enabled = process.env.WHATSAPP_NOTIFICATIONS_ENABLED === "true";
  if (!enabled) return { status: "disabled" };

  const apiUrl = process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();
  const instance = process.env.EVOLUTION_INSTANCE?.trim();
  const recipient = normalizePhone(
    process.env.SECRETARY_WHATSAPP_NUMBER ||
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
      "5551995092781"
  );

  if (!apiUrl || !apiKey || !instance || recipient.length < 10) {
    console.warn("Evolution notification skipped: missing configuration.");
    return { status: "skipped", reason: "missing_configuration" };
  }

  try {
    const response = await fetch(
      `${apiUrl}/message/sendText/${encodeURIComponent(instance)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify({
          number: recipient,
          text: buildMessage(input),
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (!response.ok) {
      const details = (await response.text().catch(() => "")).slice(0, 300);
      throw new Error(`Evolution API ${response.status}: ${details || response.statusText}`);
    }

    return { status: "sent" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown Evolution API error";
    console.error("Secretary WhatsApp notification failed:", reason);
    return { status: "failed", reason };
  }
}
