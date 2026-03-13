import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  CalendarClock,
  FileBarChart2,
  Landmark,
  PiggyBank,
  PlusCircle,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../features/layout/components/app-layout";
import { createFinanceEntry, listFinanceEntries, type FinanceEntry } from "../features/financeiro/services/financeiro";
import { fetchBuilding, getMockBuilding, type Floor } from "../features/predio/services/predio";

type RevenueCategory = "Taxa condominial" | "Multa" | "Juros por atraso" | "Aluguel areas comuns";
type ExpenseCategory = "Funcionarios" | "Energia" | "Agua" | "Manutencao" | "Limpeza" | "Seguranca" | "Outros";
type RevenueStatus = "Recebido" | "Em aberto" | "Atrasado";
type ExpenseStatus = "Pago" | "Pendente" | "Em negociacao";

type UnitOption = { value: string; label: string; resident: string };
type MonthlyPoint = { month: string; receitas: number; despesas: number; saldo: number };

const revenueCategories: RevenueCategory[] = ["Taxa condominial", "Multa", "Juros por atraso", "Aluguel areas comuns"];
const expenseCategories: ExpenseCategory[] = ["Funcionarios", "Energia", "Agua", "Manutencao", "Limpeza", "Seguranca", "Outros"];
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
const inputClass = "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";
const panelClass = "rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur";
function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function getMonthKey(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return monthFormatter.format(new Date(year, month - 1, 1));
}

function getUnitOptions(floors: Floor[]): UnitOption[] {
  return floors
    .flatMap((floor) =>
      floor.apartments.map((apartment) => ({
        value: `${floor.tower} - Ap ${apartment.number}`,
        label: `${floor.tower} - Ap ${apartment.number}${apartment.resident ? ` - ${apartment.resident.name}` : ""}`,
        resident: apartment.resident?.name ?? "Morador nao informado",
      })),
    )
    .sort((a, b) => a.value.localeCompare(b.value, "pt-BR", { numeric: true }));
}

function FinanceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-700">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }} className="mt-1">
          {item.name}: {formatCurrency(item.value)}
        </p>
      ))}
    </div>
  );
}

export default function FinanceiroPage() {
  const [building, setBuilding] = useState<Floor[]>(() => getMockBuilding());
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [revenueForm, setRevenueForm] = useState({
    identifier: "",
    description: "",
    amount: "",
    referenceDate: "2026-03-12",
    unit: "",
    resident: "",
    category: "Taxa condominial" as RevenueCategory,
    paymentMethod: "Pix",
    status: "Recebido" as RevenueStatus,
    documentName: "",
    notes: "",
  });
  const [expenseForm, setExpenseForm] = useState({
    identifier: "",
    description: "",
    amount: "",
    referenceDate: "2026-03-12",
    dueDate: "2026-03-20",
    counterparty: "",
    category: "Energia" as ExpenseCategory,
    paymentMethod: "Boleto",
    status: "Pendente" as ExpenseStatus,
    documentName: "",
    notes: "",
  });

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [floors, financeEntries] = await Promise.all([
        fetchBuilding().catch(() => getMockBuilding()),
        listFinanceEntries(),
      ]);
      setBuilding(floors);
      setEntries(financeEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar financeiro.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const unitOptions = useMemo(() => getUnitOptions(building), [building]);
  const revenues = useMemo(() => entries.filter((item) => item.type === "REVENUE"), [entries]);
  const expenses = useMemo(() => entries.filter((item) => item.type === "EXPENSE"), [entries]);
  const balance = useMemo(
    () => revenues.filter((item) => item.status === "Recebido").reduce((sum, item) => sum + item.amount, 0)
      - expenses.filter((item) => item.status === "Pago").reduce((sum, item) => sum + item.amount, 0),
    [expenses, revenues],
  );

  const monthlySeries = useMemo<MonthlyPoint[]>(() => {
    const current = new Date("2026-03-12T12:00:00");
    const map = new Map<string, MonthlyPoint>();
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(current.getFullYear(), current.getMonth() - index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, { month: formatMonthLabel(key), receitas: 0, despesas: 0, saldo: 0 });
    }
    for (const item of revenues) {
      const bucket = map.get(getMonthKey(item.reference_date));
      if (bucket) bucket.receitas += item.amount;
    }
    for (const item of expenses) {
      const bucket = map.get(getMonthKey(item.reference_date));
      if (bucket) bucket.despesas += item.amount;
    }
    return Array.from(map.values()).map((item) => ({ ...item, saldo: item.receitas - item.despesas }));
  }, [expenses, revenues]);

  const revenueByStatus = useMemo(
    () => ["Recebido", "Em aberto", "Atrasado"].map((status) => ({
      name: status,
      value: revenues.filter((item) => item.status === status).reduce((sum, item) => sum + item.amount, 0),
    })),
    [revenues],
  );

  const expensesByCategory = useMemo(
    () => expenseCategories.map((category) => ({
      name: category,
      value: expenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0),
    })).filter((item) => item.value > 0),
    [expenses],
  );

  const delinquencyRows = useMemo(
    () => revenues.filter((item) => item.category === "Taxa condominial" && item.status !== "Recebido").slice(0, 6),
    [revenues],
  );

  const recentEntries = useMemo(
    () => [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6),
    [entries],
  );
  const receivedRevenue = useMemo(
    () => revenues.filter((item) => item.status === "Recebido").reduce((sum, item) => sum + item.amount, 0),
    [revenues],
  );
  const paidExpense = useMemo(
    () => expenses.filter((item) => item.status === "Pago").reduce((sum, item) => sum + item.amount, 0),
    [expenses],
  );
  const openRevenue = useMemo(
    () => revenues.filter((item) => item.status !== "Recebido").reduce((sum, item) => sum + item.amount, 0),
    [revenues],
  );
  const pendingExpense = useMemo(
    () => expenses.filter((item) => item.status !== "Pago").reduce((sum, item) => sum + item.amount, 0),
    [expenses],
  );

  async function handleCreateRevenue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    try {
      await createFinanceEntry({
        type: "REVENUE",
        identifier: revenueForm.identifier.trim(),
        description: revenueForm.description.trim(),
        amount: Number(revenueForm.amount),
        referenceDate: revenueForm.referenceDate,
        counterparty: revenueForm.resident.trim() || "Morador nao informado",
        unit: revenueForm.unit || null,
        resident: revenueForm.resident || null,
        category: revenueForm.category,
        paymentMethod: revenueForm.paymentMethod,
        status: revenueForm.status,
        documentName: revenueForm.documentName || null,
        notes: revenueForm.notes || null,
      });
      setRevenueForm({
        identifier: "",
        description: "",
        amount: "",
        referenceDate: "2026-03-12",
        unit: "",
        resident: "",
        category: "Taxa condominial",
        paymentMethod: "Pix",
        status: "Recebido",
        documentName: "",
        notes: "",
      });
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar receita.");
    }
  }

  async function handleCreateExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    try {
      await createFinanceEntry({
        type: "EXPENSE",
        identifier: expenseForm.identifier.trim(),
        description: expenseForm.description.trim(),
        amount: Number(expenseForm.amount),
        referenceDate: expenseForm.referenceDate,
        dueDate: expenseForm.dueDate,
        counterparty: expenseForm.counterparty.trim(),
        category: expenseForm.category,
        paymentMethod: expenseForm.paymentMethod,
        status: expenseForm.status,
        documentName: expenseForm.documentName || null,
        notes: expenseForm.notes || null,
      });
      setExpenseForm({
        identifier: "",
        description: "",
        amount: "",
        referenceDate: "2026-03-12",
        dueDate: "2026-03-20",
        counterparty: "",
        category: "Energia",
        paymentMethod: "Boleto",
        status: "Pendente",
        documentName: "",
        notes: "",
      });
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar despesa.");
    }
  }

  return (
    <AppLayout title="Financeiro">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[32px] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(74,222,128,0.30),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(135deg,_#ecfdf5_0%,_#ffffff_44%,_#eff6ff_100%)] p-6 shadow-[0_30px_80px_-42px_rgba(16,185,129,0.45)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <Landmark size={13} />
                Financeiro conectado ao backend
              </div>
              <h2 className="mt-4 max-w-xl text-3xl font-black tracking-tight text-slate-950">Visao financeira com foco em caixa, risco e operacao</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Receitas, despesas, inadimplencia e fluxo de caixa organizados em um painel mais elegante para leitura rapida da saude do condominio.</p>
              <div className="mt-5 grid max-w-2xl gap-3 sm:grid-cols-3">
                {[
                  { label: "Recebido no periodo", value: formatCurrency(receivedRevenue) },
                  { label: "Pago no periodo", value: formatCurrency(paidExpense) },
                  { label: "Pendencias totais", value: formatCurrency(openRevenue + pendingExpense) },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { icon: ArrowUpCircle, label: "Receitas", value: formatCurrency(revenues.reduce((s, i) => s + i.amount, 0)), tone: "bg-emerald-50 text-emerald-700" },
                { icon: ArrowDownCircle, label: "Despesas", value: formatCurrency(expenses.reduce((s, i) => s + i.amount, 0)), tone: "bg-amber-50 text-amber-700" },
                { icon: AlertTriangle, label: "Inadimplencia", value: formatCurrency(delinquencyRows.reduce((s, i) => s + i.amount, 0)), tone: "bg-rose-50 text-rose-700" },
                { icon: PiggyBank, label: "Saldo", value: formatCurrency(balance), tone: "bg-indigo-50 text-indigo-700" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-[26px] border border-white/80 bg-white/82 p-4 shadow-sm backdrop-blur">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${item.tone}`}><Icon size={18} /></div>
                    <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
        {formError && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{formError}</p>}
        {loading && <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Carregando financeiro...</p>}

        {!loading && !error && (
          <>
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
              <div className={panelClass}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><FileBarChart2 size={18} /></div>
                  <div><h3 className="m-0 text-sm font-semibold text-slate-900">Fluxo financeiro e saldo</h3><p className="mt-0.5 text-xs text-slate-400">Leitura combinada de entradas, saidas e caixa liquido.</p></div>
                </div>
                <div className="mt-5 h-[340px] rounded-[24px] border border-slate-100 bg-[linear-gradient(180deg,_rgba(248,250,252,0.9),_rgba(255,255,255,1))] p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlySeries} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<FinanceTooltip />} />
                      <Bar dataKey="receitas" name="Receitas" radius={[8, 8, 0, 0]} fill="#10b981" />
                      <Bar dataKey="despesas" name="Despesas" radius={[8, 8, 0, 0]} fill="#f59e0b" />
                      <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#6366f1" fill="#c7d2fe" fillOpacity={0.35} strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-4">
                <div className={panelClass}>
                  <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700"><Wallet size={18} /></div><div><h3 className="m-0 text-sm font-semibold text-slate-900">Receitas por status</h3><p className="mt-0.5 text-xs text-slate-400">Pulso rapido do que entrou e do que ainda pressiona o caixa.</p></div></div>
                  <div className="mt-4 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={revenueByStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={4}>
                          {revenueByStatus.map((entry, index) => <Cell key={entry.name} fill={["#10b981", "#f59e0b", "#f43f5e"][index % 3]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className={panelClass}>
                  <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><Building2 size={18} /></div><div><h3 className="m-0 text-sm font-semibold text-slate-900">Despesas por categoria</h3><p className="mt-0.5 text-xs text-slate-400">Mapa visual das maiores frentes de custo do condominio.</p></div></div>
                  <div className="mt-4 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expensesByCategory} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                        <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                          {expensesByCategory.map((entry, index) => <Cell key={entry.name} fill={["#0f766e", "#2563eb", "#f59e0b", "#ef4444", "#7c3aed", "#14b8a6", "#64748b"][index % 7]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <form onSubmit={handleCreateRevenue} className={`${panelClass} bg-[linear-gradient(180deg,_#ffffff,_#f8fffb)]`}>
                <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><ArrowUpCircle size={18} /></div><div><h3 className="m-0 text-sm font-semibold text-slate-900">Nova receita</h3><p className="mt-0.5 text-xs text-slate-400">Lancamentos recorrentes, multas e receitas extraordinarias.</p></div></div>
                <div className="mt-4 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={revenueForm.identifier} onChange={(e) => setRevenueForm((c) => ({ ...c, identifier: e.target.value }))} placeholder="Codigo" className={inputClass} />
                    <input type="number" min={0} step="0.01" value={revenueForm.amount} onChange={(e) => setRevenueForm((c) => ({ ...c, amount: e.target.value }))} placeholder="Valor" className={inputClass} />
                  </div>
                  <input value={revenueForm.description} onChange={(e) => setRevenueForm((c) => ({ ...c, description: e.target.value }))} placeholder="Descricao da receita" className={inputClass} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input type="date" value={revenueForm.referenceDate} onChange={(e) => setRevenueForm((c) => ({ ...c, referenceDate: e.target.value }))} className={inputClass} />
                    <select value={revenueForm.category} onChange={(e) => setRevenueForm((c) => ({ ...c, category: e.target.value as RevenueCategory }))} className={inputClass}>{revenueCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                  </div>
                  <select value={revenueForm.unit} onChange={(e) => { const unit = unitOptions.find((item) => item.value === e.target.value); setRevenueForm((c) => ({ ...c, unit: e.target.value, resident: unit?.resident ?? c.resident })); }} className={inputClass}>
                    <option value="">Selecione a unidade</option>
                    {unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={revenueForm.resident} onChange={(e) => setRevenueForm((c) => ({ ...c, resident: e.target.value }))} placeholder="Morador" className={inputClass} />
                    <select value={revenueForm.status} onChange={(e) => setRevenueForm((c) => ({ ...c, status: e.target.value as RevenueStatus }))} className={inputClass}><option value="Recebido">Recebido</option><option value="Em aberto">Em aberto</option><option value="Atrasado">Atrasado</option></select>
                  </div>
                  <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"><PlusCircle size={16} />Adicionar receita</button>
              </div>
              </form>

              <form onSubmit={handleCreateExpense} className={`${panelClass} bg-[linear-gradient(180deg,_#ffffff,_#fffaf2)]`}>
                <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><ArrowDownCircle size={18} /></div><div><h3 className="m-0 text-sm font-semibold text-slate-900">Nova despesa</h3><p className="mt-0.5 text-xs text-slate-400">Contas, manutencoes e compromissos com vencimento.</p></div></div>
                <div className="mt-4 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={expenseForm.identifier} onChange={(e) => setExpenseForm((c) => ({ ...c, identifier: e.target.value }))} placeholder="Codigo" className={inputClass} />
                    <input type="number" min={0} step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm((c) => ({ ...c, amount: e.target.value }))} placeholder="Valor" className={inputClass} />
                  </div>
                  <input value={expenseForm.description} onChange={(e) => setExpenseForm((c) => ({ ...c, description: e.target.value }))} placeholder="Descricao da despesa" className={inputClass} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input type="date" value={expenseForm.referenceDate} onChange={(e) => setExpenseForm((c) => ({ ...c, referenceDate: e.target.value }))} className={inputClass} />
                    <input type="date" value={expenseForm.dueDate} onChange={(e) => setExpenseForm((c) => ({ ...c, dueDate: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={expenseForm.counterparty} onChange={(e) => setExpenseForm((c) => ({ ...c, counterparty: e.target.value }))} placeholder="Fornecedor" className={inputClass} />
                    <select value={expenseForm.category} onChange={(e) => setExpenseForm((c) => ({ ...c, category: e.target.value as ExpenseCategory }))} className={inputClass}>{expenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                  </div>
                  <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"><PlusCircle size={16} />Adicionar despesa</button>
                </div>
              </form>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700"><AlertTriangle size={18} /></div><div><h3 className="m-0 text-sm font-semibold text-slate-900">Inadimplencia</h3><p className="mt-0.5 text-xs text-slate-400">Taxas em aberto ou atrasadas.</p></div></div>
                <div className="mt-4 space-y-3">
                  {delinquencyRows.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{item.unit || "Unidade nao informada"}</p><p className="truncate text-xs text-slate-500">{item.counterparty}</p></div>
                        <span className="text-sm font-semibold text-rose-700">{formatCurrency(item.amount)}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{item.status} · Referencia {formatDate(item.reference_date)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><CalendarClock size={18} /></div><div><h3 className="m-0 text-sm font-semibold text-slate-900">Lancamentos recentes</h3><p className="mt-0.5 text-xs text-slate-400">Dados vindos do backend.</p></div></div>
                <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
                  {recentEntries.map((item) => (
                    <div key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                      <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.type === "REVENUE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.type === "REVENUE" ? "Receita" : "Despesa"}</span>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{item.identifier}</p><p className="truncate text-xs text-slate-500">{item.description}</p></div>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
