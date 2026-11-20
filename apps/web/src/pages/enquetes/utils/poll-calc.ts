import type { AssemblyMode, AssemblyScope, AssemblyStatus, AssemblyType, Poll } from "../../../features/enquetes/services/enquetes";

export function getPollTotalVotes(poll: Poll) {
  return poll.options.reduce((sum, option) => sum + option.votes.length, 0);
}

export function getWinningOption(poll: Poll) {
  return [...poll.options].sort((left, right) => right.votes.length - left.votes.length)[0] ?? null;
}

export function getStatusMeta(status: AssemblyStatus) {
  switch (status) {
    case "DRAFT":
      return { label: "Rascunho", className: "border-slate-200 bg-slate-100 text-slate-700" };
    case "CLOSED":
      return { label: "Encerrada", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    default:
      return { label: "Aberta", className: "border-sky-200 bg-sky-50 text-sky-700" };
  }
}

export function getAssemblyTypeLabel(value: AssemblyType) {
  return value === "EXTRAORDINARIA" ? "Extraordinaria" : "Ordinaria";
}

export function getModeLabel(value: AssemblyMode) {
  if (value === "HIBRIDA") return "Hibrida";
  if (value === "PRESENCIAL") return "Presencial";
  return "Digital";
}

export function getScopeLabel(value: AssemblyScope) {
  if (value === "ADMINISTRATIVO") return "Administrativo";
  if (value === "EMERGENCIAL") return "Emergencial";
  return "Geral";
}

export function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
