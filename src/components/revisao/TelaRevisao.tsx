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
  const naoConferidas = resumo.congregacoes.filter((l) => !l.conferida);

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
            {resumo.conferidas} de {resumo.cadastradas} congregações conferidas
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

      {naoConferidas.length > 0 && (
        <div className="mb-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="font-bold text-amber-800">
            {naoConferidas.length} congregaç{naoConferidas.length === 1 ? "ão ainda não foi conferida" : "ões ainda não foram conferidas"}:
          </p>
          <p className="mt-1 text-[15px] text-amber-900">{naoConferidas.map((l) => l.nome).join(", ")}</p>
        </div>
      )}

      <h2 className="mb-2 text-sm font-bold tracking-widest text-slate-500 uppercase">Congregações</h2>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {resumo.congregacoes.map((l) => (
          <li
            key={l.id}
            className={`flex items-center gap-3 px-4 py-2.5 ${l.conferida ? "" : "bg-amber-50/60"}`}
          >
            <span
              className={`w-5 text-center text-lg font-bold ${l.conferida ? "text-emerald-600" : "text-amber-600"}`}
              aria-hidden
            >
              {l.conferida ? "✓" : "○"}
            </span>
            <span className="flex-1 font-semibold text-slate-800">{l.nome}</span>
            {l.conferida ? (
              <span className="tabular text-lg font-bold text-slate-900">
                {l.total === 0 ? <span className="text-sm font-medium text-slate-500">0 presentes</span> : l.total}
              </span>
            ) : (
              <span className="text-sm font-medium text-amber-700">
                Não conferida{l.total > 0 ? ` (${l.total})` : ""}
              </span>
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
