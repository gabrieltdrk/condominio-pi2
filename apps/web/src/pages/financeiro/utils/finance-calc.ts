import type { ComponentType } from "react";
import { Building2, Droplets, ShieldCheck, Users, Wrench, Zap } from "lucide-react";
import type { FinanceBillStatus, FinanceEntry } from "../../../features/financeiro/services/financeiro";
import type { Floor } from "../../../features/predio/services/predio";
import { formatCurrency as _formatCurrency } from "../../../lib/format";

// ── Re-exports ───────────────────────────────────────────────────────────────
/** Re-exporta para components internos não precisarem subir dois níveis. */
export { _formatCurrency as formatCurrency };

// ── Types locais ──────────────────────────────────────────────────────────────
export type RevenueCategory = "Taxa condominial" | "Multa" | "Juros por atraso" | "Aluguel areas comuns";
export type ExpenseCategory = "Funcionarios" | "Energia" | "Agua" | "Manutencao" | "Limpeza" | "Seguranca" | "Outros";
export type RevenueStatus = "Recebido" | "Em aberto" | "Atrasado";
export type ExpenseStatus = "Pago" | "Pendente" | "Em negociacao";
export type MonthlyPoint = { month: string; receitas: number; despesas: number; saldo: number };
export type UnitOption = { value: string; label: string; resident: string; email: string };
export type AccountabilityReport = {
  key: string;
  label: string;
  receitas: number;
  despesas: number;
  saldo: number;
  highlights: FinanceEntry[];
};
export type LocalMockAssignment = {
  userId: string | null;
  resident: { id?: string; name?: string; email?: string } | null;
};
export type ResidentUnitDescriptor = { full: string; tower: string; apartment: string };

// ── Constants ─────────────────────────────────────────────────────────────────
export const revenueCategories: RevenueCategory[] = [
  "Taxa condominial", "Multa", "Juros por atraso", "Aluguel areas comuns",
];
export const expenseCategories: ExpenseCategory[] = [
  "Funcionarios", "Energia", "Agua", "Manutencao", "Limpeza", "Seguranca", "Outros",
];

export const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

// Mantido aqui por ser utilizado na página e nos componentes de gráfico.
export const expenseCategoryMeta: Record<ExpenseCategory, { label: string; color: string; tone: string; icon: ComponentType }> = {
  Funcionarios: { label: "Pessoal",    color: "#7c3aed", tone: "border-violet-200 bg-violet-50 text-violet-700",   icon: Users },
  Energia:      { label: "Luz",        color: "#f59e0b", tone: "border-amber-200 bg-amber-50 text-amber-700",       icon: Zap },
  Agua:         { label: "Agua",       color: "#06b6d4", tone: "border-cyan-200 bg-cyan-50 text-cyan-700",          icon: Droplets },
  Manutencao:   { label: "Manutencao", color: "#10b981", tone: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: Wrench },
  Limpeza:      { label: "Limpeza",    color: "#6366f1", tone: "border-indigo-200 bg-indigo-50 text-indigo-700",    icon: ShieldCheck },
  Seguranca:    { label: "Seguranca",  color: "#ef4444", tone: "border-rose-200 bg-rose-50 text-rose-700",          icon: ShieldCheck },
  Outros:       { label: "Outros",     color: "#64748b", tone: "border-slate-200 bg-slate-100 text-slate-700",      icon: Building2 },
};

// ── Formatadores ──────────────────────────────────────────────────────────────

/** Formata data de ISO string para localidade pt-BR, usando T12:00:00 para evitar offset de timezone. */
export function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

export function getMonthKey(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return monthFormatter.format(new Date(year, month - 1, 1));
}

export function formatMonthLongLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

// ── Utilitários de unidade ────────────────────────────────────────────────────

export function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUnit(value: string | null | undefined) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

export function parseUnitDescriptor(value: string | null | undefined): ResidentUnitDescriptor {
  const raw = normalizeText(value);
  const apartmentMatch = raw.match(/ap\s*([a-z0-9-]+)/) ?? raw.match(/\b(\d{2,4}[a-z]?)\b/);
  const apartment = apartmentMatch?.[1] ?? "";
  const towerMatch = raw.match(/torre\s*([a-z0-9]+)/);
  const tower = towerMatch?.[1] ?? "";
  return { full: normalizeUnit(value), tower, apartment: apartment.replace(/[^a-z0-9-]/g, "") };
}

export function billMatchesResidentUnit(
  billUnit: string | null | undefined,
  residentUnits: ResidentUnitDescriptor[],
) {
  const billDescriptor = parseUnitDescriptor(billUnit);
  if (!billDescriptor.full) return false;
  return residentUnits.some((unit) => {
    if (unit.full && unit.full === billDescriptor.full) return true;
    if (unit.full && billDescriptor.full.includes(unit.full)) return true;
    if (unit.full && unit.full.includes(billDescriptor.full)) return true;
    const sameApartment = !!unit.apartment && unit.apartment === billDescriptor.apartment;
    const towerCompatible = !unit.tower || !billDescriptor.tower || unit.tower === billDescriptor.tower;
    return sameApartment && towerCompatible;
  });
}

export function readLocalMockAssignments(): Record<string, LocalMockAssignment> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("predio:assignments");
    return raw ? (JSON.parse(raw) as Record<string, LocalMockAssignment>) : {};
  } catch {
    return {};
  }
}

export function getUnitOptions(floors: Floor[]): UnitOption[] {
  return floors
    .flatMap((floor) =>
      floor.apartments
        .filter((apartment) => apartment.resident)
        .map((apartment) => ({
          value: `${floor.tower} - Ap ${apartment.number}`,
          label: `${floor.tower} - Ap ${apartment.number} - ${apartment.resident?.name ?? "Morador"}`,
          resident: apartment.resident?.name ?? "Morador nao informado",
          email: apartment.resident?.email ?? "",
        })),
    )
    .sort((a, b) => a.value.localeCompare(b.value, "pt-BR", { numeric: true }));
}

export function getBillStatusMeta(status: FinanceBillStatus) {
  switch (status) {
    case "PAID":      return { label: "Pago",      className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    case "OVERDUE":   return { label: "Atrasado",  className: "border-rose-200 bg-rose-50 text-rose-700" };
    case "CANCELLED": return { label: "Cancelado", className: "border-slate-200 bg-slate-100 text-slate-600" };
    default:          return { label: "Em aberto", className: "border-amber-200 bg-amber-50 text-amber-700" };
  }
}
