const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3333";
const FINANCE_STORAGE_KEY = "omni:finance:entries:v3";

export type FinanceEntryType = "REVENUE" | "EXPENSE";

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
};

const defaultEntries: FinanceEntry[] = [
  {
    id: 1,
    type: "REVENUE",
    identifier: "REC-2026-001",
    description: "Taxa condominial de marco",
    amount: 780,
    reference_date: "2026-03-05",
    due_date: null,
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
    due_date: null,
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
    due_date: null,
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

function readLocalEntries() {
  if (typeof window === "undefined") return defaultEntries;

  const raw = window.localStorage.getItem(FINANCE_STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(defaultEntries));
    return defaultEntries;
  }

  try {
    return JSON.parse(raw) as FinanceEntry[];
  } catch {
    return defaultEntries;
  }
}

function writeLocalEntries(entries: FinanceEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(entries));
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

export async function listFinanceEntries() {
  try {
    const entries = await request<FinanceEntry[]>("/finance/entries");
    writeLocalEntries(entries);
    return entries;
  } catch {
    return readLocalEntries();
  }
}

export async function createFinanceEntry(payload: CreateFinanceEntryPayload) {
  try {
    const entry = await request<FinanceEntry>("/finance/entries", {
      method: "POST",
      body: JSON.stringify(payload),
    });

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
      created_at: new Date().toISOString(),
    };

    writeLocalEntries([entry, ...current]);
    return entry;
  }
}
