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

function isISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeText(value: unknown, max = 255) {
  return String(value || "").trim().slice(0, max);
}

function normalizePhone(value: unknown) {
  return String(value || "").replace(/[^\d]/g, "").slice(0, 20);
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: userData } = await supabase.auth.getUser();
    const emailAdmin = userData.user?.email;

    if (!userData.user) {
      return NextResponse.json(
        { ok: false, message: "Não autenticado." },
        { status: 401 }
      );
    }

    if (!isAdminEmail(emailAdmin)) {
      return NextResponse.json(
        { ok: false, message: "Sem permissão." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, message: "Corpo da requisição inválido." },
        { status: 400 }
      );
    }

    const weekendStartISO = normalizeText(body.weekendStartISO, 10);
    const churchName = normalizeText(body.churchName, 120);
    const contactName = normalizeText(body.contactName, 120);
    const phone = normalizePhone(body.phone);
    const email = normalizeText(body.email, 160).toLowerCase();
    const peopleCount = Number(body.peopleCount || 0);
    const notes = normalizeText(body.notes, 1000);

    if (
      !weekendStartISO ||
      !churchName ||
      !contactName ||
      !phone ||
      !email ||
      !peopleCount
    ) {
      return NextResponse.json(
        { ok: false, message: "Dados incompletos." },
        { status: 400 }
      );
    }

    if (!isISODate(weekendStartISO)) {
      return NextResponse.json(
        { ok: false, message: "Data inválida." },
        { status: 400 }
      );
    }

    if (!isEmail(email)) {
      return NextResponse.json(
        { ok: false, message: "E-mail inválido." },
        { status: 400 }
      );
    }

    if (phone.length < 10) {
      return NextResponse.json(
        { ok: false, message: "WhatsApp inválido." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(peopleCount) || peopleCount < 40 || peopleCount > 140) {
      return NextResponse.json(
        { ok: false, message: "A quantidade de pessoas deve ser entre 40 e 140." },
        { status: 400 }
      );
    }

    const weekendStart = new Date(`${weekendStartISO}T00:00:00`);
    if (Number.isNaN(weekendStart.getTime())) {
      return NextResponse.json(
        { ok: false, message: "Data inválida." },
        { status: 400 }
      );
    }

    const weekendEnd = new Date(weekendStart);
    weekendEnd.setDate(weekendEnd.getDate() + 2);

    const weekendStartFormatted = weekendStart.toISOString().slice(0, 10);
    const weekendEndFormatted = weekendEnd.toISOString().slice(0, 10);

    const { data: blockRow, error: blockError } = await supabase
      .from("blocks")
      .select("id")
      .eq("weekend_start", weekendStartFormatted)
      .maybeSingle();

    if (blockError) {
      return NextResponse.json(
        { ok: false, message: blockError.message },
        { status: 500 }
      );
    }

    if (blockRow) {
      return NextResponse.json(
        { ok: false, message: "Este fim de semana está bloqueado." },
        { status: 409 }
      );
    }

    const { data: existingBookings, error: existingError } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("weekend_start", weekendStartFormatted)
      .in("status", ["PENDING", "CONFIRMED"]);

    if (existingError) {
      return NextResponse.json(
        { ok: false, message: existingError.message },
        { status: 500 }
      );
    }

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Este fim de semana já possui solicitação pendente ou reserva confirmada.",
        },
        { status: 409 }
      );
    }

    const { error } = await supabase.from("bookings").insert({
      weekend_start: weekendStartFormatted,
      weekend_end: weekendEndFormatted,
      church_name: churchName,
      contact_name: contactName,
      phone,
      email,
      people_count: peopleCount,
      notes,
      status: "CONFIRMED",
    });

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