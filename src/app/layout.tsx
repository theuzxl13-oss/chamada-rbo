import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ProvedorPerfil } from "@/components/PerfilContexto";
import { loginAtivo, nomeExibicao, perfilAtual } from "@/server/auth";

// O perfil do usuário (cookie) e as variáveis de login são lidos a cada acesso.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Controle de Presença — Reunião de Obreiros",
  description:
    "Chamada da Reunião de Obreiros por cargo e congregação, com relatório em PDF.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const perfil = (await perfilAtual().catch(() => null)) ?? "PRESENCA";
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh font-sans antialiased">
        <ProvedorPerfil valor={{ perfil, nome: nomeExibicao(perfil), loginAtivo: loginAtivo() }}>{children}</ProvedorPerfil>
      </body>
    </html>
  );
}
