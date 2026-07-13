import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GoogleReviewsPortal from "@/components/GoogleReviewsPortal";
import Navbar from "@/components/Navbar";
import PhotoGalleryOverlay from "@/components/PhotoGalleryOverlay";
import WhatsAppButton from "@/components/WhatsAppButton";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sistema-agendamento-beta.vercel.app"),
  title: {
    default: "Sítio Emanuel — Retiros e Encontros",
    template: "%s | Sítio Emanuel",
  },
  description:
    "Espaço em Gravataí/RS para retiros, encontros de igrejas e eventos em grupo. Consulte as datas e envie sua solicitação de reserva.",
  applicationName: "Sítio Emanuel",
  keywords: [
    "Sítio Emanuel",
    "retiro",
    "retiro de igreja",
    "Gravataí",
    "espaço para eventos",
  ],
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/favicon.ico" }],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "Sítio Emanuel — Retiros e Encontros",
    description:
      "Estrutura, natureza e tranquilidade para retiros e encontros em Gravataí/RS.",
    siteName: "Sítio Emanuel",
    images: [
      {
        url: "/fotos/2.jpeg",
        width: 1200,
        height: 630,
        alt: "Vista do Sítio Emanuel",
      },
    ],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080d0a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-[#080d0a] text-white antialiased">
        <Navbar />
        {children}
        <GoogleReviewsPortal />
        <PhotoGalleryOverlay />
        <WhatsAppButton />
      </body>
    </html>
  );
}
