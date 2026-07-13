import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#070908]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#070908]/68">
      <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
          <div className="relative h-10 w-16 overflow-hidden rounded-xl border border-white/9 bg-white/[0.045] transition group-hover:border-white/15">
            <Image src="/logo-sitio-emanuel.png" alt="Sítio Emanuel" fill className="object-contain p-1.5" sizes="64px" priority />
          </div>
          <div className="hidden leading-tight xs:block sm:block">
            <div className="text-sm font-semibold text-white sm:text-base">Sítio Emanuel</div>
            <div className="text-[11px] text-white/45">Retiros e encontros</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Navegação principal">
          <Link href="/#estrutura" className="hidden rounded-xl px-3 py-2 text-sm text-white/58 transition hover:bg-white/[0.06] hover:text-white md:inline-flex">
            O espaço
          </Link>
          <Link href="/#como-funciona" className="hidden rounded-xl px-3 py-2 text-sm text-white/58 transition hover:bg-white/[0.06] hover:text-white lg:inline-flex">
            Como funciona
          </Link>
          <Link href="/login" className="hidden rounded-xl px-3 py-2 text-sm text-white/45 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex">
            Administração
          </Link>
          <Link href="/disponibilidade" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-[#08110d] transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
            Ver datas
          </Link>
        </nav>
      </div>
    </header>
  );
}
