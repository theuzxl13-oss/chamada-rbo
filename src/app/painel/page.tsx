import type { Metadata } from "next";
import { PainelTotais } from "@/components/painel/PainelTotais";

export const metadata: Metadata = {
  title: "Painel de Totais — Reunião de Obreiros",
};

export default function PaginaPainel() {
  return <PainelTotais />;
}
