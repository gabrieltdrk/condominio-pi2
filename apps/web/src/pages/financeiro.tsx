import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeCheck,
  Building2,
  CalendarRange,
  CreditCard,
  FileText,
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../features/layout/components/app-layout";
import { fetchBuilding, getMockBuilding, type Floor } from "../features/predio/services/predio";

type RevenueCategory =
  | "Taxa condominial"
  | "Multa"
  | "Juros por atraso"
  | "Aluguel areas comuns";

type RevenuePaymentMethod = "Pix" | "Boleto";
type RevenueStatus = "Recebido" | "Em aberto" | "Atrasado";

type ExpenseCategory =
  | "Funcionarios"
  | "Energia"
  | "Agua"
  | "Manutencao"
  | "Limpeza"
  | "Seguranca"
  | "Outros";

type ExpensePaymentMethod = "Pix" | "Boleto";
type ExpenseStatus = "Pago" | "Pendente" | "Em negociacao";

type Revenue = {
  id: string;
  identifier: string;
  description: string;
  amount: number;
  receivedDate: string;
  unit: string;
  resident: string;
  category: RevenueCategory;
  paymentMethod: RevenuePaymentMethod;
  status: RevenueStatus;
  documentName: string;
  notes: string;
};

type Expense = {
  id: string;
  identifier: string;
  description: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  supplier: string;
  category: ExpenseCategory;
  paymentMethod: ExpensePaymentMethod;
  status: ExpenseStatus;
  documentName: string;
  notes: string;
};

type RevenueFormState = {
  identifier: string;
  description: string;
  amount: string;
  receivedDate: string;
  unit: string;
  resident: string;
  category: RevenueCategory;
  paymentMethod: RevenuePaymentMethod;
  status: RevenueStatus;
  documentName: string;
  notes: string;
};

type ExpenseFormState = {
  identifier: string;
  description: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  supplier: string;
  category: ExpenseCategory;
  paymentMethod: ExpensePaymentMethod;
  status: ExpenseStatus;
  documentName: string;
  notes: string;
};

type UnitOption = {
  value: string;
  label: string;
  resident: string;
};

type MonthlySeries = {
  month: string;
  receitas: number;
  despesas: number;
};

const REVENUES_STORAGE_KEY = "omni:finance:revenues:v2";
const EXPENSES_STORAGE_KEY = "omni:finance:expenses:v2";

const revenueCategories: RevenueCategory[] = [
  "Taxa condominial",
  "Multa",
  "Juros por atraso",
  "Aluguel areas comuns",
];

const expenseCategories: ExpenseCategory[] = [
  "Funcionarios",
  "Energia",
  "Agua",
  "Manutencao",
  "Limpeza",
  "Seguranca",
  "Outros",
];

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

const defaultRevenues: Revenue[] = [
  {
    id: "rev-1",
    identifier: "REC-2026-001",
    description: "Taxa condominial de marco",
    amount: 780,
    receivedDate: "2026-03-05",
    unit: "Torre A - Ap 101",
    resident: "Gabriel Ferreira",
    category: "Taxa condominial",
    paymentMethod: "Pix",
    status: "Recebido",
    documentName: "comprovante-marco-101.pdf",
    notes: "Pagamento dentro do prazo.",
  },
  {
    id: "rev-2",
    identifier: "REC-2026-002",
    description: "Taxa condominial de marco",
    amount: 780,
    receivedDate: "2026-03-08",
    unit: "Torre B - Ap 101",
    resident: "Helena Moraes",
    category: "Taxa condominial",
    paymentMethod: "Boleto",
    status: "Recebido",
    documentName: "boleto-pago-101-marco.pdf",
    notes: "",
  },
  {
    id: "rev-3",
    identifier: "REC-2026-003",
    description: "Taxa condominial de fevereiro",
    amount: 1240,
    receivedDate: "2026-02-23",
    unit: "Torre A - Ap 203",
    resident: "Carlos Henrique",
    category: "Taxa condominial",
    paymentMethod: "Boleto",
    status: "Atrasado",
    documentName: "boleto-fevereiro-203.pdf",
    notes: "Aguardando retorno do morador.",
  },
  {
    id: "rev-4",
    identifier: "REC-2026-004",
    description: "Multa por uso indevido da vaga",
    amount: 180,
    receivedDate: "2026-03-10",
    unit: "Torre B - Ap 504",
    resident: "Fernanda Souza",
    category: "Multa",
    paymentMethod: "Pix",
    status: "Em aberto",
    documentName: "auto-infracao-504.pdf",
    notes: "Prazo de recurso ate 15/03.",
  },
  {
    id: "rev-5",
    identifier: "REC-2026-005",
    description: "Aluguel do salao de festas",
    amount: 450,
    receivedDate: "2026-03-11",
    unit: "Area comum",
    resident: "Reserva eventual",
    category: "Aluguel areas comuns",
    paymentMethod: "Pix",
    status: "Recebido",
    documentName: "contrato-salao-marco.pdf",
    notes: "",
  },
];

const defaultExpenses: Expense[] = [
  {
    id: "exp-1",
    identifier: "DES-2026-001",
    description: "Folha da equipe de limpeza",
    amount: 3200,
    issueDate: "2026-03-01",
    dueDate: "2026-03-10",
    supplier: "LimpaForte Servicos",
    category: "Limpeza",
    paymentMethod: "Pix",
    status: "Pago",
    documentName: "nf-limpeza-marco.pdf",
    notes: "Prestacao mensal recorrente.",
  },
  {
    id: "exp-2",
    identifier: "DES-2026-002",
    description: "Conta de energia das areas comuns",
    amount: 2480,
    issueDate: "2026-03-04",
    dueDate: "2026-03-18",
    supplier: "Companhia de Energia",
    category: "Energia",
    paymentMethod: "Boleto",
    status: "Pendente",
    documentName: "boleto-energia-marco.pdf",
    notes: "",
  },
  {
    id: "exp-3",
    identifier: "DES-2026-003",
    description: "Manutencao preventiva dos elevadores",
    amount: 1950,
    issueDate: "2026-03-02",
    dueDate: "2026-03-16",
    supplier: "Elevadores Sigma",
    category: "Manutencao",
    paymentMethod: "Boleto",
    status: "Pendente",
    documentName: "nf-elevadores-0316.pdf",
    notes: "Visita mensal contratada.",
  },
  {
    id: "exp-4",
    identifier: "DES-2026-004",
    description: "Acordo emergencial de encanamento",
    amount: 890,
    issueDate: "2026-03-09",
    dueDate: "2026-03-20",
    supplier: "Hidro Plantao",
    category: "Agua",
    paymentMethod: "Pix",
    status: "Em negociacao",
    documentName: "recibo-hidraulica-plantao.pdf",
    notes: "Parcelamento em avaliacao.",
  },
];

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";

const textAreaClass =
  "min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
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

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthDifference(fromDate: string, now = new Date("2026-03-12T12:00:00")) {
  const source = new Date(`${fromDate}T12:00:00`);
  return Math.max(0, (now.getFullYear() - source.getFullYear()) * 12 + now.getMonth() - source.getMonth());
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
  const [revenues, setRevenues] = useState<Revenue[]>(() => readStorage(REVENUES_STORAGE_KEY, defaultRevenues));
  const [expenses, setExpenses] = useState<Expense[]>(() => readStorage(EXPENSES_STORAGE_KEY, defaultExpenses));
  const [revenueForm, setRevenueForm] = useState<RevenueFormState>({
    identifier: "",
    description: "",
    amount: "",
    receivedDate: "2026-03-12",
    unit: "",
    resident: "",
    category: "Taxa condominial",
    paymentMethod: "Pix",
    status: "Recebido",
    documentName: "",
    notes: "",
  });
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>({
    identifier: "",
    description: "",
    amount: "",
    issueDate: "2026-03-12",
    dueDate: "2026-03-20",
    supplier: "",
    category: "Energia",
    paymentMethod: "Boleto",
    status: "Pendente",
    documentName: "",
    notes: "",
  });

  useEffect(() => {
    fetchBuilding()
      .then(setBuilding)
      .catch(() => setBuilding(getMockBuilding()));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(REVENUES_STORAGE_KEY, JSON.stringify(revenues));
  }, [revenues]);

  useEffect(() => {
    window.localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  const unitOptions = useMemo(() => getUnitOptions(building), [building]);

  const paidRevenues = useMemo(
    () => revenues.filter((item) => item.status === "Recebido").reduce((sum, item) => sum + item.amount, 0),
    [revenues],
  );
  const openRevenues = useMemo(
    () => revenues.filter((item) => item.status === "Em aberto").reduce((sum, item) => sum + item.amount, 0),
    [revenues],
  );
  const lateRevenues = useMemo(
    () => revenues.filter((item) => item.status === "Atrasado").reduce((sum, item) => sum + item.amount, 0),
    [revenues],
  );
  const paidExpenses = useMemo(
    () => expenses.filter((item) => item.status === "Pago").reduce((sum, item) => sum + item.amount, 0),
    [expenses],
  );
  const pendingExpenses = useMemo(
    () => expenses.filter((item) => item.status !== "Pago").reduce((sum, item) => sum + item.amount, 0),
    [expenses],
  );
  const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + item.amount, 0), [expenses]);
  const totalRevenues = useMemo(() => revenues.reduce((sum, item) => sum + item.amount, 0), [revenues]);
  const balance = paidRevenues - paidExpenses;

  const monthlySeries = useMemo<MonthlySeries[]>(() => {
    const currentMonth = startOfMonth(new Date("2026-03-12T12:00:00"));
    const series = new Map<string, MonthlySeries>();

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      series.set(key, {
        month: formatMonthLabel(key),
        receitas: 0,
        despesas: 0,
      });
    }

    for (const revenue of revenues) {
      const key = getMonthKey(revenue.receivedDate);
      const month = series.get(key);
      if (month) month.receitas += revenue.amount;
    }

    for (const expense of expenses) {
      const key = getMonthKey(expense.issueDate);
      const month = series.get(key);
      if (month) month.despesas += expense.amount;
    }

    return Array.from(series.values());
  }, [expenses, revenues]);

  const revenuesByMonth = useMemo(() => {
    const totals = new Map<string, number>();
    for (const revenue of revenues) {
      const key = getMonthKey(revenue.receivedDate);
      totals.set(key, (totals.get(key) ?? 0) + revenue.amount);
    }

    return Array.from(totals.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, total]) => ({ month, total }));
  }, [revenues]);

  const expensesByMonth = useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of expenses) {
      const key = getMonthKey(expense.issueDate);
      totals.set(key, (totals.get(key) ?? 0) + expense.amount);
    }

    return Array.from(totals.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, total]) => ({ month, total }));
  }, [expenses]);

  const revenuesByYear = useMemo(() => {
    const totals = new Map<string, number>();
    for (const revenue of revenues) {
      const year = revenue.receivedDate.slice(0, 4);
      totals.set(year, (totals.get(year) ?? 0) + revenue.amount);
    }

    return Array.from(totals.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, total]) => ({ year, total }));
  }, [revenues]);

  const expensesByYear = useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of expenses) {
      const year = expense.issueDate.slice(0, 4);
      totals.set(year, (totals.get(year) ?? 0) + expense.amount);
    }

    return Array.from(totals.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, total]) => ({ year, total }));
  }, [expenses]);

  const delinquencyRows = useMemo(
    () =>
      revenues
        .filter((item) => item.category === "Taxa condominial" && item.status !== "Recebido")
        .sort((a, b) => a.receivedDate.localeCompare(b.receivedDate))
        .map((item) => ({
          id: item.id,
          apartment: item.unit,
          resident: item.resident,
          amount: item.amount,
          status: item.status,
          lateMonths: monthDifference(item.receivedDate),
        })),
    [revenues],
  );

  const recentRevenues = useMemo(
    () => [...revenues].sort((a, b) => b.receivedDate.localeCompare(a.receivedDate)).slice(0, 5),
    [revenues],
  );

  const recentExpenses = useMemo(
    () => [...expenses].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5),
    [expenses],
  );

  function handleRevenueUnitChange(value: string) {
    const selected = unitOptions.find((option) => option.value === value);
    setRevenueForm((current) => ({
      ...current,
      unit: value,
      resident: selected?.resident ?? current.resident,
    }));
  }

  function handleCreateRevenue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !revenueForm.identifier.trim() ||
      !revenueForm.description.trim() ||
      !revenueForm.amount ||
      !revenueForm.receivedDate ||
      !revenueForm.unit.trim()
    ) {
      return;
    }

    setRevenues((current) => [
      {
        id: buildId("revenue"),
        identifier: revenueForm.identifier.trim(),
        description: revenueForm.description.trim(),
        amount: Number(revenueForm.amount),
        receivedDate: revenueForm.receivedDate,
        unit: revenueForm.unit.trim(),
        resident: revenueForm.resident.trim() || "Morador nao informado",
        category: revenueForm.category,
        paymentMethod: revenueForm.paymentMethod,
        status: revenueForm.status,
        documentName: revenueForm.documentName.trim(),
        notes: revenueForm.notes.trim(),
      },
      ...current,
    ]);

    setRevenueForm({
      identifier: "",
      description: "",
      amount: "",
      receivedDate: "2026-03-12",
      unit: "",
      resident: "",
      category: "Taxa condominial",
      paymentMethod: "Pix",
      status: "Recebido",
      documentName: "",
      notes: "",
    });
  }

  function handleCreateExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !expenseForm.identifier.trim() ||
      !expenseForm.description.trim() ||
      !expenseForm.amount ||
      !expenseForm.issueDate ||
      !expenseForm.dueDate ||
      !expenseForm.supplier.trim()
    ) {
      return;
    }

    setExpenses((current) => [
      {
        id: buildId("expense"),
        identifier: expenseForm.identifier.trim(),
        description: expenseForm.description.trim(),
        amount: Number(expenseForm.amount),
        issueDate: expenseForm.issueDate,
        dueDate: expenseForm.dueDate,
        supplier: expenseForm.supplier.trim(),
        category: expenseForm.category,
        paymentMethod: expenseForm.paymentMethod,
        status: expenseForm.status,
        documentName: expenseForm.documentName.trim(),
        notes: expenseForm.notes.trim(),
      },
      ...current,
    ]);

    setExpenseForm({
      identifier: "",
      description: "",
      amount: "",
      issueDate: "2026-03-12",
      dueDate: "2026-03-20",
      supplier: "",
      category: "Energia",
      paymentMethod: "Boleto",
      status: "Pendente",
      documentName: "",
      notes: "",
    });
  }

  return (
    <AppLayout title="Financeiro">
      <div className="min-w-0 space-y-5">
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(134,239,172,0.35),_transparent_34%),linear-gradient(135deg,_#ecfdf5_0%,_#ffffff_48%,_#f8fafc_100%)] p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                <Wallet size={13} />
                Gestao financeira do condominio
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                Cadastre receitas, despesas e acompanhe o saldo em tempo real
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                O painel concentra lancamentos, inadimplencia e relatorios mensais e anuais para apoiar a rotina administrativa.
              </p>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:max-w-[760px]">
              {[
                {
                  icon: ArrowUpCircle,
                  label: "Receitas recebidas",
                  value: formatCurrency(paidRevenues),
                  hint: `${revenues.filter((item) => item.status === "Recebido").length} registros`,
                  tone: "border-emerald-100 bg-white text-emerald-700",
                },
                {
                  icon: ArrowDownCircle,
                  label: "Despesas pagas",
                  value: formatCurrency(paidExpenses),
                  hint: `${expenses.filter((item) => item.status === "Pago").length} registros`,
                  tone: "border-slate-100 bg-white text-slate-700",
                },
                {
                  icon: AlertTriangle,
                  label: "Inadimplencia",
                  value: formatCurrency(lateRevenues),
                  hint: `${delinquencyRows.length} unidades com taxa em aberto`,
                  tone: "border-amber-100 bg-white text-amber-700",
                },
                {
                  icon: PiggyBank,
                  label: "Saldo atual",
                  value: formatCurrency(balance),
                  hint: "Recebido menos pago",
                  tone: "border-indigo-100 bg-white text-indigo-700",
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={`min-w-0 rounded-2xl border p-4 shadow-sm ${card.tone}`}>
                    <div className="flex items-center justify-between gap-3">
                      <Icon size={18} />
                      <span className="text-[11px] font-medium text-slate-400">{card.hint}</span>
                    </div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                    <p className="mt-1 break-words text-xl font-bold text-slate-900 sm:text-2xl">{card.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Fluxo financeiro dos ultimos 6 meses</h3>
                <p className="mt-0.5 text-xs text-slate-400">Receitas e despesas consolidadas a partir dos lancamentos cadastrados.</p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                Base local da tela financeira
              </span>
            </div>

            <div className="mt-4 h-72 rounded-3xl border border-slate-100 bg-slate-50 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySeries} barGap={10}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`}
                  />
                  <Tooltip content={<FinanceTooltip />} />
                  <Bar dataKey="receitas" name="Receitas" radius={[10, 10, 0, 0]}>
                    {monthlySeries.map((item) => (
                      <Cell key={`receita-${item.month}`} fill="#10b981" />
                    ))}
                  </Bar>
                  <Bar dataKey="despesas" name="Despesas" radius={[10, 10, 0, 0]}>
                    {monthlySeries.map((item) => (
                      <Cell key={`despesa-${item.month}`} fill="#f59e0b" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Landmark size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Total de receitas</span>
                </div>
                <p className="mt-3 break-words text-2xl font-bold text-slate-900 sm:text-3xl">{formatCurrency(totalRevenues)}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{formatCurrency(openRevenues)} ainda em aberto.</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Receipt size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Total de despesas</span>
                </div>
                <p className="mt-3 break-words text-2xl font-bold text-slate-900 sm:text-3xl">{formatCurrency(totalExpenses)}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{formatCurrency(pendingExpenses)} ainda pendente.</p>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <CalendarRange size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Receitas atrasadas</span>
                </div>
                <p className="mt-3 break-words text-2xl font-bold text-slate-900 sm:text-3xl">{formatCurrency(lateRevenues)}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Taxas condominiais e cobrancas com atraso.</p>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex items-center gap-2 text-indigo-700">
                  <BadgeCheck size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Saldo consolidado</span>
                </div>
                <p className="mt-3 break-words text-2xl font-bold text-slate-900 sm:text-3xl">{formatCurrency(balance)}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Considera apenas o que ja foi recebido e pago.</p>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-4">
            <form onSubmit={handleCreateRevenue} className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 className="m-0 text-sm font-semibold text-slate-900">Cadastro de receitas</h3>
                  <p className="mt-0.5 text-xs text-slate-400">Lance entradas com categoria, unidade, documento e status.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={revenueForm.identifier}
                    onChange={(event) => setRevenueForm((current) => ({ ...current, identifier: event.target.value }))}
                    placeholder="No receita"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={revenueForm.amount}
                    onChange={(event) => setRevenueForm((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="Valor"
                    className={inputClass}
                  />
                </div>

                <input
                  value={revenueForm.description}
                  onChange={(event) => setRevenueForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Descricao da receita"
                  className={inputClass}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="date"
                    value={revenueForm.receivedDate}
                    onChange={(event) => setRevenueForm((current) => ({ ...current, receivedDate: event.target.value }))}
                    className={inputClass}
                  />
                  <select value={revenueForm.unit} onChange={(event) => handleRevenueUnitChange(event.target.value)} className={inputClass}>
                    <option value="">Selecione a unidade</option>
                    <option value="Area comum">Area comum</option>
                    {unitOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={revenueForm.resident}
                    onChange={(event) => setRevenueForm((current) => ({ ...current, resident: event.target.value }))}
                    placeholder="Morador"
                    className={inputClass}
                  />
                  <select
                    value={revenueForm.category}
                    onChange={(event) => setRevenueForm((current) => ({ ...current, category: event.target.value as RevenueCategory }))}
                    className={inputClass}
                  >
                    {revenueCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={revenueForm.paymentMethod}
                    onChange={(event) =>
                      setRevenueForm((current) => ({ ...current, paymentMethod: event.target.value as RevenuePaymentMethod }))
                    }
                    className={inputClass}
                  >
                    <option value="Pix">Pix</option>
                    <option value="Boleto">Boleto</option>
                  </select>
                  <select
                    value={revenueForm.status}
                    onChange={(event) => setRevenueForm((current) => ({ ...current, status: event.target.value as RevenueStatus }))}
                    className={inputClass}
                  >
                    <option value="Recebido">Recebido</option>
                    <option value="Em aberto">Em aberto</option>
                    <option value="Atrasado">Atrasado</option>
                  </select>
                </div>

                <input
                  value={revenueForm.documentName}
                  onChange={(event) => setRevenueForm((current) => ({ ...current, documentName: event.target.value }))}
                  placeholder="Documento associado"
                  className={inputClass}
                />

                <textarea
                  value={revenueForm.notes}
                  onChange={(event) => setRevenueForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Observacoes"
                  className={textAreaClass}
                />

                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                  <PlusCircle size={16} />
                  Adicionar receita
                </button>
              </div>
            </form>

            <form onSubmit={handleCreateExpense} className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="m-0 text-sm font-semibold text-slate-900">Cadastro de despesas</h3>
                  <p className="mt-0.5 text-xs text-slate-400">Controle emissao, vencimento, fornecedor e documentos fiscais.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={expenseForm.identifier}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, identifier: event.target.value }))}
                    placeholder="No despesa"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="Valor"
                    className={inputClass}
                  />
                </div>

                <input
                  value={expenseForm.description}
                  onChange={(event) => setExpenseForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Descricao da despesa"
                  className={inputClass}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="date"
                    value={expenseForm.issueDate}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, issueDate: event.target.value }))}
                    className={inputClass}
                  />
                  <input
                    type="date"
                    value={expenseForm.dueDate}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, dueDate: event.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={expenseForm.supplier}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, supplier: event.target.value }))}
                    placeholder="Fornecedor"
                    className={inputClass}
                  />
                  <select
                    value={expenseForm.category}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value as ExpenseCategory }))}
                    className={inputClass}
                  >
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(event) =>
                      setExpenseForm((current) => ({ ...current, paymentMethod: event.target.value as ExpensePaymentMethod }))
                    }
                    className={inputClass}
                  >
                    <option value="Pix">Pix</option>
                    <option value="Boleto">Boleto</option>
                  </select>
                  <select
                    value={expenseForm.status}
                    onChange={(event) => setExpenseForm((current) => ({ ...current, status: event.target.value as ExpenseStatus }))}
                    className={inputClass}
                  >
                    <option value="Pago">Pago</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Em negociacao">Em negociacao</option>
                  </select>
                </div>

                <input
                  value={expenseForm.documentName}
                  onChange={(event) => setExpenseForm((current) => ({ ...current, documentName: event.target.value }))}
                  placeholder="Documento associado"
                  className={inputClass}
                />

                <textarea
                  value={expenseForm.notes}
                  onChange={(event) => setExpenseForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Observacoes"
                  className={textAreaClass}
                />

                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600">
                  <PlusCircle size={16} />
                  Adicionar despesa
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-2">
          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <ArrowUpCircle size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Relatorio de receitas</h3>
                <p className="mt-0.5 text-xs text-slate-400">Totais mensais, anuais e lancamentos recentes.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mensal</p>
                <div className="mt-3 space-y-2">
                  {revenuesByMonth.map((item) => (
                    <div key={item.month} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                      <span>{formatMonthLabel(item.month)}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Anual</p>
                <div className="mt-3 space-y-2">
                  {revenuesByYear.map((item) => (
                    <div key={item.year} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                      <span>{item.year}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <div className="hidden grid-cols-[minmax(0,1fr)_auto_auto] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">
                <span>Receita</span>
                <span>Data</span>
                <span>Total</span>
              </div>
              <div className="divide-y divide-slate-100">
                {recentRevenues.map((item) => (
                  <div key={item.id} className="grid gap-2 px-4 py-3 text-sm text-slate-700 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">{item.identifier}</p>
                      <p className="break-words text-xs text-slate-500">{item.description}</p>
                    </div>
                    <span className="text-xs text-slate-500 md:text-sm">{formatDate(item.receivedDate)}</span>
                    <span className="break-words font-semibold text-emerald-700">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <ArrowDownCircle size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Relatorio de despesas</h3>
                <p className="mt-0.5 text-xs text-slate-400">Totais mensais, anuais e despesas com vencimento mais proximo.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mensal</p>
                <div className="mt-3 space-y-2">
                  {expensesByMonth.map((item) => (
                    <div key={item.month} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                      <span>{formatMonthLabel(item.month)}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Anual</p>
                <div className="mt-3 space-y-2">
                  {expensesByYear.map((item) => (
                    <div key={item.year} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                      <span>{item.year}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <div className="hidden grid-cols-[minmax(0,1fr)_auto_auto] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">
                <span>Despesa</span>
                <span>Vencimento</span>
                <span>Total</span>
              </div>
              <div className="divide-y divide-slate-100">
                {recentExpenses.map((item) => (
                  <div key={item.id} className="grid gap-2 px-4 py-3 text-sm text-slate-700 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">{item.identifier}</p>
                      <p className="break-words text-xs text-slate-500">{item.description}</p>
                    </div>
                    <span className="text-xs text-slate-500 md:text-sm">{formatDate(item.dueDate)}</span>
                    <span className="break-words font-semibold text-amber-700">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Relatorio de inadimplencia</h3>
                <p className="mt-0.5 text-xs text-slate-400">Moradores com taxa condominial nao recebida.</p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto_auto] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">
                <span>Apartamento</span>
                <span>Morador</span>
                <span>Atraso</span>
                <span>Valor</span>
              </div>
              <div className="divide-y divide-slate-100">
                {delinquencyRows.length > 0 ? (
                  delinquencyRows.map((item) => (
                    <div key={item.id} className="grid gap-2 px-4 py-3 text-sm text-slate-700 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto_auto] md:gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-slate-900">{item.apartment}</p>
                        <p className="text-xs text-slate-500">{item.status}</p>
                      </div>
                      <span className="break-words">{item.resident}</span>
                      <span className="text-xs text-slate-500 md:text-sm">{item.lateMonths} mes(es)</span>
                      <span className="break-words font-semibold text-rose-700">{formatCurrency(item.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-sm text-slate-500">Nenhuma unidade inadimplente nas taxas condominiais.</div>
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">Relatorio financeiro</h3>
                <p className="mt-0.5 text-xs text-slate-400">Visao consolidada de entradas, saidas e saldo.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {[
                { icon: Wallet, label: "Receitas cadastradas", value: formatCurrency(totalRevenues), tone: "text-emerald-700 bg-emerald-50" },
                { icon: CreditCard, label: "Despesas cadastradas", value: formatCurrency(totalExpenses), tone: "text-amber-700 bg-amber-50" },
                { icon: FileText, label: "Documentos informados", value: `${revenues.filter((item) => item.documentName).length + expenses.filter((item) => item.documentName).length}`, tone: "text-slate-700 bg-slate-50" },
                { icon: PiggyBank, label: "Saldo financeiro", value: formatCurrency(balance), tone: "text-indigo-700 bg-indigo-50" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-slate-900">{item.label}</p>
                        <p className="text-xs text-slate-500">Atualizado a partir dos cadastros desta tela.</p>
                      </div>
                    </div>
                    <span className="break-words text-lg font-bold text-slate-900">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
