import type { OcorrenciaStatus, OcorrenciaUrgencia } from "../services/ocorrencias";

export const CATEGORIAS = ["Manutenção", "Barulho", "Reclamação", "Sugestão", "Dúvida"];
export const LOCALIZACOES = ["Áreas comuns", "Minha unidade", "Garagem", "Portaria"];
export const STATUS_OPTIONS: OcorrenciaStatus[] = [
  "Aberto", "Em Análise", "Em Atendimento",
  "Pendente Terceiros", "Concluído", "Cancelado",
];

export const STATUS_COLORS: Record<OcorrenciaStatus, string> = {
  Aberto: "bg-blue-50 text-blue-700 border-blue-200",
  "Em Análise": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Em Atendimento": "bg-orange-50 text-orange-700 border-orange-200",
  "Pendente Terceiros": "bg-purple-50 text-purple-700 border-purple-200",
  Concluído: "bg-green-50 text-green-700 border-green-200",
  Cancelado: "bg-gray-100 text-gray-500 border-gray-200",
};

export const URGENCIA_COLORS: Record<OcorrenciaUrgencia, string> = {
  Baixa: "bg-green-50 text-green-700 border-green-200",
  Média: "bg-amber-50 text-amber-700 border-amber-200",
  Alta: "bg-red-50 text-red-700 border-red-200",
};

export const URGENCIA_BAR: Record<OcorrenciaUrgencia, string> = {
  Alta: "bg-red-400",
  Média: "bg-amber-400",
  Baixa: "bg-green-400",
};

export const CURTIDAS_DESTAQUE = 3;

export const URGENCIA_ORDER: Record<OcorrenciaUrgencia, number> = { Alta: 0, Média: 1, Baixa: 2 };
export const STATUS_ORDER: Record<OcorrenciaStatus, number> = {
  Aberto: 0, "Em Análise": 1, "Em Atendimento": 2,
  "Pendente Terceiros": 3, Concluído: 4, Cancelado: 5,
};

export type SortKey = "protocolo" | "author_name" | "assunto" | "categoria" | "urgencia" | "status" | "created_at" | "curtidas_count";
