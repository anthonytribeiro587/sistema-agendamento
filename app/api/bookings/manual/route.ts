import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  databaseErrorResponse,
  errorBody,
  parseBookingInput,
  requireAdmin,
} from "@/lib/server/booking-api";

export async function POST(request: Request) {
  try {
    const access = await requireAdmin();
    if (access.ok === false) {
      return NextResponse.json(errorBody("AUTH_ERROR", access.message), {
        status: access.status,
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = parseBookingInput(body);

    if (parsed.ok === false) {
      return NextResponse.json(errorBody("VALIDATION_ERROR", parsed.message), {
        status: 400,
      });
    }

    const input = parsed.value;
    const { data, error } = await access.admin.rpc("create_manual_booking", {
      p_weekend_start: input.weekendStartISO,
      p_church_name: input.churchName,
      p_contact_name: input.contactName,
      p_phone: input.phone,
      p_email: input.email,
      p_people_count: input.peopleCount,
      p_notes: input.notes,
      p_actor_id: access.user.id,
    });

    if (error) {
      const response = databaseErrorResponse(error);
      return NextResponse.json(response.body, { status: response.status });
    }

    revalidatePath("/disponibilidade");
    return NextResponse.json({ ok: true, booking: data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bookings/manual failed:", error);

    return NextResponse.json(
      errorBody("INTERNAL_ERROR", "Não foi possível criar a reserva manual."),
      { status: 500 }
    );
  }
}
