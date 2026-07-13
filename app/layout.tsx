import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import WhatsAppButton from "@/components/WhatsAppButton";

export const metadata: Metadata = {
  metadataBase: new URL("https://sistema-agendamento-beta.vercel.app"),
  title: {
    default: "Sítio Emanuel — Retiros e Encontros",
    template: "%s | Sítio Emanuel",
  },
  description:
    "Espaço em Gravataí/RS para retiros, encontros de igrejas e eventos em grupo. Consulte as datas e envie sua solicitação de reserva.",
  applicationName: "Sítio Emanuel",
  keywords: ["Sítio Emanuel", "retiro", "retiro de igreja", "Gravataí", "espaço para eventos"],
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/favicon.ico" }],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "Sítio Emanuel — Retiros e Encontros",
    description: "Estrutura, natureza e tranquilidade para retiros e encontros em Gravataí/RS.",
    siteName: "Sítio Emanuel",
    images: [{ url: "/fotos/1.jpeg", width: 1200, height: 630, alt: "Sítio Emanuel" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070908",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#070908] text-white antialiased">
        <Navbar />
        {children}
        <WhatsAppButton />
      </body>
    </html>
  );
}
