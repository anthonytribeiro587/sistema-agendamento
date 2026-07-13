import Image from "next/image";
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Estrutura para grupos",
    text: "Ambientes preparados para receber igrejas, ministérios e grupos com organização e conforto.",
  },
  {
    number: "02",
    title: "Natureza e tranquilidade",
    text: "Um espaço reservado para desacelerar, fortalecer vínculos e viver momentos especiais.",
  },
  {
    number: "03",
    title: "Reserva descomplicada",
    text: "Consulte as datas, envie a solicitação e finalize a confirmação diretamente com a equipe.",
  },
];

const faq = [
  [
    "A solicitação confirma a reserva imediatamente?",
    "Não. O pedido fica em análise até a equipe confirmar a disponibilidade e orientar os próximos passos.",
  ],
  [
    "Quantas pessoas o espaço recebe?",
    "O sistema aceita solicitações para grupos entre 40 e 140 pessoas. A capacidade ideal pode variar conforme a programação.",
  ],
  [
    "Quais dias são reservados?",
    "As reservas são organizadas por fim de semana, normalmente de sexta-feira a domingo.",
  ],
  [
    "Posso falar com a equipe antes de solicitar?",
    "Sim. O botão de WhatsApp permanece disponível durante a navegação para tirar dúvidas.",
  ],
];

export default function HomeHero() {
  return (
    <main className="overflow-hidden">
      <section className="px-4 pb-12 pt-5 sm:px-6 sm:pt-8">
        <div className="relative mx-auto min-h-[590px] max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0e0d] shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:min-h-[650px] sm:rounded-[36px]">
          <Image
            src="/fotos/1.jpeg"
            alt="Vista aérea do Sítio Emanuel"
            fill
            priority
            sizes="(max-width: 1200px) 100vw, 1152px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,5,.93)_0%,rgba(3,7,5,.72)_47%,rgba(3,7,5,.25)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15" />

          <div className="relative z-10 flex min-h-[590px] items-center px-6 py-14 sm:min-h-[650px] sm:px-12 lg:px-16">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3.5 py-2 text-xs font-medium text-emerald-100 backdrop-blur sm:text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Retiros, encontros e comunhão
              </span>

              <div className="relative mt-6 h-16 w-24 rounded-2xl border border-white/15 bg-black/35 backdrop-blur">
                <Image
                  src="/logo-sitio-emanuel.png"
                  alt="Logo Sítio Emanuel"
                  fill
                  sizes="96px"
                  className="object-contain p-2.5"
                />
              </div>

              <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-.035em] text-white sm:text-5xl">
                Um lugar para reunir pessoas e viver algo especial.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
                Estrutura, natureza e tranquilidade para retiros de igrejas, encontros de grupos e programações que merecem ser lembradas.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/disponibilidade"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-[#08110d] transition hover:-translate-y-0.5 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  Ver datas disponíveis
                </Link>
                <a
                  href="#estrutura"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[.07] px-6 text-sm font-medium text-white backdrop-blur transition hover:bg-white/[.12]"
                >
                  Conhecer o espaço
                </a>
              </div>

              <div className="mt-9 grid max-w-xl grid-cols-3 gap-2 sm:gap-3">
                {[
                  ["Gravataí/RS", "Localização"],
                  ["40 a 140", "Pessoas"],
                  ["Sex. a dom.", "Período"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3 backdrop-blur sm:px-4">
                    <strong className="block text-xs font-semibold text-white sm:text-sm">{value}</strong>
                    <span className="mt-0.5 block text-[10px] text-white/50 sm:text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-300/85">Por que escolher</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Pensado para acolher grupos com simplicidade e propósito.
            </h2>
            <p className="mt-4 leading-7 text-white/60">
              Da consulta da data ao fim de semana do encontro, cada etapa fica mais clara e tranquila.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((item) => (
              <article key={item.number} className="rounded-3xl border border-white/9 bg-white/[.035] p-6 transition hover:-translate-y-1 hover:border-emerald-200/20 hover:bg-white/[.055]">
                <span className="text-sm font-semibold text-emerald-300">{item.number}</span>
                <h3 className="mt-10 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/58">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="estrutura" className="scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-300/85">Conheça o espaço</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ambientes para convivência, descanso e programação.
              </h2>
            </div>
            <Link href="/disponibilidade" className="text-sm font-medium text-white/65 transition hover:text-white">
              Consultar disponibilidade →
            </Link>
          </div>

          <div className="mt-10 grid auto-rows-[185px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <figure className="group relative overflow-hidden rounded-3xl border border-white/10 sm:row-span-2 lg:col-span-2">
              <Image src="/fotos/1.jpeg" alt="Piscinas e área principal" fill sizes="(max-width:1024px) 100vw, 576px" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <figcaption className="absolute bottom-0 p-6 text-lg font-semibold text-white">Área de lazer e convivência</figcaption>
            </figure>
            <figure className="group relative overflow-hidden rounded-3xl border border-white/10 lg:col-span-2">
              <Image src="/fotos/2.jpeg" alt="Vista aérea da estrutura" fill sizes="(max-width:1024px) 100vw, 576px" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <figcaption className="absolute bottom-0 p-5 font-semibold text-white">Estrutura cercada pela natureza</figcaption>
            </figure>
            {[4, 6].map((photo, index) => (
              <figure key={photo} className="group relative overflow-hidden rounded-3xl border border-white/10">
                <Image src={`/fotos/${photo}.jpeg`} alt={index === 0 ? "Dormitórios" : "Área externa"} fill sizes="(max-width:640px) 100vw, 288px" className="object-cover transition duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <figcaption className="absolute bottom-0 p-5 text-sm font-semibold text-white">{index === 0 ? "Dormitórios" : "Área externa"}</figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[3, 5].map((photo) => (
              <div key={photo} className="relative h-52 overflow-hidden rounded-3xl border border-white/10 sm:h-64">
                <Image src={`/fotos/${photo}.jpeg`} alt="Ambiente do Sítio Emanuel" fill sizes="(max-width:640px) 100vw, 576px" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-white/9 bg-[linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-6 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-300/85">Reserva em três passos</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Do calendário ao contato com a equipe.</h2>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Escolha a data", "Veja os fins de semana disponíveis ou ainda em análise."],
              ["02", "Envie a solicitação", "Informe os dados do grupo e a quantidade de pessoas."],
              ["03", "Aguarde a confirmação", "A equipe analisa o pedido e entra em contato."],
            ].map(([number, title, text]) => (
              <article key={number} className="rounded-3xl border border-white/9 bg-black/20 p-6">
                <span className="text-sm font-semibold text-emerald-300">{number}</span>
                <h3 className="mt-8 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/58">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="localizacao" className="scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[.78fr_1.22fr]">
          <div className="flex flex-col justify-between rounded-[30px] border border-white/9 bg-white/[.035] p-7 sm:p-9">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-300/85">Localização</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Perto o suficiente. Tranquilo como precisa ser.</h2>
              <p className="mt-4 leading-7 text-white/60">O Sítio Emanuel fica em Gravataí/RS, em uma região cercada pela natureza e com acesso para grupos da região metropolitana.</p>
            </div>
            <a href="https://www.google.com/maps/search/?api=1&query=S%C3%ADtio+Emanuel+Retiros+Gravata%C3%AD" target="_blank" rel="noreferrer" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/12 bg-white/[.07] px-5 text-sm font-medium text-white transition hover:bg-white/[.11]">
              Abrir no Google Maps
            </a>
          </div>
          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[.03]">
            <iframe title="Localização do Sítio Emanuel" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3459.8661566685896!2d-50.96700012378962!3d-29.86813357501282!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95190d11b273ac4d%3A0xecbc16d6da05b014!2sSitio%20Emanuel%20Retiros!5e0!3m2!1spt-BR!2sbr!4v1776280247918!5m2!1spt-BR!2sbr" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-[390px] w-full border-0 grayscale-[15%] lg:h-full lg:min-h-[460px]" />
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-300/85">Dúvidas frequentes</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Informações antes de solicitar.</h2>
          </div>
          <div className="mt-9 space-y-3">
            {faq.map(([question, answer]) => (
              <details key={question} className="group rounded-2xl border border-white/9 bg-white/[.03] px-5 open:bg-white/[.05]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 font-medium text-white marker:content-none">
                  {question}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/55 transition group-open:rotate-45 group-open:text-white">+</span>
                </summary>
                <p className="max-w-3xl pb-5 pr-10 text-sm leading-6 text-white/60">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 pt-8 sm:px-6 sm:pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[34px] border border-emerald-200/15 bg-emerald-300/[.08] px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(110,231,183,.22),transparent_48%)]" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Encontre a data ideal para o seu grupo.</h2>
            <p className="mt-4 leading-7 text-white/65">Consulte a agenda e envie sua solicitação em poucos minutos.</p>
            <Link href="/disponibilidade" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-7 text-sm font-semibold text-[#08110d] transition hover:-translate-y-0.5 hover:bg-emerald-50">Consultar datas agora</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
