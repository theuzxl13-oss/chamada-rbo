/** Conversão entre o estado armazenado e o estado entregue aos aparelhos. */
import { normalizarChamada, normalizarObreiros } from "./operacoes";
import type { Chamada, EstadoCompartilhado } from "./types";

export type EstadoPersistido = Omit<EstadoCompartilhado, "servidorId">;

export const ESTADO_INICIAL: EstadoPersistido = {
  versao: 0,
  chamada: null,
  obreiros: [],
  opsAplicadas: [],
  chamadasEncerradas: [],
};

function listaDeTextos(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Valida/normaliza um estado lido do armazenamento (arquivo, Supabase ou Realtime). */
export function montarEstadoPublico(
  origemId: string,
  versao: number,
  dados: Partial<Record<keyof EstadoPersistido, unknown>> | null | undefined,
): EstadoCompartilhado {
  let chamada: Chamada | null = null;
  try {
    chamada = dados?.chamada ? normalizarChamada(dados.chamada) : null;
  } catch (erro) {
    console.error("[chamada] Chamada armazenada inválida; ignorada.", erro);
  }
  return {
    servidorId: origemId,
    versao: Number(versao) || 0,
    chamada,
    obreiros: normalizarObreiros(dados?.obreiros),
    opsAplicadas: listaDeTextos(dados?.opsAplicadas),
    chamadasEncerradas: listaDeTextos(dados?.chamadasEncerradas),
  };
}
