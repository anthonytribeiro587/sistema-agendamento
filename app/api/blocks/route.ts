import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  databaseErrorResponse,
  errorBody,
  requireAdmin,
} from "@/lib/server/booking-api";

function normalizeDate(value: unknown) {
  return String(value ?? "").trim().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const access = await requireAdmin();
    if (access.ok === false) {
      return NextResponse.json(errorBody("AUTH_ERROR", access.message), {
        status: access.status,
      });
    }

    const body = await request.json().catch(() => ({}));
    const weekendStartISO = normalizeDate(body.weekendStartISO);
    const reason = String(body.reason ?? "").trim().slice(0, 500);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekendStartISO)) {
      return NextResponse.json(errorBody("VALIDATION_ERROR", "Data inválida."), {
        status: 400,
      });
    }

    const { data, error } = await access.admin.rpc("admin_block_weekend", {
      p_weekend_start: weekendStartISO,
      p_reason: reason,
      p_actor_id: access.user.id,
    });

    if (error) {
      const response = databaseErrorResponse(error);
      return NextResponse.json(response.body, { status: response.status });
    }

    revalidatePath("/disponibilidade");
    return NextResponse.json({ ok: true, block: data });
  } catch (error) {
    console.error("POST /api/blocks failed:", error);

    return NextResponse.json(
      errorBody("INTERNAL_ERROR", "Não foi possível bloquear a data."),
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await requireAdmin();
    if (access.ok === false) {
      return NextResponse.json(errorBody("AUTH_ERROR", access.message), {
        status: access.status,
      });
    }

    const body = await request.json().catch(() => ({}));
    const weekendStartISO = normalizeDate(body.weekendStartISO);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekendStartISO)) {
      return NextResponse.json(errorBody("VALIDATION_ERROR", "Data inválida."), {
        status: 400,
      });
    }

    const { data, error } = await access.admin.rpc("admin_unblock_weekend", {
      p_weekend_start: weekendStartISO,
      p_actor_id: access.user.id,
    });

    if (error) {
      const response = databaseErrorResponse(error);
      return NextResponse.json(response.body, { status: response.status });
    }

    revalidatePath("/disponibilidade");
    return NextResponse.json({ ok: true, removed: Boolean(data) });
  } catch (error) {
    console.error("DELETE /api/blocks failed:", error);

    return NextResponse.json(
      errorBody("INTERNAL_ERROR", "Não foi possível desbloquear a data."),
      { status: 500 }
    );
  }
}
