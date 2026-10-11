import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormLogin } from "@/components/login/FormLogin";
import { loginAtivo, perfilAtual, semConfiguracaoNaHospedagem } from "@/server/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Entrar — Reunião de Obreiros" };

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const { voltar } = await searchParams;
  const destino = voltar && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/";
  if (loginAtivo() && (await perfilAtual())) redirect(destino);
  if (!loginAtivo() && !semConfiguracaoNaHospedagem()) redirect(destino);
  return <FormLogin destino={destino} naoConfigurado={semConfiguracaoNaHospedagem()} />;
}
