"use client";

import { useState, type FormEvent } from "react";
import { dataIsoValida, hojeIso } from "@/domain/formatacao";
import type { DadosReuniao } from "@/domain/types";
import { Botao } from "@/components/ui/Botao";

interface FormNovaReuniaoProps {
  enviando: boolean;
  erro: string | null;
  aoCancelar: () => void;
  aoIniciar: (dados: DadosReuniao) => void;
}

const campo =
  "h-13 w-full rounded-xl border border-slate-300 bg-white px-4 text-base focus:border-marca-600 focus:ring-2 focus:ring-marca-100 focus:outline-none";

export function FormNovaReuniao({ enviando, erro, aoCancelar, aoIniciar }: FormNovaReuniaoProps) {
  const [dados, setDados] = useState<DadosReuniao>({
    data: hojeIso(),
    horario: "",
    local: "",
    observacao: "",
  });
  const [erroData, setErroData] = useState<string | null>(null);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!dados.data || !dataIsoValida(dados.data)) {
      setErroData("A data da reunião é obrigatória.");
      return;
    }
    setErroData(null);
    aoIniciar(dados);
  };

  const alterar = (campoNome: keyof DadosReuniao) => (valor: string) =>
    setDados((d) => ({ ...d, [campoNome]: valor }));

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <button
        type="button"
        onClick={aoCancelar}
        className="mb-4 text-[15px] font-semibold text-slate-600"
      >
        ← Voltar
      </button>
      <form onSubmit={enviar} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" noValidate>
        <h1 className="mb-5 text-xl font-extrabold text-marca-700 uppercase">
          Nova Reunião de Obreiros
        </h1>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Data <span className="text-red-600">*</span>
            </span>
            <input
              type="date"
              required
              value={dados.data}
              onChange={(e) => alterar("data")(e.target.value)}
              className={`${campo} ${erroData ? "border-red-500" : ""}`}
            />
            {erroData && <span className="mt-1 block text-sm text-red-600">{erroData}</span>}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Horário</span>
            <input
              type="time"
              value={dados.horario}
              onChange={(e) => alterar("horario")(e.target.value)}
              className={campo}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Local</span>
            <input
              type="text"
              value={dados.local}
              maxLength={200}
              placeholder="Ex.: Sede do Setor"
              onChange={(e) => alterar("local")(e.target.value)}
              className={campo}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Observação</span>
            <textarea
              value={dados.observacao}
              maxLength={1000}
              rows={3}
              onChange={(e) => alterar("observacao")(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base focus:border-marca-600 focus:ring-2 focus:ring-marca-100 focus:outline-none"
            />
          </label>
        </div>

        {erro && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{erro}</p>}

        <Botao type="submit" grande className="mt-6 w-full" disabled={enviando}>
          {enviando ? "Iniciando..." : "INICIAR CHAMADA"}
        </Botao>
      </form>
    </main>
  );
}
