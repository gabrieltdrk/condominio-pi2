import type { AvisoTipo } from "../services/avisos";

export const CURTIDAS_DESTAQUE = 3;

export const AVISO_TIPO_BAR: Record<AvisoTipo, string> = {
  Informativo:  "bg-blue-400",
  Manutenção:   "bg-amber-400",
  Assembleia:   "bg-indigo-400",
  Segurança:    "bg-red-400",
  Eventos:      "bg-emerald-400",
};

export type AvisoSortKey = "titulo" | "tipo" | "created_at" | "data_expiracao" | "curtidas_count";
