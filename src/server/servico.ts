/**
 * Serviço central (roda no servidor): aplica as operações recebidas dos
 * aparelhos sobre o estado compartilhado e grava o resultado.
 */
import { randomUUID } from "node:crypto";
import { montarEstadoPublico, type EstadoPersistido } from "@/domain/estado";
import {
  aplicarOperacao,
  ErroOperacao,
  type ContextoOperacao,
  type Operacao,
} from "@/domain/operacoes";
import type { EstadoCompartilhado } from "@/domain/types";
import { RepositorioArquivoJson, type RepositorioEstado } from "./repositorio";
import { RepositorioSupabase } from "./repositorioSupabase";

const LIMITE_OPS_LEMBRADAS = 500;
const LIMITE_CHAMADAS_ENCERRADAS = 50;
const TENTATIVAS_CONFLITO = 12;

type Ouvinte = (estado: EstadoCompartilhado) => void;

const contexto: ContextoOperacao = {
  agora: () => new Date().toISOString(),
  novoId: () => randomUUID(),
};

export class ServicoChamada {
  private readonly ouvintes = new Set<Ouvinte>();

  constructor(private readonly repositorio: RepositorioEstado) {}

  private publico(estado: EstadoPersistido): EstadoCompartilhado {
    return montarEstadoPublico(this.repositorio.origemId, estado.versao, estado);
  }

  async obterEstado(): Promise<EstadoCompartilhado> {
    return this.publico(await this.repositorio.ler());
  }

  /**
   * Aplica uma operação. Se o mesmo `opId` já foi aplicado (reenvio após falha
   * de rede), não aplica de novo — apenas devolve o estado atual.
   * Lança `ErroOperacao` quando a operação não é permitida.
   */
  async executar(opId: string, op: Operacao): Promise<EstadoCompartilhado> {
    for (let tentativa = 0; tentativa < TENTATIVAS_CONFLITO; tentativa++) {
      const atual = this.publico(await this.repositorio.ler());
      if (atual.opsAplicadas.includes(opId)) return atual;

      const resultado = aplicarOperacao(atual, op, contexto);
      const anterior = atual.chamada;
      let encerradas = atual.chamadasEncerradas;
      if (anterior && (!resultado.chamada || resultado.chamada.reuniao.id !== anterior.reuniao.id)) {
        encerradas = [...encerradas, anterior.reuniao.id].slice(-LIMITE_CHAMADAS_ENCERRADAS);
      }

      const novo: EstadoPersistido = {
        versao: atual.versao + 1,
        chamada: resultado.chamada,
        obreiros: resultado.obreiros,
        opsAplicadas: [...atual.opsAplicadas, opId].slice(-LIMITE_OPS_LEMBRADAS),
        chamadasEncerradas: encerradas,
      };

      if (await this.repositorio.gravarSeVersao(novo, atual.versao)) {
        const publico = this.publico(novo);
        this.notificar(publico);
        return publico;
      }
      // Outro aparelho gravou antes: relê e aplica de novo sobre o estado mais recente.
      await new Promise((r) => setTimeout(r, 15 + Math.random() * 40 * (tentativa + 1)));
    }
    throw new ErroOperacao(
      "DADOS_INVALIDOS",
      "Muitas alterações ao mesmo tempo. Tente novamente em instantes.",
    );
  }

  /** Aparelhos conectados por SSE (modo local). No modo Supabase, o Realtime avisa. */
  inscrever(ouvinte: Ouvinte): () => void {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  private notificar(estado: EstadoCompartilhado): void {
    for (const ouvinte of this.ouvintes) {
      try {
        ouvinte(estado);
      } catch {
        // um aparelho desconectado não deve afetar os demais
      }
    }
  }
}

function criarRepositorio(): RepositorioEstado {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && chaveServico) return new RepositorioSupabase(url, chaveServico);
  // Na hospedagem (Render, Vercel) o disco não é permanente: o Supabase é obrigatório.
  if (process.env.RENDER || process.env.VERCEL) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente da hospedagem.",
    );
  }
  return new RepositorioArquivoJson(randomUUID());
}

// Instância única por processo (sobrevive ao recarregamento do modo dev).
const globalRef = globalThis as unknown as { __servicoChamadaRbo2?: ServicoChamada };

export function obterServico(): ServicoChamada {
  globalRef.__servicoChamadaRbo2 ??= new ServicoChamada(criarRepositorio());
  return globalRef.__servicoChamadaRbo2;
}
