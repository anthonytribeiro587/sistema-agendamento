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

export async function POST() {
  try {
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

    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);

    // Tudo que terminou antes de hoje e ainda está PENDING vira REJECTED
    const { error } = await supabase
      .from("bookings")
      .update({ status: "REJECTED" })
      .lt("weekend_end", todayISO)
      .eq("status", "PENDING");

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