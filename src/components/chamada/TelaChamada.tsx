"use client";

import { useCallback, useMemo, useState } from "react";
import type { CargoId } from "@/domain/cargos";
import { calcularResumo } from "@/domain/calculos";
import { CONGREGACOES } from "@/domain/congregacoes";
import { formatarData, formatarDataHora } from "@/domain/formatacao";
import type { Operacao } from "@/domain/operacoes";
import type { Chamada, Obreiro } from "@/domain/types";
import type { ResultadoEnvio } from "@/hooks/useChamadaSincronizada";
import { gerarId } from "@/lib/id";
import { Botao } from "@/components/ui/Botao";
import { CardCongregacao } from "./CardCongregacao";
import { PainelResumo } from "./PainelResumo";

const SEM_OBREIROS: Obreiro[] = [];

interface TelaChamadaProps {
  chamada: Chamada;
  obreiros: Obreiro[];
  enviar: (op: Operacao) => void;
  /** Envio que aguarda a resposta do servidor (para mostrar erros de cadastro). */
  enviarAguardando: (op: Operacao) => Promise<ResultadoEnvio>;
  aoVoltarInicio: () => void;
  aoRevisar: () => void;
  aoFinalizar: () => void;
  aoBaixarPdf: () => void;
  aoReabrir: () => void;
  aoNovaReuniao: () => void;
}

export function TelaChamada({
  chamada,
  obreiros,
  enviar,
  enviarAguardando,
  aoVoltarInicio,
  aoRevisar,
  aoFinalizar,
  aoBaixarPdf,
  aoReabrir,
  aoNovaReuniao,
}: TelaChamadaProps) {
  const [abertas, setAbertas] = useState<Set<string>>(() => new Set());

  const resumo = useMemo(() => calcularResumo(chamada), [chamada]);
  const finalizada = chamada.status === "finalizada";
  const chamadaId = chamada.reuniao.id;
  const { reuniao } = chamada;

  const linhasPorId = useMemo(
    () => new Map(resumo.congregacoes.map((l) => [l.id, l])),
    [resumo],
  );

  const obreirosPorCongregacao = useMemo(() => {
    const mapa = new Map<string, Obreiro[]>();
    for (const o of obreiros) {
      const lista = mapa.get(o.congregacaoId);
      if (lista) lista.push(o);
      else mapa.set(o.congregacaoId, [o]);
    }
    return mapa;
  }, [obreiros]);



  const alternar = useCallback((id: string) => {
    setAbertas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }, []);

  const ajustar = useCallback(
    (congregacaoId: string, cargo: CargoId, delta: number) =>
      enviar({ tipo: "ajustar", chamadaId, congregacaoId, cargo, delta }),
    [enviar, chamadaId],
  );
  const definir = useCallback(
    (congregacaoId: string, cargo: CargoId, valor: number) =>
      enviar({ tipo: "definir", chamadaId, congregacaoId, cargo, valor }),
    [enviar, chamadaId],
  );
  const cadastrarPresente = useCallback(
    async (congregacaoId: string, nome: string, cargo: CargoId): Promise<string | null> => {
      const obreiroId = gerarId();
      const r = await enviarAguardando({
        tipo: "cadastrar_obreiro",
        obreiro: { id: obreiroId, nome, cargo, congregacaoId },
      });
      if (!r.ok) return r.erro;
      enviar({ tipo: "marcar_presenca", chamadaId, obreiroId, presente: true });
      return null;
    },
    [enviar, enviarAguardando, chamadaId],
  );
  const marcarPresenca = useCallback(
    (obreiroId: string, presente: boolean) =>
      enviar({ tipo: "marcar_presenca", chamadaId, obreiroId, presente }),
    [enviar, chamadaId],
  );
  return (
    <div className="pb-28">
      {/* Barra fixa com o resumo sempre visível */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={aoVoltarInicio}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xl text-slate-600 active:bg-slate-100"
            aria-label="Voltar para o início"
          >
            ←
          </button>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold text-slate-900">Reunião de Obreiros</p>
            <p className="text-xs text-slate-500">{formatarData(reuniao.data)}</p>
          </div>
          <div className="text-right leading-tight">
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Com presença</p>
            <p className="tabular text-base font-bold text-slate-700">
              {resumo.comPresenca}/{resumo.cadastradas}
            </p>
          </div>
          <a
            href="/painel"
            title="Abrir painel de totais"
            className="rounded-xl bg-marca-700 px-3 py-1.5 text-right leading-tight text-white hover:bg-marca-800"
          >
            <p className="text-[10px] font-bold tracking-wider text-marca-100 uppercase">Total 📊</p>
            <p className="tabular text-xl font-extrabold">{resumo.totalGeral}</p>
          </a>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-4 px-4 pt-4">
        <header>
          <h1 className="text-2xl font-extrabold text-marca-700 uppercase">Reunião de Obreiros</h1>
          <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-0.5 text-[15px] text-slate-600">
            <div>
              <dt className="inline font-semibold">Data: </dt>
              <dd className="inline">{formatarData(reuniao.data)}</dd>
            </div>
            {reuniao.horario && (
              <div>
                <dt className="inline font-semibold">Horário: </dt>
                <dd className="inline">{reuniao.horario}</dd>
              </div>
            )}
            {reuniao.local && (
              <div>
                <dt className="inline font-semibold">Local: </dt>
                <dd className="inline">{reuniao.local}</dd>
              </div>
            )}
          </dl>
          {reuniao.observacao && (
            <p className="mt-1 text-sm text-slate-500">Obs.: {reuniao.observacao}</p>
          )}
        </header>

        {finalizada && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
            <p className="font-bold text-emerald-800">Chamada finalizada</p>
            <p className="text-sm text-emerald-800">
              {chamada.pdfGeradoEm
                ? `Relatório gerado em ${formatarDataHora(chamada.pdfGeradoEm)}.`
                : "O relatório em PDF ainda não foi baixado."}{" "}
              Os valores estão travados. Para corrigir, reabra a chamada.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Botao variante="sucesso" onClick={aoBaixarPdf}>
                Baixar PDF
              </Botao>
              <Botao variante="secundario" onClick={aoReabrir}>
                Reabrir chamada
              </Botao>
              <Botao variante="primario" onClick={aoNovaReuniao}>
                + Nova reunião
              </Botao>
            </div>
          </div>
        )}

        <PainelResumo resumo={resumo} />

        <div className="flex min-h-10 items-center justify-between gap-2">
          <h2 className="text-sm font-bold tracking-widest text-slate-500 uppercase">Congregações</h2>
          {abertas.size > 0 && (
            <button
              type="button"
              onClick={() => setAbertas(new Set())}
              className="min-h-10 shrink-0 rounded-full px-3 text-sm font-semibold text-slate-600 underline"
            >
              Fechar todas
            </button>
          )}
        </div>

        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
            {CONGREGACOES.map((c) => (
              <CardCongregacao
                key={c.id}
                linha={linhasPorId.get(c.id)!}
                obreiros={obreirosPorCongregacao.get(c.id) ?? SEM_OBREIROS}
                aberta={abertas.has(c.id)}
                bloqueado={finalizada}
                aoAlternar={alternar}
                aoMarcarPresenca={marcarPresenca}
                aoCadastrarPresente={cadastrarPresente}
                aoAjustar={ajustar}
                aoDefinir={definir}
              />
            ))}
        </div>
      </main>

      {/* Ações principais fixas no rodapé */}
      {!finalizada && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl gap-2 px-4 py-3">
            <Botao variante="secundario" className="flex-1" onClick={aoRevisar}>
              Revisar chamada
            </Botao>
            <Botao variante="primario" className="flex-1" onClick={aoFinalizar}>
              Finalizar chamada
            </Botao>
          </div>
        </div>
      )}
    </div>
  );
}
