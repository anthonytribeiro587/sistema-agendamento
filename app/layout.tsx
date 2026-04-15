import "./globals.css";
import Navbar from "@/components/Navbar";
import WhatsAppButton from "@/components/WhatsAppButton";

export const metadata = {
  title: "Sítio Emanuel — Agendamentos",
  description: "Agendamento de retiros no Sítio Emanuel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-black text-white antialiased">
        {/* Navbar aparece UMA ÚNICA VEZ */}
        <Navbar />

        {/* Conteúdo das páginas */}
        <main className="relative">
          {children}
        </main>
        <WhatsAppButton />
      </body>
    </html>
  );
}
