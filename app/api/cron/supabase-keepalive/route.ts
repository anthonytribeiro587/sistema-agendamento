import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/booking-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET não configurado." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { ok: false, error: "Não autorizado." },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("bookings").select("id").limit(1);

    if (error) {
      console.error("[supabase-keepalive] Falha ao consultar o banco:", error);

      return NextResponse.json(
        { ok: false, error: "Falha ao consultar o Supabase." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        database: "reachable",
        checkedAt: new Date().toISOString(),
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("[supabase-keepalive] Erro inesperado:", error);

    return NextResponse.json(
      { ok: false, error: "Não foi possível consultar o Supabase." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
