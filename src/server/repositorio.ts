/**
 * Armazenamento do estado compartilhado (chamada atual + cadastro de obreiros).
 *
 * Há duas implementações:
 *  - `RepositorioArquivoJson`: modo local (um computador na rede), grava em ./data;
 *  - `RepositorioSupabase` (repositorioSupabase.ts): modo hospedado (Render), grava no Supabase.
 *
 * As duas usam controle de versão otimista: uma gravação só é aceita se a versão
 * no armazenamento ainda for a mesma lida antes. Assim, vários aparelhos podem
 * alterar ao mesmo tempo sem que um apague a alteração do outro.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { ESTADO_INICIAL, type EstadoPersistido } from "@/domain/estado";

export type { EstadoPersistido };

export interface RepositorioEstado {
  /** Identifica a origem dos dados (usado pelos aparelhos para ordenar versões). */
  readonly origemId: string;
  ler(): Promise<EstadoPersistido>;
  /** Grava `novo` somente se a versão atual ainda for `versaoEsperada`. */
  gravarSeVersao(novo: EstadoPersistido, versaoEsperada: number): Promise<boolean>;
}

export class RepositorioArquivoJson implements RepositorioEstado {
  readonly origemId: string;
  private readonly arquivo: string;
  private cache: EstadoPersistido | null = null;
  private carregando: Promise<EstadoPersistido> | null = null;
  private gravando: Promise<void> = Promise.resolve();

  constructor(origemId: string, pasta = process.env.RBO_DATA_DIR || path.join(process.cwd(), "data")) {
    this.origemId = origemId;
    this.arquivo = path.join(pasta, "estado.json");
  }

  async ler(): Promise<EstadoPersistido> {
    if (this.cache) return this.cache;
    this.carregando ??= this.carregarArquivo();
    this.cache = await this.carregando;
    return this.cache;
  }

  private async carregarArquivo(): Promise<EstadoPersistido> {
    try {
      const conteudo = await fs.readFile(this.arquivo, "utf8");
      return { ...ESTADO_INICIAL, ...(JSON.parse(conteudo) as Partial<EstadoPersistido>) };
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("[chamada] Não foi possível ler o arquivo de dados:", erro);
      }
      return { ...ESTADO_INICIAL };
    }
  }

  async gravarSeVersao(novo: EstadoPersistido, versaoEsperada: number): Promise<boolean> {
    const atual = await this.ler();
    if (atual.versao !== versaoEsperada) return false;
    this.cache = novo;
    // Gravações em fila: a última sempre prevalece.
    this.gravando = this.gravando
      .then(() => this.escrever(novo))
      .catch((erro) => console.error("[chamada] Não foi possível gravar o arquivo de dados:", erro));
    return true;
  }

  private async escrever(estado: EstadoPersistido): Promise<void> {
    const conteudo = JSON.stringify(estado);
    await fs.mkdir(path.dirname(this.arquivo), { recursive: true });
    const temporario = `${this.arquivo}.tmp`;
    try {
      // Grava em arquivo temporário e renomeia, para nunca deixar o JSON pela metade.
      await fs.writeFile(temporario, conteudo, "utf8");
      await fs.rename(temporario, this.arquivo);
    } catch {
      await fs.writeFile(this.arquivo, conteudo, "utf8");
    }
  }
}
