"use client";

import { useRef, useState, type FormEvent } from "react";
import { CARGOS, CARGOS_HIERARQUIA, type CargoId } from "@/domain/cargos";
import { limparNome } from "@/domain/obreiros";

interface FormCadastroRapidoProps {
  congregacaoNome: string;
  /** Cadastra e marca presente. Devolve uma mensagem de erro, ou null se deu certo. */
  aoCadastrar: (nome: string, cargo: CargoId) => Promise<string | null>;
  aoFechar: () => void;
}

/** Cadastro rápido durante a chamada: a pessoa entra no cadastro e já fica presente. */
export function FormCadastroRapido({ congregacaoNome, aoCadastrar, aoFechar }: FormCadastroRapidoProps) {
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState<CargoId | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const campoNome = useRef<HTMLInputElement>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const nomeLimpo = limparNome(nome);
    if (nomeLimpo.length < 2) {
      setMensagem({ tipo: "erro", texto: "Digite o nome." });
      campoNome.current?.focus();
      return;
    }
    if (!cargo) {
      setMensagem({ tipo: "erro", texto: "Escolha o cargo." });
      return;
    }
    setSalvando(true);
    const erro = await aoCadastrar(nomeLimpo, cargo);
    setSalvando(false);
    if (erro) {
      setMensagem({ tipo: "erro", texto: erro });
      return;
    }
    // Pronto para o próximo: limpa o nome e mantém o cargo.
    setMensagem({ tipo: "ok", texto: `${nomeLimpo} cadastrado(a) e marcado(a) presente.` });
    setNome("");
    campoNome.current?.focus();
  };

  return (
    <form onSubmit={enviar} className="rounded-xl border-2 border-marca-100 bg-marca-50 p-3" noValidate>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">Cadastrar em {congregacaoNome}</h3>
        <button type="button" onClick={aoFechar} className="text-sm font-semibold text-slate-500 underline">
          Fechar
        </button>
      </div>

      <input
        ref={campoNome}
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome"
        aria-label="Nome"
        maxLength={120}
        autoComplete="off"
        autoCapitalize="words"
        autoFocus
        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base focus:border-marca-600 focus:outline-none"
      />

      <p className="mt-2 mb-1 text-xs font-semibold text-slate-600 uppercase">Cargo</p>
      <div className="grid grid-cols-3 gap-1.5">
        {CARGOS_HIERARQUIA.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCargo(c)}
            aria-pressed={cargo === c}
            className={`min-h-11 rounded-lg px-1 text-sm font-semibold ${
              cargo === c ? "bg-marca-700 text-white" : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            {CARGOS[c].singular}
          </button>
        ))}
      </div>

      {mensagem && (
        <p
          className={`mt-2 rounded-lg p-2 text-sm font-semibold ${
            mensagem.tipo === "ok" ? "bg-emerald-100 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {mensagem.texto}
        </p>
      )}

      <button
        type="submit"
        disabled={salvando}
        className="mt-3 min-h-12 w-full rounded-xl bg-emerald-600 text-base font-bold text-white active:bg-emerald-700 disabled:opacity-60"
      >
        {salvando ? "Salvando..." : "✓ Cadastrar e marcar presente"}
      </button>
    </form>
  );
}
