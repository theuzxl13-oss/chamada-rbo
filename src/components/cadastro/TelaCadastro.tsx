"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { CARGOS, CARGOS_HIERARQUIA, type CargoId } from "@/domain/cargos";
import { CONGREGACOES, buscarCongregacao } from "@/domain/congregacoes";
import { limparNome, nomeContem, ordenarPorNome } from "@/domain/obreiros";
import type { Operacao } from "@/domain/operacoes";
import type { Obreiro } from "@/domain/types";
import type { ResultadoEnvio } from "@/hooks/useChamadaSincronizada";
import { gerarId } from "@/lib/id";
import { Botao } from "@/components/ui/Botao";
import { AcoesModal, Modal } from "@/components/ui/Modal";

interface TelaCadastroProps {
  obreiros: Obreiro[];
  enviar: (op: Operacao) => Promise<ResultadoEnvio>;
  aoVoltar: () => void;
}

const campo =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base focus:border-marca-600 focus:ring-2 focus:ring-marca-100 focus:outline-none";

export function TelaCadastro({ obreiros, enviar, aoVoltar }: TelaCadastroProps) {
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState<CargoId | "">("");
  const [congregacaoId, setCongregacaoId] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [varios, setVarios] = useState(false);
  const [textoVarios, setTextoVarios] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [excluir, setExcluir] = useState<Obreiro | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroCongregacao, setFiltroCongregacao] = useState("");
  const campoNome = useRef<HTMLInputElement>(null);

  const grupos = useMemo(() => {
    const filtrados = obreiros.filter(
      (o) =>
        (!filtroCongregacao || o.congregacaoId === filtroCongregacao) &&
        (!busca || nomeContem(o.nome, busca)),
    );
    return CONGREGACOES.map((c) => ({
      congregacao: c,
      obreiros: ordenarPorNome(filtrados.filter((o) => o.congregacaoId === c.id)),
    })).filter((g) => g.obreiros.length > 0);
  }, [obreiros, busca, filtroCongregacao]);

  const totalFiltrado = grupos.reduce((s, g) => s + g.obreiros.length, 0);

  const limparFormulario = () => {
    setNome("");
    setEditandoId(null);
    setTextoVarios("");
  };

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    if (!cargo || !congregacaoId) {
      setMensagem({ tipo: "erro", texto: "Selecione o cargo e a congregação." });
      return;
    }

    if (varios && !editandoId) {
      const nomes = textoVarios.split(/\r?\n/).map(limparNome).filter((n) => n.length >= 2);
      if (nomes.length === 0) {
        setMensagem({ tipo: "erro", texto: "Digite ao menos um nome (um por linha)." });
        return;
      }
      setSalvando(true);
      let ok = 0;
      const falhas: string[] = [];
      for (const n of nomes) {
        const r = await enviar({
          tipo: "cadastrar_obreiro",
          obreiro: { id: gerarId(), nome: n, cargo, congregacaoId },
        });
        if (r.ok) ok++;
        else falhas.push(`${n}: ${r.erro}`);
      }
      setSalvando(false);
      setTextoVarios("");
      setMensagem({
        tipo: falhas.length ? "erro" : "ok",
        texto:
          `${ok} obreiro(s) cadastrado(s).` +
          (falhas.length ? ` Não cadastrados: ${falhas.join("; ")}` : ""),
      });
      return;
    }

    const nomeLimpo = limparNome(nome);
    if (nomeLimpo.length < 2) {
      setMensagem({ tipo: "erro", texto: "Informe o nome do obreiro." });
      return;
    }
    setSalvando(true);
    const obreiro: Obreiro = { id: editandoId ?? gerarId(), nome: nomeLimpo, cargo, congregacaoId };
    const r = await enviar(
      editandoId ? { tipo: "editar_obreiro", obreiro } : { tipo: "cadastrar_obreiro", obreiro },
    );
    setSalvando(false);
    if (r.ok) {
      setMensagem({ tipo: "ok", texto: `${nomeLimpo} ${editandoId ? "atualizado(a)" : "cadastrado(a)"}.` });
      limparFormulario();
      // Mantém cargo e congregação para agilizar o próximo cadastro.
      campoNome.current?.focus();
    } else {
      setMensagem({ tipo: "erro", texto: r.erro });
    }
  };

  const editar = (o: Obreiro) => {
    setVarios(false);
    setEditandoId(o.id);
    setNome(o.nome);
    setCargo(o.cargo);
    setCongregacaoId(o.congregacaoId);
    setMensagem(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    campoNome.current?.focus();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const alvo = excluir;
    setExcluir(null);
    const r = await enviar({ tipo: "remover_obreiro", obreiroId: alvo.id });
    setMensagem(r.ok ? { tipo: "ok", texto: `${alvo.nome} removido(a) do cadastro.` } : { tipo: "erro", texto: r.erro });
    if (editandoId === alvo.id) limparFormulario();
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-16">
      <button type="button" onClick={aoVoltar} className="mb-4 text-[15px] font-semibold text-slate-600">
        ← Voltar
      </button>
      <h1 className="text-2xl font-extrabold text-marca-700 uppercase">Cadastro de obreiros</h1>
      <p className="mb-4 text-[15px] text-slate-600">
        {obreiros.length} obreiro{obreiros.length === 1 ? "" : "s"} cadastrado{obreiros.length === 1 ? "" : "s"}. O
        cadastro é mantido de uma reunião para outra.
      </p>

      <form onSubmit={salvar} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" noValidate>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-slate-900">{editandoId ? "Editar obreiro" : "Novo obreiro"}</h2>
          {!editandoId && (
            <button
              type="button"
              onClick={() => setVarios((v) => !v)}
              className="text-sm font-semibold text-marca-600 underline"
            >
              {varios ? "Cadastrar um por vez" : "Adicionar vários de uma vez"}
            </button>
          )}
        </div>

        {varios && !editandoId ? (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Nomes (um por linha)</span>
            <textarea
              value={textoVarios}
              onChange={(e) => setTextoVarios(e.target.value)}
              rows={6}
              placeholder={"João da Silva\nMaria Souza\n..."}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base focus:border-marca-600 focus:outline-none"
            />
            <span className="text-xs text-slate-500">Todos receberão o cargo e a congregação escolhidos abaixo.</span>
          </label>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Nome</span>
            <input
              ref={campoNome}
              type="text"
              value={nome}
              maxLength={120}
              autoComplete="off"
              autoCapitalize="words"
              onChange={(e) => setNome(e.target.value)}
              className={campo}
            />
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Cargo</span>
            <select value={cargo} onChange={(e) => setCargo(e.target.value as CargoId)} className={campo}>
              <option value="">Selecione...</option>
              {CARGOS_HIERARQUIA.map((c) => (
                <option key={c} value={c}>
                  {CARGOS[c].singular}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Congregação</span>
            <select value={congregacaoId} onChange={(e) => setCongregacaoId(e.target.value)} className={campo}>
              <option value="">Selecione...</option>
              {CONGREGACOES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        {mensagem && (
          <p
            className={`rounded-lg p-3 text-sm font-semibold ${
              mensagem.tipo === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
            }`}
          >
            {mensagem.texto}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Botao type="submit" disabled={salvando} className="flex-1">
            {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : varios ? "Cadastrar todos" : "Cadastrar"}
          </Botao>
          {editandoId && (
            <>
              <Botao variante="secundario" onClick={limparFormulario}>
                Cancelar
              </Botao>
              <Botao
                variante="fantasma"
                className="text-red-700"
                onClick={() => setExcluir(obreiros.find((o) => o.id === editandoId) ?? null)}
              >
                Excluir
              </Botao>
            </>
          )}
        </div>
      </form>

      {/* ------------------------------------------------ lista */}
      <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_220px]">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="🔎 Buscar nome"
          aria-label="Buscar nome"
          className={campo}
        />
        <select
          value={filtroCongregacao}
          onChange={(e) => setFiltroCongregacao(e.target.value)}
          aria-label="Filtrar por congregação"
          className={campo}
        >
          <option value="">Todas as congregações</option>
          {CONGREGACOES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {totalFiltrado === 0 ? (
        <p className="mt-4 rounded-2xl bg-white p-6 text-center text-slate-500">
          {obreiros.length === 0 ? "Nenhum obreiro cadastrado ainda." : "Nenhum obreiro encontrado."}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {grupos.map((g) => (
            <section key={g.congregacao.id}>
              <h3 className="mb-1.5 flex justify-between px-1 text-sm font-bold tracking-wide text-slate-600 uppercase">
                <span>{g.congregacao.nome}</span>
                <span className="tabular">{g.obreiros.length}</span>
              </h3>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {g.obreiros.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => editar(o)}
                      className={`flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left active:bg-slate-50 ${
                        editandoId === o.id ? "bg-marca-50" : ""
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{o.nome}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {CARGOS[o.cargo].singular}
                      </span>
                      <span aria-hidden className="text-slate-400">
                        ✎
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {excluir && (
        <Modal titulo="Excluir do cadastro?" tom="perigo" aoFechar={() => setExcluir(null)}>
          <p>
            <strong>{excluir.nome}</strong> ({CARGOS[excluir.cargo].singular} —{" "}
            {buscarCongregacao(excluir.congregacaoId)?.nome}) será removido(a) do cadastro.
          </p>
          <p className="text-sm text-slate-500">
            Se já foi marcado(a) como presente na chamada atual, a presença continua registrada.
          </p>
          <AcoesModal>
            <Botao variante="secundario" onClick={() => setExcluir(null)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" onClick={confirmarExclusao}>
              Excluir
            </Botao>
          </AcoesModal>
        </Modal>
      )}
    </main>
  );
}
