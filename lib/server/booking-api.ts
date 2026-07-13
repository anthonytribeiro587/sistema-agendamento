import { createHash } from "node:crypto";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BookingInput = {
  weekendStartISO: string;
  churchName: string;
  contactName: string;
  phone: string;
  email: string;
  peopleCount: number;
  notes: string;
};

type ValidationResult =
  | { ok: true; value: BookingInput }
  | { ok: false; message: string };

type AdminAccessResult =
  | { ok: true; user: User; admin: SupabaseClient }
  | { ok: false; status: number; message: string };

const DATABASE_ERRORS: Record<string, { status: number; message: string }> = {
  BOOKING_DATE_INVALID: {
    status: 400,
    message: "Escolha uma data válida que comece em uma sexta-feira.",
  },
  BOOKING_DATE_PAST: {
    status: 400,
    message: "Não é possível usar uma data que já passou.",
  },
  BOOKING_DATA_INVALID: {
    status: 400,
    message: "Revise os dados informados e tente novamente.",
  },
  DATE_RANGE_INVALID: {
    status: 400,
    message: "Período de consulta inválido.",
  },
  DATE_RANGE_TOO_LARGE: {
    status: 400,
    message: "O período consultado é maior do que o permitido.",
  },
  WEEKEND_BLOCKED: {
    status: 409,
    message: "Este fim de semana está bloqueado.",
  },
  WEEKEND_RESERVED: {
    status: 409,
    message: "Este fim de semana já possui uma reserva confirmada.",
  },
  DUPLICATE_REQUEST: {
    status: 409,
    message: "Já existe uma solicitação pendente com este WhatsApp ou e-mail para a mesma data.",
  },
  RATE_LIMITED: {
    status: 429,
    message: "Foram enviadas muitas solicitações em pouco tempo. Aguarde alguns minutos.",
  },
  NOT_ADMIN: {
    status: 403,
    message: "Seu usuário não possui permissão administrativa.",
  },
  STATUS_INVALID: {
    status: 400,
    message: "O status informado é inválido.",
  },
  BOOKING_NOT_FOUND: {
    status: 404,
    message: "Solicitação não encontrada.",
  },
  CONFIRMED_BOOKING_EXISTS: {
    status: 409,
    message: "Cancele a reserva confirmada antes de bloquear esta data.",
  },
};

function normalizeText(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizePhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 20);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseBookingInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Corpo da requisição inválido." };
  }

  const value = body as Record<string, unknown>;
  const weekendStartISO = normalizeText(value.weekendStartISO, 10);
  const churchName = normalizeText(value.churchName, 120);
  const contactName = normalizeText(value.contactName, 120);
  const phone = normalizePhone(value.phone);
  const email = normalizeText(value.email, 160).toLowerCase();
  const peopleCount = Number(value.peopleCount ?? 0);
  const notes = normalizeText(value.notes, 1000);

  if (!isISODate(weekendStartISO)) {
    return { ok: false, message: "Data inválida." };
  }

  const [year, month, day] = weekendStartISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDay() !== 5) {
    return { ok: false, message: "A reserva deve começar em uma sexta-feira." };
  }

  if (churchName.length < 2 || contactName.length < 2) {
    return { ok: false, message: "Informe a igreja e o responsável." };
  }

  if (phone.length < 10) {
    return { ok: false, message: "WhatsApp inválido." };
  }

  if (!isEmail(email)) {
    return { ok: false, message: "E-mail inválido." };
  }

  if (!Number.isInteger(peopleCount) || peopleCount < 40 || peopleCount > 140) {
    return {
      ok: false,
      message: "A quantidade de pessoas deve ser entre 40 e 140.",
    };
  }

  return {
    ok: true,
    value: {
      weekendStartISO,
      churchName,
      contactName,
      phone,
      email,
      peopleCount,
      notes,
    },
  };
}

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Configuração do Supabase incompleta: informe NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function requireAdmin(): Promise<AdminAccessResult> {
  const sessionClient = await createSupabaseServerClient();
  const { data, error } = await sessionClient.auth.getUser();

  if (error || !data.user) {
    return { ok: false, status: 401, message: "Não autenticado." };
  }

  const admin = createSupabaseAdminClient();
  const { data: adminUser, error: adminError } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();

  if (adminError) {
    return {
      ok: false,
      status: 500,
      message: "Não foi possível validar a permissão administrativa.",
    };
  }

  if (!adminUser) {
    return {
      ok: false,
      status: 403,
      message: "Seu usuário não possui permissão administrativa.",
    };
  }

  return { ok: true, user: data.user, admin };
}

export function createRequestFingerprint(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const salt =
    process.env.RATE_LIMIT_SALT ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "sitio-emanuel";

  return createHash("sha256")
    .update(`${salt}|${ip}|${userAgent}`)
    .digest("hex");
}

export function databaseErrorResponse(error: { message?: string } | null | undefined) {
  const rawMessage = error?.message || "Erro inesperado no banco de dados.";
  const code = Object.keys(DATABASE_ERRORS).find((key) => rawMessage.includes(key));

  if (code) {
    return {
      status: DATABASE_ERRORS[code].status,
      body: {
        ok: false,
        error: {
          code,
          message: DATABASE_ERRORS[code].message,
        },
        message: DATABASE_ERRORS[code].message,
      },
    };
  }

  console.error("Supabase error:", rawMessage);

  return {
    status: 500,
    body: {
      ok: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Não foi possível concluir a operação.",
      },
      message: "Não foi possível concluir a operação.",
    },
  };
}

export function errorBody(code: string, message: string) {
  return {
    ok: false,
    error: { code, message },
    message,
  };
}
