/**
 * Congregações fixas do setor.
 * Os nomes não devem ser alterados sem autorização.
 * O `id` é apenas uma chave técnica estável (usada no estado e na sincronização).
 */

export interface Congregacao {
  id: string;
  nome: string;
}

const NOMES = [
  "Sede",
  "Campestre",
  "Itororó",
  "Cipó",
  "Cipozinho",
  "Penteado",
  "Vila Louro",
  "Flórida",
  "Filipinho",
  "Congonhal",
  "Holanda",
  "Lagoa Grande",
  "Val Flor",
  "Santa Izabel",
  "Chácara dos Amigos",
  "Itararé",
  "Santa Fé",
  "Vale Florido",
  "Santa Rita",
  "Flamingo",
  "Chácara do Mel",
  "Crispim",
  "Jandaia",
  "Santa Júlia",
  "Carmo I",
  "Carmo II",
  "Jacira",
  "Analândia",
  "Sonia Maria",
  "Vila Calu",
  "Capela",
  "Cerejeira",
  "Horizonte Azul",
] as const;

/** Remove acentos e padroniza para comparação/busca. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function gerarId(nome: string): string {
  return normalizarTexto(nome).replace(/[^a-z0-9]+/g, "-");
}

export const CONGREGACOES: Congregacao[] = NOMES.map((nome) => ({
  id: gerarId(nome),
  nome,
}));

export const TOTAL_CONGREGACOES = CONGREGACOES.length;

const POR_ID = new Map(CONGREGACOES.map((c) => [c.id, c]));

export function buscarCongregacao(id: string): Congregacao | undefined {
  return POR_ID.get(id);
}

export function filtrarCongregacoes(termo: string): Congregacao[] {
  const t = normalizarTexto(termo);
  if (!t) return CONGREGACOES;
  return CONGREGACOES.filter((c) => normalizarTexto(c.nome).includes(t));
}
