import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, lerToken } from "@/lib/sessao";

/**
 * Exige login em todo o sistema (chamada, cadastro, painel e API).
 * As permissões por perfil (Administrador / Presença) são conferidas na API.
 */
export async function proxy(req: NextRequest) {
  const loginAtivo = Boolean(process.env.ADMIN_SENHA);
  const hospedado = Boolean(process.env.RENDER || process.env.VERCEL);
  const api = req.nextUrl.pathname.startsWith("/api/");

  if (!loginAtivo && !hospedado) return NextResponse.next(); // uso local sem senha

  if (loginAtivo && (await lerToken(req.cookies.get(COOKIE_SESSAO)?.value))) return NextResponse.next();

  if (api) {
    return NextResponse.json(
      { ok: false, codigo: "SEM_LOGIN", erro: "Sessão expirada. Entre novamente." },
      { status: 401 },
    );
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const destino = req.nextUrl.pathname + req.nextUrl.search;
  if (destino !== "/") url.searchParams.set("voltar", destino);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api/auth/login|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|logo-preta.png|logo-branca.png).*)"],
};
