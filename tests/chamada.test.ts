import { describe, expect, it } from "vitest";
import { CARGOS_HIERARQUIA } from "@/domain/cargos";
import { calcularResumo, validarChamada } from "@/domain/calculos";
import { CONGREGACOES, filtrarCongregacoes } from "@/domain/congregacoes";
import { nomeArquivoPdf } from "@/domain/formatacao";
import {
  aplicarOperacao,
  ErroOperacao,
  normalizarChamada,
  type ContextoOperacao,
  type Operacao,
} from "@/domain/operacoes";
import type { DadosCompartilhados, Obreiro } from "@/domain/types";

let seq = 0;
const ctx: ContextoOperacao = {
  agora: () => "2026-09-27T17:00:00.000Z",
  novoId: () => `reuniao-${++seq}`,
};

const VAZIO: DadosCompartilhados = { chamada: null, obreiros: [] };

function aplicar(dados: DadosCompartilhados, ops: Operacao[]): DadosCompartilhados {
  return ops.reduce((d, op) => aplicarOperacao(d, op, ctx), dados);
}

function novaReuniao(dados: DadosCompartilhados = VAZIO, data = "2026-09-27"): DadosCompartilhados {
  return aplicar(dados, [
    {
      tipo: "criar_reuniao",
      dados: { data, horario: "14:00", local: "Sede do Setor", observacao: "" },
      substituirChamadaId: dados.chamada?.reuniao.id ?? null,
    },
  ]);
}

const id = (d: DadosCompartilhados) => d.chamada!.reuniao.id;

/** Define os não cadastrados de uma congregação (ordem: pastor ... membro). */
function definirAvulsos(d: DadosCompartilhados, congregacaoId: string, valores: number[]) {
  return aplicar(
    d,
    CARGOS_HIERARQUIA.map((cargo, i) => ({
      tipo: "definir" as const,
      chamadaId: id(d),
      congregacaoId,
      cargo,
      valor: valores[i],
    })),
  );
}

function cadastrar(d: DadosCompartilhados, obreiros: Obreiro[]) {
  return aplicar(d, obreiros.map((obreiro) => ({ tipo: "cadastrar_obreiro" as const, obreiro })));
}

const PEDRO: Obreiro = { id: "o1", nome: "Pedro Alves", cargo: "diacono", congregacaoId: "sede" };
const ANA: Obreiro = { id: "o2", nome: "Ana Costa", cargo: "membro", congregacaoId: "sede" };
const ERICA: Obreiro = { id: "o3", nome: "Érica Martins", cargo: "pastor", congregacaoId: "campestre" };
const BRUNO: Obreiro = { id: "o4", nome: "Bruno Lima", cargo: "presbitero", congregacaoId: "campestre" };

describe("congregações", () => {
  it("possui as 33 congregações fixas", () => {
    expect(CONGREGACOES).toHaveLength(33);
    expect(CONGREGACOES[0].nome).toBe("Sede");
    expect(CONGREGACOES[32].nome).toBe("Horizonte Azul");
    expect(new Set(CONGREGACOES.map((c) => c.id)).size).toBe(33);
  });

  it("busca 'Santa' retorna as quatro congregações Santa", () => {
    expect(filtrarCongregacoes("Santa").map((c) => c.nome)).toEqual([
      "Santa Izabel",
      "Santa Fé",
      "Santa Rita",
      "Santa Júlia",
    ]);
  });

  it("busca ignora acentos", () => {
    expect(filtrarCongregacoes("itoror").map((c) => c.nome)).toEqual(["Itororó"]);
  });
});

describe("cadastro de obreiros", () => {
  it("cadastra, edita e remove", () => {
    let d = cadastrar(VAZIO, [PEDRO]);
    expect(d.obreiros).toHaveLength(1);
    d = aplicar(d, [{ tipo: "editar_obreiro", obreiro: { ...PEDRO, cargo: "presbitero" } }]);
    expect(d.obreiros[0].cargo).toBe("presbitero");
    d = aplicar(d, [{ tipo: "remover_obreiro", obreiroId: PEDRO.id }]);
    expect(d.obreiros).toHaveLength(0);
  });

  it("não permite o mesmo nome duas vezes na mesma congregação", () => {
    const d = cadastrar(VAZIO, [PEDRO]);
    expect(() => cadastrar(d, [{ ...PEDRO, id: "x", nome: "  pedro   ALVES " }])).toThrow(/já está cadastrado/);
    // em outra congregação é permitido
    expect(cadastrar(d, [{ ...PEDRO, id: "y", congregacaoId: "cipo" }]).obreiros).toHaveLength(2);
  });

  it("exige nome, cargo e congregação válidos", () => {
    expect(() => cadastrar(VAZIO, [{ ...PEDRO, nome: " " }])).toThrow(ErroOperacao);
    expect(() => cadastrar(VAZIO, [{ ...PEDRO, congregacaoId: "inexistente" }])).toThrow(ErroOperacao);
  });

  it("o cadastro é mantido ao iniciar nova reunião", () => {
    let d = novaReuniao(cadastrar(VAZIO, [PEDRO, ANA]));
    d = novaReuniao(d, "2026-10-25");
    expect(d.obreiros).toHaveLength(2);
  });
});

describe("chamada", () => {
  it("nova reunião começa com tudo em zero e nenhuma congregação conferida", () => {
    const r = calcularResumo(novaReuniao().chamada!);
    expect(r.totalGeral).toBe(0);
    expect(r.conferidas).toBe(0);
    expect(r.listaGeral).toHaveLength(0);
    expect(r.congregacoes.every((l) => l.total === 0 && !l.conferida)).toBe(true);
  });

  it("presença por nome soma no cargo e na congregação do obreiro", () => {
    let d = novaReuniao(cadastrar(VAZIO, [PEDRO, ANA, ERICA, BRUNO]));
    d = aplicar(d, [PEDRO, ANA, ERICA].map((o) => ({
      tipo: "marcar_presenca" as const,
      chamadaId: id(d),
      obreiroId: o.id,
      presente: true,
    })));
    const r = calcularResumo(d.chamada!);
    expect(r.congregacoes.find((l) => l.id === "sede")!.total).toBe(2);
    expect(r.congregacoes.find((l) => l.id === "campestre")!.total).toBe(1);
    expect(r.porCargo.diacono).toBe(1);
    expect(r.porCargo.pastor).toBe(1);
    expect(r.totalGeral).toBe(3);
    // ordem alfabética (Ana, Érica, Pedro)
    expect(r.listaGeral.map((p) => p.nome)).toEqual(["Ana Costa", "Érica Martins", "Pedro Alves"]);
    expect(r.congregacoes.find((l) => l.id === "sede")!.presentes.map((p) => p.nome)).toEqual([
      "Ana Costa",
      "Pedro Alves",
    ]);

    // desmarcar
    d = aplicar(d, [{ tipo: "marcar_presenca", chamadaId: id(d), obreiroId: PEDRO.id, presente: false }]);
    expect(calcularResumo(d.chamada!).totalGeral).toBe(2);
  });

  it("soma presentes por nome + não cadastrados", () => {
    let d = novaReuniao(cadastrar(VAZIO, [PEDRO]));
    d = aplicar(d, [{ tipo: "marcar_presenca", chamadaId: id(d), obreiroId: PEDRO.id, presente: true }]);
    d = definirAvulsos(d, "sede", [2, 3, 8, 10, 15, 20]); // 58 avulsos
    d = definirAvulsos(d, "campestre", [1, 2, 5, 6, 8, 8]); // 30
    const r = calcularResumo(d.chamada!);
    expect(r.congregacoes.find((l) => l.id === "sede")!.total).toBe(59);
    expect(r.porCargo.diacono).toBe(10 + 1 + 6);
    expect(r.totalAvulsos).toBe(88);
    expect(r.totalCadastradosPresentes).toBe(1);
    expect(r.totalPorCargos).toBe(89);
    expect(r.totalPorCongregacoes).toBe(89);
    expect(r.consistente).toBe(true);
  });

  it("botões + e - somam e subtraem 1 e nunca ficam negativos", () => {
    let d = novaReuniao();
    const op = (delta: number): Operacao => ({
      tipo: "ajustar",
      chamadaId: id(d),
      congregacaoId: "sede",
      cargo: "diacono",
      delta,
    });
    d = aplicar(d, [op(1), op(1), op(1)]);
    expect(d.chamada!.congregacoes.sede.avulsos.diacono).toBe(3);
    d = aplicar(d, [op(-1)]);
    expect(d.chamada!.congregacoes.sede.avulsos.diacono).toBe(2);
    d = aplicar(d, [op(-1), op(-1), op(-1), op(-1)]);
    expect(d.chamada!.congregacoes.sede.avulsos.diacono).toBe(0);
  });

  it("valor digitado negativo vira zero", () => {
    let d = novaReuniao();
    d = aplicar(d, [
      { tipo: "definir", chamadaId: id(d), congregacaoId: "sede", cargo: "membro", valor: -5 },
    ]);
    expect(d.chamada!.congregacoes.sede.avulsos.membro).toBe(0);
  });

  it("concluir congregação não impede correções", () => {
    let d = novaReuniao();
    d = aplicar(d, [
      { tipo: "definir", chamadaId: id(d), congregacaoId: "sede", cargo: "diacono", valor: 10 },
      { tipo: "marcar_conferida", chamadaId: id(d), congregacaoId: "sede", conferida: true },
      { tipo: "definir", chamadaId: id(d), congregacaoId: "sede", cargo: "diacono", valor: 11 },
    ]);
    expect(d.chamada!.congregacoes.sede.conferida).toBe(true);
    expect(d.chamada!.congregacoes.sede.avulsos.diacono).toBe(11);
  });

  it("diferencia 'conferida — 0 presentes' de 'não conferida'", () => {
    let d = novaReuniao();
    d = aplicar(d, [{ tipo: "marcar_conferida", chamadaId: id(d), congregacaoId: "cipo", conferida: true }]);
    const r = calcularResumo(d.chamada!);
    expect(r.congregacoes.find((l) => l.id === "cipo")!.situacao).toBe("conferida_sem_presenca");
    expect(r.congregacoes.find((l) => l.id === "sede")!.situacao).toBe("nao_conferida");
  });

  it("presença continua registrada se o obreiro for removido do cadastro", () => {
    let d = novaReuniao(cadastrar(VAZIO, [PEDRO]));
    d = aplicar(d, [
      { tipo: "marcar_presenca", chamadaId: id(d), obreiroId: PEDRO.id, presente: true },
      { tipo: "remover_obreiro", obreiroId: PEDRO.id },
    ]);
    expect(calcularResumo(d.chamada!).listaGeral.map((p) => p.nome)).toEqual(["Pedro Alves"]);
  });

  it("chamada finalizada bloqueia alterações até ser reaberta", () => {
    let d = novaReuniao(cadastrar(VAZIO, [PEDRO]));
    d = aplicar(d, [{ tipo: "finalizar", chamadaId: id(d) }]);
    expect(() =>
      aplicar(d, [{ tipo: "marcar_presenca", chamadaId: id(d), obreiroId: PEDRO.id, presente: true }]),
    ).toThrow(ErroOperacao);
    d = aplicar(d, [
      { tipo: "reabrir", chamadaId: id(d) },
      { tipo: "ajustar", chamadaId: id(d), congregacaoId: "sede", cargo: "pastor", delta: 1 },
    ]);
    expect(d.chamada!.congregacoes.sede.avulsos.pastor).toBe(1);
  });

  it("nova reunião zera TODAS as contagens e presenças", () => {
    let d = novaReuniao(cadastrar(VAZIO, [PEDRO, ANA]));
    for (const cong of CONGREGACOES) d = definirAvulsos(d, cong.id, [1, 1, 1, 1, 1, 1]);
    d = aplicar(d, [
      { tipo: "marcar_presenca", chamadaId: id(d), obreiroId: PEDRO.id, presente: true },
      { tipo: "marcar_conferida", chamadaId: id(d), congregacaoId: "sede", conferida: true },
    ]);
    const anteriorId = id(d);
    expect(calcularResumo(d.chamada!).totalGeral).toBe(33 * 6 + 1);

    d = novaReuniao(d, "2026-10-25");
    const r = calcularResumo(d.chamada!);
    expect(id(d)).not.toBe(anteriorId);
    expect(r.totalGeral).toBe(0);
    expect(r.conferidas).toBe(0);
    expect(r.listaGeral).toHaveLength(0);
    expect(Object.values(r.porCargo).every((v) => v === 0)).toBe(true);
    expect(d.chamada!.pdfGeradoEm).toBeNull();
  });

  it("não substitui uma chamada sem confirmação da chamada certa", () => {
    const d = novaReuniao();
    expect(() =>
      aplicar(d, [
        {
          tipo: "criar_reuniao",
          dados: { data: "2026-10-25", horario: "", local: "", observacao: "" },
          substituirChamadaId: "outra-reuniao",
        },
      ]),
    ).toThrow(/Já existe uma chamada/);
  });

  it("ignora alterações de uma reunião anterior", () => {
    const antiga = novaReuniao();
    const nova = novaReuniao(antiga, "2026-10-25");
    expect(() =>
      aplicar(nova, [
        { tipo: "ajustar", chamadaId: id(antiga), congregacaoId: "sede", cargo: "pastor", delta: 1 },
      ]),
    ).toThrow(ErroOperacao);
  });

  it("exige data válida", () => {
    expect(() =>
      aplicar(VAZIO, [
        {
          tipo: "criar_reuniao",
          dados: { data: "", horario: "", local: "", observacao: "" },
          substituirChamadaId: null,
        },
      ]),
    ).toThrow(/data/);
  });

  it("detecta dados corrompidos", () => {
    const d = novaReuniao();
    d.chamada!.congregacoes.sede.avulsos.pastor = -1;
    expect(validarChamada(d.chamada!).ok).toBe(false);
  });

  it("converte chamada salva no formato antigo (sem cadastro nominal)", () => {
    const antiga = {
      reuniao: { id: "r1", data: "2026-09-27", horario: "", local: "", observacao: "", criadaEm: "" },
      status: "em_andamento",
      congregacoes: { sede: { contagem: { diacono: 3 }, conferida: true } },
    };
    const c = normalizarChamada(antiga);
    expect(c.congregacoes.sede.avulsos.diacono).toBe(3);
    expect(c.presentes).toEqual({});
  });

  it("nome do arquivo PDF", () => {
    expect(nomeArquivoPdf("2026-09-27")).toBe("reuniao-obreiros-27-09-2026.pdf");
  });
});
