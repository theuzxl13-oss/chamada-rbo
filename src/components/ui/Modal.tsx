"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  titulo: string;
  tom?: "normal" | "alerta" | "perigo";
  /** Conteúdo do modal; os botões ficam dentro de <AcoesModal>. */
  children: ReactNode;
  aoFechar?: () => void;
}

const CORES_TITULO = {
  normal: "text-marca-700",
  alerta: "text-amber-700",
  perigo: "text-red-700",
};

export function Modal({ titulo, tom = "normal", children, aoFechar }: ModalProps) {
  useEffect(() => {
    if (!aoFechar) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aoFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={(e) => e.target === e.currentTarget && aoFechar?.()}
    >
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl">
        <h2 className={`mb-3 text-lg font-bold ${CORES_TITULO[tom]}`}>{titulo}</h2>
        <div className="space-y-2 text-[15px] leading-relaxed text-slate-700">{children}</div>
      </div>
    </div>
  );
}

export function AcoesModal({ children }: { children: ReactNode }) {
  return (
    <div className="!mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      {children}
    </div>
  );
}
