import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

function isAdminEmail(email: string | null | undefined) {
  const allowed = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return false;
  return allowed.includes(email.toLowerCase());
}

function normalizeText(value: unknown, max = 500) {
  return String(value || "").trim().slice(0, max);
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;

    if (!userData.user) {
      return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
    }

    if (!isAdminEmail(email)) {
      return NextResponse.json({ ok: false, message: "Sem permissão." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const weekendStartISO = String(body.weekendStartISO || "");
    const reason = normalizeText(body.reason, 500);

    if (!weekendStartISO) {
      return NextResponse.json({ ok: false, message: "Data inválida." }, { status: 400 });
    }

    const start = new Date(`${weekendStartISO}T00:00:00`);
    if (isNaN(start.getTime())) {
      return NextResponse.json({ ok: false, message: "Data inválida." }, { status: 400 });
    }

    const end = new Date(start);
    end.setDate(end.getDate() + 2);

    const weekend_start = start.toISOString().slice(0, 10);
    const weekend_end = end.toISOString().slice(0, 10);

    const { data: existingBlock, error: existingBlockError } = await supabase
      .from("blocks")
      .select("id")
      .eq("weekend_start", weekend_start)
      .maybeSingle();

    if (existingBlockError) {
      return NextResponse.json(
        { ok: false, message: existingBlockError.message },
        { status: 500 }
      );
    }

    if (existingBlock) {
      return NextResponse.json(
        { ok: false, message: "Este fim de semana já está bloqueado." },
        { status: 409 }
      );
    }

    const { data: existingBooking, error: existingBookingError } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("weekend_start", weekend_start)
      .in("status", ["PENDING", "CONFIRMED"])
      .maybeSingle();

    if (existingBookingError) {
      return NextResponse.json(
        { ok: false, message: existingBookingError.message },
        { status: 500 }
      );
    }

    if (existingBooking) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Não é possível bloquear uma data com solicitação pendente ou reserva confirmada.",
        },
        { status: 409 }
      );
    }

    const { error } = await supabase.from("blocks").insert({
      weekend_start,
      weekend_end,
      reason,
    });

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Erro inesperado." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;

    if (!userData.user) {
      return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
    }

    if (!isAdminEmail(email)) {
      return NextResponse.json({ ok: false, message: "Sem permissão." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const weekendStartISO = String(body.weekendStartISO || "");

    if (!weekendStartISO) {
      return NextResponse.json({ ok: false, message: "Data inválida." }, { status: 400 });
    }

    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("weekend_start", weekendStartISO);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Erro inesperado." },
      { status: 500 }
    );
  }
}