/**
 * Cargos contabilizados na chamada.
 *
 * `CARGOS_CHAMADA` é a ordem usada na tela de contagem (Membro → Pastor).
 * `CARGOS_HIERARQUIA` é a ordem usada em resumos e relatórios (Pastor → Membro).
 */

export type CargoId =
  | "membro"
  | "cooperador"
  | "diacono"
  | "presbitero"
  | "evangelista"
  | "pastor";

export interface Cargo {
  id: CargoId;
  singular: string;
  plural: string;
}

export const CARGOS: Record<CargoId, Cargo> = {
  membro: { id: "membro", singular: "Membro", plural: "Membros" },
  cooperador: { id: "cooperador", singular: "Cooperador", plural: "Cooperadores" },
  diacono: { id: "diacono", singular: "Diácono", plural: "Diáconos" },
  presbitero: { id: "presbitero", singular: "Presbítero", plural: "Presbíteros" },
  evangelista: { id: "evangelista", singular: "Evangelista", plural: "Evangelistas" },
  pastor: { id: "pastor", singular: "Pastor", plural: "Pastores" },
};

/** Ordem da contagem na tela da chamada. */
export const CARGOS_CHAMADA: CargoId[] = [
  "membro",
  "cooperador",
  "diacono",
  "presbitero",
  "evangelista",
  "pastor",
];

/** Ordem hierárquica para resumos e relatórios. */
export const CARGOS_HIERARQUIA: CargoId[] = [
  "pastor",
  "evangelista",
  "presbitero",
  "diacono",
  "cooperador",
  "membro",
];

export function isCargoId(valor: unknown): valor is CargoId {
  return typeof valor === "string" && valor in CARGOS;
}
