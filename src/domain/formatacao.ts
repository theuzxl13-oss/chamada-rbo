/** Converte "AAAA-MM-DD" em "DD/MM/AAAA". */
export function formatarData(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Nome do arquivo PDF: reuniao-obreiros-27-09-2026.pdf */
export function nomeArquivoPdf(dataIso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataIso);
  const sufixo = m ? `${m[3]}-${m[2]}-${m[1]}` : "sem-data";
  return `reuniao-obreiros-${sufixo}.pdf`;
}

export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Data de hoje no formato AAAA-MM-DD (fuso local). */
export function hojeIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function dataIsoValida(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(a, mes - 1, dia);
  return d.getFullYear() === a && d.getMonth() === mes - 1 && d.getDate() === dia;
}
