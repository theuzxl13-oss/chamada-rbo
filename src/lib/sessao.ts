/**
 * Sessão de login: token assinado (HMAC-SHA256) guardado em cookie httpOnly.
 * Usa Web Crypto para funcionar no Proxy e nas rotas da API.
 */
import type { Perfil } from "@/domain/permissoes";

export const COOKIE_SESSAO = "sessao_rbo";
/** 30 dias: os aparelhos da chamada e a TV do painel não precisam entrar toda semana. */
export const DURACAO_SESSAO_SEGUNDOS = 30 * 24 * 60 * 60;

interface DadosSessao {
  p: Perfil;
  e: number;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deB64url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

/**
 * Segredo das sessões. Inclui as senhas: ao trocar uma senha no Render,
 * todos os aparelhos precisam entrar de novo.
 */
function segredo(): string {
  return (
    process.env.SESSAO_SEGREDO ||
    [
      "chamada-rbo",
      process.env.ADMIN_SENHA ?? "",
      process.env.PRESENCA_SENHA ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "local",
    ].join("|")
  );
}

async function chave() {
  return crypto.subtle.importKey("raw", enc.encode(segredo()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function criarToken(perfil: Perfil): Promise<string> {
  const dados: DadosSessao = { p: perfil, e: Math.floor(Date.now() / 1000) + DURACAO_SESSAO_SEGUNDOS };
  const corpo = b64url(enc.encode(JSON.stringify(dados)));
  const assinatura = new Uint8Array(await crypto.subtle.sign("HMAC", await chave(), enc.encode(corpo)));
  return `${corpo}.${b64url(assinatura)}`;
}

/** Perfil da sessão, ou null se o token for inválido/expirado. */
export async function lerToken(token: string | undefined | null): Promise<Perfil | null> {
  if (!token) return null;
  const [corpo, assinatura] = token.split(".");
  if (!corpo || !assinatura) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await chave(), deB64url(assinatura), enc.encode(corpo));
    if (!ok) return null;
    const dados = JSON.parse(new TextDecoder().decode(deB64url(corpo))) as DadosSessao;
    if ((dados.p !== "ADMIN" && dados.p !== "PRESENCA") || dados.e < Date.now() / 1000) return null;
    return dados.p;
  } catch {
    return null;
  }
}
