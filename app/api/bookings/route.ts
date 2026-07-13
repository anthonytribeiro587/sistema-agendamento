import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  createRequestFingerprint,
  createSupabaseAdminClient,
  databaseErrorResponse,
  errorBody,
  parseBookingInput,
} from "@/lib/server/booking-api";

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

    revalidatePath("/disponibilidade");

    return NextResponse.json(
      {
        ok: true,
        message: "Solicitação enviada com sucesso.",
        booking,
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
