"use client";

import { PERFIL_LABEL } from "@/domain/permissoes";
import { sair, useAcesso } from "../PerfilContexto";

/** Faixa superior com a logo da igreja (versão branca sobre fundo preto) e o usuário logado. */
export function FaixaLogo({ compacta = false, semUsuario = false }: { compacta?: boolean; semUsuario?: boolean }) {
  const { perfil, nome, loginAtivo } = useAcesso();
  return (
    <header className="relative bg-faixa">
      <div className={`mx-auto flex max-w-6xl items-center justify-center px-4 ${compacta ? "py-2" : "py-4 sm:py-5"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-branca.png"
          alt="Igreja Evangélica Assembleia de Deus em São Paulo — Ministério do Belém — Setor 46 Embu-Guaçu"
          className={compacta ? "h-10 w-auto sm:h-12" : "h-14 w-auto sm:h-20"}
        />
      </div>
      {loginAtivo && !semUsuario && (
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-2 text-right text-white sm:right-4">
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-semibold">{nome}</span>
            <span className="block text-xs text-white/70">{PERFIL_LABEL[perfil]}</span>
          </span>
          <button
            type="button"
            onClick={sair}
            className="rounded-lg border border-white/30 px-2.5 py-1 text-xs font-semibold hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      )}
    </header>
  );
}
