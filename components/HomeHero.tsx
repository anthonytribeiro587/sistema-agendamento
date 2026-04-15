"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const SLIDE_MS = 3500;

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
      <section className="relative w-full">
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

              <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/35 to-black/55" />

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
                    Sítio Emanuel
                  </h1>

                  <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-white/80">
                    Espaço para retiros, encontros e eventos. Consulte a disponibilidade
                    e solicite sua reserva online.
                  </p>

                  <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      href="/disponibilidade"
                      className="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold text-black hover:bg-white/90 transition"
                    >
                      Ver disponibilidade
                    </Link>

                    <a
                      href="https://wa.me/5551999999999"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition"
                    >
                      Falar no WhatsApp
                    </a>
                  </div>

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

          <div className="mt-12">
            <div className="mb-6 text-center">
              <h2 className="text-2xl sm:text-3xl font-semibold text-white">
                Como funciona a reserva
              </h2>
              <p className="mt-2 text-sm sm:text-base text-white/70">
                Consulte a disponibilidade, envie sua solicitação e continue o atendimento pelo WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <span className="text-xs font-semibold tracking-[0.2em] text-white/40">
                  01
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  Consulte as datas
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  Veja os fins de semana disponíveis e escolha a melhor opção para o seu evento.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <span className="text-xs font-semibold tracking-[0.2em] text-white/40">
                  02
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  Envie sua solicitação
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  Preencha o formulário com os dados do responsável, da organização e da data desejada.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <span className="text-xs font-semibold tracking-[0.2em] text-white/40">
                  03
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  Continue no WhatsApp
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  Após o envio, o atendimento segue pelo WhatsApp para alinhar os detalhes da reserva.
                </p>
              </div>
            </div>
          </div>

          <div className="h-10" />
        </div>
      </section>
    </main>
  );
}