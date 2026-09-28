"use client";

import { calcularResumo } from "@/domain/calculos";
import { formatarData } from "@/domain/formatacao";
import type { Chamada } from "@/domain/types";
import { Botao } from "@/components/ui/Botao";

interface TelaInicialProps {
  pronto: boolean;
  chamada: Chamada | null;
  backup: Chamada | null;
  totalObreiros: number;
  aoCadastro: () => void;
  aoNovaReuniao: () => void;
  aoContinuar: () => void;
  aoDescartar: () => void;
  aoRestaurarBackup: () => void;
  aoDescartarBackup: () => void;
}

export function TelaInicial({
  pronto,
  chamada,
  backup,
  totalObreiros,
  aoCadastro,
  aoNovaReuniao,
  aoContinuar,
  aoDescartar,
  aoRestaurarBackup,
  aoDescartarBackup,
}: TelaInicialProps) {
  const resumo = chamada ? calcularResumo(chamada) : null;
  const resumoBackup = !chamada && backup ? calcularResumo(backup) : null;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-8 sm:py-12">
      <header className="text-center">
        <p className="text-sm font-bold tracking-[0.2em] text-slate-500 uppercase">
          Controle de Presença
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-marca-700 uppercase sm:text-4xl">
          Reunião de Obreiros
        </h1>
        <p className="mt-3 text-[15px] text-slate-600">
          Faça a chamada das congregações e gere o relatório da reunião.
        </p>
      </header>

      {!pronto && (
        <p className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm">
          Conectando...
        </p>
      )}

      {pronto && chamada && resumo && (
        <section className="rounded-2xl border-2 border-amber-300 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold tracking-widest text-amber-700 uppercase">
            {chamada.status === "finalizada" ? "Chamada finalizada" : "Chamada em andamento"}
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">Reunião de Obreiros</p>
          <p className="text-2xl font-extrabold text-marca-700">{formatarData(chamada.reuniao.data)}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs font-semibold text-slate-500 uppercase">Total atual</dt>
              <dd className="tabular text-2xl font-extrabold text-slate-900">{resumo.totalGeral}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs font-semibold text-slate-500 uppercase">Conferidas</dt>
              <dd className="tabular text-2xl font-extrabold text-slate-900">
                {resumo.conferidas}/{resumo.cadastradas}
              </dd>
            </div>
          </dl>
          {chamada.status === "em_andamento" && (
            <p className="mt-3 text-[15px] text-slate-600">Deseja continuar?</p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <Botao grande onClick={aoContinuar}>
              {chamada.status === "finalizada" ? "ABRIR CHAMADA" : "CONTINUAR CHAMADA"}
            </Botao>
            <div className="grid grid-cols-2 gap-2">
              <Botao variante="secundario" onClick={aoNovaReuniao}>
                + Nova reunião
              </Botao>
              <Botao variante="fantasma" className="text-red-700" onClick={aoDescartar}>
                Descartar
              </Botao>
            </div>
          </div>
        </section>
      )}

      {pronto && !chamada && (
        <>
          {backup && resumoBackup && (
            <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
              <p className="font-bold text-amber-800">Chamada salva neste aparelho</p>
              <p className="mt-1 text-[15px] text-amber-900">
                Reunião de {formatarData(backup.reuniao.data)} — total {resumoBackup.totalGeral},{" "}
                {resumoBackup.conferidas} de {resumoBackup.cadastradas} congregações conferidas.
                Ela não está mais no sistema. Deseja restaurá-la?
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Botao variante="alerta" onClick={aoRestaurarBackup}>
                  Restaurar
                </Botao>
                <Botao variante="secundario" onClick={aoDescartarBackup}>
                  Descartar
                </Botao>
              </div>
            </section>
          )}
          <Botao grande className="min-h-20 text-xl" onClick={aoNovaReuniao}>
            + NOVA REUNIÃO
          </Botao>
        </>
      )}

      {pronto && (
        <Botao variante="secundario" grande onClick={aoCadastro}>
          👥 Cadastro de obreiros ({totalObreiros})
        </Botao>
      )}
      {pronto && chamada && (
        <a
          href="/painel"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 text-lg font-semibold text-slate-800 hover:bg-slate-50"
        >
          📊 Painel de totais (TV / projetor)
        </a>
      )}
    </main>
  );
}
