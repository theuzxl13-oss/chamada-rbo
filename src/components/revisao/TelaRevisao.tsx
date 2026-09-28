"use client";

import { useMemo } from "react";
import { CARGOS, CARGOS_HIERARQUIA } from "@/domain/cargos";
import { calcularResumo } from "@/domain/calculos";
import { formatarData } from "@/domain/formatacao";
import type { Chamada } from "@/domain/types";
import { Botao } from "@/components/ui/Botao";

interface TelaRevisaoProps {
  chamada: Chamada;
  aoVoltar: () => void;
  aoFinalizar: () => void;
}

export function TelaRevisao({ chamada, aoVoltar, aoFinalizar }: TelaRevisaoProps) {
  const resumo = useMemo(() => calcularResumo(chamada), [chamada]);

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-28">
      <button type="button" onClick={aoVoltar} className="mb-4 text-[15px] font-semibold text-slate-600">
        ← Voltar para a chamada
      </button>

      <header className="mb-4">
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Revisão</p>
        <h1 className="text-2xl font-extrabold text-marca-700 uppercase">Reunião de Obreiros</h1>
        <p className="text-lg font-bold text-slate-700">{formatarData(chamada.reuniao.data)}</p>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-marca-700 p-4 text-white">
          <p className="text-xs font-bold tracking-widest text-marca-100 uppercase">Total geral</p>
          <p className="tabular text-5xl font-extrabold">{resumo.totalGeral}</p>
          <p className="mt-1 text-sm text-marca-100">
            {resumo.comPresenca} de {resumo.cadastradas} congregações com presença
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {CARGOS_HIERARQUIA.map((c) => (
            <div key={c} className="flex justify-between py-0.5 text-[15px]">
              <span className="text-slate-600">{CARGOS[c].plural}</span>
              <span className="tabular font-bold">{resumo.porCargo[c]}</span>
            </div>
          ))}
        </div>
      </div>

      {!resumo.consistente && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 font-semibold text-red-700">
          Divergência nos totais: por cargo = {resumo.totalPorCargos}, por congregação ={" "}
          {resumo.totalPorCongregacoes}. O PDF não será gerado até que seja corrigida.
        </p>
      )}

      <h2 className="mb-2 text-sm font-bold tracking-widest text-slate-500 uppercase">Congregações</h2>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {resumo.congregacoes.map((l) => (
          <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className={`flex-1 ${l.total > 0 ? "font-semibold text-slate-800" : "text-slate-500"}`}>{l.nome}</span>
            {l.total > 0 ? (
              <span className="tabular text-lg font-bold text-slate-900">{l.total}</span>
            ) : (
              <span className="text-sm font-medium text-slate-400">Nenhuma presença</span>
            )}
          </li>
        ))}
      </ul>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 px-4 py-3">
          <Botao variante="secundario" className="flex-1" onClick={aoVoltar}>
            Voltar
          </Botao>
          <Botao className="flex-1" onClick={aoFinalizar} disabled={chamada.status === "finalizada"}>
            FINALIZAR CHAMADA
          </Botao>
        </div>
      </div>
    </main>
  );
}
