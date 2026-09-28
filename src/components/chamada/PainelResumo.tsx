"use client";

import { CARGOS, CARGOS_HIERARQUIA } from "@/domain/cargos";
import type { ResumoChamada, ResumoFaltas } from "@/domain/calculos";

/** Total geral + totais por cargo + congregações com presença. */
export function PainelResumo({ resumo, faltas }: { resumo: ResumoChamada; faltas: ResumoFaltas }) {
  return (
    <div className="grid gap-3 md:grid-cols-[1.1fr_1fr]">
      <div className="rounded-2xl bg-marca-700 p-4 text-white shadow-sm sm:p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-marca-100 uppercase">
              Total geral
            </p>
            <p className="tabular text-5xl leading-tight font-extrabold sm:text-6xl">
              {resumo.totalGeral}
            </p>
          </div>
          <p className="pb-2 text-right text-sm text-marca-100">presentes</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {CARGOS_HIERARQUIA.map((cargo) => (
            <div key={cargo} className="flex items-baseline justify-between gap-2 border-b border-white/15 pb-1">
              <span className="text-sm text-marca-100">{CARGOS[cargo].plural}</span>
              <span className="tabular text-lg font-bold">{resumo.porCargo[cargo]}</span>
            </div>
          ))}
        </div>
      </div>

      <ProgressoChamada resumo={resumo} faltas={faltas} />
    </div>
  );
}

export function ProgressoChamada({ resumo, faltas }: { resumo: ResumoChamada; faltas: ResumoFaltas }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Obreiros presentes</p>
      <p className="mt-1 text-3xl font-extrabold text-slate-900">
        <span className="tabular">{faltas.obreirosPresentes}</span>
        <span className="text-lg font-semibold text-slate-500"> de {faltas.totalObreiros}</span>
      </p>
      <div
        className="mt-3 h-3.5 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label="Obreiros presentes"
        aria-valuenow={faltas.percentualObreiros}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-marca-700 transition-[width] duration-300"
          style={{ width: `${faltas.percentualObreiros}%` }}
        />
      </div>
      <div className="mt-2 mb-4 flex justify-between text-sm">
        <span className="font-bold text-slate-800">{faltas.percentualObreiros}%</span>
        <span className="text-slate-500">
          {faltas.totalObreiros - faltas.obreirosPresentes} ainda não marcado
          {faltas.totalObreiros - faltas.obreirosPresentes === 1 ? "" : "s"}
        </span>
      </div>

      <p className="border-t border-slate-100 pt-3 text-xs font-bold tracking-widest text-slate-500 uppercase">
        Congregações com presença
      </p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">
        <span className="tabular">{resumo.comPresenca}</span>
        <span className="text-lg font-semibold text-slate-500"> de {resumo.cadastradas}</span>
      </p>
      <div
        className="mt-3 h-3.5 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={resumo.percentualComPresenca}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width] duration-300"
          style={{ width: `${resumo.percentualComPresenca}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-sm">
        <span className="font-bold text-emerald-700">{resumo.percentualComPresenca}%</span>
        <span className="text-slate-500">
          {resumo.cadastradas - resumo.comPresenca} sem presentes
        </span>
      </div>
      <p className="mt-3 border-t border-slate-100 pt-2 text-sm text-slate-600">
        Faltas justificadas: <strong className="tabular text-amber-700">{faltas.justificadas.length}</strong>
      </p>
      {!resumo.consistente && (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">
          Atenção: divergência nos totais ({resumo.totalPorCargos} × {resumo.totalPorCongregacoes}).
        </p>
      )}
    </div>
  );
}
