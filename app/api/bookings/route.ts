import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  createRequestFingerprint,
  createSupabaseAdminClient,
  databaseErrorResponse,
  errorBody,
  parseBookingInput,
} from "@/lib/server/booking-api";
import { notifySecretaryAboutBooking } from "@/lib/server/evolution-notification";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    // Campo-isca para robôs simples. Para uma pessoa real ele permanece vazio.
    if (
      body &&
      typeof body === "object" &&
      String((body as Record<string, unknown>).website ?? "").trim()
    ) {
      return NextResponse.json(
        { ok: true, message: "Solicitação recebida." },
        { status: 201 }
      );
    }

    const parsed = parseBookingInput(body);
    if (parsed.ok === false) {
      return NextResponse.json(errorBody("VALIDATION_ERROR", parsed.message), {
        status: 400,
      });
    }

    const supabase = createSupabaseAdminClient();
    const input = parsed.value;

    const { data, error } = await supabase.rpc("create_booking_request", {
      p_weekend_start: input.weekendStartISO,
      p_church_name: input.churchName,
      p_contact_name: input.contactName,
      p_phone: input.phone,
      p_email: input.email,
      p_people_count: input.peopleCount,
      p_notes: input.notes,
      p_request_fingerprint: createRequestFingerprint(request),
    });

    if (error) {
      const response = databaseErrorResponse(error);
      return NextResponse.json(response.body, { status: response.status });
    }

    const booking = Array.isArray(data) ? data[0] : data;
    const bookingId =
      booking && typeof booking === "object" && "id" in booking
        ? String((booking as { id?: unknown }).id ?? "") || null
        : null;

    // O aviso é enviado somente depois de a solicitação estar salva. Se a Evolution
    // estiver fora do ar, o pedido continua registrado e a resposta ao visitante não falha.
    const notification = await notifySecretaryAboutBooking({
      ...input,
      bookingId,
    });

    revalidatePath("/disponibilidade");

    return NextResponse.json(
      {
        ok: true,
        message: "Solicitação enviada com sucesso.",
        booking,
        notification: notification.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/bookings failed:", error);

    return NextResponse.json(
      errorBody(
        "INTERNAL_ERROR",
        "Não foi possível enviar a solicitação agora. Tente novamente."
      ),
      { status: 500 }
    );
  }
}
