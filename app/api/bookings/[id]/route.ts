import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

function isAdminEmail(email: string | null | undefined) {
  const allowed = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return false;
  return allowed.includes(email.toLowerCase());
}

const ALLOWED_STATUS = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"] as const;

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const supabase = await createSupabaseServerClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const email = userData.user?.email;

    if (userError) {
      return NextResponse.json(
        { ok: false, message: userError.message },
        { status: 500 }
      );
    }

    if (!userData.user) {
      return NextResponse.json(
        { ok: false, message: "Não autenticado." },
        { status: 401 }
      );
    }

    if (!isAdminEmail(email)) {
      return NextResponse.json(
        { ok: false, message: "Sem permissão." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const status = String(body.status || "").trim().toUpperCase();

    if (!ALLOWED_STATUS.includes(status as (typeof ALLOWED_STATUS)[number])) {
      return NextResponse.json(
        {
          ok: false,
          message: "Status inválido. Use PENDING, CONFIRMED, REJECTED ou CANCELLED.",
        },
        { status: 400 }
      );
    }

    const { data: targetBooking, error: targetError } = await supabase
      .from("bookings")
      .select("id, weekend_start, status")
      .eq("id", id)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json(
        { ok: false, message: targetError.message },
        { status: 500 }
      );
    }

    if (!targetBooking) {
      return NextResponse.json(
        { ok: false, message: "Solicitação não encontrada." },
        { status: 404 }
      );
    }

    const weekendStart = String(targetBooking.weekend_start).slice(0, 10);

    // REGRA 1:
    // Confirmar uma => rejeitar todas as outras pendentes da mesma data
    if (status === "CONFIRMED") {
      const { error: confirmError } = await supabase
        .from("bookings")
        .update({ status: "CONFIRMED" })
        .eq("id", id);

      if (confirmError) {
        return NextResponse.json(
          { ok: false, message: confirmError.message },
          { status: 500 }
        );
      }

      const { error: rejectOthersError } = await supabase
        .from("bookings")
        .update({ status: "REJECTED" })
        .eq("weekend_start", weekendStart)
        .eq("status", "PENDING")
        .neq("id", id);

      if (rejectOthersError) {
        return NextResponse.json(
          { ok: false, message: rejectOthersError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    // REGRA 2:
    // Reabrir só se não existir outra confirmada para o mesmo fim de semana
    if (status === "PENDING") {
      const { data: confirmedSameWeekend, error: confirmedCheckError } = await supabase
        .from("bookings")
        .select("id")
        .eq("weekend_start", weekendStart)
        .eq("status", "CONFIRMED")
        .neq("id", id)
        .maybeSingle();

      if (confirmedCheckError) {
        return NextResponse.json(
          { ok: false, message: confirmedCheckError.message },
          { status: 500 }
        );
      }

      if (confirmedSameWeekend) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Não é possível reabrir esta solicitação porque já existe uma reserva confirmada para este fim de semana.",
          },
          { status: 409 }
        );
      }

      const { error: reopenError } = await supabase
        .from("bookings")
        .update({ status: "PENDING" })
        .eq("id", id);

      if (reopenError) {
        return NextResponse.json(
          { ok: false, message: reopenError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    // REJECTED: rejeita só a selecionada
    if (status === "REJECTED") {
      const { error: rejectError } = await supabase
        .from("bookings")
        .update({ status: "REJECTED" })
        .eq("id", id);

      if (rejectError) {
        return NextResponse.json(
          { ok: false, message: rejectError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    // CANCELLED: cancela só a selecionada
    if (status === "CANCELLED") {
      const { error: cancelError } = await supabase
        .from("bookings")
        .update({ status: "CANCELLED" })
        .eq("id", id);

      if (cancelError) {
        return NextResponse.json(
          { ok: false, message: cancelError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, message: "Operação não suportada." },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Erro inesperado." },
      { status: 500 }
    );
  }
}