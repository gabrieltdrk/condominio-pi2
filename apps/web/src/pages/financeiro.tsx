import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  Landmark,
  PiggyBank,
  PlusCircle,
  Receipt,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../features/layout/components/app-layout";

type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  dueDate: string;
};

type Bill = {
  id: string;
  resident: string;
  apartment: string;
  amount: number;
  dueDate: string;
  status: "Em aberto" | "Pago" | "Atrasado";
};

type MonthlyPoint = {
  mes: string;
  entradas: number;
  saidas: number;
};

const EXPENSES_STORAGE_KEY = "omni:finance:expenses:v1";
const BILLS_STORAGE_KEY = "omni:finance:bills:v1";

const chartData: MonthlyPoint[] = [
  { mes: "Out", entradas: 39200, saidas: 24800 },
  { mes: "Nov", entradas: 41800, saidas: 25900 },
  { mes: "Dez", entradas: 40500, saidas: 28100 },
  { mes: "Jan", entradas: 43100, saidas: 26700 },
  { mes: "Fev", entradas: 42780, saidas: 25450 },
  { mes: "Mar", entradas: 45200, saidas: 26450 },
];

const defaultExpenses: Expense[] = [
  { id: "exp-1", title: "Conta de energia das áreas comuns", amount: 2480, category: "Consumo", dueDate: "2026-03-14" },
  { id: "exp-2", title: "Contrato da portaria remota", amount: 6900, category: "Operação", dueDate: "2026-03-16" },
  { id: "exp-3", title: "Manutenção dos elevadores", amount: 1950, category: "Preventiva", dueDate: "2026-03-18" },
  { id: "exp-4", title: "Internet do condomínio", amount: 389, category: "Serviços", dueDate: "2026-03-20" },
];

const defaultBills: Bill[] = [
  { id: "bill-1", resident: "Carlos Henrique", apartment: "Bloco A • Ap 203", amount: 1240, dueDate: "2026-02-23", status: "Atrasado" },
  { id: "bill-2", resident: "Fernanda Souza", apartment: "Bloco B • Ap 504", amount: 2480, dueDate: "2026-02-09", status: "Atrasado" },
  { id: "bill-3", resident: "Marcos Vinicius", apartment: "Bloco C • Ap 102", amount: 620, dueDate: "2026-03-05", status: "Atrasado" },
  { id: "bill-4", resident: "Juliana Rocha", apartment: "Bloco B • Ap 501", amount: 780, dueDate: "2026-03-19", status: "Em aberto" },
  { id: "bill-5", resident: "Helena Moraes", apartment: "Bloco B • Ap 101", amount: 780, dueDate: "2026-03-08", status: "Pago" },
];

const recentMovements = [
  { label: "Recebimento de taxas condominiais", type: "entry", amount: 18760, when: "Hoje, 09:20", detail: "25 unidades compensadas" },
  { label: "Pagamento da equipe de limpeza", type: "exit", amount: 3200, when: "Hoje, 11:40", detail: "Fornecedor recorrente" },
  { label: "Fundo de reserva aplicado", type: "entry", amount: 4500, when: "Ontem, 16:15", detail: "Transferência interna" },
  { label: "Compra de materiais hidráulicos", type: "exit", amount: 890, when: "Ontem, 18:05", detail: "Reposição emergencial" },
];

const weeklyAgenda = [
  "Emitir segunda rodada de cobrança para inadimplentes acima de 15 dias",
  "Validar repasse da administradora até sexta-feira",
  "Conferir nota fiscal da manutenção dos elevadores",
  "Projetar fluxo de caixa para o fechamento do mês",
];

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function daysUntil(date: string) {
  const now = new Date("2026-03-12T12:00:00");
  const due = new Date(date);
  const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)} dias atrasado`;
  if (diff === 0) return "Vence hoje";
  if (diff === 1) return "Vence amanhã";
  return `Em ${diff} dias`;
}

function buildId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function FinanceTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-700">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }} className="mt-1">
          {item.name === "entradas" ? "Entradas" : "Saídas"}: {formatCurrency(item.value)}
        </p>
      ))}
    </div>
  );
}

export default function FinanceiroPage() {
  const [expenses, setExpenses] = useState<Expense[]>(() => readStorage(EXPENSES_STORAGE_KEY, defaultExpenses));
  const [bills, setBills] = useState<Bill[]>(() => readStorage(BILLS_STORAGE_KEY, defaultBills));
  const [expenseForm, setExpenseForm] = useState({ title: "", amount: "", category: "", dueDate: "" });
  const [billForm, setBillForm] = useState({ resident: "", apartment: "", amount: "", dueDate: "", status: "Em aberto" as Bill["status"] });

  useEffect(() => {
    window.localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    window.localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(bills));
  }, [bills]);

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const openBills = bills.filter((item) => item.status !== "Pago");
  const lateBills = bills.filter((item) => item.status === "Atrasado");
  const billedRevenue = bills.reduce((sum, item) => sum + item.amount, 0);
  const paidRevenue = bills.filter((item) => item.status === "Pago").reduce((sum, item) => sum + item.amount, 0);
  const lateRevenue = lateBills.reduce((sum, item) => sum + item.amount, 0);

  const monthlySummary = useMemo(
    () => [
      { label: "Receita prevista", value: formatCurrency(billedRevenue), tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
      { label: "Receita recebida", value: formatCurrency(paidRevenue), tone: "border-slate-100 bg-slate-50 text-slate-700" },
      { label: "Despesas lançadas", value: formatCurrency(totalExpenses), tone: "border-slate-100 bg-slate-50 text-slate-700" },
      { label: "Em atraso", value: formatCurrency(lateRevenue), tone: "border-amber-100 bg-amber-50 text-amber-700" },
    ],
    [billedRevenue, lateRevenue, paidRevenue, totalExpenses],
  );

  const displayedExpenses = useMemo(
    () => [...expenses].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [expenses],
  );

  const displayedBills = useMemo(
    () =>
      [...bills]
        .filter((item) => item.status !== "Pago")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [bills],
  );

  function handleCreateExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expenseForm.title.trim() || !expenseForm.amount || !expenseForm.category.trim() || !expenseForm.dueDate) return;

    setExpenses((current) => [
      {
        id: buildId("expense"),
        title: expenseForm.title.trim(),
        amount: Number(expenseForm.amount),
        category: expenseForm.category.trim(),
        dueDate: expenseForm.dueDate,
      },
      ...current,
    ]);

    setExpenseForm({ title: "", amount: "", category: "", dueDate: "" });
  }

  function handleCreateBill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!billForm.resident.trim() || !billForm.apartment.trim() || !billForm.amount || !billForm.dueDate) return;

    setBills((current) => [
      {
        id: buildId("bill"),
        resident: billForm.resident.trim(),
        apartment: billForm.apartment.trim(),
        amount: Number(billForm.amount),
        dueDate: billForm.dueDate,
        status: billForm.status,
      },
      ...current,
    ]);

    setBillForm({ resident: "", apartment: "", amount: "", dueDate: "", status: "Em aberto" });
  }

  return (
    <AppLayout title="Financeiro">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(134,239,172,0.35),_transparent_34%),linear-gradient(135deg,_#ecfdf5_0%,_#ffffff_48%,_#f8fafc_100%)] p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                <Wallet size={13} />
                Gestão financeira do condomínio
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Caixa, despesas e boletos com visão operacional</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Cadastre despesas e boletos, acompanhe entradas versus saídas e identifique rapidamente os pontos de atenção do mês.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:min-w-[720px]">
              {[
                { icon: CircleDollarSign, label: "Receita prevista", value: formatCurrency(billedRevenue), hint: `${bills.length} boletos no período`, tone: "border-emerald-100 bg-white text-emerald-700" },
                { icon: ArrowUpCircle, label: "Recebido", value: formatCurrency(paidRevenue), hint: `${bills.filter((item) => item.status === "Pago").length} boletos pagos`, tone: "border-slate-100 bg-white text-slate-700" },
                { icon: ArrowDownCircle, label: "Despesas", value: formatCurrency(totalExpenses), hint: `${expenses.length} lançamentos`, tone: "border-slate-100 bg-white text-slate-700" },
                { icon: AlertTriangle, label: "Inadimplência", value: formatCurrency(lateRevenue), hint: `${lateBills.length} boletos atrasados`, tone: "border-amber-100 bg-white text-amber-700" },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={`rounded-2xl border p-4 shadow-sm ${card.tone}`}>
                    <div className="flex items-center justify-between gap-3">
                      <Icon size={18} />
                      <span className="text-[11px] font-medium text-slate-400">{card.hint}</span>
                    </div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Fluxo de caixa mensal</h3>
                <p className="mt-0.5 text-xs text-slate-400">Comparativo entre entradas e saídas para leitura rápida da margem operacional.</p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                Dados simulados do semestre
              </span>
            </div>

            <div className="mt-4 h-72 rounded-3xl border border-slate-100 bg-slate-50 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={10}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`} />
                  <Tooltip content={<FinanceTooltip />} />
                  <Legend />
                  <Bar dataKey="entradas" name="entradas" radius={[10, 10, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={`entry-${entry.mes}`} fill="#10b981" />
                    ))}
                  </Bar>
                  <Bar dataKey="saidas" name="saidas" radius={[10, 10, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={`exit-${entry.mes}`} fill="#f59e0b" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {monthlySummary.map((item) => (
                <div key={item.label} className={`rounded-2xl border p-4 ${item.tone}`}>
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-wide">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Landmark size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Margem operacional</span>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {billedRevenue > 0 ? `${Math.max(0, Math.round(((billedRevenue - totalExpenses) / billedRevenue) * 100))}%` : "0%"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Baseada na receita prevista versus despesas lançadas.</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <PiggyBank size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Reserva simulada</span>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{formatCurrency(121000 + paidRevenue - totalExpenses)}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Estimativa acumulada considerando repasses e saídas atuais.</p>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <CreditCard size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Boletos em aberto</span>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{openBills.length}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{lateBills.length} já estão em atraso e pedem cobrança ativa.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <form onSubmit={handleCreateExpense} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="m-0 text-sm font-semibold text-slate-900">Cadastrar despesa</h3>
                  <p className="mt-0.5 text-xs text-slate-400">Lance contas e saídas para refletir no painel.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <input value={expenseForm.title} onChange={(event) => setExpenseForm((current) => ({ ...current, title: event.target.value }))} placeholder="Descrição da despesa" className={inputClass} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))} placeholder="Categoria" className={inputClass} />
                  <input type="number" min={0} value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Valor" className={inputClass} />
                </div>
                <input type="date" value={expenseForm.dueDate} onChange={(event) => setExpenseForm((current) => ({ ...current, dueDate: event.target.value }))} className={inputClass} />

                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600">
                  <PlusCircle size={16} />
                  Adicionar despesa
                </button>
              </div>
            </form>

            <form onSubmit={handleCreateBill} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Banknote size={18} />
                </div>
                <div>
                  <h3 className="m-0 text-sm font-semibold text-slate-900">Cadastrar boleto</h3>
                  <p className="mt-0.5 text-xs text-slate-400">Simule cobranças e acompanhe a inadimplência.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <input value={billForm.resident} onChange={(event) => setBillForm((current) => ({ ...current, resident: event.target.value }))} placeholder="Nome do morador" className={inputClass} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={billForm.apartment} onChange={(event) => setBillForm((current) => ({ ...current, apartment: event.target.value }))} placeholder="Bloco / apartamento" className={inputClass} />
                  <input type="number" min={0} value={billForm.amount} onChange={(event) => setBillForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Valor" className={inputClass} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="date" value={billForm.dueDate} onChange={(event) => setBillForm((current) => ({ ...current, dueDate: event.target.value }))} className={inputClass} />
                  <select value={billForm.status} onChange={(event) => setBillForm((current) => ({ ...current, status: event.target.value as Bill["status"] }))} className={inputClass}>
                    <option value="Em aberto">Em aberto</option>
                    <option value="Pago">Pago</option>
                    <option value="Atrasado">Atrasado</option>
                  </select>
                </div>

                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                  <PlusCircle size={16} />
                  Adicionar boleto
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Receipt size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Despesas a vencer</h3>
                <p className="mt-0.5 text-xs text-slate-400">Lançamentos ordenados por data de vencimento.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {displayedExpenses.map((expense) => (
                <div key={expense.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="m-0 text-sm font-semibold text-slate-800">{expense.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{expense.category} • Vencimento: {formatDate(expense.dueDate)}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      {daysUntil(expense.dueDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Boletos em aberto e atrasados</h3>
                <p className="mt-0.5 text-xs text-slate-400">Simulação de cobrança para acompanhamento da inadimplência.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {displayedBills.map((bill) => (
                <div key={bill.id} className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="m-0 text-sm font-semibold text-slate-800">{bill.resident}</p>
                      <p className="mt-1 text-xs text-slate-500">{bill.apartment}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                      bill.status === "Atrasado" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {bill.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-rose-700">{formatCurrency(bill.amount)}</p>
                      <p className="mt-1 text-xs text-slate-500">Vencimento: {formatDate(bill.dueDate)} • {daysUntil(bill.dueDate)}</p>
                    </div>
                    <button className="rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-100">
                      Cobrar agora
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CalendarClock size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Movimentações recentes</h3>
                <p className="mt-0.5 text-xs text-slate-400">Eventos financeiros para leitura rápida do caixa.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recentMovements.map((movement) => {
                const isEntry = movement.type === "entry";
                return (
                  <div key={`${movement.label}-${movement.when}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isEntry ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {isEntry ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                      </div>
                      <div>
                        <p className="m-0 text-sm font-semibold text-slate-800">{movement.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{movement.when} • {movement.detail}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${isEntry ? "text-emerald-700" : "text-rose-700"}`}>
                      {isEntry ? "+" : "-"} {formatCurrency(movement.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <Banknote size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Plano desta semana</h3>
                <p className="mt-0.5 text-xs text-slate-400">Ações sugeridas para manter previsibilidade financeira.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {weeklyAgenda.map((item, index) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="m-0 text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
