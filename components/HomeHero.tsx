"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const SLIDE_MS = 3500; // <-- DIMINUI/AUMENTA AQUI (ex: 2500 mais rápido)

const PHOTOS = [
  "/fotos/1.jpeg",
  "/fotos/2.jpeg",
  "/fotos/3.jpeg",
  "/fotos/4.jpeg",
  "/fotos/5.jpeg",
  "/fotos/6.jpeg",
];

export default function HomeHero() {
  const [idx, setIdx] = useState(0);

  const current = useMemo(() => PHOTOS[idx % PHOTOS.length], [idx]);

  useEffect(() => {
    const t = setInterval(() => setIdx((v) => (v + 1) % PHOTOS.length), SLIDE_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="w-full">
      {/* HERO */}
      <section className="relative w-full">
        {/* fundo */}
        <div className="relative mx-auto w-full max-w-6xl px-4 pt-6 sm:pt-10">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl">
            <div className="relative h-[70vh] min-h-[520px] sm:h-[72vh]">
              <Image
                src={current}
                alt="Sítio Emanuel"
                fill
                priority
                className="object-cover"
              />

              {/* overlay para legibilidade (sem escurecer demais) */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/35 to-black/55" />

              {/* conteúdo */}
              <div className="absolute inset-0 flex items-center justify-center px-5">
                <div className="w-full max-w-3xl text-center">
                  <div className="mx-auto mb-5 flex items-center justify-center">
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border border-white/15 bg-black/25 backdrop-blur">
                      <Image
                        src="/logo-sitio-emanuel.png"
                        alt="Sítio Emanuel"
                        fill
                        className="object-contain p-2.5"
                      />
                    </div>
                  </div>

                  <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white drop-shadow">
                    Agendamento de Retiros
                    <span className="block mt-2 text-white/90">Sítio Emanuel</span>
                  </h1>

                  <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-white/80">
                    Consulte o calendário, escolha um fim de semana disponível e envie sua
                    solicitação. Nossa equipe confirma o agendamento.
                  </p>

                  <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      href="/disponibilidade"
                      className="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold text-black hover:bg-white/90 transition"
                    >
                      Ver disponibilidade
                    </Link>

                    <Link
                      href="/admin"
                      className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition"
                    >
                      Área administrativa
                    </Link>
                  </div>

                  {/* bolinhas do slider */}
                  <div className="mt-7 flex items-center justify-center gap-2">
                    {PHOTOS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setIdx(i)}
                        aria-label={`Foto ${i + 1}`}
                        className={`h-2 w-2 rounded-full transition ${
                          i === idx ? "bg-white" : "bg-white/35 hover:bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold text-white">Calendário</h3>
              <p className="mt-2 text-sm text-white/70">
                Datas disponíveis, pendentes e confirmadas.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold text-white">Solicitação</h3>
              <p className="mt-2 text-sm text-white/70">
                Envie as informações da sua igreja em poucos minutos.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold text-white">Confirmação</h3>
              <p className="mt-2 text-sm text-white/70">
                Nossa equipe analisa e confirma o agendamento.
              </p>
            </div>
          </div>

          <div className="h-10" />
        </div>
      </section>
    </main>
  );
}
