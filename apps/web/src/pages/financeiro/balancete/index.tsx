import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Printer, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import AppLayout from "../../../features/layout/components/app-layout";
import {
  listFinanceEntries,
  listFinanceBills,
  type FinanceEntry,
  type FinanceBill,
} from "../../../features/financeiro/services/financeiro";
import {
  expenseCategoryMeta,
  formatCurrency,
  formatDate,
  formatMonthLongLabel,
  getMonthKey,
  type ExpenseCategory,
} from "../utils/finance-calc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildMonthOptions(): { key: string; label: string }[] {
  const today = new Date();
  const options = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ key, label: formatMonthLongLabel(key) });
  }
  return options;
}

function escapeCsv(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportToCsv(rows: string[][], filename: string) {
  const content = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BalancetePage() {
  const monthOptions = useMemo(buildMonthOptions, []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].key);

  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [bills, setBills] = useState<FinanceBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([listFinanceEntries(), listFinanceBills({ limit: 500 })])
      .then(([e, b]) => { setEntries(e); setBills(b); })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar dados."))
      .finally(() => setLoading(false));
  }, []);

  // ── Filter by selected month ──────────────────────────────────────────────

  const monthEntries = useMemo(
    () => entries.filter((e) => getMonthKey(e.reference_date) === selectedMonth),
    [entries, selectedMonth],
  );

  const monthBills = useMemo(
    () => bills.filter((b) => getMonthKey(b.competence_date) === selectedMonth),
    [bills, selectedMonth],
  );

  // ── Totals ────────────────────────────────────────────────────────────────

  const revenues = monthEntries.filter((e) => e.type === "REVENUE");
  const expenses = monthEntries.filter((e) => e.type === "EXPENSE");

  const totalRevenue = revenues.reduce((s, e) => s + e.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const saldo = totalRevenue - totalExpense;

  const paidBills    = monthBills.filter((b) => b.status === "PAID");
  const pendingBills = monthBills.filter((b) => b.status === "PENDING");
  const overdueBills = monthBills.filter((b) => b.status === "OVERDUE");

  const inadimplenciaAmount = overdueBills.reduce((s, b) => s + b.amount, 0);

  // ── Expense by category ───────────────────────────────────────────────────

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return Array.from(map.entries())
      .map(([cat, amount]) => ({ cat, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const maxCatAmount = expenseByCategory[0]?.amount ?? 1;

  // ── CSV export ────────────────────────────────────────────────────────────

  function handleExportCsv() {
    const header = ["Tipo", "Codigo", "Descricao", "Categoria", "Contrapartida", "Unidade", "Data Ref.", "Vencimento", "Valor", "Status", "Metodo Pagto"];
    const rows = monthEntries.map((e) => [
      e.type === "REVENUE" ? "Receita" : "Despesa",
      e.identifier,
      e.description,
      e.category,
      e.counterparty,
      e.unit ?? "",
      e.reference_date,
      e.due_date ?? "",
      e.amount.toFixed(2),
      e.status,
      e.payment_method,
    ]);
    exportToCsv([header, ...rows], `balancete-${selectedMonth}.csv`);
  }

  const monthLabel = formatMonthLongLabel(selectedMonth);

  return (
    <AppLayout title="Balancete">
      <div className="w-full space-y-6 px-4 py-8 print:px-0 print:py-0 print:space-y-4">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Balancete</h1>
            <p className="mt-1 text-sm text-slate-500">Prestação de contas mensal do condomínio.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            >
              {monthOptions.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={15} />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Printer size={15} />
              Imprimir / PDF
            </button>
          </div>
        </div>

        {/* Print-only title */}
        <div className="hidden print:block print:mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Balancete — {monthLabel}</h1>
          <p className="text-sm text-slate-500 mt-1">Gerado em {new Date().toLocaleDateString("pt-BR")}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            Carregando...
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Receitas"
                value={formatCurrency(totalRevenue)}
                sub={`${revenues.length} lançamentos`}
                color="emerald"
                icon={<TrendingUp size={18} />}
              />
              <KpiCard
                label="Despesas"
                value={formatCurrency(totalExpense)}
                sub={`${expenses.length} lançamentos`}
                color="rose"
                icon={<TrendingDown size={18} />}
              />
              <KpiCard
                label="Saldo"
                value={formatCurrency(saldo)}
                sub={saldo >= 0 ? "Resultado positivo" : "Resultado negativo"}
                color={saldo >= 0 ? "sky" : "amber"}
                icon={<Wallet size={18} />}
              />
              <KpiCard
                label="Inadimplência"
                value={formatCurrency(inadimplenciaAmount)}
                sub={`${overdueBills.length} boleto${overdueBills.length !== 1 ? "s" : ""} em atraso`}
                color="orange"
                icon={<TrendingDown size={18} />}
              />
            </div>

            {/* Bills summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Cobranças do período</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <BillStat label="Emitidos" count={monthBills.length} amount={monthBills.reduce((s, b) => s + b.amount, 0)} color="slate" />
                <BillStat label="Pagos" count={paidBills.length} amount={paidBills.reduce((s, b) => s + b.amount, 0)} color="emerald" />
                <BillStat label="Pendentes" count={pendingBills.length} amount={pendingBills.reduce((s, b) => s + b.amount, 0)} color="amber" />
              </div>
            </div>

            {/* Expense breakdown */}
            {expenseByCategory.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-4">Despesas por categoria</h2>
                <div className="space-y-3">
                  {expenseByCategory.map(({ cat, amount }) => {
                    const meta = expenseCategoryMeta[cat as ExpenseCategory] ?? expenseCategoryMeta.Outros;
                    const pct = Math.round((amount / maxCatAmount) * 100);
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.tone}`}>
                            {meta.label}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">{formatCurrency(amount)}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-slate-300 transition-all" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Entries table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Lançamentos — {monthLabel}</h2>
                <span className="text-xs text-slate-400">{monthEntries.length} registros</span>
              </div>

              {monthEntries.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">Nenhum lançamento neste período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden md:table-cell">Categoria</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden lg:table-cell">Contrapartida</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden sm:table-cell">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden sm:table-cell">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${entry.type === "REVENUE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                              {entry.type === "REVENUE" ? "Receita" : "Despesa"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 max-w-48 truncate">{entry.description}</td>
                          <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{entry.category}</td>
                          <td className="px-4 py-3 text-slate-500 hidden lg:table-cell max-w-32 truncate">{entry.counterparty || "—"}</td>
                          <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{formatDate(entry.reference_date)}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${entry.status === "Recebido" || entry.status === "Pago" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : entry.status === "Atrasado" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${entry.type === "REVENUE" ? "text-emerald-700" : "text-rose-700"}`}>
                            {entry.type === "REVENUE" ? "+" : "-"}{formatCurrency(entry.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Resultado do período</td>
                        <td colSpan={2} className="px-4 py-3 text-right text-sm font-bold text-slate-900 lg:col-span-1">
                          <span className={saldo >= 0 ? "text-emerald-700" : "text-rose-700"}>
                            {saldo >= 0 ? "+" : ""}{formatCurrency(saldo)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </AppLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type KpiCardProps = {
  label: string;
  value: string;
  sub: string;
  color: "emerald" | "rose" | "sky" | "amber" | "orange";
  icon: React.ReactNode;
};

const colorMap: Record<KpiCardProps["color"], { card: string; icon: string }> = {
  emerald: { card: "border-emerald-200",  icon: "bg-emerald-50 text-emerald-600" },
  rose:    { card: "border-rose-200",     icon: "bg-rose-50 text-rose-600" },
  sky:     { card: "border-sky-200",      icon: "bg-sky-50 text-sky-600" },
  amber:   { card: "border-amber-200",    icon: "bg-amber-50 text-amber-600" },
  orange:  { card: "border-orange-200",   icon: "bg-orange-50 text-orange-600" },
};

function KpiCard({ label, value, sub, color, icon }: KpiCardProps) {
  const c = colorMap[color];
  return (
    <div className={`rounded-2xl border ${c.card} bg-white p-5`}>
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${c.icon}`}>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

type BillStatProps = {
  label: string;
  count: number;
  amount: number;
  color: "slate" | "emerald" | "amber";
};

const billColorMap: Record<BillStatProps["color"], string> = {
  slate:   "text-slate-600",
  emerald: "text-emerald-700",
  amber:   "text-amber-700",
};

function BillStat({ label, count, amount, color }: BillStatProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1.5 text-xl font-bold ${billColorMap[color]}`}>{count}</p>
      <p className="mt-0.5 text-xs text-slate-500">{formatCurrency(amount)}</p>
    </div>
  );
}
