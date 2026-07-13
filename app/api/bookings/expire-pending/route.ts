import { NextResponse } from "next/server";
import {
  databaseErrorResponse,
  errorBody,
  requireAdmin,
} from "@/lib/server/booking-api";

export async function POST() {
  try {
    const access = await requireAdmin();
    if (access.ok === false) {
      return NextResponse.json(errorBody("AUTH_ERROR", access.message), {
        status: access.status,
      });
    }

    const { data, error } = await access.admin.rpc("expire_pending_bookings");
    if (error) {
      const response = databaseErrorResponse(error);
      return NextResponse.json(response.body, { status: response.status });
    }

    return NextResponse.json({ ok: true, expired: Number(data ?? 0) });
  } catch (error) {
    console.error("POST /api/bookings/expire-pending failed:", error);

    return NextResponse.json(
      errorBody("INTERNAL_ERROR", "Não foi possível atualizar as solicitações expiradas."),
      { status: 500 }
    );
  }
}
