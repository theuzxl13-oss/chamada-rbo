"use client";

import { useState } from "react";
import { CARGOS } from "@/domain/cargos";
import type { FaltasCongregacao } from "@/domain/calculos";
import { TAMANHO_MAXIMO_MOTIVO } from "@/domain/operacoes";

const MOTIVOS_RAPIDOS = ["Doença", "Trabalho", "Viagem", "Família"];

interface SecaoFaltasProps {
  faltas: FaltasCongregacao;
  bloqueado: boolean;
  aoJustificar: (obreiroId: string, motivo: string) => void;
  aoRemoverJustificativa: (obreiroId: string) => void;
}

/** Quem não compareceu nesta congregação, com a opção de registrar falta justificada. */
export function SecaoFaltas({ faltas, bloqueado, aoJustificar, aoRemoverJustificativa }: SecaoFaltasProps) {
  const [aberta, setAberta] = useState(false);
  const [justificando, setJustificando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const total = faltas.justificadas.length + faltas.semJustificativa.length;
  if (total === 0) return null;

  const salvar = (obreiroId: string, texto: string) => {
    aoJustificar(obreiroId, texto);
    setJustificando(null);
    setMotivo("");
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        className="flex min-h-12 w-full items-center justify-between gap-2 bg-slate-50 px-3 text-left active:bg-slate-100"
      >
        <span className="text-sm font-bold text-slate-700">
          Não compareceram ({total})
          {faltas.justificadas.length > 0 && (
            <span className="ml-1 font-semibold text-amber-700">
              · {faltas.justificadas.length} justificada{faltas.justificadas.length === 1 ? "" : "s"}
            </span>
          )}
        </span>
        <span aria-hidden className={`text-slate-400 transition-transform ${aberta ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {aberta && (
        <ul className="divide-y divide-slate-100">
          {faltas.justificadas.map((f) => (
            <li key={f.obreiroId} className="flex items-center gap-2 bg-amber-50 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-800">{f.nome}</span>
                <span className="block text-xs text-amber-800">
                  {CARGOS[f.cargo].singular} · Falta justificada{f.motivo ? `: ${f.motivo}` : ""}
                </span>
              </span>
              {!bloqueado && (
                <button
                  type="button"
                  onClick={() => aoRemoverJustificativa(f.obreiroId)}
                  className="min-h-10 shrink-0 rounded-lg px-2 text-sm font-semibold text-slate-600 underline"
                >
                  Desfazer
                </button>
              )}
            </li>
          ))}

          {faltas.semJustificativa.map((p) => (
            <li key={p.obreiroId} className="px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-700">{p.nome}</span>
                  <span className="block text-xs text-slate-500">{CARGOS[p.cargo].singular} · Sem justificativa</span>
                </span>
                {!bloqueado && justificando !== p.obreiroId && (
                  <button
                    type="button"
                    onClick={() => {
                      setJustificando(p.obreiroId);
                      setMotivo("");
                    }}
                    className="min-h-10 shrink-0 rounded-lg border border-amber-400 bg-white px-3 text-sm font-semibold text-amber-800 active:bg-amber-50"
                  >
                    Justificar
                  </button>
                )}
              </div>

              {justificando === p.obreiroId && (
                <div className="mt-2 rounded-lg bg-amber-50 p-2">
                  <p className="mb-1.5 text-xs font-semibold text-amber-900">Motivo (opcional):</p>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {MOTIVOS_RAPIDOS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => salvar(p.obreiroId, m)}
                        className="min-h-10 rounded-full border border-amber-400 bg-white px-3 text-sm font-semibold text-amber-900 active:bg-amber-100"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <form
                    className="flex gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      salvar(p.obreiroId, motivo);
                    }}
                  >
                    <input
                      type="text"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Outro motivo"
                      maxLength={TAMANHO_MAXIMO_MOTIVO}
                      aria-label={`Motivo da falta de ${p.nome}`}
                      className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-base focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="min-h-11 shrink-0 rounded-lg bg-amber-600 px-3 text-sm font-bold text-white active:bg-amber-700"
                    >
                      Salvar
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setJustificando(null)}
                    className="mt-1.5 text-sm font-semibold text-slate-600 underline"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
