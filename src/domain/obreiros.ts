/** Regras do cadastro de obreiros. */
import { normalizarTexto } from "./congregacoes";

export const TAMANHO_MAXIMO_NOME = 120;

/** Remove espaços duplicados e das pontas. */
export function limparNome(nome: string): string {
  return nome.replace(/\s+/g, " ").trim().slice(0, TAMANHO_MAXIMO_NOME);
}

/** Comparação alfabética em português (ignora maiúsculas e acentos). */
export function compararNomes(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

export function ordenarPorNome<T extends { nome: string }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => compararNomes(a.nome, b.nome));
}

export function mesmoNome(a: string, b: string): boolean {
  return normalizarTexto(limparNome(a)) === normalizarTexto(limparNome(b));
}

export function nomeContem(nome: string, termo: string): boolean {
  return normalizarTexto(nome).includes(normalizarTexto(termo));
}
