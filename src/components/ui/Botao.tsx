import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "sucesso" | "perigo" | "alerta" | "fantasma";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-marca-700 text-white hover:bg-marca-800 active:bg-marca-800",
  secundario:
    "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 active:bg-slate-100",
  sucesso: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
  perigo: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  alerta: "bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700",
  fantasma: "text-slate-600 hover:bg-slate-100 active:bg-slate-200",
};

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  grande?: boolean;
}

export function Botao({ variante = "primario", grande, className = "", ...props }: BotaoProps) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        grande ? "min-h-14 px-6 text-lg" : "min-h-11 px-4 text-[15px]"
      } ${VARIANTES[variante]} ${className}`}
    />
  );
}
