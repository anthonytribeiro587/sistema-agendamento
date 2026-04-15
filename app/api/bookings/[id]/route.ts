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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const supabase = await createSupabaseServerClient();

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;

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
    const status = String(body.status || "").toUpperCase();

    if (!["PENDING", "CONFIRMED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { ok: false, message: "Status inválido." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Erro inesperado." },
      { status: 500 }
    );
  }
}