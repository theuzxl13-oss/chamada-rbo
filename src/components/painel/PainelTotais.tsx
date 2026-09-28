"use client";

/**
 * Painel de totais (somente leitura), para exibir em TV, projetor ou notebook
 * durante a chamada. Atualiza em tempo real conforme os aparelhos registram presenças.
 */
import { useMemo, useState } from "react";
import { CARGOS, CARGOS_HIERARQUIA, type CargoId } from "@/domain/cargos";
import { calcularResumo } from "@/domain/calculos";
import { formatarData } from "@/domain/formatacao";
import { useChamadaSincronizada } from "@/hooks/useChamadaSincronizada";

const CORES_CARGO: Record<CargoId, string> = {
  pastor: "border-t-marca-700",
  evangelista: "border-t-sky-600",
  presbitero: "border-t-indigo-500",
  diacono: "border-t-emerald-600",
  cooperador: "border-t-amber-500",
  membro: "border-t-slate-500",
};

export function PainelTotais() {
  const { pronto, chamada, conexao } = useChamadaSincronizada();
  const resumo = useMemo(() => (chamada ? calcularResumo(chamada) : null), [chamada]);
  const [mostrarCongregacoes, setMostrarCongregacoes] = useState(true);

  const telaCheia = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  if (!pronto) {
    return <Centro texto="Conectando..." />;
  }
  if (!chamada || !resumo) {
    return (
      <Centro texto="Nenhuma reunião em andamento.">
        <a href="/" className="mt-4 inline-block font-semibold text-marca-600 underline">
          Ir para a chamada
        </a>
      </Centro>
    );
  }

  const { reuniao } = chamada;

  return (
    <main className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase sm:text-sm">
            Painel de totais
          </p>
          <h1 className="text-2xl font-extrabold text-marca-700 uppercase sm:text-4xl">
            Reunião de Obreiros
          </h1>
          <p className="text-base text-slate-600 sm:text-xl">
            <strong>{formatarData(reuniao.data)}</strong>
            {reuniao.horario && ` · ${reuniao.horario}`}
            {reuniao.local && ` · ${reuniao.local}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IndicadorAoVivo conexao={conexao} finalizada={chamada.status === "finalizada"} />
          <button
            type="button"
            onClick={telaCheia}
            className="hidden min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:block"
          >
            ⛶ Tela cheia
          </button>
          <a
            href="/"
            className="min-h-10 content-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Chamada
          </a>
        </div>
      </header>

      {/* Total geral + progresso */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col justify-center rounded-3xl bg-marca-700 px-6 py-6 text-white shadow-lg sm:px-10 sm:py-8">
          <p className="text-sm font-bold tracking-[0.25em] text-marca-100 uppercase sm:text-lg">Total geral</p>
          <p className="tabular text-7xl leading-none font-extrabold sm:text-9xl">{resumo.totalGeral}</p>
          <p className="mt-2 text-base text-marca-100 sm:text-xl">presentes</p>
          {resumo.totalAvulsos > 0 && (
            <p className="mt-3 text-sm text-marca-100 sm:text-base">
              {resumo.totalCadastradosPresentes} cadastrados · {resumo.totalAvulsos} não cadastrados
            </p>
          )}
        </div>

        <div className="flex flex-col justify-center rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
          <p className="text-sm font-bold tracking-[0.2em] text-slate-500 uppercase sm:text-base">
            Congregações com presença
          </p>
          <p className="mt-1 text-5xl font-extrabold text-slate-900 sm:text-6xl">
            <span className="tabular">{resumo.comPresenca}</span>
            <span className="text-2xl font-semibold text-slate-400 sm:text-3xl"> / {resumo.cadastradas}</span>
          </p>
          <div className="mt-4 h-5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width] duration-500"
              style={{ width: `${resumo.percentualComPresenca}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-base sm:text-lg">
            <span className="font-bold text-emerald-700">{resumo.percentualComPresenca}%</span>
            <span className="text-slate-500">{resumo.cadastradas - resumo.comPresenca} sem presentes</span>
          </div>
        </div>
      </section>

      {/* Totais por cargo */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {CARGOS_HIERARQUIA.map((cargo) => {
          const valor = resumo.porCargo[cargo];
          const pct = resumo.totalGeral ? Math.round((valor / resumo.totalGeral) * 100) : 0;
          return (
            <div
              key={cargo}
              className={`rounded-2xl border border-t-8 border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5 ${CORES_CARGO[cargo]}`}
            >
              <p className="text-sm font-bold tracking-wide text-slate-500 uppercase sm:text-base">
                {CARGOS[cargo].plural}
              </p>
              <p className="tabular text-5xl leading-tight font-extrabold text-slate-900 sm:text-6xl">{valor}</p>
              <p className="text-sm text-slate-500">{pct}% do total</p>
            </div>
          );
        })}
      </section>

      {/* Totais por congregação */}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold tracking-widest text-slate-500 uppercase sm:text-lg">
            Total por congregação
          </h2>
          <button
            type="button"
            onClick={() => setMostrarCongregacoes((v) => !v)}
            className="text-sm font-semibold text-marca-600 underline"
          >
            {mostrarCongregacoes ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        {mostrarCongregacoes && (
          <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resumo.congregacoes.map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-2 border-b border-slate-100 py-2 text-base sm:text-lg"
              >
                <span className={`flex-1 truncate ${l.total > 0 ? "font-semibold text-slate-800" : "text-slate-500"}`}>
                  {l.nome}
                </span>
                <span className="tabular font-extrabold text-marca-700">{l.total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function IndicadorAoVivo({
  conexao,
  finalizada,
}: {
  conexao: "conectando" | "online" | "offline";
  finalizada: boolean;
}) {
  if (finalizada) {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-800">
        Chamada finalizada
      </span>
    );
  }
  const online = conexao === "online";
  return (
    <span
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${
        online ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      <span className={`size-2.5 rounded-full ${online ? "animate-pulse bg-red-600" : "bg-slate-400"}`} />
      {online ? "AO VIVO" : "Reconectando..."}
    </span>
  );
}

function Centro({ texto, children }: { texto: string; children?: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <p className="text-sm font-bold tracking-[0.2em] text-slate-500 uppercase">Painel de totais</p>
      <h1 className="mt-1 text-3xl font-extrabold text-marca-700 uppercase">Reunião de Obreiros</h1>
      <p className="mt-4 text-lg text-slate-600">{texto}</p>
      {children}
    </main>
  );
}
