import { describe, expect, it } from "vitest";
import { motivoRecusa, podeIniciarNovaReuniao } from "@/domain/permissoes";
import { aplicarOperacao, type ContextoOperacao, type Operacao } from "@/domain/operacoes";
import type { Chamada, DadosCompartilhados } from "@/domain/types";

const ctx: ContextoOperacao = { agora: () => "2026-10-11T10:00:00.000Z", novoId: () => "r1" };
const dados: DadosReuniaoTeste = { data: "2026-10-11", horario: "19:30", local: "Sede", observacao: "" };
type DadosReuniaoTeste = { data: string; horario: string; local: string; observacao: string };

function chamada(status: "em_andamento" | "finalizada", pdf: boolean): Chamada {
  let d: DadosCompartilhados = aplicarOperacao({ chamada: null, obreiros: [] }, { tipo: "criar_reuniao", dados, substituirChamadaId: null }, ctx);
  if (status === "finalizada") d = aplicarOperacao(d, { tipo: "finalizar", chamadaId: "r1" }, ctx);
  if (pdf) d = aplicarOperacao(d, { tipo: "registrar_pdf", chamadaId: "r1" }, ctx);
  return d.chamada!;
}

const OPS_LIVRES: Operacao[] = [
  { tipo: "marcar_presenca", chamadaId: "r1", obreiroId: "o1", presente: true },
  { tipo: "ajustar", chamadaId: "r1", congregacaoId: "c1", cargo: "membro" as never, delta: 1 },
  { tipo: "justificar_falta", chamadaId: "r1", obreiroId: "o1", motivo: "Trabalho" },
  { tipo: "cadastrar_obreiro", obreiro: { id: "o2", nome: "Novo", cargo: "membro" as never, congregacaoId: "c1" } },
  { tipo: "finalizar", chamadaId: "r1" },
  { tipo: "registrar_pdf", chamadaId: "r1" },
];

const OPS_ADMIN: Operacao[] = [
  { tipo: "descartar", chamadaId: "r1" },
  { tipo: "reabrir", chamadaId: "r1" },
  { tipo: "editar_obreiro", obreiro: { id: "o1", nome: "X", cargo: "membro" as never, congregacaoId: "c1" } },
  { tipo: "remover_obreiro", obreiroId: "o1" },
];

describe("permissões", () => {
  it("administrador pode tudo", () => {
    for (const op of [...OPS_LIVRES, ...OPS_ADMIN]) expect(motivoRecusa("ADMIN", op, chamada("em_andamento", false))).toBeNull();
  });

  it("presença faz a chamada e cadastra", () => {
    for (const op of OPS_LIVRES) expect(motivoRecusa("PRESENCA", op, chamada("em_andamento", false))).toBeNull();
  });

  it("presença não apaga nem altera dados", () => {
    for (const op of OPS_ADMIN) expect(motivoRecusa("PRESENCA", op, chamada("finalizada", true))).toMatch(/administrador/);
  });

  it("presença só inicia nova reunião sem chamada ou com relatório já gerado", () => {
    expect(podeIniciarNovaReuniao("PRESENCA", null)).toBe(true);
    expect(podeIniciarNovaReuniao("PRESENCA", chamada("em_andamento", false))).toBe(false);
    expect(podeIniciarNovaReuniao("PRESENCA", chamada("finalizada", false))).toBe(false);
    expect(podeIniciarNovaReuniao("PRESENCA", chamada("finalizada", true))).toBe(true);
    expect(podeIniciarNovaReuniao("ADMIN", chamada("em_andamento", false))).toBe(true);
    const nova: Operacao = { tipo: "criar_reuniao", dados, substituirChamadaId: "r1" };
    expect(motivoRecusa("PRESENCA", nova, chamada("em_andamento", false))).not.toBeNull();
  });
});
