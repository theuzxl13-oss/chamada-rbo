import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CARGOS_HIERARQUIA } from "@/domain/cargos";
import { calcularResumo } from "@/domain/calculos";
import { CONGREGACOES } from "@/domain/congregacoes";
import { aplicarOperacao, type ContextoOperacao, type Operacao } from "@/domain/operacoes";
import type { Chamada, DadosCompartilhados } from "@/domain/types";
import { ErroRelatorio, montarRelatorioPdf } from "@/relatorio/gerarPdf";

const ctx: ContextoOperacao = { agora: () => new Date().toISOString(), novoId: () => "teste" };
const NOMES = ["Silva", "Souza", "Oliveira", "Pereira", "Almeida", "Barbosa", "Ferreira", "Gomes"];
const PRENOMES = ["Ana", "Bruno", "Carla", "Daniel", "Elias", "Fábio", "Gabriela", "Hélio", "Íris", "José"];

function chamadaCompleta(): DadosCompartilhados {
  let d: DadosCompartilhados = { chamada: null, obreiros: [] };
  const aplicar = (op: Operacao) => (d = aplicarOperacao(d, op, ctx));

  aplicar({
    tipo: "criar_reuniao",
    dados: { data: "2026-09-27", horario: "14:00", local: "Sede do Setor", observacao: "" },
    substituirChamadaId: null,
  });

  // Obreiros cadastrados e presenças em todas as 33 congregações (algumas vazias)
  CONGREGACOES.forEach((cong, i) => {
    if (i % 7 === 3) return; // algumas congregações sem presentes
    for (let k = 0; k < 4 + (i % 6); k++) {
      const oid = `${cong.id}-${k}`;
      aplicar({
        tipo: "cadastrar_obreiro",
        obreiro: {
          id: oid,
          nome: `${PRENOMES[(i + k * 3) % PRENOMES.length]} ${NOMES[(i * 2 + k) % NOMES.length]} ${cong.nome.split(" ")[0]}`,
          cargo: CARGOS_HIERARQUIA[(i + k) % 6],
          congregacaoId: cong.id,
        },
      });
      if (k % 3 !== 2) aplicar({ tipo: "marcar_presenca", chamadaId: "teste", obreiroId: oid, presente: true });
      else if (i % 2 === 0) aplicar({ tipo: "justificar_falta", chamadaId: "teste", obreiroId: oid, motivo: k % 2 ? "Doença" : "" });
    }
    if (i % 4 === 0) {
      aplicar({ tipo: "definir", chamadaId: "teste", congregacaoId: cong.id, cargo: "membro", valor: 2 });
    }
  });
  return d;
}

describe("relatório PDF", () => {
  it("gera PDF A4 com todas as 33 congregações, lista A–Z e os mesmos totais da tela", async () => {
    const dados = chamadaCompleta();
    const chamada = dados.chamada!;
    const resumo = calcularResumo(chamada);
    const logo = {
      dataUrl: `data:image/png;base64,${readFileSync("public/logo-preta.png").toString("base64")}`,
      proporcao: 1152 / 414,
    };
    const doc = await montarRelatorioPdf(chamada, logo, dados.obreiros);

    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    const { width, height } = doc.internal.pageSize;
    expect(Math.round(width)).toBe(210);
    expect(Math.round(height)).toBe(297);

    const bruto = doc.output();
    // Nomes sem acento aparecem literalmente no conteúdo do PDF
    for (const cong of CONGREGACOES.filter((c) => /^[A-Za-z ]+$/.test(c.nome))) {
      expect(bruto).toContain(cong.nome.toUpperCase());
    }
    expect(bruto).toContain(`(${resumo.totalGeral})`);
    expect(bruto).toContain("LISTA GERAL DE PRESENTES");
    expect(bruto).toContain("FALTAS JUSTIFICADAS");
    expect(bruto).toContain("FALTAS SEM JUSTIFICATIVA");

    // Permite inspecionar o PDF gerado: RBO_PDF_SAIDA=caminho.pdf npm test
    if (process.env.RBO_PDF_SAIDA) {
      writeFileSync(process.env.RBO_PDF_SAIDA, Buffer.from(doc.output("arraybuffer")));
    }
  });

  it("não gera PDF com dados inconsistentes", async () => {
    const chamada = chamadaCompleta().chamada!;
    chamada.congregacoes.sede.avulsos.pastor = -3;
    await expect(montarRelatorioPdf(chamada)).rejects.toBeInstanceOf(ErroRelatorio);
  });
});
