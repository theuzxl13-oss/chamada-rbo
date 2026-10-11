"use client";

import { createContext, useContext } from "react";
import type { Perfil } from "@/domain/permissoes";

interface InfoAcesso {
  perfil: Perfil;
  nome: string;
  /** Falso no uso local sem senha (não mostra "Sair"). */
  loginAtivo: boolean;
}

const Contexto = createContext<InfoAcesso>({ perfil: "ADMIN", nome: "", loginAtivo: false });

export function ProvedorPerfil({ valor, children }: { valor: InfoAcesso; children: React.ReactNode }) {
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAcesso() {
  return useContext(Contexto);
}

export async function sair() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  window.location.href = "/login";
}
