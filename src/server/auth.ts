/**
 * Logins do sistema, definidos nas variáveis de ambiente (Render → Environment):
 *
 *   ADMIN_USUARIO / ADMIN_SENHA         → perfil Administrador (ex.: Hugo)
 *   PRESENCA_USUARIO / PRESENCA_SENHA   → perfil Presença (demais pessoas)
 *
 * Sem ADMIN_SENHA o login fica desligado (somente para uso local).
 * No Render, sem ADMIN_SENHA o sistema fica bloqueado até a variável ser criada.
 */
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Perfil } from "@/domain/permissoes";
import { COOKIE_SESSAO, lerToken } from "@/lib/sessao";

export function loginAtivo(): boolean {
  return Boolean(process.env.ADMIN_SENHA);
}

/** Hospedado sem senha configurada: bloqueia tudo. */
export function semConfiguracaoNaHospedagem(): boolean {
  return !loginAtivo() && Boolean(process.env.RENDER || process.env.VERCEL);
}

function igual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Confere usuário e senha. Devolve o perfil ou null. */
export function conferirCredenciais(usuario: string, senha: string): Perfil | null {
  const u = usuario.trim().toLowerCase();
  const adminUsuario = (process.env.ADMIN_USUARIO || "admin").trim().toLowerCase();
  const adminSenha = process.env.ADMIN_SENHA ?? "";
  const presencaUsuario = (process.env.PRESENCA_USUARIO || "presenca").trim().toLowerCase();
  const presencaSenha = process.env.PRESENCA_SENHA ?? "";

  if (adminSenha && u === adminUsuario && igual(senha, adminSenha)) return "ADMIN";
  if (presencaSenha && u === presencaUsuario && igual(senha, presencaSenha)) return "PRESENCA";
  return null;
}

export function nomeExibicao(perfil: Perfil): string {
  return perfil === "ADMIN" ? process.env.ADMIN_NOME || "Administrador" : "Presença";
}

/**
 * Perfil da requisição atual. Com o login desligado (uso local), todos são administradores.
 */
export async function perfilAtual(): Promise<Perfil | null> {
  if (!loginAtivo()) return semConfiguracaoNaHospedagem() ? null : "ADMIN";
  return lerToken((await cookies()).get(COOKIE_SESSAO)?.value);
}
