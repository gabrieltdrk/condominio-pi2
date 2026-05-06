import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, CheckCircle2, Plus, RefreshCw, Repeat, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AppLayout from "../features/layout/components/app-layout";
import {
  createFinanceBill,
  createFinanceEntry,
  createRecurringRule,
  generateRecurringEntries,
  getFinanceCashFlow,
  getFinanceDashboard,
  getFinanceDelinquency,
  getFinanceSummaryReport,
  listFinanceBills,
  listFinanceChartAccounts,
  listFinanceCostCenters,
  listFinanceEntries,
  updateFinanceBillStatus,
  updateFinanceEntry,
  type FinanceBill,
  type FinanceChartAccount,
  type FinanceCostCenter,
  type FinanceEntry,
  type FinanceEntryType,
} from "../features/financeiro/services/financeiro";
import { getUser } from "../features/auth/services/auth";
import { listUsers } from "../features/dashboard/services/users";
import { fetchBuilding, getMockBuilding, listBuildingApartmentOptions, type Floor } from "../features/predio/services/predio";

type ModalType = "entry" | "bill" | "recurring" | null;
type UnitChoice = { unit: string; tower: string; resident: string; email: string; residentId?: string | null; apartmentId?: string | null };

type EntryForm = {
  id?: number;
  type: FinanceEntryType;
  identifier: string;
  description: string;
  amount: string;
  referenceDate: string;
  dueDate: string;
  counterparty: string;
  unit: string;
  resident: string;
  category: string;
  paymentMethod: string;
  status: string;
  chartAccountId: string;
  costCenterId: string;
};

const cardClass = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm";
const inputClass = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500";
const today = new Date().toISOString().slice(0, 10);

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("pago") || normalized.includes("recebido")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (normalized.includes("atras") || normalized.includes("venc")) return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function buildMonthOptions() {
  const list: string[] = [];
  const base = new Date();
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return list;
}

function billStatusLabel(status: FinanceBill["status"]) {
  if (status === "PAID") return "Pago";
  if (status === "OVERDUE") return "Atrasado";
  if (status === "CANCELLED") return "Cancelado";
  return "Em aberto";
}

function renderBillPdf(bill: FinanceBill) {
  const win = window.open("", "_blank", "width=920,height=760");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${bill.bill_code}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 28px; color: #0f172a; }
        .card { border: 1px solid #cbd5e1; border-radius: 18px; padding: 20px; }
        .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; }
        .code { margin-top: 14px; font-family: monospace; font-size: 18px; letter-spacing: .5px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px; }
        .label { font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
        .value { font-size: 15px; font-weight: 700; }
        .sep { border-top: 1px dashed #cbd5e1; margin: 18px 0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="pill">Boleto condominial</div>
        <h1 style="margin:10px 0 0 0; font-size:22px;">${bill.bill_code}</h1>
        <p style="margin:6px 0 0 0; color:#475569;">Documento interno para cobranca condominial.</p>
        <p class="code">${bill.digitable_line}</p>
        <div class="sep"></div>
        <div class="grid">
          <div><div class="label">Unidade</div><div class="value">${bill.unit}</div></div>
          <div><div class="label">Morador</div><div class="value">${bill.resident}</div></div>
          <div><div class="label">Competencia</div><div class="value">${new Date(`${bill.competence_date}T12:00:00`).toLocaleDateString("pt-BR")}</div></div>
          <div><div class="label">Vencimento</div><div class="value">${new Date(`${bill.due_date}T12:00:00`).toLocaleDateString("pt-BR")}</div></div>
          <div><div class="label">Valor</div><div class="value">${brl(bill.amount)}</div></div>
          <div><div class="label">Status</div><div class="value">${billStatusLabel(bill.status)}</div></div>
        </div>
        <div class="sep"></div>
        <div><div class="label">Codigo de barras</div><div class="value" style="font-family:monospace; font-size:13px;">${bill.barcode}</div></div>
      </div>
      <script>window.print()</script>
    </body>
  </html>`);
  win.document.close();
}

function buildUnitChoices(floors: Floor[]): UnitChoice[] {
  return floors
    .flatMap((floor) =>
      floor.apartments.map((apartment) => ({
        unit: `${floor.tower} - Ap ${apartment.number}`,
        tower: floor.tower,
        resident: apartment.resident?.name ?? "",
        email: apartment.resident?.email ?? "",
        residentId: apartment.resident?.id ?? null,
        apartmentId: apartment.id,
      })),
    )
    .sort((a, b) => a.unit.localeCompare(b.unit, "pt-BR", { numeric: true }));
}

async function loadUnitChoicesFromAssignments(): Promise<UnitChoice[]> {
  const [apartments, users] = await Promise.all([listBuildingApartmentOptions(), listUsers()]);
  const byResidentId = new Map(users.map((user) => [user.id, user]));

  return apartments
    .map((apartment) => {
      const resident = apartment.residentId ? byResidentId.get(apartment.residentId) : undefined;
      return {
        unit: `${apartment.tower} - Ap ${apartment.number}`,
        tower: apartment.tower,
        resident: resident?.name ?? "",
        email: resident?.email ?? "",
        residentId: resident?.id ?? null,
        apartmentId: apartment.id,
      };
    })
    .sort((a, b) => a.unit.localeCompare(b.unit, "pt-BR", { numeric: true }));
}

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  const escaped = text.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const lines = [headers.map(csvEscape).join(";"), ...rows.map((row) => row.map(csvEscape).join(";"))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildFinancePdfHtml(params: {
  entries: FinanceEntry[];
  bills: FinanceBill[];
  dashboard: {
    month: string;
    balance: number;
    monthlyRevenue: number;
    monthlyExpense: number;
    delinquencyAmount: number;
    openAccountsCount: number;
    openAccountsAmount: number;
  };
}) {
  const { entries, bills, dashboard } = params;
  const entryRows = entries
    .slice(0, 120)
    .map(
      (entry) => `
      <tr>
        <td>${new Date(`${entry.reference_date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
        <td>${entry.description}</td>
        <td>${entry.type === "REVENUE" ? "Receita" : "Despesa"}</td>
        <td>${entry.category}</td>
        <td>${entry.status}</td>
        <td style="text-align:right;">${brl(entry.amount)}</td>
      </tr>`,
    )
    .join("");

  const billRows = bills
    .slice(0, 120)
    .map(
      (bill) => `
      <tr>
        <td>${bill.bill_code}</td>
        <td>${bill.unit}</td>
        <td>${bill.resident}</td>
        <td>${new Date(`${bill.due_date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
        <td>${billStatusLabel(bill.status)}</td>
        <td style="text-align:right;">${brl(bill.amount)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Relatorio Financeiro</title>
      <style>
        body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
        h1 { margin: 0 0 4px 0; font-size: 24px; }
        .muted { color: #475569; margin-bottom: 14px; }
        .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 18px; }
        .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px 10px; }
        .label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
        .value { font-size: 14px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; }
        th, td { border: 1px solid #e2e8f0; font-size: 12px; padding: 6px; vertical-align: top; }
        th { background: #f8fafc; text-align: left; }
      </style>
    </head>
    <body>
      <h1>Relatorio Financeiro</h1>
      <div class="muted">Competencia: ${dashboard.month}</div>
      <div class="cards">
        <div class="card"><div class="label">Saldo atual</div><div class="value">${brl(dashboard.balance)}</div></div>
        <div class="card"><div class="label">Receitas do mes</div><div class="value">${brl(dashboard.monthlyRevenue)}</div></div>
        <div class="card"><div class="label">Despesas do mes</div><div class="value">${brl(dashboard.monthlyExpense)}</div></div>
        <div class="card"><div class="label">Inadimplencia</div><div class="value">${brl(dashboard.delinquencyAmount)}</div></div>
        <div class="card"><div class="label">Contas em aberto</div><div class="value">${dashboard.openAccountsCount}</div></div>
        <div class="card"><div class="label">Valor em aberto</div><div class="value">${brl(dashboard.openAccountsAmount)}</div></div>
      </div>

      <h2>Lancamentos</h2>
      <table>
        <thead><tr><th>Data</th><th>Descricao</th><th>Tipo</th><th>Categoria</th><th>Status</th><th>Valor</th></tr></thead>
        <tbody>${entryRows || "<tr><td colspan='6'>Sem dados.</td></tr>"}</tbody>
      </table>

      <h2>Boletos</h2>
      <table>
        <thead><tr><th>Codigo</th><th>Unidade</th><th>Morador</th><th>Vencimento</th><th>Status</th><th>Valor</th></tr></thead>
        <tbody>${billRows || "<tr><td colspan='6'>Sem dados.</td></tr>"}</tbody>
      </table>
      <script>window.print()</script>
    </body>
  </html>`;
}

export default function FinanceiroPage() {
  const user = getUser();
  const isResident = user?.role === "MORADOR";
  const [building, setBuilding] = useState<Floor[]>([]);
  const [unitChoicesOverride, setUnitChoicesOverride] = useState<UnitChoice[]>([]);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [chartAccounts, setChartAccounts] = useState<FinanceChartAccount[]>([]);
  const [costCenters, setCostCenters] = useState<FinanceCostCenter[]>([]);
  const [chartAccountsLoadError, setChartAccountsLoadError] = useState(false);
  const [costCentersLoadError, setCostCentersLoadError] = useState(false);
  const [bills, setBills] = useState<FinanceBill[]>([]);
  const [dashboard, setDashboard] = useState({
    month: today.slice(0, 7),
    periodStart: `${today.slice(0, 7)}-01`,
    periodEnd: today,
    balance: 0,
    monthlyRevenue: 0,
    monthlyExpense: 0,
    delinquencyAmount: 0,
    openAccountsCount: 0,
    openAccountsAmount: 0,
  });
  const [delinquency, setDelinquency] = useState<{ totalAmount: number; totalUnits: number; units: Array<{ id: number; unit: string; resident: string; amount: number; due_date: string; days_overdue: number }> }>({
    totalAmount: 0,
    totalUnits: 0,
    units: [],
  });
  const [cashFlow, setCashFlow] = useState<Array<{ period: string; revenues: number; expenses: number; balance: number }>>([]);
  const [report, setReport] = useState<Array<{ category: string; type: FinanceEntryType; total: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState<ModalType>(null);
  const [monthToGenerate, setMonthToGenerate] = useState(today.slice(0, 7));
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    category: "",
    dateFrom: "",
    dateTo: "",
  });
  const [billForm, setBillForm] = useState({
    tower: "",
    unit: "",
    resident: "",
    residentId: "",
    apartmentId: "",
    residentEmail: "",
    amount: "",
    competenceDate: today.slice(0, 7) + "-01",
    issueDate: today,
    dueDate: today,
    instructions: "",
  });
  const [recurringForm, setRecurringForm] = useState({
    name: "",
    type: "EXPENSE" as FinanceEntryType,
    descriptionTemplate: "",
    amount: "",
    category: "",
    paymentMethod: "Boleto",
    counterparty: "",
    dayReference: "5",
    dayDue: "10",
    statusOnCreate: "Pendente",
  });
  const [entryForm, setEntryForm] = useState<EntryForm>({
    type: "REVENUE",
    identifier: "",
    description: "",
    amount: "",
    referenceDate: today,
    dueDate: "",
    counterparty: "",
    unit: "",
    resident: "",
    category: "",
    paymentMethod: "Pix",
    status: "Em aberto",
    chartAccountId: "",
    costCenterId: "",
  });

  function exportFinanceExcel() {
    downloadCsv(
      `financeiro-lancamentos-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Data", "Descricao", "Tipo", "Categoria", "Status", "Valor", "Unidade", "Morador", "Contraparte"],
      entries.map((entry) => [
        entry.reference_date,
        entry.description,
        entry.type === "REVENUE" ? "Receita" : "Despesa",
        entry.category,
        entry.status,
        entry.amount,
        entry.unit ?? "",
        entry.resident ?? "",
        entry.counterparty,
      ]),
    );

    downloadCsv(
      `financeiro-boletos-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Codigo", "Unidade", "Morador", "Email", "Competencia", "Vencimento", "Status", "Valor"],
      bills.map((bill) => [
        bill.bill_code,
        bill.unit,
        bill.resident,
        bill.resident_email ?? "",
        bill.competence_date,
        bill.due_date,
        billStatusLabel(bill.status),
        bill.amount,
      ]),
    );
    setMessage("Exportacao para Excel (CSV) concluida.");
  }

  function exportFinancePdf() {
    const win = window.open("", "_blank", "width=1100,height=820");
    if (!win) {
      setError("Nao foi possivel abrir a janela para gerar PDF.");
      return;
    }
    win.document.write(buildFinancePdfHtml({ entries, bills, dashboard }));
    win.document.close();
    setMessage("Relatorio PDF pronto para impressao.");
  }

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      if (isResident) {
        if (!user?.id) {
          setBills([]);
          setLoading(false);
          return;
        }
        const apartments = await listBuildingApartmentOptions().catch(() => []);
        const myApartmentIds = apartments.filter((apartment) => apartment.residentId === user.id).map((apartment) => apartment.id);
        const [byIdentity, ...byApartment] = await Promise.all([
          listFinanceBills({ residentId: String(user.id), residentEmail: user.email, limit: 400 }).catch(() => []),
          ...myApartmentIds.map((apartmentId) => listFinanceBills({ apartmentId, limit: 400 }).catch(() => [])),
        ]);
        const merged = [...byIdentity, ...byApartment.flat()].filter(
          (bill, index, array) => array.findIndex((item) => item.id === bill.id) === index,
        );
        setBills(merged);
        setLoading(false);
        return;
      }

      const [buildingResult, billsResult, entriesResult, dashboardResult, delinquencyResult, cashFlowResult, reportResult, chartAccountsResult, costCentersResult] = await Promise.all([
        fetchBuilding().catch(() => getMockBuilding()),
        listFinanceBills({ limit: 80 }),
        listFinanceEntries({
          type: (filters.type || undefined) as FinanceEntryType | undefined,
          status: filters.status || undefined,
          category: filters.category || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        }),
        getFinanceDashboard(),
        getFinanceDelinquency(),
        getFinanceCashFlow(),
        getFinanceSummaryReport(),
        listFinanceChartAccounts().catch(() => {
          setChartAccountsLoadError(true);
          return [];
        }),
        listFinanceCostCenters().catch(() => {
          setCostCentersLoadError(true);
          return [];
        }),
      ]);
      setChartAccountsLoadError(false);
      setCostCentersLoadError(false);
      setBuilding(buildingResult);
      setBills(billsResult);
      setEntries(entriesResult);
      setDashboard(dashboardResult);
      setDelinquency(delinquencyResult);
      setCashFlow(cashFlowResult.points);
      setReport(reportResult.byCategory);
      setChartAccounts(chartAccountsResult);
      setCostCenters(costCentersResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar financeiro.");
    } finally {
      setLoading(false);
    }
  }

  async function openBillModal() {
    try {
      const latestBuilding = await fetchBuilding().catch(() => getMockBuilding());
      setBuilding(latestBuilding);
      const latestChoices = await loadUnitChoicesFromAssignments().catch(() => []);
      if (latestChoices.length > 0) setUnitChoicesOverride(latestChoices);
    } catch {
      // Keeps current list if refresh fails.
    } finally {
      setModal("bill");
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type, filters.status, filters.category, filters.dateFrom, filters.dateTo, isResident, user?.email]);

  const residentBills = useMemo(() => (isResident ? bills : bills.filter((bill) => (user?.id && bill.resident_id === user.id) || (!!user?.email && bill.resident_email?.toLowerCase() === user.email.toLowerCase()))), [bills, isResident, user?.id, user?.email]);
  const residentOpenAmount = useMemo(
    () =>
      residentBills
        .filter((bill) => bill.status === "PENDING" || bill.status === "OVERDUE")
        .reduce((sum, bill) => sum + bill.amount, 0),
    [residentBills],
  );
  const residentOverdueAmount = useMemo(
    () => residentBills.filter((bill) => bill.status === "OVERDUE").reduce((sum, bill) => sum + bill.amount, 0),
    [residentBills],
  );
  const residentPaidAmount = useMemo(
    () => residentBills.filter((bill) => bill.status === "PAID").reduce((sum, bill) => sum + bill.amount, 0),
    [residentBills],
  );

  const categoryTotals = useMemo(() => report.slice(0, 6), [report]);
  const unitChoices = useMemo(() => {
    if (unitChoicesOverride.length > 0) return unitChoicesOverride;
    return buildUnitChoices(building);
  }, [building, unitChoicesOverride]);
  const towerChoices = useMemo(
    () => Array.from(new Set(unitChoices.map((item) => item.tower))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [unitChoices],
  );
  const filteredUnitChoices = useMemo(
    () => unitChoices.filter((item) => (billForm.tower ? item.tower === billForm.tower : true)),
    [unitChoices, billForm.tower],
  );
  const selectedUnitChoice = useMemo(
    () => filteredUnitChoices.find((item) => item.unit === billForm.unit),
    [filteredUnitChoices, billForm.unit],
  );

  async function saveEntry() {
    if (!entryForm.identifier || !entryForm.description || Number(entryForm.amount) <= 0 || !entryForm.referenceDate || !entryForm.category) {
      setError("Preencha os campos obrigatorios de lancamento.");
      return;
    }
    const payload = {
      type: entryForm.type,
      identifier: entryForm.identifier.trim(),
      description: entryForm.description.trim(),
      amount: Number(entryForm.amount),
      referenceDate: entryForm.referenceDate,
      dueDate: entryForm.dueDate || null,
      counterparty: entryForm.counterparty.trim() || "Nao informado",
      unit: entryForm.unit || null,
      resident: entryForm.resident || null,
      category: entryForm.category.trim(),
      paymentMethod: entryForm.paymentMethod,
      status: entryForm.status,
      chartAccountId: entryForm.chartAccountId ? Number(entryForm.chartAccountId) : null,
      costCenterId: entryForm.costCenterId ? Number(entryForm.costCenterId) : null,
    };
    try {
      if (entryForm.id) await updateFinanceEntry(entryForm.id, payload);
      else await createFinanceEntry(payload);
      setMessage(entryForm.id ? "Lancamento atualizado." : "Lancamento criado.");
      setModal(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar lancamento.");
    }
  }

  async function saveBill() {
    if (!billForm.unit || Number(billForm.amount) <= 0) {
      setError("Preencha os campos obrigatorios do boleto.");
      return;
    }
    if (!billForm.resident || !billForm.residentEmail || !billForm.residentId) {
      setError("A unidade selecionada precisa ter morador vinculado e e-mail cadastrado.");
      return;
    }
    try {
      const createdBill = await createFinanceBill({
        unit: billForm.unit,
        resident: billForm.resident,
        residentId: billForm.residentId || null,
        apartmentId: billForm.apartmentId || null,
        residentEmail: billForm.residentEmail || null,
        amount: Number(billForm.amount),
        competenceDate: billForm.competenceDate,
        issueDate: billForm.issueDate,
        dueDate: billForm.dueDate,
        instructions: billForm.instructions || null,
      });
      setMessage("Boleto emitido com sucesso.");
      setModal(null);
      await loadData();
      renderBillPdf(createdBill);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao emitir boleto.");
    }
  }

  async function saveRecurringRule() {
    if (!recurringForm.name || !recurringForm.descriptionTemplate || Number(recurringForm.amount) <= 0 || !recurringForm.category) {
      setError("Preencha os campos obrigatorios da recorrencia.");
      return;
    }
    try {
      await createRecurringRule({
        name: recurringForm.name,
        type: recurringForm.type,
        descriptionTemplate: recurringForm.descriptionTemplate,
        amount: Number(recurringForm.amount),
        category: recurringForm.category,
        paymentMethod: recurringForm.paymentMethod,
        counterparty: recurringForm.counterparty || "Nao informado",
        dayReference: Number(recurringForm.dayReference),
        dayDue: recurringForm.dayDue ? Number(recurringForm.dayDue) : null,
        statusOnCreate: recurringForm.statusOnCreate,
      });
      setMessage("Regra recorrente criada.");
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar recorrencia.");
    }
  }

  return (
    <AppLayout title="Financeiro">
      {isResident ? (
        <div className="space-y-5">
          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

          <section className="grid gap-4 md:grid-cols-3">
            <div className={cardClass}><p className="text-xs text-slate-500">Em aberto</p><p className="mt-2 text-xl font-bold text-amber-700">{brl(residentOpenAmount)}</p></div>
            <div className={cardClass}><p className="text-xs text-slate-500">Em atraso</p><p className="mt-2 text-xl font-bold text-rose-700">{brl(residentOverdueAmount)}</p></div>
            <div className={cardClass}><p className="text-xs text-slate-500">Ja pago</p><p className="mt-2 text-xl font-bold text-emerald-700">{brl(residentPaidAmount)}</p></div>
          </section>

          <section className={cardClass}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Meus boletos</h3>
              <button type="button" onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"><RefreshCw size={15} /> Atualizar</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2 font-semibold">Codigo</th>
                    <th className="px-3 py-2 font-semibold">Competencia</th>
                    <th className="px-3 py-2 font-semibold">Vencimento</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 text-right font-semibold">Valor</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {residentBills.map((bill) => (
                    <tr key={bill.id} className="border-t border-slate-100">
                      <td className="whitespace-nowrap px-3 py-2">{bill.bill_code}</td>
                      <td className="whitespace-nowrap px-3 py-2">{new Date(`${bill.competence_date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                      <td className="whitespace-nowrap px-3 py-2">{new Date(`${bill.due_date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                      <td className="px-3 py-2"><span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${statusClass(billStatusLabel(bill.status))}`}>{billStatusLabel(bill.status)}</span></td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{brl(bill.amount)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                            onClick={() => void navigator.clipboard.writeText(bill.digitable_line).then(() => setMessage("Linha digitavel copiada."))}
                          >
                            Copiar linha
                          </button>
                          <button type="button" className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700" onClick={() => renderBillPdf(bill)}>PDF</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {residentBills.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                        Nenhum boleto encontrado no seu e-mail.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
      <>
      <div className="space-y-5">
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

        <section className="grid gap-4 md:grid-cols-5">
          <div className={cardClass}><p className="text-xs text-slate-500">Saldo atual</p><p className="mt-2 text-xl font-bold text-slate-900">{brl(dashboard.balance)}</p></div>
          <div className={cardClass}><p className="text-xs text-slate-500">Receitas do mes</p><p className="mt-2 text-xl font-bold text-emerald-700">{brl(dashboard.monthlyRevenue)}</p></div>
          <div className={cardClass}><p className="text-xs text-slate-500">Despesas do mes</p><p className="mt-2 text-xl font-bold text-amber-700">{brl(dashboard.monthlyExpense)}</p></div>
          <div className={cardClass}><p className="text-xs text-slate-500">Inadimplencia</p><p className="mt-2 text-xl font-bold text-rose-700">{brl(dashboard.delinquencyAmount)}</p></div>
          <div className={cardClass}><p className="text-xs text-slate-500">Contas em aberto</p><p className="mt-2 text-xl font-bold text-slate-900">{dashboard.openAccountsCount} ({brl(dashboard.openAccountsAmount)})</p></div>
        </section>

        <section className={`${cardClass} space-y-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setModal("entry")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><Plus size={15} /> Novo lancamento</button>
            <button type="button" onClick={() => void openBillModal()} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-white"><Wallet size={15} /> Emitir boleto</button>
            <button type="button" onClick={() => setModal("recurring")} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"><Repeat size={15} /> Nova recorrencia</button>
            <button type="button" onClick={exportFinanceExcel} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">Exportar Excel</button>
            <button type="button" onClick={exportFinancePdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">Exportar PDF</button>
            <button type="button" onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"><RefreshCw size={15} /> Atualizar</button>
          </div>
          <div className="grid gap-2 md:grid-cols-5">
            <select className={inputClass} value={filters.type} onChange={(e) => setFilters((s) => ({ ...s, type: e.target.value }))}><option value="">Tipo</option><option value="REVENUE">Receita</option><option value="EXPENSE">Despesa</option></select>
            <select className={inputClass} value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
              <option value="">Status</option>
              <option value="Recebido">Recebido</option>
              <option value="Pago">Pago</option>
              <option value="Em aberto">Em aberto</option>
              <option value="Pendente">Pendente</option>
              <option value="Atrasado">Atrasado</option>
              <option value="Vencido">Vencido</option>
              <option value="Cancelado">Cancelado</option>
            </select>
            <input className={inputClass} value={filters.category} onChange={(e) => setFilters((s) => ({ ...s, category: e.target.value }))} placeholder="Categoria" />
            <input className={inputClass} type="date" value={filters.dateFrom} onChange={(e) => setFilters((s) => ({ ...s, dateFrom: e.target.value }))} />
            <input className={inputClass} type="date" value={filters.dateTo} onChange={(e) => setFilters((s) => ({ ...s, dateTo: e.target.value }))} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className={cardClass}>
            <h3 className="mb-3 text-base font-semibold text-slate-900">Receitas e despesas</h3>
            {loading ? <p className="text-sm text-slate-500">Carregando...</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-[920px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-2 font-semibold">Data</th>
                      <th className="px-3 py-2 font-semibold">Descricao</th>
                      <th className="px-3 py-2 font-semibold">Tipo</th>
                      <th className="px-3 py-2 font-semibold">Categoria</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 text-right font-semibold">Valor</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className={`${entry.due_date && entry.due_date < today && !["Pago", "Recebido"].includes(entry.status) ? "bg-rose-50/40" : ""} border-t border-slate-100`}>
                        <td className="whitespace-nowrap px-3 py-2">{new Date(`${entry.reference_date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                        <td className="max-w-[360px] px-3 py-2 leading-5 text-slate-800">{entry.description}</td>
                        <td className="whitespace-nowrap px-3 py-2">{entry.type === "REVENUE" ? "Receita" : "Despesa"}</td>
                        <td className="px-3 py-2">{entry.category}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${statusClass(entry.status)}`}>{entry.status}</span>
                        </td>
                        <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${entry.type === "REVENUE" ? "text-emerald-700" : "text-amber-700"}`}>{brl(entry.amount)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right"><button type="button" className="rounded-md border border-slate-300 px-2 py-1 text-xs" onClick={() => { setEntryForm({ id: entry.id, type: entry.type, identifier: entry.identifier, description: entry.description, amount: String(entry.amount), referenceDate: entry.reference_date, dueDate: entry.due_date ?? "", counterparty: entry.counterparty, unit: entry.unit ?? "", resident: entry.resident ?? "", category: entry.category, paymentMethod: entry.payment_method, status: entry.status, chartAccountId: entry.chart_account_id ? String(entry.chart_account_id) : "", costCenterId: entry.cost_center_id ? String(entry.cost_center_id) : "" }); setModal("entry"); }}>Editar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={`${cardClass} space-y-3`}>
            <div className="flex items-center justify-between"><h3 className="text-base font-semibold text-slate-900">Inadimplencia</h3><span className="text-xs text-rose-700">{brl(delinquency.totalAmount)}</span></div>
            {delinquency.units.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{item.unit}</p>
                <p className="text-xs text-slate-600">{item.resident} - {item.days_overdue} dias</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-rose-700">{brl(item.amount)}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700" onClick={() => { const bill = bills.find((b) => b.id === item.id); if (bill) renderBillPdf(bill); }}>PDF</button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs text-emerald-700" onClick={() => void updateFinanceBillStatus(item.id, "PAID").then(loadData)}><CheckCircle2 size={13} /> Marcar pago</button>
                  </div>
                </div>
              </div>
            ))}
            {delinquency.units.length === 0 && <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">Sem debitos em atraso.</p>}
          </div>
        </section>

        <section className={cardClass}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Boletos emitidos</h3>
            <span className="text-xs text-slate-500">{bills.length} boletos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2 font-semibold">Codigo</th>
                  <th className="px-3 py-2 font-semibold">Unidade</th>
                  <th className="px-3 py-2 font-semibold">Morador</th>
                  <th className="px-3 py-2 font-semibold">Vencimento</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">Valor</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {bills.slice(0, 12).map((bill) => (
                  <tr key={bill.id} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-3 py-2">{bill.bill_code}</td>
                    <td className="px-3 py-2">{bill.unit}</td>
                    <td className="px-3 py-2">{bill.resident}</td>
                    <td className="whitespace-nowrap px-3 py-2">{new Date(`${bill.due_date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-2"><span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${statusClass(billStatusLabel(bill.status))}`}>{billStatusLabel(bill.status)}</span></td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{brl(bill.amount)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button type="button" className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700" onClick={() => renderBillPdf(bill)}>PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className={cardClass}>
            <div className="mb-3 flex items-center gap-2 text-slate-900"><CalendarRange size={16} /><h3 className="text-base font-semibold">Fluxo de caixa</h3></div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => brl(Number(value))} />
                  <Area type="monotone" dataKey="revenues" stroke="#16a34a" fill="#86efac" fillOpacity={0.4} name="Entradas" />
                  <Area type="monotone" dataKey="expenses" stroke="#f59e0b" fill="#fde68a" fillOpacity={0.45} name="Saidas" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cardClass}>
            <div className="mb-3 flex items-center gap-2 text-slate-900"><AlertTriangle size={16} /><h3 className="text-base font-semibold">Relatorio por categoria</h3></div>
            <div className="space-y-2">
              {categoryTotals.map((item) => (
                <div key={`${item.type}-${item.category}`} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <span>{item.category} ({item.type === "REVENUE" ? "Receita" : "Despesa"})</span>
                  <span className="font-semibold">{brl(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <p className="text-xs font-semibold text-indigo-700">Recorrencia mensal</p>
              <div className="mt-2 flex items-center gap-2">
                <select className={inputClass} value={monthToGenerate} onChange={(e) => setMonthToGenerate(e.target.value)}>{buildMonthOptions().map((month) => <option key={month} value={month}>{month}</option>)}</select>
                <button type="button" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => void generateRecurringEntries(monthToGenerate).then(() => { setMessage("Recorrencias geradas."); return loadData(); })}><Repeat size={14} /> Gerar</button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{modal === "entry" ? "Lancamento financeiro" : modal === "bill" ? "Emitir boleto" : "Nova regra recorrente"}</h3>
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-1 text-sm" onClick={() => setModal(null)}>Fechar</button>
            </div>

            {modal === "entry" && (
              <div className="grid gap-3 md:grid-cols-2">
                <select className={inputClass} value={entryForm.type} onChange={(e) => setEntryForm((s) => ({ ...s, type: e.target.value as FinanceEntryType }))}><option value="REVENUE">Receita</option><option value="EXPENSE">Despesa</option></select>
                <input className={inputClass} value={entryForm.identifier} onChange={(e) => setEntryForm((s) => ({ ...s, identifier: e.target.value }))} placeholder="Codigo" />
                <input className={inputClass} value={entryForm.description} onChange={(e) => setEntryForm((s) => ({ ...s, description: e.target.value }))} placeholder="Descricao" />
                <input className={inputClass} type="number" min={0} step="0.01" value={entryForm.amount} onChange={(e) => setEntryForm((s) => ({ ...s, amount: e.target.value }))} placeholder="Valor" />
                <input className={inputClass} type="date" value={entryForm.referenceDate} onChange={(e) => setEntryForm((s) => ({ ...s, referenceDate: e.target.value }))} />
                <input className={inputClass} type="date" value={entryForm.dueDate} onChange={(e) => setEntryForm((s) => ({ ...s, dueDate: e.target.value }))} />
                <input className={inputClass} value={entryForm.category} onChange={(e) => setEntryForm((s) => ({ ...s, category: e.target.value }))} placeholder="Categoria" />
                <input className={inputClass} value={entryForm.counterparty} onChange={(e) => setEntryForm((s) => ({ ...s, counterparty: e.target.value }))} placeholder="Contraparte" />
                <input className={inputClass} value={entryForm.unit} onChange={(e) => setEntryForm((s) => ({ ...s, unit: e.target.value }))} placeholder="Unidade (opcional)" />
                <input className={inputClass} value={entryForm.status} onChange={(e) => setEntryForm((s) => ({ ...s, status: e.target.value }))} placeholder="Status" />
                <select
                  className={inputClass}
                  value={entryForm.chartAccountId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selected = chartAccounts.find((account) => String(account.id) === selectedId);
                    setEntryForm((s) => ({
                      ...s,
                      chartAccountId: selectedId,
                      category: selected?.default_category?.trim() ? selected.default_category : s.category,
                    }));
                  }}
                >
                  <option value="">Plano de contas (opcional)</option>
                  {chartAccounts.filter((account) => account.type === entryForm.type).length === 0 && (
                    <option value="" disabled>
                      Nenhum plano cadastrado para {entryForm.type === "REVENUE" ? "receita" : "despesa"}
                    </option>
                  )}
                  {chartAccounts
                    .filter((account) => account.type === entryForm.type)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                </select>
                <select className={inputClass} value={entryForm.costCenterId} onChange={(e) => setEntryForm((s) => ({ ...s, costCenterId: e.target.value }))}>
                  <option value="">Centro de custo (opcional)</option>
                  {costCenters.length === 0 && (
                    <option value="" disabled>
                      Nenhum centro de custo cadastrado
                    </option>
                  )}
                  {costCenters.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.code} - {center.name}
                    </option>
                  ))}
                </select>
                {(chartAccountsLoadError || costCentersLoadError) && (
                  <p className="text-xs text-amber-700 md:col-span-2">
                    Nao foi possivel carregar plano de contas/centro de custo no backend. O lancamento pode ser salvo sem esses campos.
                  </p>
                )}
                <button type="button" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white md:col-span-2" onClick={() => void saveEntry()}>{entryForm.id ? "Salvar alteracoes" : "Cadastrar lancamento"}</button>
              </div>
            )}

            {modal === "bill" && (
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className={inputClass}
                  value={billForm.tower}
                  onChange={(e) => setBillForm((s) => ({ ...s, tower: e.target.value, unit: "", resident: "", residentId: "", apartmentId: "", residentEmail: "" }))}
                >
                  <option value="">Selecione a torre</option>
                  {towerChoices.map((tower) => (
                    <option key={tower} value={tower}>
                      {tower}
                    </option>
                  ))}
                </select>
                <select
                  className={inputClass}
                  value={billForm.unit}
                  onChange={(e) => {
                    const selected = filteredUnitChoices.find((item) => item.unit === e.target.value);
                    setBillForm((s) => ({
                      ...s,
                      unit: e.target.value,
                      resident: selected?.resident ?? s.resident,
                      residentId: selected?.residentId ?? s.residentId,
                      apartmentId: selected?.apartmentId ?? s.apartmentId,
                      residentEmail: selected?.email ?? s.residentEmail,
                    }));
                  }}
                >
                  <option value="">Selecione a unidade</option>
                  {filteredUnitChoices.map((item) => (
                    <option key={item.unit} value={item.unit}>
                      {item.unit}
                    </option>
                  ))}
                </select>
                <input
                  className={`${inputClass} bg-slate-50`}
                  value={billForm.resident}
                  readOnly
                  placeholder="Morador (preenchido automaticamente)"
                />
                <input
                  className={`${inputClass} bg-slate-50`}
                  type="email"
                  value={billForm.residentEmail}
                  readOnly
                  placeholder="Email (preenchido automaticamente)"
                />
                {billForm.unit && (!selectedUnitChoice?.resident || !selectedUnitChoice?.email || !selectedUnitChoice?.residentId) && (
                  <p className="text-xs text-amber-700 md:col-span-2">
                    Esta unidade nao tem morador/e-mail completo no cadastro do predio. Atualize em Predio/Usuarios para emitir boleto.
                  </p>
                )}
                <input className={inputClass} type="number" min={0} step="0.01" value={billForm.amount} onChange={(e) => setBillForm((s) => ({ ...s, amount: e.target.value }))} placeholder="Valor" />
                <input className={inputClass} type="date" value={billForm.competenceDate} onChange={(e) => setBillForm((s) => ({ ...s, competenceDate: e.target.value }))} />
                <input className={inputClass} type="date" value={billForm.issueDate} onChange={(e) => setBillForm((s) => ({ ...s, issueDate: e.target.value }))} />
                <input className={inputClass} type="date" value={billForm.dueDate} onChange={(e) => setBillForm((s) => ({ ...s, dueDate: e.target.value }))} />
                <button type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:col-span-2" onClick={() => void saveBill()}>Emitir boleto</button>
              </div>
            )}

            {modal === "recurring" && (
              <div className="grid gap-3 md:grid-cols-2">
                <input className={inputClass} value={recurringForm.name} onChange={(e) => setRecurringForm((s) => ({ ...s, name: e.target.value }))} placeholder="Nome da regra" />
                <select className={inputClass} value={recurringForm.type} onChange={(e) => setRecurringForm((s) => ({ ...s, type: e.target.value as FinanceEntryType }))}><option value="REVENUE">Receita</option><option value="EXPENSE">Despesa</option></select>
                <input className={inputClass} value={recurringForm.descriptionTemplate} onChange={(e) => setRecurringForm((s) => ({ ...s, descriptionTemplate: e.target.value }))} placeholder="Descricao base" />
                <input className={inputClass} type="number" min={0} step="0.01" value={recurringForm.amount} onChange={(e) => setRecurringForm((s) => ({ ...s, amount: e.target.value }))} placeholder="Valor mensal" />
                <input className={inputClass} value={recurringForm.category} onChange={(e) => setRecurringForm((s) => ({ ...s, category: e.target.value }))} placeholder="Categoria" />
                <input className={inputClass} value={recurringForm.counterparty} onChange={(e) => setRecurringForm((s) => ({ ...s, counterparty: e.target.value }))} placeholder="Contraparte" />
                <input className={inputClass} value={recurringForm.dayReference} onChange={(e) => setRecurringForm((s) => ({ ...s, dayReference: e.target.value }))} placeholder="Dia referencia" />
                <input className={inputClass} value={recurringForm.dayDue} onChange={(e) => setRecurringForm((s) => ({ ...s, dayDue: e.target.value }))} placeholder="Dia vencimento" />
                <button type="button" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white md:col-span-2" onClick={() => void saveRecurringRule()}>Salvar regra recorrente</button>
              </div>
            )}
          </div>
        </div>
      )}
      </>
      )}
    </AppLayout>
  );
}
