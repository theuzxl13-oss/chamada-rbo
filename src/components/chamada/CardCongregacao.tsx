"use client";

import { memo, useMemo, useState } from "react";
import { CARGOS, CARGOS_CHAMADA, CARGOS_HIERARQUIA, type CargoId } from "@/domain/cargos";
import type { LinhaCongregacao } from "@/domain/calculos";
import { nomeContem, ordenarPorNome } from "@/domain/obreiros";
import type { Obreiro } from "@/domain/types";
import { ContadorCargo } from "./ContadorCargo";
import { LinhaPresenca } from "./LinhaPresenca";

interface CardCongregacaoProps {
  linha: LinhaCongregacao;
  /** Obreiros cadastrados nesta congregação. */
  obreiros: Obreiro[];
  aberta: boolean;
  bloqueado: boolean;
  aoAlternar: (id: string) => void;
  aoMarcarPresenca: (obreiroId: string, presente: boolean) => void;
  aoAjustar: (congregacaoId: string, cargo: CargoId, delta: number) => void;
  aoDefinir: (congregacaoId: string, cargo: CargoId, valor: number) => void;
  aoMarcarConferida: (congregacaoId: string, conferida: boolean) => void;
}

const ABREVIACOES: Record<CargoId, string> = {
  pastor: "Past.",
  evangelista: "Evang.",
  presbitero: "Presb.",
  diacono: "Diác.",
  cooperador: "Coop.",
  membro: "Memb.",
};

export const CardCongregacao = memo(function CardCongregacao({
  linha,
  obreiros,
  aberta,
  bloqueado,
  aoAlternar,
  aoMarcarPresenca,
  aoAjustar,
  aoDefinir,
  aoMarcarConferida,
}: CardCongregacaoProps) {
  const { conferida, total } = linha;
  const [filtro, setFiltro] = useState("");
  const [mostrarAvulsos, setMostrarAvulsos] = useState(false);

  // Lista A–Z: cadastrados desta congregação + presentes que saíram do cadastro depois de marcados.
  const pessoas = useMemo(() => {
    const ids = new Set(obreiros.map((o) => o.id));
    const extras = linha.presentes
      .filter((p) => !ids.has(p.obreiroId))
      .map((p) => ({ id: p.obreiroId, nome: p.nome, cargo: p.cargo, congregacaoId: p.congregacaoId }));
    return ordenarPorNome([...obreiros, ...extras]);
  }, [obreiros, linha.presentes]);

  const presentesIds = useMemo(() => new Set(linha.presentes.map((p) => p.obreiroId)), [linha.presentes]);
  const visiveis = filtro ? pessoas.filter((p) => nomeContem(p.nome, filtro)) : pessoas;
  const avulsosAbertos = mostrarAvulsos || linha.totalAvulsos > 0;

  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
        conferida ? "border-emerald-300" : "border-slate-200"
      } ${aberta ? "ring-2 ring-marca-100" : ""}`}
    >
      <button
        type="button"
        onClick={() => aoAlternar(linha.id)}
        aria-expanded={aberta}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50"
      >
        <span
          aria-hidden
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-base font-bold ${
            conferida ? "bg-emerald-600 text-white" : "border-2 border-slate-300 text-transparent"
          }`}
        >
          ✓
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-bold text-slate-900 uppercase">{linha.nome}</span>
          <span className={`block text-[13px] font-medium ${conferida ? "text-emerald-700" : "text-slate-500"}`}>
            {conferida ? (total === 0 ? "Conferida — 0 presentes" : "Conferida") : "Não conferida"}
            {pessoas.length > 0 && ` · ${linha.presentes.length}/${pessoas.length} cadastrados`}
          </span>
        </span>
        <span className="text-right">
          <span className="block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Total</span>
          <span className="tabular block text-2xl leading-none font-extrabold text-marca-700">{total}</span>
        </span>
        <span aria-hidden className={`text-slate-400 transition-transform ${aberta ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {aberta && (
        <div className="border-t border-slate-100 px-3 pt-3 pb-4 sm:px-4">
          {/* ------------------------------------------------ presença por nome */}
          <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
            <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase">Obreiros cadastrados</h3>
            <span className="tabular text-sm font-semibold text-slate-600">
              {linha.presentes.length} de {pessoas.length} presentes
            </span>
          </div>

          {pessoas.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
              Nenhum obreiro cadastrado nesta congregação. Use &quot;Cadastro de obreiros&quot; na tela inicial,
              ou conte os presentes em &quot;Não cadastrados&quot; abaixo.
            </p>
          ) : (
            <>
              {pessoas.length > 12 && (
                <input
                  type="search"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  placeholder={`Buscar nome em ${linha.nome}`}
                  aria-label={`Buscar nome em ${linha.nome}`}
                  className="mb-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-base focus:border-marca-600 focus:outline-none"
                />
              )}
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                {visiveis.map((p) => (
                  <li key={p.id}>
                    <LinhaPresenca
                      nome={p.nome}
                      cargo={p.cargo}
                      presente={presentesIds.has(p.id)}
                      bloqueado={bloqueado}
                      aoAlternar={() => aoMarcarPresenca(p.id, !presentesIds.has(p.id))}
                    />
                  </li>
                ))}
                {visiveis.length === 0 && <li className="p-3 text-sm text-slate-500">Nenhum nome encontrado.</li>}
              </ul>
            </>
          )}

          {/* ------------------------------------------------ não cadastrados */}
          <div className="mt-4">
            {avulsosAbertos ? (
              <>
                <h3 className="px-1 text-xs font-bold tracking-widest text-slate-500 uppercase">
                  Não cadastrados (visitantes / novos)
                </h3>
                <div className="divide-y divide-slate-100 px-1">
                  {CARGOS_CHAMADA.map((cargo) => (
                    <ContadorCargo
                      key={cargo}
                      rotulo={CARGOS[cargo].plural}
                      valor={linha.avulsos[cargo]}
                      bloqueado={bloqueado}
                      aoAjustar={(delta) => aoAjustar(linha.id, cargo, delta)}
                      aoDefinir={(valor) => aoDefinir(linha.id, cargo, valor)}
                    />
                  ))}
                </div>
              </>
            ) : (
              !bloqueado && (
                <button
                  type="button"
                  onClick={() => setMostrarAvulsos(true)}
                  className="min-h-11 w-full rounded-xl border border-dashed border-slate-300 text-[15px] font-semibold text-slate-600 active:bg-slate-50"
                >
                  + Contar presentes não cadastrados
                </button>
              )
            )}
          </div>

          {/* ------------------------------------------------ totais */}
          <div className="mt-3 rounded-xl bg-marca-50 px-4 py-3">
            <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[13px] text-marca-700 sm:grid-cols-6">
              {CARGOS_HIERARQUIA.map((cargo) => (
                <span key={cargo} className="flex justify-between gap-1">
                  <span>{ABREVIACOES[cargo]}</span>
                  <span className="tabular font-bold">{linha.contagem[cargo]}</span>
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-marca-100 pt-2">
              <span className="text-sm font-bold text-marca-700 uppercase">Total da congregação</span>
              <span className="tabular text-2xl font-extrabold text-marca-700">{total}</span>
            </div>
          </div>

          {!bloqueado &&
            (conferida ? (
              <button
                type="button"
                onClick={() => aoMarcarConferida(linha.id, false)}
                className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 text-[15px] font-semibold text-slate-600 active:bg-slate-100"
              >
                Desmarcar como conferida
              </button>
            ) : (
              <button
                type="button"
                onClick={() => aoMarcarConferida(linha.id, true)}
                className="mt-3 min-h-13 w-full rounded-xl bg-emerald-600 text-base font-bold text-white active:bg-emerald-700"
              >
                ✓ CONCLUIR CONGREGAÇÃO
              </button>
            ))}
        </div>
      )}
    </section>
  );
});
