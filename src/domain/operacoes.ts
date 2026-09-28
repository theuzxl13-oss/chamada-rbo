/**
 * Regras de negócio da chamada e do cadastro de obreiros.
 *
 * Toda alteração é descrita como uma `Operacao`. A mesma função pura
 * `aplicarOperacao` é usada:
 *  - no servidor, para alterar o estado oficial compartilhado;
 *  - no aparelho, para mostrar o resultado imediatamente (atualização otimista).
 *
 * Contagens avulsas usam "ajustes" (+1 / -1) em vez de valores absolutos, para
 * que vários aparelhos possam contar ao mesmo tempo sem sobrescrever uns aos outros.
 */
import { CARGOS_HIERARQUIA, isCargoId, type CargoId } from "./cargos";
import { CONGREGACOES, buscarCongregacao } from "./congregacoes";
import { contagemZerada, validarChamada } from "./calculos";
import { dataIsoValida } from "./formatacao";
import { limparNome, mesmoNome } from "./obreiros";
import type {
  Chamada,
  DadosCompartilhados,
  DadosReuniao,
  Obreiro,
  PresencaNominal,
  RegistroCongregacao,
} from "./types";

export const MAX_QUANTIDADE = 9999;
export const MAX_OBREIROS = 5000;

export type Operacao =
  | { tipo: "criar_reuniao"; dados: DadosReuniao; substituirChamadaId: string | null }
  | { tipo: "ajustar"; chamadaId: string; congregacaoId: string; cargo: CargoId; delta: number }
  | { tipo: "definir"; chamadaId: string; congregacaoId: string; cargo: CargoId; valor: number }
  | { tipo: "marcar_presenca"; chamadaId: string; obreiroId: string; presente: boolean }
  | { tipo: "finalizar"; chamadaId: string }
  | { tipo: "reabrir"; chamadaId: string }
  | { tipo: "registrar_pdf"; chamadaId: string }
  | { tipo: "descartar"; chamadaId: string }
  | { tipo: "restaurar"; chamada: Chamada }
  | { tipo: "cadastrar_obreiro"; obreiro: Obreiro }
  | { tipo: "editar_obreiro"; obreiro: Obreiro }
  | { tipo: "remover_obreiro"; obreiroId: string };

export type CodigoErro =
  | "SEM_CHAMADA"
  | "CHAMADA_DIFERENTE"
  | "CHAMADA_FINALIZADA"
  | "CHAMADA_NAO_FINALIZADA"
  | "EXISTE_CHAMADA"
  | "DADOS_INVALIDOS"
  | "OBREIRO_DUPLICADO"
  | "OBREIRO_INEXISTENTE"
  | "TOTAIS_DIVERGENTES";

export class ErroOperacao extends Error {
  constructor(
    public codigo: CodigoErro,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroOperacao";
  }
}

export interface ContextoOperacao {
  agora: () => string;
  novoId: () => string;
}

/** Operações que podem ser mostradas na tela antes da confirmação do servidor. */
export function ehOperacaoOtimista(op: Operacao): boolean {
  return (
    op.tipo === "ajustar" ||
    op.tipo === "definir" ||
    op.tipo === "marcar_presenca"
  );
}

export function limitarQuantidade(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.min(MAX_QUANTIDADE, Math.max(0, Math.trunc(valor)));
}

export function criarChamada(dados: DadosReuniao, ctx: ContextoOperacao): Chamada {
  const congregacoes: Record<string, RegistroCongregacao> = {};
  for (const c of CONGREGACOES) {
    congregacoes[c.id] = { avulsos: contagemZerada() };
  }
  return {
    reuniao: {
      id: ctx.novoId(),
      criadaEm: ctx.agora(),
      data: dados.data,
      horario: dados.horario.trim(),
      local: dados.local.trim(),
      observacao: dados.observacao.trim(),
    },
    status: "em_andamento",
    congregacoes,
    presentes: {},
    finalizadaEm: null,
    pdfGeradoEm: null,
  };
}

function exigirChamada(chamada: Chamada | null, chamadaId: string): Chamada {
  if (!chamada) throw new ErroOperacao("SEM_CHAMADA", "Não existe chamada em andamento.");
  if (chamada.reuniao.id !== chamadaId) {
    throw new ErroOperacao(
      "CHAMADA_DIFERENTE",
      "Esta alteração pertence a outra reunião e foi ignorada.",
    );
  }
  return chamada;
}

function exigirEmAndamento(chamada: Chamada): void {
  if (chamada.status !== "em_andamento") {
    throw new ErroOperacao(
      "CHAMADA_FINALIZADA",
      "A chamada já foi finalizada. Reabra a chamada para alterar os valores.",
    );
  }
}

function alterarRegistro(
  chamada: Chamada,
  congregacaoId: string,
  alterar: (reg: RegistroCongregacao) => RegistroCongregacao,
): Chamada {
  if (!buscarCongregacao(congregacaoId)) {
    throw new ErroOperacao("DADOS_INVALIDOS", "Congregação desconhecida.");
  }
  const atual = chamada.congregacoes[congregacaoId] ?? {
    avulsos: contagemZerada(),
  };
  return {
    ...chamada,
    congregacoes: { ...chamada.congregacoes, [congregacaoId]: alterar(atual) },
  };
}

function validarObreiro(obreiro: Obreiro, lista: Obreiro[]): Obreiro {
  const nome = limparNome(obreiro.nome);
  if (nome.length < 2) throw new ErroOperacao("DADOS_INVALIDOS", "Informe o nome do obreiro.");
  if (!isCargoId(obreiro.cargo)) throw new ErroOperacao("DADOS_INVALIDOS", "Selecione o cargo.");
  if (!buscarCongregacao(obreiro.congregacaoId)) {
    throw new ErroOperacao("DADOS_INVALIDOS", "Selecione a congregação.");
  }
  const duplicado = lista.find(
    (o) =>
      o.id !== obreiro.id &&
      o.congregacaoId === obreiro.congregacaoId &&
      mesmoNome(o.nome, nome),
  );
  if (duplicado) {
    throw new ErroOperacao(
      "OBREIRO_DUPLICADO",
      `${duplicado.nome} já está cadastrado(a) nesta congregação.`,
    );
  }
  return { id: obreiro.id, nome, cargo: obreiro.cargo, congregacaoId: obreiro.congregacaoId };
}

function presencaDe(o: Obreiro): PresencaNominal {
  return { obreiroId: o.id, nome: o.nome, cargo: o.cargo, congregacaoId: o.congregacaoId };
}

export function aplicarOperacao(
  dados: DadosCompartilhados,
  op: Operacao,
  ctx: ContextoOperacao,
): DadosCompartilhados {
  const { chamada, obreiros } = dados;
  const comChamada = (nova: Chamada | null): DadosCompartilhados => ({ chamada: nova, obreiros });

  switch (op.tipo) {
    case "criar_reuniao": {
      if (!dataIsoValida(op.dados.data)) {
        throw new ErroOperacao("DADOS_INVALIDOS", "Informe uma data válida para a reunião.");
      }
      // Só substitui a chamada atual se for exatamente a que o usuário confirmou encerrar.
      if (chamada && chamada.reuniao.id !== op.substituirChamadaId) {
        throw new ErroOperacao(
          "EXISTE_CHAMADA",
          "Já existe uma chamada em andamento. Confirme antes de iniciar uma nova reunião.",
        );
      }
      // Nova reunião: tudo começa em ZERO e ninguém presente.
      // O cadastro de obreiros é mantido.
      return comChamada(criarChamada(op.dados, ctx));
    }

    case "ajustar": {
      const c = exigirChamada(chamada, op.chamadaId);
      exigirEmAndamento(c);
      return comChamada(
        alterarRegistro(c, op.congregacaoId, (reg) => ({
          ...reg,
          avulsos: {
            ...reg.avulsos,
            [op.cargo]: limitarQuantidade(reg.avulsos[op.cargo] + op.delta),
          },
        })),
      );
    }

    case "definir": {
      const c = exigirChamada(chamada, op.chamadaId);
      exigirEmAndamento(c);
      return comChamada(
        alterarRegistro(c, op.congregacaoId, (reg) => ({
          ...reg,
          avulsos: { ...reg.avulsos, [op.cargo]: limitarQuantidade(op.valor) },
        })),
      );
    }

    case "marcar_presenca": {
      const c = exigirChamada(chamada, op.chamadaId);
      exigirEmAndamento(c);
      const presentes = { ...c.presentes };
      if (op.presente) {
        const obreiro = obreiros.find((o) => o.id === op.obreiroId);
        if (!obreiro) {
          throw new ErroOperacao("OBREIRO_INEXISTENTE", "Este obreiro não está mais cadastrado.");
        }
        presentes[obreiro.id] = presencaDe(obreiro);
      } else {
        delete presentes[op.obreiroId];
      }
      return comChamada({ ...c, presentes });
    }

    case "finalizar": {
      const c = exigirChamada(chamada, op.chamadaId);
      if (c.status === "finalizada") return dados;
      const validacao = validarChamada(c);
      if (!validacao.ok) {
        throw new ErroOperacao("TOTAIS_DIVERGENTES", validacao.erros.join(" "));
      }
      return comChamada({ ...c, status: "finalizada", finalizadaEm: ctx.agora() });
    }

    case "reabrir": {
      const c = exigirChamada(chamada, op.chamadaId);
      return comChamada({ ...c, status: "em_andamento", finalizadaEm: null, pdfGeradoEm: null });
    }

    case "registrar_pdf": {
      const c = exigirChamada(chamada, op.chamadaId);
      if (c.status !== "finalizada") {
        throw new ErroOperacao(
          "CHAMADA_NAO_FINALIZADA",
          "Finalize a chamada antes de registrar o relatório.",
        );
      }
      return comChamada({ ...c, pdfGeradoEm: ctx.agora() });
    }

    case "descartar": {
      exigirChamada(chamada, op.chamadaId);
      return comChamada(null);
    }

    case "restaurar": {
      if (chamada) {
        throw new ErroOperacao(
          "EXISTE_CHAMADA",
          "Já existe uma chamada em andamento no sistema; o backup não foi restaurado.",
        );
      }
      return comChamada(normalizarChamada(op.chamada));
    }

    case "cadastrar_obreiro": {
      if (obreiros.length >= MAX_OBREIROS) {
        throw new ErroOperacao("DADOS_INVALIDOS", "Limite de obreiros cadastrados atingido.");
      }
      if (obreiros.some((o) => o.id === op.obreiro.id)) return dados;
      const novo = validarObreiro(op.obreiro, obreiros);
      return { chamada, obreiros: [...obreiros, novo] };
    }

    case "editar_obreiro": {
      const indice = obreiros.findIndex((o) => o.id === op.obreiro.id);
      if (indice < 0) {
        throw new ErroOperacao("OBREIRO_INEXISTENTE", "Este obreiro não está mais cadastrado.");
      }
      const editado = validarObreiro(op.obreiro, obreiros);
      const lista = [...obreiros];
      lista[indice] = editado;
      // Se já está presente na chamada em andamento, atualiza os dados da presença.
      let novaChamada = chamada;
      if (chamada && chamada.status === "em_andamento" && chamada.presentes[editado.id]) {
        novaChamada = {
          ...chamada,
          presentes: { ...chamada.presentes, [editado.id]: presencaDe(editado) },
        };
      }
      return { chamada: novaChamada, obreiros: lista };
    }

    case "remover_obreiro": {
      // A presença já registrada na chamada atual é mantida (a pessoa esteve presente).
      return { chamada, obreiros: obreiros.filter((o) => o.id !== op.obreiroId) };
    }
  }
}

// ---------------------------------------------------------------------------
// Validação de dados recebidos (corpo das requisições, backups e armazenamento)
// ---------------------------------------------------------------------------

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function texto(v: unknown, max = 500): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function exigirTexto(v: unknown, campo: string): string {
  if (typeof v !== "string" || !v) {
    throw new ErroOperacao("DADOS_INVALIDOS", `Campo inválido: ${campo}.`);
  }
  return v.slice(0, 100);
}

function exigirCargo(v: unknown): CargoId {
  if (!isCargoId(v)) throw new ErroOperacao("DADOS_INVALIDOS", "Cargo inválido.");
  return v;
}

function exigirNumero(v: unknown, campo: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new ErroOperacao("DADOS_INVALIDOS", `Número inválido: ${campo}.`);
  }
  return v;
}

function interpretarObreiro(v: unknown): Obreiro {
  if (!ehObjeto(v)) throw new ErroOperacao("DADOS_INVALIDOS", "Dados do obreiro ausentes.");
  return {
    id: exigirTexto(v.id, "obreiro.id"),
    nome: texto(v.nome, 200),
    cargo: exigirCargo(v.cargo),
    congregacaoId: exigirTexto(v.congregacaoId, "obreiro.congregacaoId"),
  };
}

/** Lista de obreiros vinda do armazenamento: descarta registros inválidos. */
export function normalizarObreiros(bruta: unknown): Obreiro[] {
  if (!Array.isArray(bruta)) return [];
  const lista: Obreiro[] = [];
  for (const item of bruta) {
    try {
      const o = interpretarObreiro(item);
      if (buscarCongregacao(o.congregacaoId) && limparNome(o.nome)) {
        lista.push({ ...o, nome: limparNome(o.nome) });
      }
    } catch {
      // registro inválido ignorado
    }
  }
  return lista;
}

/** Garante que uma chamada vinda de fora (backup/armazenamento) está completa e bem formada. */
export function normalizarChamada(bruta: unknown): Chamada {
  if (!ehObjeto(bruta) || !ehObjeto(bruta.reuniao) || !ehObjeto(bruta.congregacoes)) {
    throw new ErroOperacao("DADOS_INVALIDOS", "Dados da chamada inválidos.");
  }
  const r = bruta.reuniao;
  const data = texto(r.data, 10);
  if (!dataIsoValida(data)) {
    throw new ErroOperacao("DADOS_INVALIDOS", "Data da reunião inválida.");
  }
  const congregacoes: Record<string, RegistroCongregacao> = {};
  for (const c of CONGREGACOES) {
    const reg = bruta.congregacoes[c.id];
    const avulsos = contagemZerada();
    if (ehObjeto(reg)) {
      // `contagem` = formato da versão anterior (sem cadastro nominal)
      const origem = ehObjeto(reg.avulsos) ? reg.avulsos : ehObjeto(reg.contagem) ? reg.contagem : null;
      if (origem) {
        for (const cargo of CARGOS_HIERARQUIA) {
          const v = origem[cargo];
          avulsos[cargo] = typeof v === "number" ? limitarQuantidade(v) : 0;
        }
      }
    }
    congregacoes[c.id] = { avulsos };
  }
  const presentes: Record<string, PresencaNominal> = {};
  if (ehObjeto(bruta.presentes)) {
    for (const p of Object.values(bruta.presentes)) {
      if (!ehObjeto(p)) continue;
      const obreiroId = texto(p.obreiroId, 100);
      const congregacaoId = texto(p.congregacaoId, 100);
      if (!obreiroId || !isCargoId(p.cargo) || !buscarCongregacao(congregacaoId)) continue;
      presentes[obreiroId] = {
        obreiroId,
        nome: limparNome(texto(p.nome, 200)) || "—",
        cargo: p.cargo,
        congregacaoId,
      };
    }
  }
  const status = bruta.status === "finalizada" ? "finalizada" : "em_andamento";
  return {
    reuniao: {
      id: exigirTexto(r.id, "reuniao.id"),
      criadaEm: texto(r.criadaEm, 40),
      data,
      horario: texto(r.horario, 10),
      local: texto(r.local, 200),
      observacao: texto(r.observacao, 1000),
    },
    status,
    congregacoes,
    presentes,
    finalizadaEm: status === "finalizada" ? texto(bruta.finalizadaEm, 40) || null : null,
    pdfGeradoEm: typeof bruta.pdfGeradoEm === "string" ? bruta.pdfGeradoEm : null,
  };
}

/** Converte o corpo de uma requisição em uma operação válida (ou lança erro). */
export function interpretarOperacao(bruta: unknown): Operacao {
  if (!ehObjeto(bruta)) throw new ErroOperacao("DADOS_INVALIDOS", "Operação inválida.");
  switch (bruta.tipo) {
    case "criar_reuniao": {
      if (!ehObjeto(bruta.dados)) {
        throw new ErroOperacao("DADOS_INVALIDOS", "Dados da reunião ausentes.");
      }
      return {
        tipo: "criar_reuniao",
        substituirChamadaId:
          typeof bruta.substituirChamadaId === "string" ? bruta.substituirChamadaId : null,
        dados: {
          data: texto(bruta.dados.data, 10),
          horario: texto(bruta.dados.horario, 10),
          local: texto(bruta.dados.local, 200),
          observacao: texto(bruta.dados.observacao, 1000),
        },
      };
    }
    case "ajustar":
      return {
        tipo: "ajustar",
        chamadaId: exigirTexto(bruta.chamadaId, "chamadaId"),
        congregacaoId: exigirTexto(bruta.congregacaoId, "congregacaoId"),
        cargo: exigirCargo(bruta.cargo),
        delta: Math.trunc(exigirNumero(bruta.delta, "delta")),
      };
    case "definir":
      return {
        tipo: "definir",
        chamadaId: exigirTexto(bruta.chamadaId, "chamadaId"),
        congregacaoId: exigirTexto(bruta.congregacaoId, "congregacaoId"),
        cargo: exigirCargo(bruta.cargo),
        valor: exigirNumero(bruta.valor, "valor"),
      };
    case "marcar_presenca":
      return {
        tipo: "marcar_presenca",
        chamadaId: exigirTexto(bruta.chamadaId, "chamadaId"),
        obreiroId: exigirTexto(bruta.obreiroId, "obreiroId"),
        presente: bruta.presente === true,
      };
    case "finalizar":
    case "reabrir":
    case "registrar_pdf":
    case "descartar":
      return { tipo: bruta.tipo, chamadaId: exigirTexto(bruta.chamadaId, "chamadaId") };
    case "restaurar":
      return { tipo: "restaurar", chamada: normalizarChamada(bruta.chamada) };
    case "cadastrar_obreiro":
    case "editar_obreiro":
      return { tipo: bruta.tipo, obreiro: interpretarObreiro(bruta.obreiro) };
    case "remover_obreiro":
      return { tipo: "remover_obreiro", obreiroId: exigirTexto(bruta.obreiroId, "obreiroId") };
    default:
      throw new ErroOperacao("DADOS_INVALIDOS", "Tipo de operação desconhecido.");
  }
}
