"use client";

import { memo, useState } from "react";
import { MAX_QUANTIDADE } from "@/domain/operacoes";

interface ContadorCargoProps {
  rotulo: string;
  valor: number;
  bloqueado: boolean;
  aoAjustar: (delta: number) => void;
  aoDefinir: (valor: number) => void;
}

/** Linha de contagem de um cargo: [-] quantidade [+] (a quantidade pode ser digitada). */
export const ContadorCargo = memo(function ContadorCargo({
  rotulo,
  valor,
  bloqueado,
  aoAjustar,
  aoDefinir,
}: ContadorCargoProps) {
  // Enquanto o campo está sendo editado, o texto digitado tem prioridade
  // sobre atualizações vindas de outros aparelhos.
  const [editando, setEditando] = useState<string | null>(null);

  const confirmar = () => {
    if (editando === null) return;
    const numero = Math.min(MAX_QUANTIDADE, parseInt(editando, 10) || 0);
    setEditando(null);
    if (numero !== valor) aoDefinir(numero);
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0 flex-1 text-[15px] font-medium text-slate-700">{rotulo}</span>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label={`Diminuir ${rotulo}`}
          disabled={bloqueado || valor <= 0}
          onClick={() => aoAjustar(-1)}
          className="flex size-12 items-center justify-center rounded-xl border border-slate-300 bg-white text-2xl font-bold text-slate-700 select-none active:bg-slate-200 disabled:opacity-35 sm:size-11"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={`Quantidade de ${rotulo}`}
          disabled={bloqueado}
          value={editando ?? String(valor)}
          onFocus={(e) => {
            setEditando(String(valor));
            e.currentTarget.select();
          }}
          onChange={(e) => setEditando(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setEditando(null);
              e.currentTarget.blur();
            }
          }}
          className="tabular h-12 w-16 rounded-xl border border-slate-300 bg-slate-50 text-center text-xl font-bold text-slate-900 focus:border-marca-600 focus:bg-white focus:ring-2 focus:ring-marca-100 focus:outline-none disabled:opacity-60 sm:h-11"
        />
        <button
          type="button"
          aria-label={`Aumentar ${rotulo}`}
          disabled={bloqueado || valor >= MAX_QUANTIDADE}
          onClick={() => aoAjustar(1)}
          className="flex size-12 items-center justify-center rounded-xl bg-marca-700 text-2xl font-bold text-white select-none active:bg-marca-800 disabled:opacity-35 sm:size-11"
        >
          +
        </button>
      </div>
    </div>
  );
});
