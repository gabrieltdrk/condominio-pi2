import type { MaintenanceCategory, MaintenanceKind, MaintenancePriority, MaintenanceStatus } from "../../../features/maintenance/services/maintenance";

export const inputClass = "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
export const textareaClass = "mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
export const labelClass = "text-xs font-semibold uppercase tracking-[0.12em] text-slate-500";

export const STATUS_META: Record<MaintenanceStatus, { label: string; tone: string }> = {
  AGENDADA: { label: "Agendada", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  EM_ANDAMENTO: { label: "Em andamento", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  CONCLUIDA: { label: "Concluida", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  ATRASADA: { label: "Atrasada", tone: "border-rose-200 bg-rose-50 text-rose-700" },
  CANCELADA: { label: "Cancelada", tone: "border-slate-200 bg-slate-100 text-slate-600" },
};

export const PRIORITY_META: Record<MaintenancePriority, string> = {
  BAIXA: "border-slate-200 bg-slate-100 text-slate-600",
  MEDIA: "border-sky-200 bg-sky-50 text-sky-700",
  ALTA: "border-amber-200 bg-amber-50 text-amber-700",
  CRITICA: "border-rose-200 bg-rose-50 text-rose-700",
};

export const CATEGORY_OPTIONS: Array<{ value: MaintenanceCategory; label: string }> = [
  { value: "HIDRAULICA", label: "Hidraulica" },
  { value: "ELETRICA", label: "Eletrica" },
  { value: "ESTRUTURAL", label: "Estrutural" },
  { value: "ELEVADORES", label: "Elevadores" },
  { value: "LIMPEZA", label: "Limpeza" },
  { value: "SEGURANCA", label: "Seguranca" },
  { value: "JARDINAGEM", label: "Jardinagem" },
  { value: "PINTURA", label: "Pintura" },
  { value: "CLIMATIZACAO", label: "Climatizacao" },
  { value: "OUTROS", label: "Outros" },
];

export const PRIORITY_OPTIONS: Array<{ value: MaintenancePriority; label: string }> = [
  { value: "BAIXA", label: "Baixa" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Critica" },
];

export const KIND_OPTIONS: Array<{ value: MaintenanceKind; label: string }> = [
  { value: "PREVENTIVA", label: "Preventiva" },
  { value: "CORRETIVA", label: "Corretiva" },
  { value: "INSPECAO", label: "Inspecao" },
];
