import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Copy,
  FileBarChart2,
  Landmark,
  PlusCircle,
  Printer,
  Receipt,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppLayout from "../features/layout/components/app-layout";
import {
  createFinanceBill,
  createFinanceEntry,
  listFinanceBills,
  listFinanceEntries,
  updateFinanceBillStatus,
  type CreateFinanceBillPayload,
  type FinanceBill,
  type FinanceBillStatus,
  type FinanceEntry,
} from "../features/financeiro/services/financeiro";
import { fetchBuilding, getMockBuilding, type Floor } from "../features/predio/services/predio";

type RevenueCategory = "Taxa condominial" | "Multa" | "Juros por atraso" | "Aluguel areas comuns";
type ExpenseCategory = "Funcionarios" | "Energia" | "Agua" | "Manutencao" | "Limpeza" | "Seguranca" | "Outros";
type RevenueStatus = "Recebido" | "Em aberto" | "Atrasado";
type ExpenseStatus = "Pago" | "Pendente" | "Em negociacao";
type FinanceModal = "revenue" | "expense" | "bill" | null;
type MonthlyPoint = { month: string; receitas: number; despesas: number; saldo: number };
type UnitOption = { value: string; label: string; resident: string; email: string };

const revenueCategories: RevenueCategory[] = ["Taxa condominial", "Multa", "Juros por atraso", "Aluguel areas comuns"];
const expenseCategories: ExpenseCategory[] = ["Funcionarios", "Energia", "Agua", "Manutencao", "Limpeza", "Seguranca", "Outros"];
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";
const fieldLabelClass = "grid gap-2 text-sm font-medium text-slate-700";
const panelClass =
  "rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

function getMonthKey(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return monthFormatter.format(new Date(year, month - 1, 1));
}

function getUnitOptions(floors: Floor[]): UnitOption[] {
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

function getBillStatusMeta(status: FinanceBillStatus) {
  switch (status) {
    case "PAID":
      return { label: "Pago", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    case "OVERDUE":
      return { label: "Atrasado", className: "border-rose-200 bg-rose-50 text-rose-700" };
    case "CANCELLED":
      return { label: "Cancelado", className: "border-slate-200 bg-slate-100 text-slate-600" };
    default:
      return { label: "Em aberto", className: "border-amber-200 bg-amber-50 text-amber-700" };
  }
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

function openBillPrintView(bill: FinanceBill) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${bill.bill_code}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
          .card { border: 1px solid #cbd5e1; border-radius: 20px; padding: 24px; }
          .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; }
          .line { font-family: monospace; font-size: 20px; letter-spacing: 1px; margin: 18px 0; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
          .label { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          .value { font-size: 16px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="pill">Boleto mockado</div>
          <h1>${bill.bill_code}</h1>
          <p>Documento interno para cobranca condominial sem integracao bancaria.</p>
          <div class="line">${bill.digitable_line}</div>
          <div class="grid">
            <div><div class="label">Unidade</div><div class="value">${bill.unit}</div></div>
            <div><div class="label">Morador</div><div class="value">${bill.resident}</div></div>
            <div><div class="label">Competencia</div><div class="value">${formatDate(bill.competence_date)}</div></div>
            <div><div class="label">Vencimento</div><div class="value">${formatDate(bill.due_date)}</div></div>
            <div><div class="label">Valor</div><div class="value">${formatCurrency(bill.amount)}</div></div>
            <div><div class="label">Codigo de barras</div><div class="value">${bill.barcode}</div></div>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #64748b;">Gerado para demonstracao do fluxo financeiro do condominio.</p>
        </div>
        <script>window.print()</script>
      </body>
    </html>`);
  win.document.close();
}

export default function FinanceiroPage() {
  const [building, setBuilding] = useState<Floor[]>(() => getMockBuilding());
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [bills, setBills] = useState<FinanceBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [revenueErrors, setRevenueErrors] = useState<Record<string, string>>({});
  const [expenseErrors, setExpenseErrors] = useState<Record<string, string>>({});
  const [billErrors, setBillErrors] = useState<Record<string, string>>({});
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingBill, setSavingBill] = useState(false);
  const [activeModal, setActiveModal] = useState<FinanceModal>(null);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const [updatingBillId, setUpdatingBillId] = useState<number | null>(null);
  const [copiedBillCode, setCopiedBillCode] = useState("");

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
  const [billForm, setBillForm] = useState({
    unit: "",
    resident: "",
    residentEmail: "",
    amount: "",
    competenceDate: "2026-04-01",
    issueDate: "2026-04-01",
    dueDate: "2026-04-10",
    instructions: "",
  });

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [floors, financeEntries, financeBills] = await Promise.all([
        fetchBuilding().catch(() => getMockBuilding()),
        listFinanceEntries(),
        listFinanceBills({ limit: 200 }),
      ]);

      setBuilding(floors);
      setEntries(financeEntries);
      setBills(financeBills);
      setSelectedBillId((current) => current ?? financeBills[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar financeiro.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const unitOptions = useMemo(() => getUnitOptions(building), [building]);
  const selectedBill = useMemo(
    () => bills.find((bill) => bill.id === selectedBillId) ?? bills[0] ?? null,
    [bills, selectedBillId],
  );
  const revenues = useMemo(() => entries.filter((item) => item.type === "REVENUE"), [entries]);
  const expenses = useMemo(() => entries.filter((item) => item.type === "EXPENSE"), [entries]);
  const paidBills = useMemo(() => bills.filter((bill) => bill.status === "PAID"), [bills]);
  const pendingBills = useMemo(() => bills.filter((bill) => bill.status === "PENDING"), [bills]);
  const overdueBills = useMemo(() => bills.filter((bill) => bill.status === "OVERDUE"), [bills]);
  const receivedRevenue = useMemo(
    () => revenues.filter((item) => item.status === "Recebido").reduce((sum, item) => sum + item.amount, 0),
    [revenues],
  );
  const paidExpense = useMemo(
    () => expenses.filter((item) => item.status === "Pago").reduce((sum, item) => sum + item.amount, 0),
    [expenses],
  );
  const openBillsAmount = useMemo(
    () => pendingBills.concat(overdueBills).reduce((sum, bill) => sum + bill.amount, 0),
    [overdueBills, pendingBills],
  );
  const delinquencyAmount = useMemo(
    () => overdueBills.reduce((sum, bill) => sum + bill.amount, 0),
    [overdueBills],
  );
  const balance = useMemo(() => receivedRevenue - paidExpense, [paidExpense, receivedRevenue]);

  const monthlySeries = useMemo<MonthlyPoint[]>(() => {
    const current = new Date("2026-04-01T12:00:00");
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

  const billStatusChart = useMemo(
    () =>
      [
        { name: "Pago", value: paidBills.reduce((sum, bill) => sum + bill.amount, 0) },
        { name: "Em aberto", value: pendingBills.reduce((sum, bill) => sum + bill.amount, 0) },
        { name: "Atrasado", value: overdueBills.reduce((sum, bill) => sum + bill.amount, 0) },
      ].filter((item) => item.value > 0),
    [overdueBills, paidBills, pendingBills],
  );

  const recentEntries = useMemo(() => {
    const safeDate = (d?: string | null) => d ?? "";
    return [...entries]
      .sort((a, b) => safeDate(b.created_at).localeCompare(safeDate(a.created_at)))
      .slice(0, 8);
  }, [entries]);

  const recentBills = useMemo(() => {
    const safeDate = (d?: string | null) => d ?? "";
    return [...bills]
      .sort((a, b) => safeDate(b.created_at).localeCompare(safeDate(a.created_at)))
      .slice(0, 8);
  }, [bills]);

  function validateRequiredRevenue() {
    const errors: Record<string, string> = {};
    if (!revenueForm.identifier.trim()) errors.identifier = "Obrigatório";
    if (!revenueForm.description.trim()) errors.description = "Obrigatório";
    if (!revenueForm.amount || Number(revenueForm.amount) <= 0) errors.amount = "Valor deve ser maior que zero";
    if (!revenueForm.referenceDate) errors.referenceDate = "Obrigatório";
    setRevenueErrors(errors);
    setFormError(Object.keys(errors).length ? "Corrija os campos destacados." : "");
    return Object.keys(errors).length === 0;
  }

  function validateRequiredExpense() {
    const errors: Record<string, string> = {};
    if (!expenseForm.identifier.trim()) errors.identifier = "Obrigatório";
    if (!expenseForm.description.trim()) errors.description = "Obrigatório";
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) errors.amount = "Valor deve ser maior que zero";
    if (!expenseForm.referenceDate) errors.referenceDate = "Obrigatório";
    if (!expenseForm.dueDate) errors.dueDate = "Obrigatório";
    if (!expenseForm.counterparty.trim()) errors.counterparty = "Obrigatório";
    setExpenseErrors(errors);
    setFormError(Object.keys(errors).length ? "Corrija os campos destacados." : "");
    return Object.keys(errors).length === 0;
  }

  function validateRequiredBill() {
    const errors: Record<string, string> = {};
    if (!billForm.unit) errors.unit = "Obrigatório";
    if (!billForm.resident.trim()) errors.resident = "Obrigatório";
    if (!billForm.amount || Number(billForm.amount) <= 0) errors.amount = "Valor deve ser maior que zero";
    if (!billForm.competenceDate) errors.competenceDate = "Obrigatório";
    if (!billForm.issueDate) errors.issueDate = "Obrigatório";
    if (!billForm.dueDate) errors.dueDate = "Obrigatório";
    setBillErrors(errors);
    setFormError(Object.keys(errors).length ? "Corrija os campos destacados." : "");
    return Object.keys(errors).length === 0;
  }

  const allowedStatusTransitions: Record<FinanceBillStatus, FinanceBillStatus[]> = {
    PENDING: ["PAID", "OVERDUE", "CANCELLED"],
    OVERDUE: ["PAID", "CANCELLED"],
    PAID: [],
    CANCELLED: [],
  };

  function canChangeBillStatus(current: FinanceBillStatus, next: FinanceBillStatus) {
    return allowedStatusTransitions[current]?.includes(next);
  }

  async function handleCreateRevenue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setRevenueErrors({});

    if (!validateRequiredRevenue()) return;

    try {
      setSavingRevenue(true);
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
      setActiveModal(null);
      setActionMessage("Receita cadastrada com sucesso.");
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar receita.");
    }
    finally {
      setSavingRevenue(false);
    }
  }

  async function handleCreateExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setExpenseErrors({});

    if (!validateRequiredExpense()) return;

    try {
      setSavingExpense(true);
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
      setActiveModal(null);
      setActionMessage("Despesa cadastrada com sucesso.");
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar despesa.");
    }
    finally {
      setSavingExpense(false);
    }
  }

  async function handleIssueBill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setBillErrors({});

    if (!validateRequiredBill()) return;

    try {
      setSavingBill(true);
      const payload: CreateFinanceBillPayload = {
        unit: billForm.unit,
        resident: billForm.resident.trim(),
        residentEmail: billForm.residentEmail.trim() || null,
        amount: Number(billForm.amount),
        competenceDate: billForm.competenceDate,
        issueDate: billForm.issueDate,
        dueDate: billForm.dueDate,
        instructions: billForm.instructions.trim() || null,
      };

      const created = await createFinanceBill(payload);
      setBillForm({
        unit: "",
        resident: "",
        residentEmail: "",
        amount: "",
        competenceDate: "2026-04-01",
        issueDate: "2026-04-01",
        dueDate: "2026-04-10",
        instructions: "",
      });
      setActiveModal(null);
      setActionMessage(`Boleto ${created.bill_code} emitido com sucesso.`);
      await loadData();
      setSelectedBillId(created.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao emitir boleto.");
    }
    finally {
      setSavingBill(false);
    }
  }

  async function handleBillStatusChange(bill: FinanceBill, status: FinanceBillStatus) {
    setUpdatingBillId(bill.id);
    setActionMessage("");

    if (!canChangeBillStatus(bill.status, status)) {
      setError("Transição de status inválida para este boleto.");
      setUpdatingBillId(null);
      return;
    }

    try {
      const updated = await updateFinanceBillStatus(bill.id, status);
      setBills((current) => [updated, ...current.filter((item) => item.id !== updated.id)]);
      setSelectedBillId(updated.id);
      setActionMessage(`Boleto ${updated.bill_code} atualizado para ${getBillStatusMeta(status).label.toLowerCase()}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar boleto.");
    } finally {
      setUpdatingBillId(null);
    }
  }

  return (
    <AppLayout title="Financeiro">
      <div className="relative space-y-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_30%),linear-gradient(180deg,_rgba(248,250,252,0.9),_rgba(248,250,252,0))]" />

        <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <Landmark size={13} />
                Central financeira
              </div>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">Caixa, cobrancas e boletos mockados</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                A aba agora concentra lancamentos, cobranca condominial e emissao de boleto mockado com linha digitavel, status e segunda via interna.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormError("");
                  setActiveModal("bill");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Receipt size={16} />
                Emitir boleto
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormError("");
                  setActiveModal("revenue");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <PlusCircle size={16} />
                Cadastrar receita
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormError("");
                  setActiveModal("expense");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
              >
                <PlusCircle size={16} />
                Cadastrar despesa
              </button>
            </div>
          </div>
        </section>

        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
        {actionMessage && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{actionMessage}</p>}
        {loading && <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Carregando financeiro...</p>}

        {!loading && !error && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { title: "Saldo liquido", value: formatCurrency(balance), sub: "Recebido menos despesas pagas", icon: Wallet, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                { title: "Carteira em aberto", value: formatCurrency(openBillsAmount), sub: `${pendingBills.length + overdueBills.length} boletos aguardando baixa`, icon: Receipt, tone: "bg-amber-50 text-amber-700 border-amber-200" },
                { title: "Inadimplencia", value: formatCurrency(delinquencyAmount), sub: `${overdueBills.length} boletos atrasados`, icon: AlertTriangle, tone: "bg-rose-50 text-rose-700 border-rose-200" },
                { title: "Boletos pagos", value: formatCurrency(paidBills.reduce((sum, bill) => sum + bill.amount, 0)), sub: `${paidBills.length} cobrancas compensadas`, icon: CheckCircle2, tone: "bg-sky-50 text-sky-700 border-sky-200" },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className={`${panelClass} border ${card.tone}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone}`}>
                        <Icon size={20} />
                      </div>
                      <span className="rounded-full border border-white/80 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Financeiro
                      </span>
                    </div>
                    <p className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-900">{card.value}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{card.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
                  </div>
                );
              })}
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_340px]">
              <div className={`${panelClass} overflow-hidden bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.98))]`}>
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <FileBarChart2 size={20} />
                    </div>
                    <div>
                      <h3 className="m-0 text-base font-semibold text-slate-900">Fluxo financeiro e saldo</h3>
                      <p className="mt-1 text-sm text-slate-500">Entradas, saidas e tendencia de caixa nos ultimos meses.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      Recebido: {formatCurrency(receivedRevenue)}
                    </span>
                    <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                      Pago: {formatCurrency(paidExpense)}
                    </span>
                    <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                      Saldo: {formatCurrency(balance)}
                    </span>
                  </div>
                </div>
                <div className="mt-5 h-[340px] rounded-[24px] border border-slate-100 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_34%),linear-gradient(180deg,_rgba(248,250,252,0.9),_rgba(255,255,255,1))] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlySeries} margin={{ top: 10, right: 16, left: -24, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<FinanceTooltip />} />
                      <Bar dataKey="receitas" name="Receitas" radius={[10, 10, 0, 0]} fill="#10b981" />
                      <Bar dataKey="despesas" name="Despesas" radius={[10, 10, 0, 0]} fill="#f59e0b" />
                      <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#4f46e5" fill="#c7d2fe" fillOpacity={0.42} strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <aside className={`${panelClass} bg-[linear-gradient(180deg,_#fff,_#f8fafc)]`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h3 className="m-0 text-base font-semibold text-slate-900">Carteira de cobranca</h3>
                    <p className="mt-1 text-sm text-slate-500">Distribuicao financeira dos boletos emitidos.</p>
                  </div>
                </div>
                <div className="mt-4 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={billStatusChart} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={4}>
                        {billStatusChart.map((entry, index) => (
                          <Cell key={entry.name} fill={["#10b981", "#f59e0b", "#f43f5e"][index % 3]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-3">
                  {billStatusChart.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ["#10b981", "#f59e0b", "#f43f5e"][index % 3] }} />
                        <span className="text-sm font-medium text-slate-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </aside>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className={`${panelClass} bg-[linear-gradient(180deg,_#ffffff,_#fffaf1)]`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <CalendarClock size={20} />
                    </div>
                    <div>
                      <h3 className="m-0 text-base font-semibold text-slate-900">Boletos emitidos</h3>
                      <p className="mt-1 text-sm text-slate-500">Selecione um boleto para ver a cobranca completa e atualizar o status.</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {bills.length} documentos
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {recentBills.map((bill) => {
                    const statusMeta = getBillStatusMeta(bill.status);
                    return (
                      <button
                        key={bill.id}
                        type="button"
                        onClick={() => setSelectedBillId(bill.id)}
                        className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${selectedBillId === bill.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-300"}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className={`text-sm font-semibold ${selectedBillId === bill.id ? "text-white" : "text-slate-900"}`}>{bill.bill_code}</p>
                            <p className={`mt-1 text-xs ${selectedBillId === bill.id ? "text-slate-200" : "text-slate-500"}`}>{bill.unit} - {bill.resident}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${selectedBillId === bill.id ? "border-white/20 bg-white/10 text-white" : statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <span className={`text-sm font-semibold ${selectedBillId === bill.id ? "text-white" : "text-slate-900"}`}>{formatCurrency(bill.amount)}</span>
                          <span className={`text-xs ${selectedBillId === bill.id ? "text-slate-300" : "text-slate-500"}`}>Vence em {formatDate(bill.due_date)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`${panelClass} bg-[linear-gradient(180deg,_#ffffff,_#f8fbff)]`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="m-0 text-base font-semibold text-slate-900">Detalhe do boleto</h3>
                    <p className="mt-1 text-sm text-slate-500">Linha digitavel, vencimento, instrucoes e acoes operacionais.</p>
                  </div>
                </div>

                {selectedBill ? (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-white">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">Boleto mockado</p>
                          <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{selectedBill.bill_code}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getBillStatusMeta(selectedBill.status).className}`}>
                          {getBillStatusMeta(selectedBill.status).label}
                        </span>
                      </div>
                      <p className="mt-4 break-all rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-slate-100">
                        {selectedBill.digitable_line}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Unidade</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{selectedBill.unit}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Morador</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{selectedBill.resident}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Competencia</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(selectedBill.competence_date)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vencimento</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(selectedBill.due_date)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Valor</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(selectedBill.amount)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Baixa</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{selectedBill.paid_at ? formatDate(selectedBill.paid_at) : "Nao baixado"}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Instrucoes</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{selectedBill.instructions || "Sem instrucoes adicionais para este documento."}</p>
                      <p className="mt-4 break-all text-xs text-slate-500">Codigo de barras: {selectedBill.barcode}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(selectedBill.digitable_line);
                          setCopiedBillCode(selectedBill.bill_code);
                          setActionMessage(`Linha digitavel de ${selectedBill.bill_code} copiada.`);
                          setTimeout(() => setCopiedBillCode(""), 2500);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Copy size={16} />
                        Copiar linha
                      </button>
                      <button
                        type="button"
                        onClick={() => openBillPrintView(selectedBill)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Printer size={16} />
                        Imprimir 2a via
                      </button>
                      {copiedBillCode === selectedBill.bill_code && (
                        <p className="sm:col-span-2 text-xs font-medium text-emerald-700">Código copiado para a área de transferência.</p>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        disabled={updatingBillId === selectedBill.id || !canChangeBillStatus(selectedBill.status, "PAID")}
                        onClick={() => void handleBillStatusChange(selectedBill, "PAID")}
                        className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Marcar como pago
                      </button>
                      <button
                        type="button"
                        disabled={updatingBillId === selectedBill.id || !canChangeBillStatus(selectedBill.status, "OVERDUE")}
                        onClick={() => void handleBillStatusChange(selectedBill, "OVERDUE")}
                        className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                      >
                        Marcar atrasado
                      </button>
                      <button
                        type="button"
                        disabled={updatingBillId === selectedBill.id || !canChangeBillStatus(selectedBill.status, "CANCELLED")}
                        onClick={() => void handleBillStatusChange(selectedBill, "CANCELLED")}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        Cancelar boleto
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Nenhum boleto emitido ainda.
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className={`${panelClass} bg-[linear-gradient(180deg,_#ffffff,_#fff7f7)]`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="m-0 text-base font-semibold text-slate-900">Inadimplencia atual</h3>
                    <p className="mt-1 text-sm text-slate-500">Unidades com cobranca que exigem acompanhamento mais proximo.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {overdueBills.map((bill) => (
                    <div key={bill.id} className="rounded-[22px] border border-rose-100 bg-[linear-gradient(135deg,_#fff1f2,_#ffffff)] p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{bill.unit}</p>
                          <p className="truncate text-xs text-slate-500">{bill.resident}</p>
                        </div>
                        <span className="break-words text-right text-sm font-semibold text-rose-700">{formatCurrency(bill.amount)}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Vencimento {formatDate(bill.due_date)} - {bill.bill_code}
                      </p>
                    </div>
                  ))}
                  {overdueBills.length === 0 && (
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      Nenhum boleto em atraso no momento.
                    </div>
                  )}
                </div>
              </div>

              <div className={`${panelClass} bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)]`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <CalendarClock size={20} />
                  </div>
                  <div>
                    <h3 className="m-0 text-base font-semibold text-slate-900">Lancamentos recentes</h3>
                    <p className="mt-1 text-sm text-slate-500">Ultimas movimentacoes para leitura rapida da atividade financeira.</p>
                  </div>
                </div>
                <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-[24px] border border-slate-100 bg-white/90">
                  {recentEntries.map((item) => (
                    <div key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                      <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.type === "REVENUE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {item.type === "REVENUE" ? "Receita" : "Despesa"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.identifier}</p>
                        <p className="truncate text-xs text-slate-500">{item.description}</p>
                      </div>
                      <span className="break-words text-right text-sm font-semibold text-slate-900">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Financeiro</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {activeModal === "revenue" ? "Cadastrar receita" : activeModal === "expense" ? "Cadastrar despesa" : "Emitir boleto mockado"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {activeModal === "bill"
                    ? "Gere a cobranca condominial com linha digitavel e segunda via interna."
                    : "Preencha os dados da movimentacao financeira."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {formError && <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{formError}</p>}

              {activeModal === "revenue" && (
                <form onSubmit={handleCreateRevenue} className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={fieldLabelClass}>
                      <span>Codigo</span>
                      <input
                        value={revenueForm.identifier}
                        onChange={(e) => setRevenueForm((current) => ({ ...current, identifier: e.target.value }))}
                        placeholder="Ex.: REC-0426-001"
                        className={`${inputClass} ${revenueErrors.identifier ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""}`}
                      />
                      {revenueErrors.identifier && <span className="text-xs text-rose-600">{revenueErrors.identifier}</span>}
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Valor</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={revenueForm.amount}
                        onChange={(e) => setRevenueForm((current) => ({ ...current, amount: e.target.value }))}
                        placeholder="0,00"
                        className={`${inputClass} ${revenueErrors.amount ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""}`}
                      />
                      {revenueErrors.amount && <span className="text-xs text-rose-600">{revenueErrors.amount}</span>}
                    </label>
                  </div>

                  <label className={fieldLabelClass}>
                    <span>Descricao</span>
                    <input
                      value={revenueForm.description}
                      onChange={(e) => setRevenueForm((current) => ({ ...current, description: e.target.value }))}
                      placeholder="Ex.: Aluguel do salao"
                      className={`${inputClass} ${revenueErrors.description ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""}`}
                    />
                    {revenueErrors.description && <span className="text-xs text-rose-600">{revenueErrors.description}</span>}
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={fieldLabelClass}>
                      <span>Data de referencia</span>
                      <input
                        type="date"
                        value={revenueForm.referenceDate}
                        onChange={(e) => setRevenueForm((current) => ({ ...current, referenceDate: e.target.value }))}
                        className={`${inputClass} ${revenueErrors.referenceDate ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""}`}
                      />
                      {revenueErrors.referenceDate && <span className="text-xs text-rose-600">{revenueErrors.referenceDate}</span>}
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Categoria</span>
                      <select value={revenueForm.category} onChange={(e) => setRevenueForm((current) => ({ ...current, category: e.target.value as RevenueCategory }))} className={inputClass}>
                        {revenueCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className={fieldLabelClass}>
                    <span>Unidade</span>
                    <select
                      value={revenueForm.unit}
                      onChange={(e) => {
                        const unit = unitOptions.find((item) => item.value === e.target.value);
                        setRevenueForm((current) => ({
                          ...current,
                          unit: e.target.value,
                          resident: unit?.resident ?? current.resident,
                        }));
                      }}
                      className={inputClass}
                    >
                      <option value="">Selecione a unidade</option>
                      {unitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={fieldLabelClass}>
                      <span>Morador</span>
                      <input value={revenueForm.resident} onChange={(e) => setRevenueForm((current) => ({ ...current, resident: e.target.value }))} placeholder="Nome do morador" className={inputClass} />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Status</span>
                      <select value={revenueForm.status} onChange={(e) => setRevenueForm((current) => ({ ...current, status: e.target.value as RevenueStatus }))} className={inputClass}>
                        <option value="Recebido">Recebido</option>
                        <option value="Em aberto">Em aberto</option>
                        <option value="Atrasado">Atrasado</option>
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => setActiveModal(null)} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingRevenue}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <PlusCircle size={16} />
                      {savingRevenue ? "Salvando..." : "Salvar receita"}
                    </button>
                  </div>
                </form>
              )}

              {activeModal === "expense" && (
                <form onSubmit={handleCreateExpense} className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={fieldLabelClass}>
                      <span>Codigo</span>
                      <input value={expenseForm.identifier} onChange={(e) => setExpenseForm((current) => ({ ...current, identifier: e.target.value }))} placeholder="Ex.: DESP-0426-001" className={inputClass} />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Valor</span>
                      <input type="number" min={0} step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm((current) => ({ ...current, amount: e.target.value }))} placeholder="0,00" className={inputClass} />
                    </label>
                  </div>

                  <label className={fieldLabelClass}>
                    <span>Descricao</span>
                    <input value={expenseForm.description} onChange={(e) => setExpenseForm((current) => ({ ...current, description: e.target.value }))} placeholder="Ex.: Conta de energia" className={inputClass} />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={fieldLabelClass}>
                      <span>Data de referencia</span>
                      <input type="date" value={expenseForm.referenceDate} onChange={(e) => setExpenseForm((current) => ({ ...current, referenceDate: e.target.value }))} className={inputClass} />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Vencimento</span>
                      <input type="date" value={expenseForm.dueDate} onChange={(e) => setExpenseForm((current) => ({ ...current, dueDate: e.target.value }))} className={inputClass} />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={fieldLabelClass}>
                      <span>Fornecedor</span>
                      <input value={expenseForm.counterparty} onChange={(e) => setExpenseForm((current) => ({ ...current, counterparty: e.target.value }))} placeholder="Nome do fornecedor" className={inputClass} />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Categoria</span>
                      <select value={expenseForm.category} onChange={(e) => setExpenseForm((current) => ({ ...current, category: e.target.value as ExpenseCategory }))} className={inputClass}>
                        {expenseCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => setActiveModal(null)} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                      Cancelar
                    </button>
                    <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600">
                      <PlusCircle size={16} />
                      Salvar despesa
                    </button>
                  </div>
                </form>
              )}

              {activeModal === "bill" && (
                <form onSubmit={handleIssueBill} className="grid gap-4">
                  <label className={fieldLabelClass}>
                    <span>Unidade</span>
                    <select
                      value={billForm.unit}
                      onChange={(e) => {
                        const option = unitOptions.find((item) => item.value === e.target.value);
                        setBillForm((current) => ({
                          ...current,
                          unit: e.target.value,
                          resident: option?.resident ?? current.resident,
                          residentEmail: option?.email ?? current.residentEmail,
                        }));
                      }}
                      className={inputClass}
                    >
                      <option value="">Selecione a unidade</option>
                      {unitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={fieldLabelClass}>
                      <span>Morador</span>
                      <input value={billForm.resident} onChange={(e) => setBillForm((current) => ({ ...current, resident: e.target.value }))} placeholder="Nome do morador" className={inputClass} />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Email do morador</span>
                      <input type="email" value={billForm.residentEmail} onChange={(e) => setBillForm((current) => ({ ...current, residentEmail: e.target.value }))} placeholder="morador@exemplo.com" className={inputClass} />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={fieldLabelClass}>
                      <span>Valor</span>
                      <input type="number" min={0} step="0.01" value={billForm.amount} onChange={(e) => setBillForm((current) => ({ ...current, amount: e.target.value }))} placeholder="0,00" className={inputClass} />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Competencia</span>
                      <input type="date" value={billForm.competenceDate} onChange={(e) => setBillForm((current) => ({ ...current, competenceDate: e.target.value }))} className={inputClass} />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={fieldLabelClass}>
                      <span>Emissao</span>
                      <input type="date" value={billForm.issueDate} onChange={(e) => setBillForm((current) => ({ ...current, issueDate: e.target.value }))} className={inputClass} />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Vencimento</span>
                      <input type="date" value={billForm.dueDate} onChange={(e) => setBillForm((current) => ({ ...current, dueDate: e.target.value }))} className={inputClass} />
                    </label>
                  </div>

                  <label className={fieldLabelClass}>
                    <span>Instrucoes</span>
                    <textarea
                      value={billForm.instructions}
                      placeholder="Ex.: Não receber após 30 dias do vencimento."
                      onChange={(e) => setBillForm((current) => ({ ...current, instructions: e.target.value }))}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => setActiveModal(null)} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                      Cancelar
                    </button>
                    <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                      <Receipt size={16} />
                      Emitir boleto
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
