import { NextResponse } from "next/server";
import { conferirCredenciais, loginAtivo } from "@/server/auth";
import { COOKIE_SESSAO, DURACAO_SESSAO_SEGUNDOS, criarToken } from "@/lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  if (!loginAtivo()) {
    return NextResponse.json(
      { ok: false, erro: "Login não configurado: defina ADMIN_SENHA e PRESENCA_SENHA no Render (Environment)." },
      { status: 503 },
    );
  }
  const b = (await req.json().catch(() => null)) as { usuario?: unknown; senha?: unknown } | null;
  const usuario = typeof b?.usuario === "string" ? b.usuario : "";
  const senha = typeof b?.senha === "string" ? b.senha : "";
  const perfil = usuario && senha ? conferirCredenciais(usuario, senha) : null;
  if (!perfil) {
    await espera(700); // dificulta tentativas em sequência
    return NextResponse.json({ ok: false, erro: "Usuário ou senha incorretos." }, { status: 401 });
  }
  const resp = NextResponse.json({ ok: true, perfil });
  resp.cookies.set(COOKIE_SESSAO, await criarToken(perfil), {
    httpOnly: true,
    sameSite: "lax",
    // HTTPS no Render (atrás do proxy dele); HTTP apenas em uso local.
    secure: req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:",
    path: "/",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
  return resp;
}
