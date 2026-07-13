import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  databaseErrorResponse,
  errorBody,
  requireAdmin,
} from "@/lib/server/booking-api";

const ALLOWED_STATUS = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"] as const;
type AllowedStatus = (typeof ALLOWED_STATUS)[number];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireAdmin();
    if (access.ok === false) {
      return NextResponse.json(errorBody("AUTH_ERROR", access.message), {
        status: access.status,
      });
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const status = String(body.status ?? "").trim().toUpperCase() as AllowedStatus;
    const reason = String(body.reason ?? "").trim().slice(0, 500) || null;

    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json(
        errorBody(
          "STATUS_INVALID",
          "Status inválido. Use PENDING, CONFIRMED, REJECTED ou CANCELLED."
        ),
        { status: 400 }
      );
    }

    const { data, error } = await access.admin.rpc("admin_update_booking_status", {
      p_booking_id: id,
      p_status: status,
      p_actor_id: access.user.id,
      p_reason: reason,
    });

    if (error) {
      const response = databaseErrorResponse(error);
      return NextResponse.json(response.body, { status: response.status });
    }

    revalidatePath("/disponibilidade");
    return NextResponse.json({ ok: true, booking: data });
  } catch (error) {
    console.error("PATCH /api/bookings/[id] failed:", error);

    return NextResponse.json(
      errorBody("INTERNAL_ERROR", "Não foi possível atualizar a solicitação."),
      { status: 500 }
    );
  }
}
