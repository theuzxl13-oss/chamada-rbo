import { NextResponse } from "next/server";
import { ErroOperacao, interpretarOperacao } from "@/domain/operacoes";
import { obterServico } from "@/server/servico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Estado atual da chamada compartilhada. */
export async function GET() {
  const estado = await obterServico().obterEstado();
  return NextResponse.json(estado, { headers: { "Cache-Control": "no-store" } });
}

/** Aplica uma operação: { id: string, op: Operacao } */
export async function POST(request: Request) {
  const servico = obterServico();
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
    const estado = await servico.executar(opId, op);
    return NextResponse.json({ ok: true, estado });
  } catch (erro) {
    const estado = await servico.obterEstado();
    if (erro instanceof ErroOperacao) {
      return NextResponse.json(
        { ok: false, codigo: erro.codigo, erro: erro.message, estado },
        { status: 409 },
      );
    }
    console.error("[chamada] Erro inesperado:", erro);
    return NextResponse.json(
      { ok: false, codigo: "ERRO_INTERNO", erro: "Erro inesperado no servidor.", estado },
      { status: 500 },
    );
  }
}
