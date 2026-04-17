import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {/* Logo maior */}
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <Image
  src="/logo-sitio-emanuel.png"
  alt="Sítio Emanuel"
  fill
  className="object-contain p-1.5"
  sizes="44px"
/>
            </div>

            <div className="leading-tight">
              <div className="text-sm sm:text-base font-semibold text-white">
                Sítio Emanuel
              </div>
              <div className="text-xs text-white/55">Agendamentos</div>
            </div>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/disponibilidade"
              className="rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              Disponibilidade
            </Link>

            <Link
              href="/admin"
              className="rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              Área administrativa
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
