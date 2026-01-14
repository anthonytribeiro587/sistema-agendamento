"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Login do Admin</h1>
      <p className="text-white/70 text-sm">
        Acesso restrito. Apenas e-mails autorizados conseguem entrar no painel.
      </p>

      <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm text-white/80">E-mail</label>
          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@dominio.com"
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-white/80">Senha</label>
          <input
            type="password"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <button
          disabled={loading}
          className="w-full rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90 transition disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {msg ? <p className="text-sm text-red-200">{msg}</p> : null}
      </form>

      <p className="text-xs text-white/50">
        Se você ainda não criou um usuário admin no Supabase, crie em: Authentication → Users.
      </p>
    </div>
  );
}
