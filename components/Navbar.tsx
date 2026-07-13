"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/", label: "Início" },
  { href: "/#estrutura", label: "Estrutura" },
  { href: "/disponibilidade", label: "Disponibilidade" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#localizacao", label: "Localização" },
  { href: "/#contato", label: "Contato" },
];

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M7 3v3M17 3v3M4.5 9.5h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#080d0a]/90 backdrop-blur-xl supports-[backdrop-filter]:bg-[#080d0a]/76">
      <div className="mx-auto flex h-[68px] max-w-[1220px] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 rounded-xl"
          aria-label="Página inicial do Sítio Emanuel"
        >
          <div className="relative h-10 w-14 shrink-0 overflow-hidden">
            <Image
              src="/logo-sitio-emanuel.png"
              alt=""
              fill
              className="object-contain"
              sizes="56px"
              priority
            />
          </div>
          <span className="text-[14px] font-semibold tracking-[-0.01em] text-white sm:text-[15px]">
            Sítio Emanuel
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Navegação principal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-2.5 py-2 text-[12px] font-medium text-white/58 transition hover:bg-white/[0.055] hover:text-white lg:px-3 lg:text-[13px]"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="ml-1 hidden rounded-lg border border-white/10 px-3 py-2 text-[12px] font-medium text-white/64 transition hover:border-white/18 hover:bg-white/[0.05] hover:text-white xl:inline-flex"
          >
            Área administrativa
          </Link>
          <Link
            href="/disponibilidade"
            className="ml-2 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#22c55e] px-4 text-[12px] font-semibold text-[#041108] transition hover:bg-[#2bd268] lg:text-[13px]"
          >
            <CalendarIcon />
            Ver disponibilidade
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-white md:hidden"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          <span className="relative block h-4 w-5">
            <span className={`absolute left-0 top-0 h-px w-5 bg-current transition ${open ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`absolute left-0 top-[7px] h-px w-5 bg-current transition ${open ? "opacity-0" : ""}`} />
            <span className={`absolute left-0 top-[14px] h-px w-5 bg-current transition ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </span>
        </button>
      </div>

      <div
        id="mobile-navigation"
        className={`border-t border-white/[0.07] bg-[#090f0b] px-4 transition-all duration-200 md:hidden ${
          open ? "max-h-[520px] py-4 opacity-100" : "max-h-0 overflow-hidden py-0 opacity-0"
        }`}
      >
        <nav className="mx-auto grid max-w-[1220px] gap-1" aria-label="Navegação mobile">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-sm font-medium text-white/72 transition hover:bg-white/[0.055] hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="rounded-xl px-3 py-3 text-sm font-medium text-white/55 transition hover:bg-white/[0.055] hover:text-white"
          >
            Área administrativa
          </Link>
          <Link
            href="/disponibilidade"
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#22c55e] px-5 text-sm font-semibold text-[#041108]"
          >
            <CalendarIcon />
            Ver disponibilidade
          </Link>
        </nav>
      </div>
    </header>
  );
}
