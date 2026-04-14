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
  listFinanceEntries,
  updateFinanceBillStatus,
  updateFinanceEntry,
  type FinanceBill,
  type FinanceEntry,
  type FinanceEntryType,
} from "../features/financeiro/services/financeiro";
import { fetchBuilding, getMockBuilding, type Floor } from "../features/predio/services/predio";

type ModalType = "entry" | "bill" | "recurring" | null;
type UnitChoice = { unit: string; tower: string; resident: string; email: string };

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
      })),
    )
    .sort((a, b) => a.unit.localeCompare(b.unit, "pt-BR", { numeric: true }));
}

export default function FinanceiroPage() {
  const [building, setBuilding] = useState<Floor[]>([]);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
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
  });

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [buildingResult, billsResult, entriesResult, dashboardResult, delinquencyResult, cashFlowResult, reportResult] = await Promise.all([
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
      ]);
      setBuilding(buildingResult);
      setBills(billsResult);
      setEntries(entriesResult);
      setDashboard(dashboardResult);
      setDelinquency(delinquencyResult);
      setCashFlow(cashFlowResult.points);
      setReport(reportResult.byCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar financeiro.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type, filters.status, filters.category, filters.dateFrom, filters.dateTo]);

  const categoryTotals = useMemo(() => report.slice(0, 6), [report]);
  const unitChoices = useMemo(() => buildUnitChoices(building), [building]);
  const towerChoices = useMemo(
    () => Array.from(new Set(unitChoices.map((item) => item.tower))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [unitChoices],
  );
  const filteredUnitChoices = useMemo(
    () => unitChoices.filter((item) => (billForm.tower ? item.tower === billForm.tower : true)),
    [unitChoices, billForm.tower],
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
    if (!billForm.unit || !billForm.resident || Number(billForm.amount) <= 0) {
      setError("Preencha os campos obrigatorios do boleto.");
      return;
    }
    try {
      const createdBill = await createFinanceBill({
        unit: billForm.unit,
        resident: billForm.resident,
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
            <button type="button" onClick={() => setModal("bill")} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-white"><Wallet size={15} /> Emitir boleto</button>
            <button type="button" onClick={() => setModal("recurring")} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"><Repeat size={15} /> Nova recorrencia</button>
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
                        <td className="whitespace-nowrap px-3 py-2 text-right"><button type="button" className="rounded-md border border-slate-300 px-2 py-1 text-xs" onClick={() => { setEntryForm({ id: entry.id, type: entry.type, identifier: entry.identifier, description: entry.description, amount: String(entry.amount), referenceDate: entry.reference_date, dueDate: entry.due_date ?? "", counterparty: entry.counterparty, unit: entry.unit ?? "", resident: entry.resident ?? "", category: entry.category, paymentMethod: entry.payment_method, status: entry.status }); setModal("entry"); }}>Editar</button></td>
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
                <button type="button" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white md:col-span-2" onClick={() => void saveEntry()}>{entryForm.id ? "Salvar alteracoes" : "Cadastrar lancamento"}</button>
              </div>
            )}

            {modal === "bill" && (
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className={inputClass}
                  value={billForm.tower}
                  onChange={(e) => setBillForm((s) => ({ ...s, tower: e.target.value, unit: "", resident: "", residentEmail: "" }))}
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
                <input className={inputClass} value={billForm.resident} onChange={(e) => setBillForm((s) => ({ ...s, resident: e.target.value }))} placeholder="Morador" />
                <input className={inputClass} type="email" value={billForm.residentEmail} onChange={(e) => setBillForm((s) => ({ ...s, residentEmail: e.target.value }))} placeholder="Email do morador" />
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
    </AppLayout>
  );
}
