"use client";

import { memo } from "react";
import { CARGOS, type CargoId } from "@/domain/cargos";

interface LinhaPresencaProps {
  nome: string;
  cargo: CargoId;
  presente: boolean;
  bloqueado: boolean;
  /** Mostrado abaixo do nome (ex.: congregação, na busca geral). */
  detalhe?: string;
  aoAlternar: () => void;
}

/** Linha tocável de um obreiro: toque = presente / ausente. */
export const LinhaPresenca = memo(function LinhaPresenca({
  nome,
  cargo,
  presente,
  bloqueado,
  detalhe,
  aoAlternar,
}: LinhaPresencaProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={presente}
      disabled={bloqueado}
      onClick={aoAlternar}
      className={`flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left select-none disabled:cursor-default ${
        presente ? "bg-emerald-50 active:bg-emerald-100" : "bg-white active:bg-slate-100"
      }`}
    >
      <span
        aria-hidden
        className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-base font-bold ${
          presente ? "bg-emerald-600 text-white" : "border-2 border-slate-300 text-transparent"
        }`}
      >
        ✓
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[16px] ${presente ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
          {nome}
        </span>
        {detalhe && <span className="block truncate text-xs text-slate-500">{detalhe}</span>}
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          presente ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {CARGOS[cargo].singular}
      </span>
    </button>
  );
});
