import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const weekendStartISO = String(body.weekendStartISO || "");
    const churchName = String(body.churchName || "");
    const contactName = String(body.contactName || "");
    const phone = String(body.phone || "");
    const email = String(body.email || "");
    const peopleCount = Number(body.peopleCount || 0);
    const notes = String(body.notes || "");

    console.log("[API] recebendo booking", { weekendStartISO, churchName, contactName });

    if (!weekendStartISO || !churchName || !contactName || !phone || !email || !peopleCount) {
      return NextResponse.json({ ok: false, message: "Dados incompletos." }, { status: 400 });
    }

    const weekendStart = new Date(weekendStartISO);
    const weekendEnd = new Date(weekendStart);
    weekendEnd.setDate(weekendEnd.getDate() + 2);

    const payload = {
      weekend_start: weekendStart.toISOString().slice(0, 10),
      weekend_end: weekendEnd.toISOString().slice(0, 10),
      church_name: churchName,
      contact_name: contactName,
      phone,
      email,
      people_count: peopleCount,
      notes,
      status: "PENDING",
    };

    console.log("[API] inserindo no supabase", payload);

    const { data, error } = await supabase.from("bookings").insert(payload).select();

    if (error) {
      console.error("[API] erro supabase:", error);
      return NextResponse.json(
        { ok: false, message: `Erro Supabase: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("[API] inserido com sucesso:", data);

    return NextResponse.json({
      ok: true,
      message: "Solicitação enviada! Em breve entraremos em contato para confirmar.",
    });
  } catch (err: any) {
    console.error("[API] erro geral:", err?.message || err);
    return NextResponse.json({ ok: false, message: "Erro ao processar." }, { status: 500 });
  }
}
