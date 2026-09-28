import type { CargoId } from "./cargos";

/** Quantidade de presentes por cargo. */
export type Contagem = Record<CargoId, number>;

/** Obreiro cadastrado (permanece de uma reunião para outra). */
export interface Obreiro {
  id: string;
  nome: string;
  cargo: CargoId;
  congregacaoId: string;
}

/**
 * Presença nominal registrada na chamada.
 * Guarda uma cópia do nome/cargo/congregação do momento da chamada, para que o
 * relatório continue correto mesmo se o cadastro for alterado depois.
 */
export interface PresencaNominal {
  obreiroId: string;
  nome: string;
  cargo: CargoId;
  congregacaoId: string;
}

/** Falta justificada registrada na chamada (cópia dos dados do obreiro + motivo). */
export interface FaltaJustificada extends PresencaNominal {
  /** Motivo informado (pode ficar vazio). */
  motivo: string;
}

export interface RegistroCongregacao {
  /** Presentes NÃO cadastrados (visitantes/novos), contados por quantidade. */
  avulsos: Contagem;
}

export interface DadosReuniao {
  /** Data no formato ISO (AAAA-MM-DD). Obrigatória. */
  data: string;
  /** Horário no formato HH:MM (opcional). */
  horario: string;
  local: string;
  observacao: string;
}

export interface Reuniao extends DadosReuniao {
  id: string;
  criadaEm: string;
}

export type StatusChamada = "em_andamento" | "finalizada";

/** Chamada da reunião atual. Cada reunião é totalmente independente. */
export interface Chamada {
  reuniao: Reuniao;
  status: StatusChamada;
  congregacoes: Record<string, RegistroCongregacao>;
  /** Obreiros cadastrados marcados como presentes, por id do obreiro. */
  presentes: Record<string, PresencaNominal>;
  /** Faltas justificadas, por id do obreiro. */
  justificadas: Record<string, FaltaJustificada>;
  /**
   * Cópia do cadastro no momento em que a chamada foi finalizada. Define quem
   * faltou no relatório, mesmo que o cadastro mude depois. null = em andamento.
   */
  cadastroNoFechamento: Obreiro[] | null;
  finalizadaEm: string | null;
  /** Momento em que o PDF foi gerado pela última vez (null = ainda não gerado). */
  pdfGeradoEm: string | null;
}

/** Dados alterados pelas operações: a chamada atual e o cadastro de obreiros. */
export interface DadosCompartilhados {
  chamada: Chamada | null;
  obreiros: Obreiro[];
}

/** Estado compartilhado entre todos os aparelhos conectados. */
export interface EstadoCompartilhado extends DadosCompartilhados {
  /** Identificador da origem dos dados (muda quando o servidor local reinicia). */
  servidorId: string;
  /** Incrementa a cada alteração. Usado para ordenar atualizações. */
  versao: number;
  /** Ids das últimas operações aplicadas (evita aplicar duas vezes). */
  opsAplicadas: string[];
  /** Ids de chamadas que foram descartadas/substituídas (para limpar backups antigos). */
  chamadasEncerradas: string[];
}
