"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const GOOGLE_LINKS = {
  allReviews: "https://share.google/1Tw9zT7p248iLoEYO",
  malu: "https://share.google/JVthegLrnfq2jgCLw",
  andre: "https://share.google/gMPxT3wgDXf8IXMH2",
} as const;

const REVIEWS = [
  {
    name: "Malu",
    initial: "M",
    rating: 4,
    text: "Lugar lindo, aconchegante. Ótimo para retiros, reuniões especiais, bom atendimento, bons alojamentos.",
    href: GOOGLE_LINKS.malu,
  },
  {
    name: "André Cunha",
    initial: "A",
    rating: 5,
    text: "Simplesmente maravilhoso, o meu ED neste lugar foi tremendo. Com certeza Jesus se faz presente neste lugar!",
    href: GOOGLE_LINKS.andre,
  },
] as const;

function Stars({ rating = 5 }: { rating?: number }) {
  return (
    <span
      aria-label={`${rating} de 5 estrelas`}
      className="inline-flex gap-0.5 text-[15px] tracking-tight text-[#fbbc04]"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden="true" className={index < rating ? "" : "text-white/20"}>
          ★
        </span>
      ))}
    </span>
  );
}

function ExternalArrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M8 16 16 8M10 8h6v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReviewsSection() {
  return (
    <section
      aria-labelledby="avaliacoes-title"
      className="px-4 py-14 sm:px-6 sm:py-18"
    >
      <div className="mx-auto max-w-[1120px]">
        <div className="rounded-[22px] border border-white/[0.075] bg-white/[0.026] p-5 sm:p-8">
          <div className="flex flex-col gap-6 border-b border-white/[0.07] pb-7 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6ee7a0]">
                Avaliações no Google
              </p>
              <h2
                id="avaliacoes-title"
                className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-white sm:text-[30px]"
              >
                Quem já esteve aqui recomenda.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/52">
                Experiências reais de pessoas e grupos que já conheceram o Sítio Emanuel.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3">
                <span className="text-3xl font-semibold tracking-[-0.04em] text-white">4,9</span>
                <div>
                  <Stars />
                  <p className="mt-0.5 text-[11px] text-white/45">60+ avaliações</p>
                </div>
              </div>

              <a
                href={GOOGLE_LINKS.allReviews}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-[12px] font-semibold text-[#07110a] transition hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                Ver avaliações no Google
                <ExternalArrow />
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {REVIEWS.map((review) => (
              <article
                key={review.name}
                className="flex h-full flex-col rounded-[18px] border border-white/[0.075] bg-black/15 p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4ade80]/12 text-sm font-semibold text-[#8cf0b2]">
                      {review.initial}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{review.name}</h3>
                      <p className="mt-0.5 text-[11px] text-white/42">Avaliação publicada no Google</p>
                    </div>
                  </div>
                  <Stars rating={review.rating} />
                </div>

                <blockquote className="mt-5 flex-1 text-[13px] leading-6 text-white/65">
                  “{review.text}”
                </blockquote>

                <a
                  href={review.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-[12px] font-semibold text-[#6ee7a0] transition hover:text-[#8cf0b2]"
                >
                  Conferir no Google
                  <ExternalArrow />
                </a>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function GoogleReviewsPortal() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const nextSection = document.getElementById("como-funciona");
    if (!nextSection?.parentElement) return;

    let mount = document.getElementById("google-reviews-section-root");
    let createdByComponent = false;

    if (!mount) {
      mount = document.createElement("div");
      mount.id = "google-reviews-section-root";
      nextSection.parentElement.insertBefore(mount, nextSection);
      createdByComponent = true;
    }

    setTarget(mount);

    return () => {
      setTarget(null);
      if (createdByComponent && mount?.parentElement) mount.remove();
    };
  }, []);

  return target ? createPortal(<ReviewsSection />, target) : null;
}
