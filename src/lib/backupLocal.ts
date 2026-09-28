/**
 * Cópia de segurança da CHAMADA ATUAL no localStorage deste aparelho.
 *
 * O servidor local é quem guarda a chamada oficial compartilhada. Esta cópia
 * existe apenas para o caso de o servidor perder os dados (ex.: arquivo apagado):
 * o aparelho poderá oferecer a restauração da última chamada que viu.
 * Não é um histórico — é sobrescrita a cada alteração e apagada quando a
 * reunião é encerrada/descartada.
 */
import { normalizarChamada } from "@/domain/operacoes";
import type { Chamada } from "@/domain/types";

const CHAVE = "rbo:chamada-atual";

export function lerBackup(): Chamada | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    // Valida e converte (inclusive backups de versões anteriores do sistema).
    return bruto ? normalizarChamada(JSON.parse(bruto)) : null;
  } catch {
    return null;
  }
}

export function salvarBackup(chamada: Chamada): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(chamada));
  } catch {
    // armazenamento indisponível (modo privado/cheio): o servidor continua sendo a fonte oficial
  }
}

export function limparBackup(): void {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    // ignorado
  }
}
