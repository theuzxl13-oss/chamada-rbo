import { NextResponse } from "next/server";
import { ErroOperacao, interpretarOperacao } from "@/domain/operacoes";
import { obterServico } from "@/server/servico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Estado atual da chamada compartilhada. */
export async function GET() {
  try {
    const estado = await obterServico().obterEstado();
    return NextResponse.json(estado, { headers: { "Cache-Control": "no-store" } });
  } catch (erro) {
    // Mostra o motivo (ex.: variável do Supabase ausente ou chave inválida) sem expor valores.
    console.error("[chamada] Erro ao ler o estado:", erro);
    return NextResponse.json(
      { ok: false, erro: erro instanceof Error ? erro.message : "Erro ao ler os dados." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/** Aplica uma operação: { id: string, op: Operacao } */
export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, codigo: "DADOS_INVALIDOS", erro: "Requisição inválida." },
      { status: 400 },
    );
  }

  const opId =
    typeof corpo === "object" && corpo !== null && "id" in corpo && typeof corpo.id === "string"
      ? corpo.id.slice(0, 100)
      : "";

  try {
    if (!opId) throw new ErroOperacao("DADOS_INVALIDOS", "Operação sem identificador.");
    const op = interpretarOperacao((corpo as { op?: unknown }).op);
    const estado = await obterServico().executar(opId, op);
    return NextResponse.json({ ok: true, estado });
  } catch (erro) {
    // Devolve o estado atual (quando disponível) para o aparelho se corrigir.
    const estado = await obterServico()
      .obterEstado()
      .catch(() => undefined);
    if (erro instanceof ErroOperacao) {
      return NextResponse.json(
        { ok: false, codigo: erro.codigo, erro: erro.message, estado },
        { status: 409 },
      );
    }
    console.error("[chamada] Erro inesperado:", erro);
    return NextResponse.json(
      {
        ok: false,
        codigo: "ERRO_INTERNO",
        erro: erro instanceof Error ? erro.message : "Erro inesperado no servidor.",
        estado,
      },
      { status: 500 },
    );
  }
}
