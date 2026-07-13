import type { ReactNode } from "react";
import { createSupabaseAdminClient } from "@/lib/server/booking-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AdminLayoutProps = {
  children: ReactNode;
};

function configuredAdminEmails() {
  return new Set(
    [process.env.ADMIN_EMAILS, process.env.NEXT_PUBLIC_ADMIN_EMAILS]
      .filter(Boolean)
      .join(",")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function ensureAdminRecord() {
  try {
    const sessionClient = await createSupabaseServerClient();
    const { data, error } = await sessionClient.auth.getUser();
    const user = data.user;

    if (error || !user?.email) return;

    const admin = createSupabaseAdminClient();
    const normalizedEmail = user.email.trim().toLowerCase();

    const { data: currentByUser, error: currentByUserError } = await admin
      .from("admin_users")
      .select("user_id, active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (currentByUserError) {
      console.error("Admin bootstrap lookup by user failed:", currentByUserError.message);
      return;
    }

    // Respeita bloqueios manuais: se já existe um registro para este usuário,
    // ativo ou não, o bootstrap não altera a decisão administrativa.
    if (currentByUser) return;

    const { data: currentByEmail, error: currentByEmailError } = await admin
      .from("admin_users")
      .select("user_id, email, active")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (currentByEmailError) {
      console.error("Admin bootstrap lookup by email failed:", currentByEmailError.message);
      return;
    }

    if (currentByEmail) {
      if (!currentByEmail.active) return;

      const { error: relinkError } = await admin
        .from("admin_users")
        .update({
          user_id: user.id,
          email: normalizedEmail,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", currentByEmail.user_id);

      if (relinkError) {
        console.error("Admin bootstrap relink failed:", relinkError.message);
      }
      return;
    }

    if (!configuredAdminEmails().has(normalizedEmail)) return;

    const { error: insertError } = await admin.from("admin_users").insert({
      user_id: user.id,
      email: normalizedEmail,
      role: "ADMIN",
      active: true,
    });

    if (insertError) {
      console.error("Admin bootstrap insert failed:", insertError.message);
    }
  } catch (bootstrapError) {
    console.error("Admin bootstrap failed:", bootstrapError);
  }
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await ensureAdminRecord();
  return children;
}
