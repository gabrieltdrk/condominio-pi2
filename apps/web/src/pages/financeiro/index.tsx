import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Copy,
  FileBarChart2,
  Landmark,
  Layers,
  PlusCircle,
  Printer,
  Receipt,
  Wallet,
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
import { getUser } from "../../features/auth/services/auth";
import AppLayout from "../../features/layout/components/app-layout";
import {
  createFinanceBill,
  createFinanceBillBatch,
  createFinanceEntry,
  listFinanceBills,
  listFinanceEntries,
  markOverdueBills,
  updateFinanceBillStatus,
  calculateLateFees,
  type CreateFinanceBillPayload,
  type FinanceBill,
  type FinanceBillStatus,
  type FinanceEntry,
  type LateFeeBreakdown,
} from "../../features/financeiro/services/financeiro";
import { supabase } from "../../lib/supabase";
import { listFornecedores, type Fornecedor } from "../../features/financeiro/services/fornecedores";
import { fetchBuilding, type Floor } from "../../features/predio/services/predio";
import {
  type ExpenseCategory,
  type MonthlyPoint,
  type AccountabilityReport,
  expenseCategories,
  expenseCategoryMeta,
  formatCurrency,
  formatDate,
  getMonthKey,
  formatMonthLabel,
  formatMonthLongLabel,
  normalizeText,
  normalizeUnit,
  parseUnitDescriptor,
  billMatchesResidentUnit,
  readLocalMockAssignments,
  getUnitOptions,
  getBillStatusMeta,
} from "./utils/finance-calc";
import { openBillPrintView } from "./utils/finance-print";
import { FinanceTooltip } from "./components/finance-tooltip";
import { FinanceFormModal, type RevenueForm, type ExpenseForm, type BillForm, type BatchForm } from "./components/finance-form-modal";
import { ResidentFinanceView } from "./components/resident-finance-view";

type FinanceModal = "revenue" | "expense" | "bill" | "batch" | null;

const panelClass =
  "rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur";

type CarouselProps = {
  balance: number;
  openBillsAmount: number;
  pendingBills: FinanceBill[];
  overdueBills: FinanceBill[];
  delinquencyAmount: number;
  paidBills: FinanceBill[];
  revenues: FinanceEntry[];
  expenses: FinanceEntry[];
  totalUnits: number;
};

function FinanceCarousel({ balance, openBillsAmount, pendingBills, overdueBills, delinquencyAmount, paidBills, revenues, expenses, totalUnits }: CarouselProps) {
  const totalRevenue = revenues.reduce((s, e) => s + e.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const avgTicket = paidBills.length ? paidBills.reduce((s, b) => s + b.amount, 0) / paidBills.length : 0;
  const inadimplenciaRate = totalUnits > 0 ? (overdueBills.length / totalUnits) * 100 : 0;
  const cancelledBills = 0;

  const cards = [
    { title: "Saldo líquido", value: formatCurrency(balance), sub: "Recebido menos despesas pagas", icon: Wallet, tone: { card: "border-emerald-200", bg: "from-emerald-50/60 to-white", icon: "text-emerald-600 bg-emerald-50" } },
    { title: "Carteira em aberto", value: formatCurrency(openBillsAmount), sub: `${pendingBills.length + overdueBills.length} boletos aguardando baixa`, icon: Receipt, tone: { card: "border-amber-200", bg: "from-amber-50/60 to-white", icon: "text-amber-600 bg-amber-50" } },
    { title: "Inadimplência", value: formatCurrency(delinquencyAmount), sub: `${overdueBills.length} boletos atrasados`, icon: AlertTriangle, tone: { card: "border-rose-200", bg: "from-rose-50/60 to-white", icon: "text-rose-600 bg-rose-50" } },
    { title: "Boletos pagos", value: formatCurrency(paidBills.reduce((s, b) => s + b.amount, 0)), sub: `${paidBills.length} cobranças compensadas`, icon: CheckCircle2, tone: { card: "border-sky-200", bg: "from-sky-50/60 to-white", icon: "text-sky-600 bg-sky-50" } },
    { title: "Total receitas", value: formatCurrency(totalRevenue), sub: `${revenues.length} lançamentos de entrada`, icon: Landmark, tone: { card: "border-teal-200", bg: "from-teal-50/60 to-white", icon: "text-teal-600 bg-teal-50" } },
    { title: "Total despesas", value: formatCurrency(totalExpense), sub: `${expenses.length} lançamentos de saída`, icon: Building2, tone: { card: "border-orange-200", bg: "from-orange-50/60 to-white", icon: "text-orange-600 bg-orange-50" } },
    { title: "Ticket médio", value: formatCurrency(avgTicket), sub: "Valor médio por boleto pago", icon: CalendarClock, tone: { card: "border-violet-200", bg: "from-violet-50/60 to-white", icon: "text-violet-600 bg-violet-50" } },
    { title: "Taxa inadimplência", value: `${inadimplenciaRate.toFixed(1)}%`, sub: `De ${totalUnits} unidades do condomínio`, icon: FileBarChart2, tone: { card: "border-pink-200", bg: "from-pink-50/60 to-white", icon: "text-pink-600 bg-pink-50" } },
    { title: "Cobranças canceladas", value: String(cancelledBills), sub: "Boletos cancelados no período", icon: Copy, tone: { card: "border-slate-200", bg: "from-slate-50/60 to-white", icon: "text-slate-500 bg-slate-100" } },
  ];

  const doubled = [...cards, ...cards];

  return (
    <section className="relative overflow-hidden rounded-2xl">
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .finance-marquee { animation: marquee 32s linear infinite; }
        .finance-marquee:hover { animation-play-state: paused; }
      `}</style>
      <div className="flex finance-marquee gap-4 w-max">
        {doubled.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`w-56 shrink-0 rounded-2xl border ${card.tone.card} bg-linear-to-b ${card.tone.bg} p-4 shadow-sm`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.tone.icon}`}>
                  <Icon size={16} />
                </div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">{card.title}</p>
              </div>
              <p className="text-2xl font-black tracking-tight text-slate-900 leading-none">{card.value}</p>
              <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">{card.sub}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function FinanceiroPage() {
  const user = getUser();
  const isResident = user?.role === "MORADOR";
  const [building, setBuilding] = useState<Floor[]>([]);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [bills, setBills] = useState<FinanceBill[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [residentOwnedUnits, setResidentOwnedUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [revenueErrors, setRevenueErrors] = useState<Record<string, string>>({});
  const [, setExpenseErrors] = useState<Record<string, string>>({});
  const [, setBillErrors] = useState<Record<string, string>>({});
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [, setSavingExpense] = useState(false);
  const [, setSavingBill] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [activeModal, setActiveModal] = useState<FinanceModal>(null);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [updatingBillId, setUpdatingBillId] = useState<string | null>(null);
  const [copiedBillCode, setCopiedBillCode] = useState("");
  const [lateFeeConfirm, setLateFeeConfirm] = useState<{ bill: FinanceBill; breakdown: LateFeeBreakdown } | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 8) + "01";
  const tenthOfMonth = today.slice(0, 8) + "10";

  const defaultBatchForm: BatchForm = {
    competenceDate: firstOfMonth,
    issueDate: today,
    dueDate: tenthOfMonth,
    defaultAmount: "",
    instructions: "",
    unitAmounts: {},
  };

  const [revenueForm, setRevenueForm] = useState<RevenueForm>({
    identifier: "", description: "", amount: "", referenceDate: today,
    unit: "", resident: "", category: "Taxa condominial", paymentMethod: "Pix",
    status: "Recebido", documentName: "", notes: "",
  });
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({
    identifier: "", description: "", amount: "", referenceDate: today,
    dueDate: tenthOfMonth, counterparty: "", category: "Energia",
    paymentMethod: "Boleto", status: "Pendente", documentName: "", notes: "",
  });
  const [billForm, setBillForm] = useState<BillForm>({
    unit: "", resident: "", residentEmail: "", amount: "",
    competenceDate: firstOfMonth, issueDate: firstOfMonth, dueDate: tenthOfMonth, instructions: "",
  });
  const [batchForm, setBatchForm] = useState<BatchForm>(defaultBatchForm);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      // Mark overdue first so the list reflects current state
      await markOverdueBills().catch(() => null);

      const [floors, financeEntries, financeBills, forn] = await Promise.all([
        fetchBuilding().catch(() => []),
        listFinanceEntries(),
        listFinanceBills({ limit: 200 }),
        listFornecedores().catch(() => []),
      ]);

      setBuilding(floors);
      setEntries(financeEntries);
      setBills(financeBills);
      setFornecedores(forn);
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

  useEffect(() => {
    let active = true;

    async function loadResidentUnits() {
      if (!isResident || !user?.id) {
        setResidentOwnedUnits([]);
        return;
      }

      const result = await supabase
        .from("condo_apartments")
        .select("tower, number")
        .eq("resident_id", user.id);

      if (!active) return;

      if (result.error) {
        setResidentOwnedUnits([]);
        return;
      }

      setResidentOwnedUnits(
        (result.data ?? []).map((row) => normalizeUnit(`${row.tower} - Ap ${row.number}`)),
      );
    }

    void loadResidentUnits();

    return () => {
      active = false;
    };
  }, [isResident, user?.id]);

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
    const current = new Date();
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
  const residentUnits = useMemo(() => {
    const email = normalizeText(user?.email);
    const name = normalizeText(user?.name);
    const userId = user?.id ?? "";
    const assignments = readLocalMockAssignments();
    const unitsFromAssignments = building
      .flatMap((floor) =>
        floor.apartments
          .filter((apartment) => {
            const assignment = assignments[apartment.id];
            if (!assignment) return false;

            const matchesId = !!userId && assignment.userId === userId;
            const matchesEmail = !!email && normalizeText(assignment.resident?.email) === email;
            const matchesName = !!name && normalizeText(assignment.resident?.name) === name;
            return matchesId || matchesEmail || matchesName;
          })
          .map((apartment) => `${floor.tower} - Ap ${apartment.number}`),
      )
      .map((unit) => parseUnitDescriptor(unit));

    const unitsFromBuilding = building
      .flatMap((floor) =>
        floor.apartments
          .filter((apartment) => {
            const resident = apartment.resident;
            if (!resident) return false;

            const matchesId = !!userId && resident.id === userId;
            const matchesEmail = !!email && normalizeText(resident.email) === email;
            const matchesName = !!name && normalizeText(resident.name) === name;
            return matchesId || matchesEmail || matchesName;
          })
          .map((apartment) => `${floor.tower} - Ap ${apartment.number}`),
      )
      .map((unit) => parseUnitDescriptor(unit));

    return [...residentOwnedUnits.map((unit) => parseUnitDescriptor(unit)), ...unitsFromAssignments, ...unitsFromBuilding].filter(
      (unit, index, list) => unit.full && list.findIndex((item) => item.full === unit.full) === index,
    );
  }, [building, residentOwnedUnits, user?.email, user?.id, user?.name]);
  const residentBills = useMemo(() => {
    const email = normalizeText(user?.email);
    const name = normalizeText(user?.name);

    return [...bills]
      .filter((bill) => {
        const matchesEmail = !!email && normalizeText(bill.resident_email) === email;
        const matchesName = !!name && normalizeText(bill.resident) === name;
        const matchesUnit = billMatchesResidentUnit(bill.unit, residentUnits);
        return matchesEmail || matchesName || matchesUnit;
      })
      .sort((a, b) => b.competence_date.localeCompare(a.competence_date));
  }, [bills, residentUnits, user?.email, user?.name]);
  const nextResidentBill = useMemo(() => {
    const priority: Record<FinanceBillStatus, number> = {
      OVERDUE: 0,
      PENDING: 1,
      PAID: 2,
      CANCELLED: 3,
    };

    return [...residentBills].sort((a, b) => {
      const priorityDiff = priority[a.status] - priority[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return a.due_date.localeCompare(b.due_date);
    })[0] ?? null;
  }, [residentBills]);
  const referenceMonthKey = useMemo(() => {
    if (!expenses.length) return "";

    const currentKey = getMonthKey(new Date().toISOString().slice(0, 10));
    if (expenses.some((item) => getMonthKey(item.reference_date) === currentKey)) return currentKey;

    return [...expenses]
      .map((item) => getMonthKey(item.reference_date))
      .sort((a, b) => b.localeCompare(a))[0] ?? "";
  }, [expenses]);
  const referenceMonthLabel = useMemo(
    () => (referenceMonthKey ? formatMonthLongLabel(referenceMonthKey) : "sem dados recentes"),
    [referenceMonthKey],
  );
  const residentExpenseBreakdown = useMemo(() => {
    const grouped = new Map<ExpenseCategory, number>();

    for (const item of expenses) {
      if (getMonthKey(item.reference_date) !== referenceMonthKey) continue;
      const category = expenseCategories.includes(item.category as ExpenseCategory)
        ? (item.category as ExpenseCategory)
        : "Outros";
      grouped.set(category, (grouped.get(category) ?? 0) + item.amount);
    }

    return Array.from(grouped.entries())
      .map(([category, value]) => ({
        category,
        value,
        ...expenseCategoryMeta[category],
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, referenceMonthKey]);
  const residentExpenseTotal = useMemo(
    () => residentExpenseBreakdown.reduce((sum, item) => sum + item.value, 0),
    [residentExpenseBreakdown],
  );
  const reserveFundAmount = useMemo(() => Math.max(balance, 0), [balance]);
  const accountabilityReports = useMemo<AccountabilityReport[]>(() => {
    const reportMap = new Map<string, AccountabilityReport>();

    for (const item of entries) {
      const key = getMonthKey(item.reference_date);
      const current =
        reportMap.get(key) ??
        {
          key,
          label: formatMonthLongLabel(key),
          receitas: 0,
          despesas: 0,
          saldo: 0,
          highlights: [],
        };

      if (item.type === "REVENUE") current.receitas += item.amount;
      if (item.type === "EXPENSE") {
        current.despesas += item.amount;
        current.highlights.push(item);
      }
      current.saldo = current.receitas - current.despesas;
      reportMap.set(key, current);
    }

    return Array.from(reportMap.values())
      .sort((a, b) => b.key.localeCompare(a.key))
      .slice(0, 6)
      .map((report) => ({
        ...report,
        highlights: [...report.highlights].sort((a, b) => b.amount - a.amount).slice(0, 3),
      }));
  }, [entries]);

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
        identifier: "", description: "", amount: "", referenceDate: new Date().toISOString().slice(0, 10),
        unit: "", resident: "", category: "Taxa condominial", paymentMethod: "Pix",
        status: "Recebido", documentName: "", notes: "",
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
        identifier: "", description: "", amount: "", referenceDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 8) + "10", counterparty: "", category: "Energia",
        paymentMethod: "Boleto", status: "Pendente", documentName: "", notes: "",
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
        unit: "", resident: "", residentEmail: "", amount: "",
        competenceDate: new Date().toISOString().slice(0, 8) + "01",
        issueDate: new Date().toISOString().slice(0, 8) + "01",
        dueDate: new Date().toISOString().slice(0, 8) + "10",
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

  async function handleIssueBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const units = unitOptions
      .filter((opt) => opt.resident)
      .map((opt) => ({
        unit: opt.value,
        resident: opt.resident,
        residentEmail: opt.email || null,
        amount: Number(batchForm.unitAmounts[opt.value] ?? batchForm.defaultAmount),
      }))
      .filter((u) => u.amount > 0);

    if (units.length === 0) {
      setFormError("Nenhuma unidade com morador e valor válido encontrada.");
      return;
    }

    try {
      setSavingBatch(true);
      const result = await createFinanceBillBatch({
        competenceDate: batchForm.competenceDate,
        dueDate: batchForm.dueDate,
        issueDate: batchForm.issueDate,
        instructions: batchForm.instructions || null,
        units,
      });

      setBatchForm(defaultBatchForm);
      setActiveModal(null);
      const skippedMsg = result.skipped.length > 0 ? ` (${result.skipped.length} já existiam)` : "";
      setActionMessage(`${result.created.length} boleto${result.created.length !== 1 ? "s" : ""} emitido${result.created.length !== 1 ? "s" : ""} com sucesso${skippedMsg}.`);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao emitir boletos em lote.");
    } finally {
      setSavingBatch(false);
    }
  }

  async function handleBillStatusChange(bill: FinanceBill, status: FinanceBillStatus) {
    if (!canChangeBillStatus(bill.status, status)) {
      setError("Transição de status inválida para este boleto.");
      return;
    }

    // If paying an overdue bill, show late fee confirmation first
    if (status === "PAID" && bill.status === "OVERDUE") {
      const breakdown = calculateLateFees(bill.amount, bill.due_date);
      if (breakdown.daysLate > 0) {
        setLateFeeConfirm({ bill, breakdown });
        return;
      }
    }

    await applyBillStatusChange(bill.id, status, null, null);
  }

  async function applyBillStatusChange(
    billId: string,
    status: FinanceBillStatus,
    paidAt: string | null,
    finalAmount: number | null,
  ) {
    setUpdatingBillId(billId);
    setActionMessage("");

    try {
      const updated = await updateFinanceBillStatus(billId, status, paidAt, finalAmount);
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

  if (isResident) {
    return (
      <ResidentFinanceView
        loading={loading}
        error={error}
        actionMessage={actionMessage}
        nextResidentBill={nextResidentBill}
        residentBills={residentBills}
        reserveFundAmount={reserveFundAmount}
        referenceMonthLabel={referenceMonthLabel}
        residentExpenseBreakdown={residentExpenseBreakdown}
        residentExpenseTotal={residentExpenseTotal}
        accountabilityReports={accountabilityReports}
        onSetActionMessage={setActionMessage}
      />
    );
  }

  return (
    <AppLayout title="Financeiro">
      <div className="relative space-y-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_30%),linear-gradient(180deg,_rgba(248,250,252,0.9),_rgba(248,250,252,0))]" />

        <section className="py-1">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
                <Landmark size={16} />
                Central financeira
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormError("");
                  setBatchForm(defaultBatchForm);
                  setActiveModal("batch");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-900 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                <Layers size={16} />
                Emitir em lote
              </button>
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
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-500 bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:border-amber-600 hover:bg-amber-600"
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
            <FinanceCarousel
              balance={balance}
              openBillsAmount={openBillsAmount}
              pendingBills={pendingBills}
              overdueBills={overdueBills}
              delinquencyAmount={delinquencyAmount}
              paidBills={paidBills}
              revenues={revenues}
              expenses={expenses}
              totalUnits={building.flatMap((f) => f.apartments).length}
            />

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
                          await navigator.clipboard.writeText(selectedBill.digitable_line ?? "");
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

      <FinanceFormModal
        activeModal={activeModal}
        formError={formError}
        revenueForm={revenueForm}
        setRevenueForm={setRevenueForm}
        revenueErrors={revenueErrors}
        expenseForm={expenseForm}
        setExpenseForm={setExpenseForm}
        billForm={billForm}
        setBillForm={setBillForm}
        batchForm={batchForm}
        setBatchForm={setBatchForm}
        unitOptions={unitOptions}
        fornecedores={fornecedores}
        savingRevenue={savingRevenue}
        savingBatch={savingBatch}
        onClose={() => setActiveModal(null)}
        onCreateRevenue={handleCreateRevenue}
        onCreateExpense={handleCreateExpense}
        onIssueBill={handleIssueBill}
        onIssueBatch={handleIssueBatch}
      />

      {lateFeeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Boleto em atraso</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">Confirmar baixa com encargos</h3>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-slate-600">
                Este boleto venceu há <span className="font-semibold text-rose-600">{lateFeeConfirm.breakdown.daysLate} dia{lateFeeConfirm.breakdown.daysLate !== 1 ? "s" : ""}</span>. Encargos calculados:
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 divide-y divide-slate-100 text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-500">Valor original</span>
                  <span className="font-medium text-slate-800">{formatCurrency(lateFeeConfirm.breakdown.originalAmount)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-500">Multa (2%)</span>
                  <span className="font-medium text-rose-600">+ {formatCurrency(lateFeeConfirm.breakdown.fine)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-500">Juros ({lateFeeConfirm.breakdown.daysLate}d × 0,033%)</span>
                  <span className="font-medium text-rose-600">+ {formatCurrency(lateFeeConfirm.breakdown.interest)}</span>
                </div>
                <div className="flex justify-between px-4 py-3 bg-white rounded-b-2xl">
                  <span className="font-semibold text-slate-800">Total a receber</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(lateFeeConfirm.breakdown.totalAmount)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">O valor registrado será atualizado para o total com encargos.</p>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setLateFeeConfirm(null)}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const { bill, breakdown } = lateFeeConfirm;
                  setLateFeeConfirm(null);
                  void applyBillStatusChange(bill.id, "PAID", null, breakdown.totalAmount);
                }}
                className="flex-1 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Confirmar ({formatCurrency(lateFeeConfirm.breakdown.totalAmount)})
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
