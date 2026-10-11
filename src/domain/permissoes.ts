/**
 * Perfis de acesso e o que cada um pode fazer.
 *
 *  - ADMIN:    acesso total.
 *  - PRESENCA: faz a chamada (marca presença, conta não cadastrados, justifica faltas),
 *              cadastra novos obreiros, finaliza e gera o PDF.
 *              NÃO apaga nem substitui dados: não descarta chamada, não reabre,
 *              não edita/exclui obreiros e não inicia nova reunião por cima de uma
 *              chamada cujo relatório ainda não foi gerado.
 */
import type { Operacao } from "./operacoes";
import type { Chamada } from "./types";

export type Perfil = "ADMIN" | "PRESENCA";

export const PERFIL_LABEL: Record<Perfil, string> = {
  ADMIN: "Administrador",
  PRESENCA: "Presença",
};

const SOMENTE_ADMIN: ReadonlySet<Operacao["tipo"]> = new Set([
  "descartar",
  "reabrir",
  "editar_obreiro",
  "remover_obreiro",
]);

/**
 * Uma nova reunião substitui a chamada atual. O perfil Presença só pode fazer isso
 * quando não há chamada, ou quando a atual já foi finalizada e o PDF já foi gerado
 * (o relatório está guardado).
 */
export function podeIniciarNovaReuniao(perfil: Perfil, chamada: Chamada | null): boolean {
  if (perfil === "ADMIN" || !chamada) return true;
  return chamada.status === "finalizada" && chamada.pdfGeradoEm !== null;
}

/** Devolve a mensagem de recusa, ou null quando a operação é permitida. */
export function motivoRecusa(perfil: Perfil, op: Operacao, chamada: Chamada | null): string | null {
  if (perfil === "ADMIN") return null;
  if (SOMENTE_ADMIN.has(op.tipo)) {
    return "Apenas o administrador pode realizar esta ação.";
  }
  if (op.tipo === "criar_reuniao" && !podeIniciarNovaReuniao(perfil, chamada)) {
    return "Só o administrador pode iniciar uma nova reunião antes de a chamada atual ser finalizada e o PDF gerado.";
  }
  return null;
}
