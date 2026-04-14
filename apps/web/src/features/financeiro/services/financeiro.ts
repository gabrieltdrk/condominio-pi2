const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3333";
const FINANCE_STORAGE_KEY = "omni:finance:entries:v4";
const BILL_STORAGE_KEY = "omni:finance:bills:v1";

export type FinanceEntryType = "REVENUE" | "EXPENSE";
export type FinanceBillStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

export type FinanceEntry = {
  id: number;
  type: FinanceEntryType;
  identifier: string;
  description: string;
  amount: number;
  reference_date: string;
  due_date: string | null;
  counterparty: string;
  unit: string | null;
  resident: string | null;
  category: string;
  payment_method: string;
  status: string;
  document_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
  recurrence_rule_id?: number | null;
  competence_month?: string | null;
};

export type FinanceBill = {
  id: number;
  entry_id: number;
  bill_code: string;
  unit: string;
  resident: string;
  resident_email: string | null;
  competence_date: string;
  issue_date: string;
  due_date: string;
  amount: number;
  instructions: string | null;
  status: FinanceBillStatus;
  digitable_line: string;
  barcode: string;
  pdf_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateFinanceEntryPayload = {
  type: FinanceEntryType;
  identifier: string;
  description: string;
  amount: number;
  referenceDate: string;
  dueDate?: string | null;
  counterparty: string;
  unit?: string | null;
  resident?: string | null;
  category: string;
  paymentMethod: string;
  status: string;
  documentName?: string | null;
  notes?: string | null;
  recurrenceRuleId?: number | null;
  competenceMonth?: string | null;
};

export type UpdateFinanceEntryPayload = Partial<CreateFinanceEntryPayload>;

export type FinanceDashboard = {
  month: string;
  periodStart: string;
  periodEnd: string;
  balance: number;
  monthlyRevenue: number;
  monthlyExpense: number;
  delinquencyAmount: number;
  openAccountsCount: number;
  openAccountsAmount: number;
};

export type FinanceDelinquencyItem = FinanceBill & {
  days_overdue: number;
};

export type FinanceDelinquency = {
  totalAmount: number;
  totalUnits: number;
  units: FinanceDelinquencyItem[];
};

export type FinanceCashFlowPoint = {
  period: string;
  revenues: number;
  expenses: number;
  balance: number;
};

export type FinanceCashFlow = {
  from: string;
  to: string;
  points: FinanceCashFlowPoint[];
};

export type FinanceCategorySummary = {
  category: string;
  type: FinanceEntryType;
  total: number;
};

export type FinanceReportSummary = {
  from: string;
  to: string;
  byCategory: FinanceCategorySummary[];
};

export type CreateFinanceBillPayload = {
  unit: string;
  resident: string;
  residentEmail?: string | null;
  amount: number;
  competenceDate: string;
  dueDate: string;
  issueDate?: string | null;
  instructions?: string | null;
};

const defaultEntries: FinanceEntry[] = [
  {
    id: 1,
    type: "REVENUE",
    identifier: "REC-2026-001",
    description: "Taxa condominial de marco",
    amount: 780,
    reference_date: "2026-03-05",
    due_date: "2026-03-10",
    counterparty: "Gabriel Ferreira",
    unit: "Torre A - Ap 101",
    resident: "Gabriel Ferreira",
    category: "Taxa condominial",
    payment_method: "Pix",
    status: "Recebido",
    document_name: "comprovante-marco-101.pdf",
    notes: "Pagamento dentro do prazo.",
    created_at: "2026-03-05T12:00:00.000Z",
  },
  {
    id: 2,
    type: "REVENUE",
    identifier: "REC-2026-002",
    description: "Taxa condominial de marco",
    amount: 780,
    reference_date: "2026-03-08",
    due_date: "2026-03-10",
    counterparty: "Helena Moraes",
    unit: "Torre B - Ap 101",
    resident: "Helena Moraes",
    category: "Taxa condominial",
    payment_method: "Boleto",
    status: "Recebido",
    document_name: "boleto-pago-101-marco.pdf",
    notes: "",
    created_at: "2026-03-08T12:00:00.000Z",
  },
  {
    id: 3,
    type: "REVENUE",
    identifier: "REC-2026-003",
    description: "Taxa condominial fevereiro",
    amount: 1240,
    reference_date: "2026-02-23",
    due_date: "2026-02-10",
    counterparty: "Carlos Henrique",
    unit: "Torre A - Ap 203",
    resident: "Carlos Henrique",
    category: "Taxa condominial",
    payment_method: "Boleto",
    status: "Atrasado",
    document_name: "boleto-fevereiro-203.pdf",
    notes: "Aguardando retorno do morador.",
    created_at: "2026-02-23T12:00:00.000Z",
  },
  {
    id: 4,
    type: "EXPENSE",
    identifier: "DES-2026-001",
    description: "Folha da equipe de limpeza",
    amount: 3200,
    reference_date: "2026-03-01",
    due_date: "2026-03-10",
    counterparty: "LimpaForte Servicos",
    unit: null,
    resident: null,
    category: "Limpeza",
    payment_method: "Pix",
    status: "Pago",
    document_name: "nf-limpeza-marco.pdf",
    notes: "Prestacao mensal recorrente.",
    created_at: "2026-03-01T12:00:00.000Z",
  },
  {
    id: 5,
    type: "EXPENSE",
    identifier: "DES-2026-002",
    description: "Conta de energia das areas comuns",
    amount: 2480,
    reference_date: "2026-03-04",
    due_date: "2026-03-18",
    counterparty: "Companhia de Energia",
    unit: null,
    resident: null,
    category: "Energia",
    payment_method: "Boleto",
    status: "Pendente",
    document_name: "boleto-energia-marco.pdf",
    notes: "",
    created_at: "2026-03-04T12:00:00.000Z",
  },
];

const defaultBills: FinanceBill[] = [
  {
    id: 1,
    entry_id: 1,
    bill_code: "BOL-202603-0001",
    unit: "Torre A - Ap 101",
    resident: "Gabriel Ferreira",
    resident_email: "gabriel.ferreira@example.com",
    competence_date: "2026-03-01",
    issue_date: "2026-03-01",
    due_date: "2026-03-10",
    amount: 780,
    instructions: "Nao receber apos 30 dias do vencimento.",
    status: "PAID",
    digitable_line: "34191.09008 00001.780007 32026.030107 8 000000078000",
    barcode: "34192026030100000007800000017800073202603",
    pdf_url: "/finance/bills/BOL-202603-0001/mock-pdf",
    paid_at: "2026-03-08T12:00:00.000Z",
    created_at: "2026-03-01T09:00:00.000Z",
    updated_at: "2026-03-08T12:00:00.000Z",
  },
  {
    id: 2,
    entry_id: 2,
    bill_code: "BOL-202603-0002",
    unit: "Torre B - Ap 101",
    resident: "Helena Moraes",
    resident_email: "helena.moraes@example.com",
    competence_date: "2026-03-01",
    issue_date: "2026-03-01",
    due_date: "2026-03-10",
    amount: 780,
    instructions: "Multa de 2% apos o vencimento.",
    status: "PAID",
    digitable_line: "34191.09008 00002.780004 32026.030206 1 000000078000",
    barcode: "34112026030100000007800000027800043202603",
    pdf_url: "/finance/bills/BOL-202603-0002/mock-pdf",
    paid_at: "2026-03-08T14:30:00.000Z",
    created_at: "2026-03-01T09:10:00.000Z",
    updated_at: "2026-03-08T14:30:00.000Z",
  },
  {
    id: 3,
    entry_id: 3,
    bill_code: "BOL-202602-0003",
    unit: "Torre A - Ap 203",
    resident: "Carlos Henrique",
    resident_email: "carlos.henrique@example.com",
    competence_date: "2026-02-01",
    issue_date: "2026-02-01",
    due_date: "2026-02-10",
    amount: 1240,
    instructions: "Contato com a administracao em caso de duvidas.",
    status: "OVERDUE",
    digitable_line: "34191.09008 00003.124004 22026.020302 3 000000124000",
    barcode: "34132026020100000012400000031240042202602",
    pdf_url: "/finance/bills/BOL-202602-0003/mock-pdf",
    paid_at: null,
    created_at: "2026-02-01T09:00:00.000Z",
    updated_at: "2026-02-11T09:00:00.000Z",
  },
];

function ensureNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function pad(value: number | string, length: number) {
  return String(value).padStart(length, "0");
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function buildBarcode(seed: number, amount: number, dueDate: string) {
  const amountDigits = pad(Math.round(amount * 100), 10);
  const dueDigits = digitsOnly(dueDate).slice(-8);
  const sequence = pad(seed, 14);
  const freeField = `${sequence}${dueDigits}${amountDigits}`.slice(0, 25);
  return `3419${dueDigits}${amountDigits}${freeField}`.slice(0, 44);
}

function buildDigitableLine(seed: number, amount: number, dueDate: string) {
  const barcode = buildBarcode(seed, amount, dueDate);
  return `${barcode.slice(0, 5)}.${barcode.slice(5, 10)} ${barcode.slice(10, 15)}.${barcode.slice(15, 21)} ${barcode.slice(21, 26)}.${barcode.slice(26, 32)} ${barcode.slice(32, 33)} ${barcode.slice(33, 47)}`.trim();
}

function buildBillCode(seed: number, competenceDate: string) {
  return `BOL-${competenceDate.slice(0, 7).replace("-", "")}-${pad(seed, 4)}`;
}

function buildEntryIdentifier(seed: number, competenceDate: string) {
  return `REC-${competenceDate.slice(0, 7).replace("-", "")}-${pad(seed, 4)}`;
}

function formatCompetence(competenceDate: string) {
  const [year, month] = competenceDate.split("-").map(Number);
  return `${pad(month, 2)}/${year}`;
}

function mapBillStatusToEntryStatus(status: FinanceBillStatus) {
  switch (status) {
    case "PAID":
      return "Recebido";
    case "OVERDUE":
      return "Atrasado";
    case "CANCELLED":
      return "Cancelado";
    default:
      return "Em aberto";
  }
}

function mapEntry(row: FinanceEntry): FinanceEntry {
  return { ...row, amount: ensureNumber(row.amount) };
}

function mapBill(row: FinanceBill): FinanceBill {
  return { ...row, amount: ensureNumber(row.amount) };
}

function readLocalEntries() {
  if (typeof window === "undefined") return defaultEntries;

  const raw = window.localStorage.getItem(FINANCE_STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(defaultEntries));
    return defaultEntries;
  }

  try {
    return (JSON.parse(raw) as FinanceEntry[]).map(mapEntry);
  } catch {
    return defaultEntries;
  }
}

function writeLocalEntries(entries: FinanceEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(entries));
}

function readLocalBills() {
  if (typeof window === "undefined") return defaultBills;

  const raw = window.localStorage.getItem(BILL_STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(BILL_STORAGE_KEY, JSON.stringify(defaultBills));
    return defaultBills;
  }

  try {
    return (JSON.parse(raw) as FinanceBill[]).map(mapBill);
  } catch {
    return defaultBills;
  }
}

function writeLocalBills(bills: FinanceBill[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BILL_STORAGE_KEY, JSON.stringify(bills));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Erro ao carregar financeiro.");
  }

  return response.json() as Promise<T>;
}

function buildLocalEntryForBill(seed: number, payload: CreateFinanceBillPayload, billCode: string): FinanceEntry {
  const createdAt = new Date().toISOString();
  return {
    id: Date.now(),
    type: "REVENUE",
    identifier: buildEntryIdentifier(seed, payload.competenceDate),
    description: `Taxa condominial ${formatCompetence(payload.competenceDate)} - ${payload.unit}`,
    amount: payload.amount,
    reference_date: payload.issueDate ?? new Date().toISOString().slice(0, 10),
    due_date: payload.dueDate,
    counterparty: payload.resident,
    unit: payload.unit,
    resident: payload.resident,
    category: "Taxa condominial",
    payment_method: "Boleto",
    status: "Em aberto",
    document_name: `${billCode}.pdf`,
    notes: payload.instructions ?? null,
    created_at: createdAt,
  };
}

function buildLocalBill(seed: number, entryId: number, payload: CreateFinanceBillPayload): FinanceBill {
  const createdAt = new Date().toISOString();
  const billCode = buildBillCode(seed, payload.competenceDate);
  return {
    id: Date.now(),
    entry_id: entryId,
    bill_code: billCode,
    unit: payload.unit,
    resident: payload.resident,
    resident_email: payload.residentEmail ?? null,
    competence_date: payload.competenceDate,
    issue_date: payload.issueDate ?? new Date().toISOString().slice(0, 10),
    due_date: payload.dueDate,
    amount: payload.amount,
    instructions: payload.instructions ?? null,
    status: "PENDING",
    digitable_line: buildDigitableLine(seed, payload.amount, payload.dueDate),
    barcode: buildBarcode(seed, payload.amount, payload.dueDate),
    pdf_url: `/finance/bills/${billCode}/mock-pdf`,
    paid_at: null,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

export async function listFinanceEntries(filters?: {
  type?: FinanceEntryType;
  status?: string;
  category?: string;
  unit?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.type) params.set("type", filters.type);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.unit) params.set("unit", filters.unit);
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    const query = params.toString();
    const entries = await request<FinanceEntry[]>(`/finance/entries${query ? `?${query}` : ""}`);
    const normalized = entries.map(mapEntry);
    writeLocalEntries(normalized);
    return normalized;
  } catch {
    return readLocalEntries().filter((entry) => {
      if (filters?.type && entry.type !== filters.type) return false;
      if (filters?.status && !entry.status.toLowerCase().includes(filters.status.toLowerCase())) return false;
      if (filters?.category && !entry.category.toLowerCase().includes(filters.category.toLowerCase())) return false;
      if (filters?.unit && !(entry.unit ?? "").toLowerCase().includes(filters.unit.toLowerCase())) return false;
      if (filters?.dateFrom && entry.reference_date < filters.dateFrom) return false;
      if (filters?.dateTo && entry.reference_date > filters.dateTo) return false;
      return true;
    });
  }
}

export async function createFinanceEntry(payload: CreateFinanceEntryPayload) {
  try {
    const entry = mapEntry(
      await request<FinanceEntry>("/finance/entries", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    const current = readLocalEntries().filter((item) => item.id !== entry.id);
    writeLocalEntries([entry, ...current]);
    return entry;
  } catch {
    const current = readLocalEntries();
    const entry: FinanceEntry = {
      id: Date.now(),
      type: payload.type,
      identifier: payload.identifier,
      description: payload.description,
      amount: payload.amount,
      reference_date: payload.referenceDate,
      due_date: payload.dueDate ?? null,
      counterparty: payload.counterparty,
      unit: payload.unit ?? null,
      resident: payload.resident ?? null,
      category: payload.category,
      payment_method: payload.paymentMethod,
      status: payload.status,
      document_name: payload.documentName ?? null,
      notes: payload.notes ?? null,
      recurrence_rule_id: payload.recurrenceRuleId ?? null,
      competence_month: payload.competenceMonth ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    writeLocalEntries([entry, ...current]);
    return entry;
  }
}

export async function updateFinanceEntry(id: number, payload: UpdateFinanceEntryPayload) {
  try {
    const entry = mapEntry(
      await request<FinanceEntry>(`/finance/entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    );
    const current = readLocalEntries().filter((item) => item.id !== entry.id);
    writeLocalEntries([entry, ...current]);
    return entry;
  } catch {
    const current = readLocalEntries();
    const target = current.find((item) => item.id === id);
    if (!target) throw new Error("Lancamento nao encontrado.");

    const updated: FinanceEntry = {
      ...target,
      type: payload.type ?? target.type,
      identifier: payload.identifier ?? target.identifier,
      description: payload.description ?? target.description,
      amount: payload.amount ?? target.amount,
      reference_date: payload.referenceDate ?? target.reference_date,
      due_date: payload.dueDate ?? target.due_date,
      counterparty: payload.counterparty ?? target.counterparty,
      unit: payload.unit ?? target.unit,
      resident: payload.resident ?? target.resident,
      category: payload.category ?? target.category,
      payment_method: payload.paymentMethod ?? target.payment_method,
      status: payload.status ?? target.status,
      document_name: payload.documentName ?? target.document_name,
      notes: payload.notes ?? target.notes,
      updated_at: new Date().toISOString(),
    };

    writeLocalEntries([updated, ...current.filter((item) => item.id !== id)]);
    return updated;
  }
}

export async function listFinanceBills(filters?: {
  resident?: string;
  residentEmail?: string;
  unit?: string;
  status?: FinanceBillStatus;
  limit?: number;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.resident) params.set("resident", filters.resident);
    if (filters?.residentEmail) params.set("residentEmail", filters.residentEmail);
    if (filters?.unit) params.set("unit", filters.unit);
    if (filters?.status) params.set("status", filters.status);
    if (typeof filters?.limit === "number") params.set("limit", String(filters.limit));

    const query = params.toString();
    const bills = await request<FinanceBill[]>(`/finance/bills${query ? `?${query}` : ""}`);
    const normalized = bills.map(mapBill);
    writeLocalBills(normalized);
    return normalized;
  } catch {
    const bills = readLocalBills();
    return bills.filter((bill) => {
      if (filters?.resident && !bill.resident.toLowerCase().includes(filters.resident.toLowerCase())) return false;
      if (filters?.residentEmail && bill.resident_email !== filters.residentEmail) return false;
      if (filters?.unit && !bill.unit.toLowerCase().includes(filters.unit.toLowerCase())) return false;
      if (filters?.status && bill.status !== filters.status) return false;
      return true;
    });
  }
}

export async function createFinanceBill(payload: CreateFinanceBillPayload) {
  try {
    const bill = mapBill(
      await request<FinanceBill>("/finance/bills", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    const current = readLocalBills().filter((item) => item.id !== bill.id);
    writeLocalBills([bill, ...current]);
    return bill;
  } catch {
    const currentBills = readLocalBills();
    const seed = currentBills.length + 1;
    const billCode = buildBillCode(seed, payload.competenceDate);
    const entry = buildLocalEntryForBill(seed, payload, billCode);
    const bill = buildLocalBill(seed, entry.id, payload);
    writeLocalEntries([entry, ...readLocalEntries()]);
    writeLocalBills([bill, ...currentBills]);
    return bill;
  }
}

export async function updateFinanceBillStatus(id: number, status: FinanceBillStatus, paidAt?: string | null) {
  const allowedStatusTransitions: Record<FinanceBillStatus, FinanceBillStatus[]> = {
    PENDING: ["PAID", "OVERDUE", "CANCELLED"],
    OVERDUE: ["PAID", "CANCELLED"],
    PAID: [],
    CANCELLED: [],
  };

  try {
    const bill = mapBill(
      await request<FinanceBill>(`/finance/bills/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, paidAt: paidAt ?? null }),
      }),
    );

    const currentBills = readLocalBills().filter((item) => item.id !== bill.id);
    writeLocalBills([bill, ...currentBills]);

    const currentEntries = readLocalEntries().map((entry) =>
      entry.id === bill.entry_id ? { ...entry, status: mapBillStatusToEntryStatus(status) } : entry,
    );
    writeLocalEntries(currentEntries);
    return bill;
  } catch {
    const currentBills = readLocalBills();
    const target = currentBills.find((item) => item.id === id);
    if (!target) throw new Error("Boleto nao encontrado.");

    const allowedNext = allowedStatusTransitions[target.status] ?? [];
    if (!allowedNext.includes(status)) {
      throw new Error("Transicao de status invalida.");
    }

    const updated: FinanceBill = {
      ...target,
      status,
      paid_at: status === "PAID" ? paidAt ?? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    writeLocalBills([updated, ...currentBills.filter((item) => item.id !== id)]);

    const currentEntries = readLocalEntries().map((entry) =>
      entry.id === updated.entry_id ? { ...entry, status: mapBillStatusToEntryStatus(status) } : entry,
    );
    writeLocalEntries(currentEntries);

    return updated;
  }
}

function currentMonthRange() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const start = `${month}-01`;
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { month, start, end };
}

export async function getFinanceDashboard(month?: string) {
  try {
    return await request<FinanceDashboard>(`/finance/dashboard${month ? `?month=${month}` : ""}`);
  } catch {
    const entries = readLocalEntries();
    const bills = readLocalBills();
    const { month: currentMonth, start, end } = currentMonthRange();
    const selectedMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : currentMonth;
    const isInMonth = (date: string) => date >= `${selectedMonth}-01` && date <= end;
    const paidRevenue = entries
      .filter((item) => item.type === "REVENUE" && ["Recebido", "Pago"].includes(item.status))
      .reduce((sum, item) => sum + item.amount, 0);
    const paidExpense = entries
      .filter((item) => item.type === "EXPENSE" && item.status === "Pago")
      .reduce((sum, item) => sum + item.amount, 0);
    const monthRevenue = entries.filter((item) => item.type === "REVENUE" && isInMonth(item.reference_date)).reduce((sum, item) => sum + item.amount, 0);
    const monthExpense = entries.filter((item) => item.type === "EXPENSE" && isInMonth(item.reference_date)).reduce((sum, item) => sum + item.amount, 0);
    const delinquencyAmount = bills
      .filter((bill) => bill.status === "OVERDUE" || (bill.status === "PENDING" && bill.due_date < new Date().toISOString().slice(0, 10)))
      .reduce((sum, bill) => sum + bill.amount, 0);
    const openEntries = entries.filter((item) => !["Recebido", "Pago", "Cancelado"].includes(item.status));
    return {
      month: selectedMonth,
      periodStart: start,
      periodEnd: end,
      balance: paidRevenue - paidExpense,
      monthlyRevenue: monthRevenue,
      monthlyExpense: monthExpense,
      delinquencyAmount,
      openAccountsCount: openEntries.length,
      openAccountsAmount: openEntries.reduce((sum, item) => sum + item.amount, 0),
    };
  }
}

export async function getFinanceDelinquency() {
  try {
    return await request<FinanceDelinquency>("/finance/delinquency");
  } catch {
    const today = new Date().toISOString().slice(0, 10);
    const units = readLocalBills()
      .filter((bill) => bill.status === "OVERDUE" || (bill.status === "PENDING" && bill.due_date < today))
      .map((bill) => {
        const days = Math.max(0, Math.ceil((new Date(`${today}T00:00:00`).getTime() - new Date(`${bill.due_date}T00:00:00`).getTime()) / 86400000));
        return { ...bill, days_overdue: days };
      });
    return {
      totalAmount: units.reduce((sum, item) => sum + item.amount, 0),
      totalUnits: units.length,
      units,
    };
  }
}

export async function getFinanceCashFlow(filters?: { from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  try {
    return await request<FinanceCashFlow>(`/finance/cash-flow${params.toString() ? `?${params.toString()}` : ""}`);
  } catch {
    const entries = readLocalEntries();
    const bucket = new Map<string, FinanceCashFlowPoint>();
    for (const entry of entries) {
      const period = entry.reference_date.slice(0, 7);
      const current = bucket.get(period) ?? { period, revenues: 0, expenses: 0, balance: 0 };
      if (entry.type === "REVENUE") current.revenues += entry.amount;
      if (entry.type === "EXPENSE") current.expenses += entry.amount;
      current.balance = current.revenues - current.expenses;
      bucket.set(period, current);
    }
    const points = Array.from(bucket.values()).sort((a, b) => a.period.localeCompare(b.period));
    return { from: filters?.from ?? "", to: filters?.to ?? "", points };
  }
}

export async function getFinanceSummaryReport(filters?: { from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  try {
    return await request<FinanceReportSummary>(`/finance/reports/summary${params.toString() ? `?${params.toString()}` : ""}`);
  } catch {
    const entries = readLocalEntries();
    const byCategory = new Map<string, FinanceCategorySummary>();
    for (const entry of entries) {
      const key = `${entry.type}:${entry.category}`;
      const current = byCategory.get(key) ?? { category: entry.category, type: entry.type, total: 0 };
      current.total += entry.amount;
      byCategory.set(key, current);
    }
    return { from: filters?.from ?? "", to: filters?.to ?? "", byCategory: Array.from(byCategory.values()) };
  }
}

export async function generateRecurringEntries(month?: string) {
  return request<{ month: string; generatedCount: number; entries: FinanceEntry[] }>("/finance/recurring-rules/generate-all", {
    method: "POST",
    body: JSON.stringify({ month }),
  });
}

export async function createRecurringRule(payload: {
  name: string;
  type: FinanceEntryType;
  descriptionTemplate: string;
  amount: number;
  category: string;
  paymentMethod: string;
  counterparty: string;
  unit?: string | null;
  resident?: string | null;
  dayReference: number;
  dayDue?: number | null;
  statusOnCreate: string;
  active?: boolean;
}) {
  return request("/finance/recurring-rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
