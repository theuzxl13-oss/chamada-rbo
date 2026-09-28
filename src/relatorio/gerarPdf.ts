/**
 * Geração do relatório da reunião em PDF (A4), no próprio navegador.
 *
 * Todos os números vêm de `calcularResumo`, a mesma função usada na tela —
 * assim o PDF é sempre idêntico ao que foi exibido.
 */
import type { jsPDF as JsPDF } from "jspdf";
import type { CellInput, RowInput, UserOptions } from "jspdf-autotable";
import { CARGOS, CARGOS_HIERARQUIA } from "@/domain/cargos";
import {
  calcularResumo,
  validarChamada,
  type LinhaCongregacao,
} from "@/domain/calculos";
import { formatarData, formatarDataHora, nomeArquivoPdf } from "@/domain/formatacao";
import type { Chamada } from "@/domain/types";

export class ErroRelatorio extends Error {
  constructor(public erros: string[]) {
    super(erros.join("\n"));
    this.name = "ErroRelatorio";
  }
}

type RGB = [number, number, number];

const COR = {
  // Identidade da logo: preto/grafite
  primaria: [24, 24, 27] as RGB,
  primariaClara: [241, 241, 243] as RGB,
  texto: [30, 34, 40] as RGB,
  suave: [110, 116, 125] as RGB,
  linha: [212, 212, 216] as RGB,
  zebra: [250, 250, 250] as RGB,
};

// Medidas em milímetros (A4 = 210 × 297)
const LARGURA = 210;
const ALTURA = 297;
const MARGEM = 15;
const TOPO_CONTEUDO = 28;
const BASE_CONTEUDO = 20;
const LARGURA_UTIL = LARGURA - MARGEM * 2;

/**
 * Gera e baixa o PDF. Lança `ErroRelatorio` se os totais não forem consistentes
 * (nunca gera um PDF com números divergentes).
 */
export async function gerarRelatorioPdf(chamada: Chamada): Promise<string> {
  const doc = await montarRelatorioPdf(chamada, await carregarLogo());
  const nome = nomeArquivoPdf(chamada.reuniao.data);
  doc.save(nome);
  return nome;
}

/** Logo da igreja (versão preta, fundo transparente) em data URL. Sem logo, o PDF sai sem ela. */
async function carregarLogo(): Promise<LogoPdf | null> {
  try {
    const resp = await fetch("/logo-preta.png");
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result));
      leitor.onerror = () => reject(leitor.error);
      leitor.readAsDataURL(blob);
    });
    const proporcao = await new Promise<number>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
      img.onerror = () => resolve(PROPORCAO_LOGO_PADRAO);
      img.src = dataUrl;
    });
    return { dataUrl, proporcao };
  } catch {
    return null;
  }
}

/** Logo em data URL (PNG) e sua proporção largura/altura. */
export interface LogoPdf {
  dataUrl: string;
  proporcao: number;
}

const PROPORCAO_LOGO_PADRAO = 1152 / 414;

/** Monta o documento do relatório sem baixá-lo. */
export async function montarRelatorioPdf(chamada: Chamada, logo: LogoPdf | null = null): Promise<JsPDF> {
  const validacao = validarChamada(chamada);
  if (!validacao.ok) throw new ErroRelatorio(validacao.erros);

  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const resumo = calcularResumo(chamada);
  const { reuniao } = chamada;
  const dataFormatada = formatarData(reuniao.data);
  const geradoEm = formatarDataHora(new Date().toISOString());

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setProperties({
    title: `Relatório de Presença — Reunião de Obreiros — ${dataFormatada}`,
    subject: "Reunião de Obreiros",
    creator: "Controle de Presença — Reunião de Obreiros",
  });

  const finalY = () =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const baseTabela: Partial<UserOptions> = {
    theme: "grid",
    margin: { top: TOPO_CONTEUDO, bottom: BASE_CONTEUDO + 2, left: MARGEM, right: MARGEM },
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      cellPadding: 1.8,
      textColor: COR.texto,
      lineColor: COR.linha,
      lineWidth: 0.2,
      overflow: "linebreak",
    },
    headStyles: { fillColor: COR.primaria, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: COR.primariaClara, textColor: COR.primaria, fontStyle: "bold" },
    alternateRowStyles: { fillColor: COR.zebra },
  };

  const espacoRestante = (y: number) => ALTURA - BASE_CONTEUDO - y;
  const garantirEspaco = (y: number, necessario: number) => {
    if (espacoRestante(y) < necessario) {
      doc.addPage();
      return TOPO_CONTEUDO;
    }
    return y;
  };

  const tituloSecao = (texto: string, y: number) => {
    y = garantirEspaco(y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COR.primaria);
    doc.text(texto, MARGEM, y);
    doc.setDrawColor(...COR.primaria);
    doc.setLineWidth(0.5);
    doc.line(MARGEM, y + 1.8, MARGEM + LARGURA_UTIL, y + 1.8);
    return y + 6;
  };

  /** Texto explicativo pequeno; devolve a nova posição vertical. */
  const textoNota = (texto: string, y: number) => {
    const linhas = doc.splitTextToSize(texto, LARGURA_UTIL) as string[];
    y = garantirEspaco(y, linhas.length * 4.5 + 2);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...COR.suave);
    doc.text(linhas, MARGEM, y + 3);
    return y + linhas.length * 4.2 + 3;
  };

  /** Bloco de uma congregação: totais por cargo + presentes em ordem alfabética. */
  const blocoCongregacao = (l: LinhaCongregacao, inicio: number): number => {
    const semPresenca = l.total === 0;
    const subcabecalho = { fillColor: COR.primariaClara, textColor: COR.primaria, fontSize: 8 };
    autoTable(doc, {
      ...baseTabela,
      startY: inicio,
      pageBreak: "avoid",
      styles: { ...baseTabela.styles, fontSize: 9, cellPadding: 1.5, halign: "center" },
      alternateRowStyles: {},
      head: [
        [
          { content: `CONGREGAÇÃO — ${l.nome.toUpperCase()}`, colSpan: 7, styles: { halign: "left", fontSize: 10 } },
        ],
        ...(semPresenca
          ? []
          : [
              [
                ...CARGOS_HIERARQUIA.map((c) => ({ content: CARGOS[c].plural, styles: subcabecalho })),
                { content: "TOTAL", styles: subcabecalho },
              ],
            ]),
      ],
      body: semPresenca
        ? [
            [
              {
                content: "Nenhuma presença registrada.   TOTAL: 0",
                colSpan: 7,
                styles: { fontStyle: "italic", textColor: COR.suave },
              },
            ],
          ]
        : [
            [
              ...CARGOS_HIERARQUIA.map((c) => l.contagem[c]),
              { content: l.total, styles: { fontStyle: "bold", textColor: COR.primaria } },
            ],
          ],
    });
    let fim = finalY();

    if (l.presentes.length > 0 || l.totalAvulsos > 0) {
      const corpo: RowInput[] = l.presentes.map((p, i) => [
        { content: i + 1, styles: { halign: "center", textColor: COR.suave } },
        p.nome,
        CARGOS[p.cargo].singular,
      ]);
      if (l.totalAvulsos > 0) {
        const detalhe = CARGOS_HIERARQUIA.filter((c) => l.avulsos[c] > 0)
          .map((c) => `${l.avulsos[c]} ${l.avulsos[c] === 1 ? CARGOS[c].singular : CARGOS[c].plural}`)
          .join(", ");
        corpo.push([
          {
            content: `Não cadastrados (visitantes/novos): ${l.totalAvulsos} — ${detalhe}`,
            colSpan: 3,
            styles: { fontStyle: "italic", textColor: COR.suave },
          },
        ]);
      }
      autoTable(doc, {
        ...baseTabela,
        startY: fim,
        styles: { ...baseTabela.styles, fontSize: 8.5, cellPadding: 1.2 },
        headStyles: subcabecalho,
        head:
          l.presentes.length > 0
            ? [[{ content: "#", styles: { halign: "center" } }, "Presentes (ordem alfabética)", "Cargo"]]
            : undefined,
        body: corpo,
        columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 40 } },
      });
      fim = finalY();
    }
    return fim + 5;
  };

  // ======================================================= CAPA / CABEÇALHO
  let y = TOPO_CONTEUDO + 4;
  if (logo) {
    // Primeira página: logo grande e centralizada no topo
    const altura = 20;
    const largura = altura * logo.proporcao;
    doc.addImage(logo.dataUrl, "PNG", (LARGURA - largura) / 2, 10, largura, altura, "logo", "FAST");
    y = 42;
  }
  doc.setTextColor(...COR.primaria);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("RELATÓRIO DE PRESENÇA", LARGURA / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(14);
  doc.text("REUNIÃO DE OBREIROS", LARGURA / 2, y, { align: "center" });
  y += 8;

  // Quadro de informações da reunião
  const linhasInfo: [string, string][] = [
    ["Data", dataFormatada],
    ["Horário", reuniao.horario || "—"],
    ["Local", reuniao.local || "—"],
  ];
  if (reuniao.observacao) linhasInfo.push(["Observação", reuniao.observacao]);

  autoTable(doc, {
    ...baseTabela,
    startY: y,
    theme: "plain",
    body: linhasInfo.map(([rotulo, valor], i) => [
      { content: rotulo, styles: { fontStyle: "bold", textColor: COR.suave } },
      {
        content: valor,
        styles: i === 0 ? { fontStyle: "bold", fontSize: 13, textColor: COR.primaria } : {},
      },
    ]),
    columnStyles: { 0: { cellWidth: 30 } },
    styles: { ...baseTabela.styles, fontSize: 10.5, cellPadding: 1.6 },
    tableLineColor: COR.linha,
    tableLineWidth: 0.3,
  });
  y = finalY() + 6;

  // Destaque do total geral
  y = garantirEspaco(y, 30);
  doc.setFillColor(...COR.primaria);
  doc.roundedRect(MARGEM, y, LARGURA_UTIL, 24, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL GERAL DE PRESENTES", MARGEM + 8, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Congregações com presença: ${resumo.comPresenca} de ${resumo.cadastradas}`,
    MARGEM + 8,
    y + 17,
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(String(resumo.totalGeral), LARGURA - MARGEM - 8, y + 15.5, { align: "right" });
  y += 32;

  // ======================================================= TOTAL POR CARGO
  y = tituloSecao("TOTAL POR CARGO", y);
  autoTable(doc, {
    ...baseTabela,
    startY: y,
    head: [["Cargo", { content: "Presentes", styles: { halign: "right" } }]],
    body: CARGOS_HIERARQUIA.map((cargo) => [CARGOS[cargo].plural, resumo.porCargo[cargo]]),
    foot: [["TOTAL GERAL", { content: resumo.totalGeral, styles: { halign: "right" } }]],
    columnStyles: { 1: { halign: "right", cellWidth: 40 } },
    tableWidth: 110,
  });
  y = finalY() + 8;

  // ======================================================= TOTAL POR CONGREGAÇÃO
  y = tituloSecao("TOTAL POR CONGREGAÇÃO", y);
  const abrev: Record<string, string> = {
    pastor: "Past.",
    evangelista: "Evang.",
    presbitero: "Presb.",
    diacono: "Diác.",
    cooperador: "Coop.",
    membro: "Memb.",
  };
  const centro = { halign: "center" as const };
  autoTable(doc, {
    ...baseTabela,
    startY: y,
    styles: { ...baseTabela.styles, fontSize: 8.5, cellPadding: 1.4 },
    head: [
      [
        { content: "#", styles: centro },
        "Congregação",
        ...CARGOS_HIERARQUIA.map((c) => ({ content: abrev[c], styles: centro })),
        { content: "Total", styles: centro },
      ],
    ],
    body: resumo.congregacoes.map((l, i) => linhaTabelaCongregacao(l, i)),
    foot: [
      [
        { content: "TOTAL GERAL", colSpan: 2 },
        ...CARGOS_HIERARQUIA.map((c) => ({ content: resumo.porCargo[c], styles: centro })),
        { content: resumo.totalGeral, styles: centro },
      ],
    ],
    columnStyles: {
      0: { cellWidth: 7, halign: "center", textColor: COR.suave },
      1: { cellWidth: "auto" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 14, halign: "center" },
      4: { cellWidth: 14, halign: "center" },
      5: { cellWidth: 14, halign: "center" },
      6: { cellWidth: 14, halign: "center" },
      7: { cellWidth: 14, halign: "center" },
      8: { cellWidth: 15, halign: "center", fontStyle: "bold" },
    },
  });
  y = finalY() + 8;

  // ======================================================= LISTA GERAL A–Z
  doc.addPage();
  y = tituloSecao("LISTA GERAL DE PRESENTES (ORDEM ALFABÉTICA)", TOPO_CONTEUDO + 2);
  if (resumo.listaGeral.length === 0) {
    y = textoNota("Nenhum obreiro cadastrado foi marcado como presente.", y);
  } else {
    autoTable(doc, {
      ...baseTabela,
      startY: y,
      styles: { ...baseTabela.styles, fontSize: 9, cellPadding: 1.4 },
      head: [[{ content: "#", styles: centro }, "Nome", "Cargo", "Congregação"]],
      body: resumo.listaGeral.map((p, i) => [
        { content: i + 1, styles: { halign: "center", textColor: COR.suave } },
        p.nome,
        CARGOS[p.cargo].singular,
        p.congregacaoNome,
      ]),
      columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 32 }, 3: { cellWidth: 48 } },
    });
    y = finalY() + 4;
  }
  if (resumo.totalAvulsos > 0) {
    y = textoNota(
      `Além dos nomes acima, ${resumo.totalAvulsos} presente(s) não cadastrado(s) (visitantes/novos) ` +
        `foram contados por quantidade e estão incluídos nos totais.`,
      y,
    );
  }
  y += 4;

  // ======================================================= DETALHAMENTO
  y = tituloSecao("RELATÓRIO DETALHADO POR CONGREGAÇÃO", garantirEspaco(y, 50));
  for (const linha of resumo.congregacoes) {
    y = blocoCongregacao(linha, garantirEspaco(y, 34 + Math.min(linha.presentes.length, 4) * 5.5));
  }

  // ======================================================= RESUMO FINAL
  y = garantirEspaco(y + 3, 95);
  y = tituloSecao("RESUMO FINAL", y);
  autoTable(doc, {
    ...baseTabela,
    startY: y,
    body: [
      ["Congregações cadastradas", resumo.cadastradas],
      ["Congregações sem presentes", resumo.cadastradas - resumo.comPresenca],
      ["Congregações com presença", resumo.comPresenca],
      ["Presentes cadastrados (por nome)", resumo.totalCadastradosPresentes],
      ["Presentes não cadastrados", resumo.totalAvulsos],
      ...CARGOS_HIERARQUIA.map((c) => [CARGOS[c].plural, resumo.porCargo[c]] as RowInput),
    ],
    foot: [
      [
        { content: "TOTAL GERAL DE PRESENTES", styles: { fontSize: 11.5 } },
        { content: resumo.totalGeral, styles: { halign: "right", fontSize: 11.5 } },
      ],
    ],
    columnStyles: { 1: { halign: "right", cellWidth: 35, fontStyle: "bold" } },
    tableWidth: 120,
  });
  y = finalY() + 5;

  y = garantirEspaco(y, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COR.suave);
  doc.text(
    `Conferência dos totais: soma por cargo = ${resumo.totalPorCargos}  |  ` +
      `soma por congregação = ${resumo.totalPorCongregacoes}  |  resultado: CONFERE`,
    MARGEM,
    y,
  );

  desenharCabecalhoERodape(doc, dataFormatada, geradoEm, logo);
  return doc;
}

function linhaTabelaCongregacao(l: LinhaCongregacao, indice: number): RowInput {
  const estiloLinha = l.total === 0 ? { textColor: COR.suave } : {};
  const celulas: CellInput[] = [
    { content: indice + 1 },
    { content: l.nome, styles: { fontStyle: "bold", ...estiloLinha } },
    ...CARGOS_HIERARQUIA.map((c) => ({ content: l.contagem[c], styles: estiloLinha })),
    { content: l.total, styles: { fontStyle: "bold", ...estiloLinha } },
  ];
  return celulas;
}

function desenharCabecalhoERodape(doc: JsPDF, data: string, geradoEm: string, logo: LogoPdf | null) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);

    // Cabeçalho (na 1ª página com logo, o topo já traz a logo grande)
    if (!(logo && p === 1)) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COR.primaria);
      if (logo) {
        const altura = 8;
        doc.addImage(logo.dataUrl, "PNG", MARGEM, 6.5, altura * logo.proporcao, altura, "logo", "FAST");
        doc.text("RELATÓRIO DE PRESENÇA", LARGURA - MARGEM, 10, { align: "right" });
        doc.text(`Reunião de Obreiros — ${data}`, LARGURA - MARGEM, 14, { align: "right" });
      } else {
        doc.text("REUNIÃO DE OBREIROS — RELATÓRIO DE PRESENÇA", MARGEM, 13);
        doc.text(`Data da reunião: ${data}`, LARGURA - MARGEM, 13, { align: "right" });
      }
      doc.setDrawColor(...COR.primaria);
      doc.setLineWidth(0.6);
      doc.line(MARGEM, 16.5, LARGURA - MARGEM, 16.5);
    }

    // Rodapé
    const yRodape = ALTURA - 12;
    doc.setDrawColor(...COR.linha);
    doc.setLineWidth(0.3);
    doc.line(MARGEM, yRodape - 4, LARGURA - MARGEM, yRodape - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COR.suave);
    doc.text(`Gerado em ${geradoEm}`, MARGEM, yRodape);
    doc.text(`Página ${p} de ${total}`, LARGURA - MARGEM, yRodape, { align: "right" });
  }
}
