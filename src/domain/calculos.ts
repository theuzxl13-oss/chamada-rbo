/**
 * Cálculos da chamada. Funções puras — usadas igualmente pela tela e pelo PDF,
 * garantindo que os números exibidos e impressos sejam sempre os mesmos.
 *
 * Presentes de uma congregação = obreiros cadastrados marcados como presentes
 *                              + presentes não cadastrados (contagem avulsa).
 */
import { CARGOS_HIERARQUIA } from "./cargos";
import { CONGREGACOES, TOTAL_CONGREGACOES, buscarCongregacao } from "./congregacoes";
import { compararNomes } from "./obreiros";
import type { Chamada, Contagem, PresencaNominal, RegistroCongregacao } from "./types";

export function contagemZerada(): Contagem {
  return {
    pastor: 0,
    evangelista: 0,
    presbitero: 0,
    diacono: 0,
    cooperador: 0,
    membro: 0,
  };
}

/** Soma de todos os cargos de uma contagem. */
export function totalContagem(contagem: Contagem): number {
  return CARGOS_HIERARQUIA.reduce((soma, cargo) => soma + contagem[cargo], 0);
}

function somarContagens(a: Contagem, b: Contagem): Contagem {
  const r = contagemZerada();
  for (const cargo of CARGOS_HIERARQUIA) r[cargo] = a[cargo] + b[cargo];
  return r;
}

export function registroDe(chamada: Chamada, congregacaoId: string): RegistroCongregacao {
  return chamada.congregacoes[congregacaoId] ?? { avulsos: contagemZerada() };
}

export interface PresencaComCongregacao extends PresencaNominal {
  congregacaoNome: string;
}

export interface LinhaCongregacao {
  id: string;
  nome: string;
  /** Presentes por cargo (cadastrados + não cadastrados). */
  contagem: Contagem;
  /** Somente os não cadastrados. */
  avulsos: Contagem;
  totalAvulsos: number;
  /** Cadastrados presentes, em ordem alfabética. */
  presentes: PresencaNominal[];
  total: number;
}

export interface ResumoChamada {
  porCargo: Contagem;
  congregacoes: LinhaCongregacao[];
  /** Todos os cadastrados presentes, em ordem alfabética. */
  listaGeral: PresencaComCongregacao[];
  totalCadastradosPresentes: number;
  totalAvulsos: number;
  /** Validação 1: soma dos totais por cargo. */
  totalPorCargos: number;
  /** Validação 2: soma dos totais de cada congregação. */
  totalPorCongregacoes: number;
  /** Total geral (válido somente quando `consistente` for true). */
  totalGeral: number;
  consistente: boolean;
  cadastradas: number;
  /** Congregações com pelo menos um presente. */
  comPresenca: number;
  percentualComPresenca: number;
}

/** Cadastrados presentes agrupados por congregação. */
export function presentesPorCongregacao(chamada: Chamada): Map<string, PresencaNominal[]> {
  const mapa = new Map<string, PresencaNominal[]>();
  for (const p of Object.values(chamada.presentes)) {
    const lista = mapa.get(p.congregacaoId);
    if (lista) lista.push(p);
    else mapa.set(p.congregacaoId, [p]);
  }
  for (const lista of mapa.values()) lista.sort((a, b) => compararNomes(a.nome, b.nome));
  return mapa;
}

export function calcularResumo(chamada: Chamada): ResumoChamada {
  const nominais = presentesPorCongregacao(chamada);

  const congregacoes: LinhaCongregacao[] = CONGREGACOES.map((c) => {
    const reg = registroDe(chamada, c.id);
    const presentes = nominais.get(c.id) ?? [];
    const contagemNominal = contagemZerada();
    for (const p of presentes) contagemNominal[p.cargo] += 1;
    const contagem = somarContagens(contagemNominal, reg.avulsos);
    const total = totalContagem(contagem);
    return {
      id: c.id,
      nome: c.nome,
      contagem,
      avulsos: { ...reg.avulsos },
      totalAvulsos: totalContagem(reg.avulsos),
      presentes,
      total,
    };
  });

  const porCargo = contagemZerada();
  for (const l of congregacoes) {
    for (const cargo of CARGOS_HIERARQUIA) porCargo[cargo] += l.contagem[cargo];
  }

  const listaGeral: PresencaComCongregacao[] = Object.values(chamada.presentes)
    .map((p) => ({ ...p, congregacaoNome: buscarCongregacao(p.congregacaoId)?.nome ?? "—" }))
    .sort(
      (a, b) =>
        compararNomes(a.nome, b.nome) || compararNomes(a.congregacaoNome, b.congregacaoNome),
    );

  const totalPorCargos = totalContagem(porCargo);
  const totalPorCongregacoes = congregacoes.reduce((s, l) => s + l.total, 0);
  const comPresenca = congregacoes.filter((l) => l.total > 0).length;

  return {
    porCargo,
    congregacoes,
    listaGeral,
    totalCadastradosPresentes: listaGeral.length,
    totalAvulsos: congregacoes.reduce((s, l) => s + l.totalAvulsos, 0),
    totalPorCargos,
    totalPorCongregacoes,
    totalGeral: totalPorCargos,
    consistente: totalPorCargos === totalPorCongregacoes,
    cadastradas: TOTAL_CONGREGACOES,
    comPresenca,
    percentualComPresenca: Math.round((comPresenca / TOTAL_CONGREGACOES) * 100),
  };
}

export interface ResultadoValidacao {
  ok: boolean;
  erros: string[];
}

/**
 * Valida a chamada antes de gerar o relatório.
 * Garante que todos os valores são inteiros não negativos, que toda presença
 * pertence a uma congregação válida e que as duas formas de calcular o total
 * geral coincidem.
 */
export function validarChamada(chamada: Chamada): ResultadoValidacao {
  const erros: string[] = [];

  for (const c of CONGREGACOES) {
    const reg = chamada.congregacoes[c.id];
    if (!reg) {
      erros.push(`A congregação ${c.nome} não está presente na chamada.`);
      continue;
    }
    for (const cargo of CARGOS_HIERARQUIA) {
      const v = reg.avulsos[cargo];
      if (!Number.isInteger(v) || v < 0) {
        erros.push(`Valor inválido em ${c.nome} (${cargo}): ${String(v)}.`);
      }
    }
  }

  for (const p of Object.values(chamada.presentes)) {
    if (!buscarCongregacao(p.congregacaoId)) {
      erros.push(`Presença de ${p.nome} com congregação inválida.`);
    }
  }

  const resumo = calcularResumo(chamada);
  if (!resumo.consistente) {
    erros.push(
      `Divergência no total geral: soma por cargo = ${resumo.totalPorCargos}, ` +
        `soma por congregação = ${resumo.totalPorCongregacoes}.`,
    );
  }

  return { ok: erros.length === 0, erros };
}
