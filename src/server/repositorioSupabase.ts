/**
 * Armazenamento no Supabase (modo hospedado: Render).
 *
 * Todo o estado compartilhado fica em UMA linha da tabela `estado_compartilhado`
 * (coluna `dados` em JSON + coluna `versao`). Veja supabase/schema.sql.
 * Os aparelhos recebem as alterações em tempo real pelo Supabase Realtime.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ESTADO_INICIAL, type EstadoPersistido } from "@/domain/estado";
import type { RepositorioEstado } from "./repositorio";

const TABELA = "estado_compartilhado";
const ID_LINHA = 1;

type DadosLinha = Omit<EstadoPersistido, "versao">;

export class RepositorioSupabase implements RepositorioEstado {
  readonly origemId = "supabase";
  private readonly cliente: SupabaseClient;

  constructor(url: string, chaveServico: string) {
    this.cliente = createClient(url, chaveServico, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async ler(): Promise<EstadoPersistido> {
    const { data, error } = await this.cliente
      .from(TABELA)
      .select("versao, dados")
      .eq("id", ID_LINHA)
      .maybeSingle();
    if (error) throw new Error(`Supabase (leitura): ${error.message}`);
    if (!data) {
      // Primeira execução: cria a linha única.
      const { error: erroInsercao } = await this.cliente
        .from(TABELA)
        .insert({ id: ID_LINHA, versao: 0, dados: semVersao(ESTADO_INICIAL) });
      if (erroInsercao && erroInsercao.code !== "23505") {
        throw new Error(`Supabase (criação): ${erroInsercao.message}`);
      }
      return { ...ESTADO_INICIAL };
    }
    return { ...ESTADO_INICIAL, ...(data.dados as Partial<DadosLinha>), versao: Number(data.versao) };
  }

  async gravarSeVersao(novo: EstadoPersistido, versaoEsperada: number): Promise<boolean> {
    const { data, error } = await this.cliente
      .from(TABELA)
      .update({ versao: novo.versao, dados: semVersao(novo), atualizado_em: new Date().toISOString() })
      .eq("id", ID_LINHA)
      .eq("versao", versaoEsperada)
      .select("versao");
    if (error) throw new Error(`Supabase (gravação): ${error.message}`);
    return Array.isArray(data) && data.length === 1;
  }
}

function semVersao(estado: EstadoPersistido): DadosLinha {
  const { versao: _versao, ...resto } = estado;
  return resto;
}
