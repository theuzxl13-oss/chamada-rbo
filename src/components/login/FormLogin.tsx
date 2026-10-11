"use client";

import { useState, type FormEvent } from "react";
import { Botao } from "../ui/Botao";
import { FaixaLogo } from "../ui/FaixaLogo";

const campo =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base focus:border-marca-600 focus:ring-2 focus:ring-marca-100 focus:outline-none";

export function FormLogin({ destino, naoConfigurado }: { destino: string; naoConfigurado: boolean }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });
      const d = (await r.json().catch(() => ({}))) as { erro?: string };
      if (!r.ok) throw new Error(d.erro ?? "Não foi possível entrar.");
      window.location.href = destino;
    } catch (e) {
      setErro((e as Error).message);
      setEntrando(false);
    }
  }

  return (
    <div className="min-h-dvh bg-slate-100">
      <FaixaLogo semUsuario />
      <main className="mx-auto max-w-sm px-4 py-10">
        <p className="text-center text-sm font-bold tracking-[0.2em] text-slate-500 uppercase">Controle de presença</p>
        <h1 className="mt-1 text-center text-3xl font-black text-slate-900 uppercase">Reunião de Obreiros</h1>

        {naoConfigurado ? (
          <div className="mt-8 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-[15px] text-amber-900">
            <p className="font-bold">Login ainda não configurado</p>
            <p className="mt-1">
              No Render, abra o serviço → <strong>Environment</strong> e crie as variáveis <code>ADMIN_USUARIO</code>,{" "}
              <code>ADMIN_SENHA</code>, <code>PRESENCA_USUARIO</code> e <code>PRESENCA_SENHA</code>.
            </p>
          </div>
        ) : (
          <form onSubmit={entrar} className="mt-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Usuário</span>
              <input
                className={campo}
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Senha</span>
              <input
                className={campo}
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erro}</p>}
            <Botao type="submit" grande className="w-full" disabled={entrando}>
              {entrando ? "Entrando..." : "ENTRAR"}
            </Botao>
          </form>
        )}
      </main>
    </div>
  );
}
