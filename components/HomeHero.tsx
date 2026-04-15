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
          {/* HERO */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl">
            <div className="relative h-[62vh] min-h-[460px] sm:h-[64vh]">
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

                  <h1 className="text-4xl sm:text-6xl font-semibold text-white">
                    Sítio Emanuel
                  </h1>

                  <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-white/80">
                    Espaço para retiros, encontros e eventos. Consulte a disponibilidade
                    e solicite sua reserva online.
                  </p>

                  <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      href="/disponibilidade"
                      className="rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold text-black hover:bg-white/90 transition"
                    >
                      Ver disponibilidade
                    </Link>

                  </div>

                  <div className="mt-7 flex justify-center gap-2">
                    {PHOTOS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setIdx(i)}
                        className={`h-2 w-2 rounded-full ${
                          i === idx ? "bg-white" : "bg-white/35"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO DE VALOR (ÚNICA) */}
          <section className="mt-16">
            <div className="max-w-5xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-semibold text-white">
                Um espaço ideal para retiros e encontros
              </h2>
              <p className="mt-3 text-white/70">
                Um ambiente completo para igrejas e grupos que buscam tranquilidade,
                estrutura e contato com a natureza.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-lg">
                  Estrutura completa
                </h3>
                <p className="text-white/70 text-sm mt-2">
                  Salão amplo, refeitório, dormitórios e áreas preparadas para eventos e retiros.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-lg">
                  Ambiente natural
                </h3>
                <p className="text-white/70 text-sm mt-2">
                  Um espaço tranquilo em meio à natureza, ideal para descanso e momentos espirituais.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-lg">
                  Fácil agendamento
                </h3>
                <p className="text-white/70 text-sm mt-2">
                  Consulte a disponibilidade online e envie sua solicitação em poucos minutos.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-16">
  <div className="max-w-5xl mx-auto text-center">
    <h2 className="text-2xl sm:text-3xl font-semibold text-white">
      Conheça a estrutura do Sítio Emanuel
    </h2>
    <p className="mt-3 text-white/70">
      Ambientes preparados para retiros, encontros e momentos especiais.
    </p>
  </div>

  <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="relative h-56">
        <Image
          src="/fotos/1.jpeg"
          alt="Piscinas do Sítio Emanuel"
          fill
          className="object-cover"
        />
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white">Piscinas</h3>
        <p className="mt-2 text-sm text-white/70">
          Espaço com piscinas para lazer e convivência durante o retiro.
        </p>
      </div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="relative h-56">
        <Image
          src="/fotos/4.jpeg"
          alt="Dormitórios do Sítio Emanuel"
          fill
          className="object-cover"
        />
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white">Dormitórios</h3>
        <p className="mt-2 text-sm text-white/70">
          Acomodações preparadas para receber grupos com conforto e praticidade.
        </p>
      </div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="relative h-56">
        <Image
          src="/fotos/6.jpeg"
          alt="Área externa do Sítio Emanuel"
          fill
          className="object-cover"
        />
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white">Área externa</h3>
        <p className="mt-2 text-sm text-white/70">
          Ambiente amplo e acolhedor em meio à natureza.
        </p>
      </div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="relative h-56">
        <Image
          src="/fotos/2.jpeg"
          alt="Vista aérea do Sítio Emanuel"
          fill
          className="object-cover"
        />
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white">Vista do espaço</h3>
        <p className="mt-2 text-sm text-white/70">
          Uma visão completa da estrutura e da área disponível para os eventos.
        </p>
      </div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="relative h-56">
        <Image
          src="/fotos/3.jpeg"
          alt="Área de lazer do Sítio Emanuel"
          fill
          className="object-cover"
        />
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white">Área de lazer</h3>
        <p className="mt-2 text-sm text-white/70">
          Estrutura ideal para momentos de descanso, convivência e integração.
        </p>
      </div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="relative h-56">
        <Image
          src="/fotos/5.jpeg"
          alt="Estrutura principal do Sítio Emanuel"
          fill
          className="object-cover"
        />
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white">Estrutura principal</h3>
        <p className="mt-2 text-sm text-white/70">
          Espaço preparado para receber retiros, encontros e programações especiais.
        </p>
      </div>
    </div>
  </div>
</section>

                <section className="mt-20">
  <div className="max-w-4xl mx-auto rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center">
    <h2 className="text-2xl sm:text-3xl font-semibold text-white">
      Pronto para realizar seu encontro conosco?
    </h2>
    <p className="mt-3 text-white/70">
      Consulte os fins de semana disponíveis e envie sua solicitação de reserva de forma simples e prática.
    </p>

    <div className="mt-6">
      <Link
        href="/disponibilidade"
        className="rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold text-black hover:bg-white/90 transition inline-block"
      >
        Ver disponibilidade
      </Link>
    </div>
  </div>
</section>

<footer className="mt-16 border-t border-white/10 py-8">
  <div className="max-w-6xl mx-auto px-4 text-center text-sm text-white/50">
    <p>Sítio Emanuel • Gravataí/RS</p>
    <p className="mt-1">
      Espaço para retiros, encontros e eventos.
    </p>
  </div>
</footer>
          <div className="h-10" />
        </div>
      </section>
    </main>
  );
}