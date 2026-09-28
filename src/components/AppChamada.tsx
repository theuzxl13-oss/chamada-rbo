"use client";

/**
 * Componente principal: controla as telas e os fluxos de confirmação
 * (nova reunião, descarte, revisão, finalização e geração do PDF).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { calcularResumo } from "@/domain/calculos";
import { formatarData } from "@/domain/formatacao";
import type { Operacao } from "@/domain/operacoes";
import type { Chamada, DadosReuniao } from "@/domain/types";
import { useChamadaSincronizada } from "@/hooks/useChamadaSincronizada";
import { ErroRelatorio, gerarRelatorioPdf } from "@/relatorio/gerarPdf";
import { TelaCadastro } from "./cadastro/TelaCadastro";
import { TelaChamada } from "./chamada/TelaChamada";
import { FormNovaReuniao } from "./inicio/FormNovaReuniao";
import { TelaInicial } from "./inicio/TelaInicial";
import { TelaRevisao } from "./revisao/TelaRevisao";
import { Botao } from "./ui/Botao";
import { FaixaLogo } from "./ui/FaixaLogo";
import { AcoesModal, Modal } from "./ui/Modal";

type Tela = "inicio" | "nova" | "chamada" | "revisao" | "cadastro";
type AcaoEncerrar = "nova" | "descartar";

type EstadoModal =
  | { tipo: "protecao"; acao: AcaoEncerrar }
  | { tipo: "confirmar_encerrar"; acao: AcaoEncerrar }
  | { tipo: "confirmar_finalizar" }
  | { tipo: "processando"; texto: string }
  | { tipo: "erro"; titulo: string; mensagens: string[] }
  | { tipo: "pdf_gerado"; arquivo: string }
  | { tipo: "aviso"; titulo: string; texto: string };

export function AppChamada() {
  const sync = useChamadaSincronizada();
  const { chamada, enviar } = sync;

  const [tela, setTela] = useState<Tela>("inicio");
  const [modal, setModal] = useState<EstadoModal | null>(null);
  const [substituirId, setSubstituirId] = useState<string | null>(null);
  const [enviandoForm, setEnviandoForm] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Detecta quando OUTRO aparelho encerra/troca a reunião enquanto esta tela está na chamada.
  const acaoPropriaRef = useRef(false);
  const idAnteriorRef = useRef<string | null>(null);
  const idAtual = chamada?.reuniao.id ?? null;
  useEffect(() => {
    const anterior = idAnteriorRef.current;
    idAnteriorRef.current = idAtual;
    if (acaoPropriaRef.current || anterior === null || anterior === idAtual) return;
    if (tela === "chamada" || tela === "revisao") {
      setTela("inicio");
      setModal({
        tipo: "aviso",
        titulo: "A reunião foi alterada",
        texto: idAtual
          ? "Uma nova reunião foi iniciada em outro aparelho. Os números começaram novamente do zero."
          : "A chamada foi encerrada em outro aparelho.",
      });
    }
  }, [idAtual, tela]);

  /** Envia uma operação feita por este aparelho que pode trocar/encerrar a reunião. */
  const enviarPropria = useCallback(
    async (op: Operacao) => {
      acaoPropriaRef.current = true;
      try {
        return await enviar(op);
      } finally {
        acaoPropriaRef.current = false;
      }
    },
    [enviar],
  );

  const enviarContagem = useCallback((op: Operacao) => void enviar(op), [enviar]);

  // Mensagens de erro de contagens recusadas (ex.: chamada finalizada em outro aparelho)
  useEffect(() => {
    if (!sync.erroRecente) return;
    const t = setTimeout(sync.limparErro, 6000);
    return () => clearTimeout(t);
  }, [sync.erroRecente, sync.limparErro]);

  // ------------------------------------------------------------- PDF e finalização
  const gerarPdf = useCallback(
    async (alvo: Chamada): Promise<boolean> => {
      setModal({ tipo: "processando", texto: "Gerando o relatório em PDF..." });
      try {
        const arquivo = await gerarRelatorioPdf(alvo, sync.obreiros);
        await enviar({ tipo: "registrar_pdf", chamadaId: alvo.reuniao.id });
        setModal({ tipo: "pdf_gerado", arquivo });
        return true;
      } catch (erro) {
        setModal({
          tipo: "erro",
          titulo:
            erro instanceof ErroRelatorio ? "Totais divergentes — PDF não gerado" : "Erro ao gerar o PDF",
          mensagens:
            erro instanceof ErroRelatorio
              ? erro.erros
              : [erro instanceof Error ? erro.message : "Erro desconhecido."],
        });
        return false;
      }
    },
    [enviar, sync.obreiros],
  );

  const finalizarEGerarPdf = useCallback(async (): Promise<boolean> => {
    if (!chamada) return false;
    let alvo: Chamada | null = chamada;
    if (chamada.status === "em_andamento") {
      setModal({ tipo: "processando", texto: "Finalizando a chamada..." });
      // A fila garante que todas as contagens feitas antes cheguem ao servidor primeiro.
      const r = await enviar({ tipo: "finalizar", chamadaId: chamada.reuniao.id });
      if (!r.ok) {
        setModal({ tipo: "erro", titulo: "Não foi possível finalizar", mensagens: [r.erro] });
        return false;
      }
      alvo = r.estado.chamada;
    }
    if (!alvo) return false;
    return gerarPdf(alvo);
  }, [chamada, enviar, gerarPdf]);

  const iniciarFinalizacao = useCallback(() => {
    if (!chamada) return;
    const resumo = calcularResumo(chamada);
    if (!resumo.consistente) {
      setModal({
        tipo: "erro",
        titulo: "Totais divergentes",
        mensagens: [
          `Soma por cargo = ${resumo.totalPorCargos}; soma por congregação = ${resumo.totalPorCongregacoes}.`,
          "O PDF não será gerado com números inconsistentes.",
        ],
      });
      return;
    }
    setModal({ tipo: "confirmar_finalizar" });

  }, [chamada]);

  // ------------------------------------------------------------- nova reunião / descarte
  const abrirFormulario = useCallback((idParaSubstituir: string | null) => {
    setSubstituirId(idParaSubstituir);
    setErroForm(null);
    setModal(null);
    setTela("nova");
  }, []);

  const pedirEncerramento = useCallback(
    (acao: AcaoEncerrar) => {
      if (!chamada) {
        if (acao === "nova") abrirFormulario(null);
        return;
      }
      // Nunca apagar a chamada atual sem confirmação.
      setModal(chamada.pdfGeradoEm ? { tipo: "confirmar_encerrar", acao } : { tipo: "protecao", acao });
    },
    [chamada, abrirFormulario],
  );

  const executarEncerramento = useCallback(
    async (acao: AcaoEncerrar) => {
      if (!chamada) return;
      if (acao === "nova") {
        abrirFormulario(chamada.reuniao.id);
        return;
      }
      setModal({ tipo: "processando", texto: "Descartando a chamada..." });
      const r = await enviarPropria({ tipo: "descartar", chamadaId: chamada.reuniao.id });
      setTela("inicio");
      setModal(r.ok ? null : { tipo: "erro", titulo: "Não foi possível descartar", mensagens: [r.erro] });
    },
    [chamada, abrirFormulario, enviarPropria],
  );

  const iniciarReuniao = useCallback(
    async (dados: DadosReuniao) => {
      setEnviandoForm(true);
      setErroForm(null);
      const r = await enviarPropria({ tipo: "criar_reuniao", dados, substituirChamadaId: substituirId });
      setEnviandoForm(false);
      if (r.ok) {
        setModal(null);
        setTela("chamada");
      } else if (r.codigo === "EXISTE_CHAMADA") {
        setTela("inicio");
        setModal({
          tipo: "aviso",
          titulo: "Já existe uma chamada",
          texto:
            "Outra chamada foi iniciada ou alterada em outro aparelho enquanto você preenchia o formulário. Confira a chamada atual antes de iniciar uma nova.",
        });
      } else {
        setErroForm(r.erro);
      }
    },
    [enviarPropria, substituirId],
  );

  const restaurarBackup = useCallback(async () => {
    const r = await sync.restaurarBackup();
    if (!r.ok) setModal({ tipo: "erro", titulo: "Não foi possível restaurar", mensagens: [r.erro] });
  }, [sync]);

  const reabrir = useCallback(async () => {
    if (!chamada) return;
    const r = await enviar({ tipo: "reabrir", chamadaId: chamada.reuniao.id });
    if (!r.ok) setModal({ tipo: "erro", titulo: "Não foi possível reabrir", mensagens: [r.erro] });
  }, [chamada, enviar]);

  // Se a chamada deixou de existir, telas que dependem dela voltam ao início.
  const telaEfetiva: Tela = (tela === "chamada" || tela === "revisao") && !chamada ? "inicio" : tela;
  // Cada troca de tela começa no topo da página.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [telaEfetiva]);

  const dataAtual = chamada ? formatarData(chamada.reuniao.data) : "";
  const totalAtual = chamada ? calcularResumo(chamada).totalGeral : 0;

  return (
    <>
      <AvisoConexao conexao={sync.conexao} pendentes={sync.alteracoesPendentes} />
      <FaixaLogo compacta={telaEfetiva !== "inicio"} />

      {telaEfetiva === "inicio" && (
        <TelaInicial
          pronto={sync.pronto}
          chamada={chamada}
          backup={sync.backup}
          totalObreiros={sync.obreiros.length}
          aoCadastro={() => setTela("cadastro")}
          aoNovaReuniao={() => pedirEncerramento("nova")}
          aoContinuar={() => setTela("chamada")}
          aoDescartar={() => pedirEncerramento("descartar")}
          aoRestaurarBackup={restaurarBackup}
          aoDescartarBackup={sync.descartarBackup}
        />
      )}

      {telaEfetiva === "nova" && (
        <FormNovaReuniao
          enviando={enviandoForm}
          erro={erroForm}
          aoCancelar={() => setTela("inicio")}
          aoIniciar={iniciarReuniao}
        />
      )}

      {telaEfetiva === "chamada" && chamada && (
        <TelaChamada
          chamada={chamada}
          obreiros={sync.obreiros}
          enviar={enviarContagem}
          enviarAguardando={enviar}
          aoVoltarInicio={() => setTela("inicio")}
          aoRevisar={() => setTela("revisao")}
          aoFinalizar={iniciarFinalizacao}
          aoBaixarPdf={() => void gerarPdf(chamada)}
          aoReabrir={reabrir}
          aoNovaReuniao={() => pedirEncerramento("nova")}
        />
      )}

      {telaEfetiva === "cadastro" && (
        <TelaCadastro obreiros={sync.obreiros} enviar={enviar} aoVoltar={() => setTela("inicio")} />
      )}

      {telaEfetiva === "revisao" && chamada && (
        <TelaRevisao chamada={chamada} aoVoltar={() => setTela("chamada")} aoFinalizar={iniciarFinalizacao} />
      )}

      {sync.erroRecente && (
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md rounded-xl bg-red-700 px-4 py-3 text-[15px] font-semibold text-white shadow-lg">
          {sync.erroRecente.mensagem}
        </div>
      )}

      {/* ------------------------------------------------------------ modais */}
      {modal?.tipo === "protecao" && (
        <Modal titulo="ATENÇÃO" tom="alerta" aoFechar={() => setModal(null)}>
          <p className="font-semibold">O relatório desta reunião ainda não foi gerado.</p>
          <p>
            {modal.acao === "nova" ? "Se iniciar uma nova reunião agora" : "Se descartar a chamada agora"}, os
            dados atuais serão perdidos <strong>em todos os aparelhos</strong>.
          </p>
          <p>Recomendamos gerar o PDF antes de continuar.</p>
          <AcoesModal>
            <Botao variante="secundario" onClick={() => setModal(null)}>
              VOLTAR
            </Botao>
            <Botao
              variante="sucesso"
              onClick={async () => {
                const acao = modal.acao;
                const ok = await finalizarEGerarPdf();
                if (ok && acao === "nova" && chamada) abrirFormulario(chamada.reuniao.id);
              }}
            >
              GERAR PDF
            </Botao>
            <Botao variante="perigo" onClick={() => executarEncerramento(modal.acao)}>
              {modal.acao === "nova" ? "INICIAR MESMO ASSIM" : "DESCARTAR MESMO ASSIM"}
            </Botao>
          </AcoesModal>
        </Modal>
      )}

      {modal?.tipo === "confirmar_encerrar" && (
        <Modal
          titulo={modal.acao === "nova" ? "Iniciar nova reunião?" : "Descartar chamada?"}
          tom="alerta"
          aoFechar={() => setModal(null)}
        >
          <p>
            A chamada da reunião de <strong>{dataAtual}</strong> será encerrada em todos os aparelhos.
            {modal.acao === "nova" && " A nova reunião começará com todas as contagens em zero."}
          </p>
          <p className="text-sm text-slate-500">O relatório em PDF desta reunião já foi gerado.</p>
          <AcoesModal>
            <Botao variante="secundario" onClick={() => setModal(null)}>
              Voltar
            </Botao>
            <Botao
              variante={modal.acao === "nova" ? "primario" : "perigo"}
              onClick={() => executarEncerramento(modal.acao)}
            >
              {modal.acao === "nova" ? "Continuar" : "Descartar"}
            </Botao>
          </AcoesModal>
        </Modal>
      )}

      {modal?.tipo === "confirmar_finalizar" && (
        <Modal titulo="Finalizar chamada" aoFechar={() => setModal(null)}>
          <p>
            Você está prestes a finalizar a Reunião de Obreiros de <strong>{dataAtual}</strong>.
          </p>
          <p>
            Total registrado: <strong>{totalAtual} presentes</strong>.
          </p>
          <p>Após confirmar, será gerado o relatório em PDF.</p>
          <p>Deseja continuar?</p>
          <AcoesModal>
            <Botao variante="secundario" onClick={() => setModal(null)}>
              CANCELAR
            </Botao>
            <Botao variante="sucesso" onClick={() => void finalizarEGerarPdf()}>
              FINALIZAR E GERAR PDF
            </Botao>
          </AcoesModal>
        </Modal>
      )}

      {modal?.tipo === "processando" && (
        <Modal titulo="Aguarde">
          <p>{modal.texto}</p>
        </Modal>
      )}

      {modal?.tipo === "erro" && (
        <Modal titulo={modal.titulo} tom="perigo" aoFechar={() => setModal(null)}>
          {modal.mensagens.map((m) => (
            <p key={m}>{m}</p>
          ))}
          <AcoesModal>
            <Botao onClick={() => setModal(null)}>Entendi</Botao>
          </AcoesModal>
        </Modal>
      )}

      {modal?.tipo === "pdf_gerado" && (
        <Modal titulo="Relatório gerado" aoFechar={() => setModal(null)}>
          <p>
            O arquivo <strong className="break-all">{modal.arquivo}</strong> foi gerado. Verifique a pasta de
            downloads deste aparelho e guarde o relatório.
          </p>
          <p className="text-sm text-slate-500">
            Se o download não começou, use o botão &quot;Baixar PDF&quot; na tela da chamada.
          </p>
          <AcoesModal>
            <Botao variante="secundario" onClick={() => setModal(null)}>
              Fechar
            </Botao>
            <Botao onClick={() => chamada && abrirFormulario(chamada.reuniao.id)}>+ NOVA REUNIÃO</Botao>
          </AcoesModal>
        </Modal>
      )}

      {modal?.tipo === "aviso" && (
        <Modal titulo={modal.titulo} tom="alerta" aoFechar={() => setModal(null)}>
          <p>{modal.texto}</p>
          <AcoesModal>
            <Botao onClick={() => setModal(null)}>Entendi</Botao>
          </AcoesModal>
        </Modal>
      )}
    </>
  );
}

function AvisoConexao({
  conexao,
  pendentes,
}: {
  conexao: "conectando" | "online" | "offline";
  pendentes: number;
}) {
  if (conexao !== "offline") return null;
  return (
    <div className="sticky top-0 z-40 bg-red-700 px-4 py-2 text-center text-sm font-semibold text-white">
      Sem conexão com o servidor.
      {pendentes > 0 && ` ${pendentes} alteração(ões) aguardando envio — serão enviadas ao reconectar.`}
    </div>
  );
}
