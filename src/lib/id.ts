/**
 * Gera um identificador único.
 * `crypto.randomUUID` só existe em conexões seguras (https/localhost); quando os
 * celulares acessam pelo IP da rede local (http://192.168...), usamos um
 * gerador alternativo.
 */
export function gerarId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") {
    try {
      return c.randomUUID();
    } catch {
      // contexto inseguro: cai no gerador alternativo
    }
  }
  if (c && typeof c.getRandomValues === "function") {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}
