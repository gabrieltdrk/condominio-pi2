import { supabase } from "../../../lib/supabase";
import { getUser } from "../../auth/services/auth";

export type FinanceEntryType = "REVENUE" | "EXPENSE";
export type FinanceBillStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

export type FinanceEntry = {
  id: string;
  condominio_id: string;
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

export type FinanceBill = {
  id: string;
  condominio_id: string;
  entry_id: string | null;
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
  digitable_line: string | null;
  barcode: string | null;
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

export type BatchBillUnit = {
  unit: string;
  resident: string;
  residentEmail?: string | null;
  amount: number;
};

export type CreateFinanceBillBatchPayload = {
  competenceDate: string;
  dueDate: string;
  issueDate?: string | null;
  instructions?: string | null;
  units: BatchBillUnit[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCondominioUUID(): string {
  const uuid = getUser()?.condominioUUID;
  if (!uuid) throw new Error("Condomínio não identificado. Faça login novamente.");
  return uuid;
}

function ensureNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function mapEntry(row: Record<string, unknown>): FinanceEntry {
  return { ...(row as FinanceEntry), amount: ensureNumber(row.amount) };
}

function mapBill(row: Record<string, unknown>): FinanceBill {
  return { ...(row as FinanceBill), amount: ensureNumber(row.amount) };
}

function pad(value: number | string, length: number) {
  return String(value).padStart(length, "0");
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

function mapBillStatusToEntryStatus(status: FinanceBillStatus): string {
  switch (status) {
    case "PAID": return "Recebido";
    case "OVERDUE": return "Atrasado";
    case "CANCELLED": return "Cancelado";
    default: return "Em aberto";
  }
}

// ─── Finance Entries ─────────────────────────────────────────────────────────

export async function listFinanceEntries(): Promise<FinanceEntry[]> {
  const condominioId = getCondominioUUID();
  const { data, error } = await supabase
    .from("finance_entries")
    .select("*")
    .eq("condominio_id", condominioId)
    .order("reference_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEntry);
}

export async function createFinanceEntry(payload: CreateFinanceEntryPayload): Promise<FinanceEntry> {
  const condominioId = getCondominioUUID();

  const { data, error } = await supabase
    .from("finance_entries")
    .insert({
      condominio_id: condominioId,
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
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapEntry(data as Record<string, unknown>);
}

// ─── Finance Bills ────────────────────────────────────────────────────────────

export async function listFinanceBills(filters?: {
  resident?: string;
  residentEmail?: string;
  unit?: string;
  status?: FinanceBillStatus;
  limit?: number;
}): Promise<FinanceBill[]> {
  const condominioId = getCondominioUUID();

  let query = supabase
    .from("finance_bills")
    .select("*")
    .eq("condominio_id", condominioId)
    .order("due_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.residentEmail) query = query.eq("resident_email", filters.residentEmail);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.unit) query = query.ilike("unit", `%${filters.unit}%`);
  if (filters?.resident) query = query.ilike("resident", `%${filters.resident}%`);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBill);
}

export async function createFinanceBill(payload: CreateFinanceBillPayload): Promise<FinanceBill> {
  const condominioId = getCondominioUUID();

  // Count existing bills for this competence to generate sequential code
  const { count } = await supabase
    .from("finance_bills")
    .select("*", { count: "exact", head: true })
    .eq("condominio_id", condominioId)
    .like("bill_code", `BOL-${payload.competenceDate.slice(0, 7).replace("-", "")}%`);

  const seed = (count ?? 0) + 1;
  const billCode = buildBillCode(seed, payload.competenceDate);
  const entryIdentifier = buildEntryIdentifier(seed, payload.competenceDate);

  // Create the corresponding revenue entry
  const { data: entryData, error: entryError } = await supabase
    .from("finance_entries")
    .insert({
      condominio_id: condominioId,
      type: "REVENUE",
      identifier: entryIdentifier,
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
    })
    .select()
    .single();

  if (entryError) throw new Error(entryError.message);

  const { data: billData, error: billError } = await supabase
    .from("finance_bills")
    .insert({
      condominio_id: condominioId,
      entry_id: (entryData as { id: string }).id,
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
      digitable_line: null,
      barcode: null,
      pdf_url: null,
      paid_at: null,
    })
    .select()
    .single();

  if (billError) throw new Error(billError.message);
  return mapBill(billData as Record<string, unknown>);
}

// ─── Late fees ───────────────────────────────────────────────────────────────

export type LateFeeBreakdown = {
  originalAmount: number;
  daysLate: number;
  fine: number;       // 2% flat
  interest: number;   // 0.033% per day (≈ 1% per month)
  totalAmount: number;
};

export function calculateLateFees(originalAmount: number, dueDate: string, paymentDate?: string): LateFeeBreakdown {
  const due = new Date(dueDate + "T00:00:00");
  const paid = paymentDate ? new Date(paymentDate + "T00:00:00") : new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLate = Math.max(0, Math.floor((paid.getTime() - due.getTime()) / msPerDay));

  if (daysLate === 0) {
    return { originalAmount, daysLate: 0, fine: 0, interest: 0, totalAmount: originalAmount };
  }

  const fine = originalAmount * 0.02;
  const interest = originalAmount * 0.00033 * daysLate;
  const totalAmount = originalAmount + fine + interest;

  return { originalAmount, daysLate, fine, interest, totalAmount };
}

export type BatchBillResult = {
  created: FinanceBill[];
  skipped: { unit: string; reason: string }[];
};

export async function createFinanceBillBatch(payload: CreateFinanceBillBatchPayload): Promise<BatchBillResult> {
  const condominioId = getCondominioUUID();
  const issueDate = payload.issueDate ?? new Date().toISOString().slice(0, 10);
  const competencePrefix = payload.competenceDate.slice(0, 7).replace("-", "");

  // Count existing bills for this competence to start the sequential seed
  const { count: existingCount } = await supabase
    .from("finance_bills")
    .select("*", { count: "exact", head: true })
    .eq("condominio_id", condominioId)
    .like("bill_code", `BOL-${competencePrefix}%`);

  // Check which units already have a bill for this competence (to skip duplicates)
  const { data: existingBills } = await supabase
    .from("finance_bills")
    .select("unit")
    .eq("condominio_id", condominioId)
    .like("bill_code", `BOL-${competencePrefix}%`);

  const alreadyBilled = new Set((existingBills ?? []).map((b: { unit: string }) => b.unit));

  const created: FinanceBill[] = [];
  const skipped: { unit: string; reason: string }[] = [];
  let seed = (existingCount ?? 0) + 1;

  for (const unitPayload of payload.units) {
    if (alreadyBilled.has(unitPayload.unit)) {
      skipped.push({ unit: unitPayload.unit, reason: "Já possui boleto nesta competência" });
      continue;
    }

    const billCode = buildBillCode(seed, payload.competenceDate);
    const entryIdentifier = buildEntryIdentifier(seed, payload.competenceDate);

    const { data: entryData, error: entryError } = await supabase
      .from("finance_entries")
      .insert({
        condominio_id: condominioId,
        type: "REVENUE",
        identifier: entryIdentifier,
        description: `Taxa condominial ${formatCompetence(payload.competenceDate)} - ${unitPayload.unit}`,
        amount: unitPayload.amount,
        reference_date: issueDate,
        due_date: payload.dueDate,
        counterparty: unitPayload.resident,
        unit: unitPayload.unit,
        resident: unitPayload.resident,
        category: "Taxa condominial",
        payment_method: "Boleto",
        status: "Em aberto",
        document_name: `${billCode}.pdf`,
        notes: payload.instructions ?? null,
      })
      .select()
      .single();

    if (entryError) {
      skipped.push({ unit: unitPayload.unit, reason: entryError.message });
      continue;
    }

    const { data: billData, error: billError } = await supabase
      .from("finance_bills")
      .insert({
        condominio_id: condominioId,
        entry_id: (entryData as { id: string }).id,
        bill_code: billCode,
        unit: unitPayload.unit,
        resident: unitPayload.resident,
        resident_email: unitPayload.residentEmail ?? null,
        competence_date: payload.competenceDate,
        issue_date: issueDate,
        due_date: payload.dueDate,
        amount: unitPayload.amount,
        instructions: payload.instructions ?? null,
        status: "PENDING",
        digitable_line: null,
        barcode: null,
        pdf_url: null,
        paid_at: null,
      })
      .select()
      .single();

    if (billError) {
      skipped.push({ unit: unitPayload.unit, reason: billError.message });
      seed++;
      continue;
    }

    created.push(mapBill(billData as Record<string, unknown>));
    seed++;
  }

  return { created, skipped };
}

export async function markOverdueBills(): Promise<number> {
  const condominioId = getCondominioUUID();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("finance_bills")
    .update({ status: "OVERDUE", updated_at: new Date().toISOString() })
    .eq("condominio_id", condominioId)
    .eq("status", "PENDING")
    .lt("due_date", today)
    .select("id");

  if (error) throw new Error(error.message);

  const count = (data ?? []).length;
  if (count > 0) {
    // Sync linked entries to "Atrasado"
    const ids = (data as { id: string }[]).map((r) => r.id);
    const { data: bills } = await supabase
      .from("finance_bills")
      .select("entry_id")
      .in("id", ids);

    const entryIds = (bills ?? [])
      .map((b: { entry_id: string | null }) => b.entry_id)
      .filter(Boolean) as string[];

    if (entryIds.length > 0) {
      await supabase
        .from("finance_entries")
        .update({ status: "Atrasado" })
        .in("id", entryIds);
    }
  }

  return count;
}

export async function updateFinanceBillStatus(
  id: string,
  status: FinanceBillStatus,
  paidAt?: string | null,
  finalAmount?: number | null,
): Promise<FinanceBill> {
  const allowedStatusTransitions: Record<FinanceBillStatus, FinanceBillStatus[]> = {
    PENDING: ["PAID", "OVERDUE", "CANCELLED"],
    OVERDUE: ["PAID", "CANCELLED"],
    PAID: [],
    CANCELLED: [],
  };

  // Fetch current bill to validate transition
  const { data: current, error: fetchError } = await supabase
    .from("finance_bills")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !current) throw new Error("Boleto não encontrado.");

  const currentBill = mapBill(current as Record<string, unknown>);
  const allowedNext = allowedStatusTransitions[currentBill.status] ?? [];
  if (!allowedNext.includes(status)) throw new Error("Transição de status inválida.");

  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "PAID") {
    updatePayload.paid_at = paidAt ?? new Date().toISOString();
    if (finalAmount != null) updatePayload.amount = finalAmount;
  } else {
    updatePayload.paid_at = null;
  }

  const { data: updated, error: updateError } = await supabase
    .from("finance_bills")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);

  const updatedBill = mapBill(updated as Record<string, unknown>);

  // Sync the linked entry status (and amount if PAID with late fees)
  if (updatedBill.entry_id) {
    const entryUpdate: Record<string, unknown> = { status: mapBillStatusToEntryStatus(status) };
    if (status === "PAID" && finalAmount != null) entryUpdate.amount = finalAmount;
    await supabase
      .from("finance_entries")
      .update(entryUpdate)
      .eq("id", updatedBill.entry_id);
  }

  return updatedBill;
}
