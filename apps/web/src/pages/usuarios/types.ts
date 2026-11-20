export type Role = "ADMIN" | "MORADOR" | "PORTEIRO";
export type ResidentType = "PROPRIETARIO" | "INQUILINO" | "VISITANTE";
export type UserStatus = "ATIVO" | "INATIVO";
export type SortKey = "name" | "email" | "role" | "created_at";

export type FilterDraft = {
  roles: Role[];
  tipos: ResidentType[];
  habilitado: "" | "sim" | "nao";
  condominioId: string;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
};

export const inputCls =
  "px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-[13px] outline-none w-full focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

export function apartmentLabel(a: { number: string; level: number }): string {
  return `${a.number} · ${a.level}o andar`;
}
