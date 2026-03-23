import { getUser } from "../../auth/services/auth";
import { supabase } from "../../../lib/supabase";

export type MaintenanceStatus = "AGENDADA" | "EM_ANDAMENTO" | "CONCLUIDA" | "ATRASADA" | "CANCELADA";
export type MaintenancePriority = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
export type MaintenanceKind = "PREVENTIVA" | "CORRETIVA" | "INSPECAO";
export type MaintenanceCategory =
  | "HIDRAULICA"
  | "ELETRICA"
  | "ESTRUTURAL"
  | "ELEVADORES"
  | "LIMPEZA"
  | "SEGURANCA"
  | "JARDINAGEM"
  | "PINTURA"
  | "CLIMATIZACAO"
  | "OUTROS";

export type MaintenanceOrder = {
  id: string;
  orderCode: string;
  title: string;
  assetName: string;
  area: string;
  kind: MaintenanceKind;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  supplierName: string;
  technicianName: string;
  responsibleName: string;
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  createdByName: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  lastServiceAt: string | null;
  maintenanceIntervalDays: number;
  estimatedCost: number | null;
  finalCost: number | null;
  approvedByName: string;
  approvedAt: string | null;
  accessNotes: string;
};

type MaintenanceOrderInput = {
  title: string;
  kind: MaintenanceKind;
  assetName: string;
  area: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  supplierName: string;
  technicianName: string;
  responsibleName: string;
  scheduledDate: string;
  scheduledTime: string;
  maintenanceIntervalDays: number;
  estimatedCost: number | null;
  finalCost: number | null;
  approvedByName: string;
  notes: string;
};

type AccessInput = {
  happenedAt: string;
  accessNotes: string;
};

type MaintenanceOrderRow = {
  id: string;
  order_code: string;
  title: string;
  asset_name: string;
  area: string;
  kind: MaintenanceKind;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  supplier_name: string;
  technician_name: string;
  responsible_name: string;
  scheduled_date: string;
  scheduled_time: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  created_by_name: string;
  check_in_at: string | null;
  check_out_at: string | null;
  last_service_at: string | null;
  maintenance_interval_days: number;
  estimated_cost: number | null;
  final_cost: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  access_notes: string | null;
};

function mapRow(row: MaintenanceOrderRow): MaintenanceOrder {
  return {
    id: row.id,
    orderCode: row.order_code,
    title: row.title,
    assetName: row.asset_name,
    area: row.area,
    kind: row.kind,
    category: row.category,
    priority: row.priority,
    status: row.status,
    supplierName: row.supplier_name,
    technicianName: row.technician_name,
    responsibleName: row.responsible_name,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time.slice(0, 5),
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    lastServiceAt: row.last_service_at,
    maintenanceIntervalDays: row.maintenance_interval_days,
    estimatedCost: row.estimated_cost,
    finalCost: row.final_cost,
    approvedByName: row.approved_by_name ?? "",
    approvedAt: row.approved_at,
    accessNotes: row.access_notes ?? "",
  };
}

function mapInsertInput(input: MaintenanceOrderInput, currentUserId: string, createdByName: string) {
  return {
    title: input.title.trim(),
    kind: input.kind,
    asset_name: input.assetName.trim(),
    area: input.area.trim(),
    category: input.category,
    priority: input.priority,
    supplier_name: input.supplierName.trim(),
    technician_name: input.technicianName.trim(),
    responsible_name: input.responsibleName.trim(),
    scheduled_date: input.scheduledDate,
    scheduled_time: `${input.scheduledTime}:00`,
    maintenance_interval_days: Math.max(1, Math.round(input.maintenanceIntervalDays)),
    estimated_cost: input.estimatedCost,
    final_cost: input.finalCost,
    approved_by_name: input.approvedByName.trim() || null,
    approved_at: input.approvedByName.trim() ? new Date().toISOString() : null,
    notes: input.notes.trim() || null,
    created_by_user_id: currentUserId,
    created_by_name: createdByName,
  };
}

async function requireSessionUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  return data.user;
}

export async function listMaintenanceOrders(): Promise<MaintenanceOrder[]> {
  const { data, error } = await supabase
    .from("maintenance_orders")
    .select("id, order_code, title, asset_name, area, kind, category, priority, status, supplier_name, technician_name, responsible_name, scheduled_date, scheduled_time, notes, created_at, updated_at, created_by_user_id, created_by_name, check_in_at, check_out_at, last_service_at, maintenance_interval_days, estimated_cost, final_cost, approved_by_name, approved_at, access_notes")
    .order("scheduled_date", { ascending: false })
    .order("scheduled_time", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MaintenanceOrderRow[]).map(mapRow);
}

export async function createMaintenanceOrder(input: MaintenanceOrderInput): Promise<MaintenanceOrder> {
  const authUser = await requireSessionUser();
  const currentUser = getUser();

  const { data, error } = await supabase
    .from("maintenance_orders")
    .insert(mapInsertInput(input, authUser.id, currentUser?.name?.trim() || authUser.email || "Usuario"))
    .select("id, order_code, title, asset_name, area, kind, category, priority, status, supplier_name, technician_name, responsible_name, scheduled_date, scheduled_time, notes, created_at, updated_at, created_by_user_id, created_by_name, check_in_at, check_out_at, last_service_at, maintenance_interval_days, estimated_cost, final_cost, approved_by_name, approved_at, access_notes")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nao foi possivel criar a manutencao.");
  }

  return mapRow(data as MaintenanceOrderRow);
}

export async function updateMaintenanceOrder(orderId: string, input: MaintenanceOrderInput & { status: MaintenanceStatus }): Promise<MaintenanceOrder> {
  const { data, error } = await supabase
    .from("maintenance_orders")
    .update({
      title: input.title.trim(),
      kind: input.kind,
      asset_name: input.assetName.trim(),
      area: input.area.trim(),
      category: input.category,
      priority: input.priority,
      status: input.status,
      supplier_name: input.supplierName.trim(),
      technician_name: input.technicianName.trim(),
      responsible_name: input.responsibleName.trim(),
      scheduled_date: input.scheduledDate,
      scheduled_time: `${input.scheduledTime}:00`,
      maintenance_interval_days: Math.max(1, Math.round(input.maintenanceIntervalDays)),
      estimated_cost: input.estimatedCost,
      final_cost: input.finalCost,
      approved_by_name: input.approvedByName.trim() || null,
      approved_at: input.approvedByName.trim() ? new Date().toISOString() : null,
      notes: input.notes.trim() || null,
    })
    .eq("id", orderId)
    .select("id, order_code, title, asset_name, area, kind, category, priority, status, supplier_name, technician_name, responsible_name, scheduled_date, scheduled_time, notes, created_at, updated_at, created_by_user_id, created_by_name, check_in_at, check_out_at, last_service_at, maintenance_interval_days, estimated_cost, final_cost, approved_by_name, approved_at, access_notes")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Manutencao nao encontrada.");
  }

  return mapRow(data as MaintenanceOrderRow);
}

export async function registerMaintenanceCheckIn(orderId: string, input: AccessInput): Promise<MaintenanceOrder> {
  const { data, error } = await supabase
    .from("maintenance_orders")
    .update({
      status: "EM_ANDAMENTO",
      check_in_at: input.happenedAt,
      check_out_at: null,
      access_notes: input.accessNotes.trim() || null,
    })
    .eq("id", orderId)
    .select("id, order_code, title, asset_name, area, kind, category, priority, status, supplier_name, technician_name, responsible_name, scheduled_date, scheduled_time, notes, created_at, updated_at, created_by_user_id, created_by_name, check_in_at, check_out_at, last_service_at, maintenance_interval_days, estimated_cost, final_cost, approved_by_name, approved_at, access_notes")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Manutencao nao encontrada.");
  }

  return mapRow(data as MaintenanceOrderRow);
}

export async function registerMaintenanceCheckOut(orderId: string, input: AccessInput): Promise<MaintenanceOrder> {
  const { data, error } = await supabase
    .from("maintenance_orders")
    .update({
      status: "CONCLUIDA",
      check_out_at: input.happenedAt,
      last_service_at: input.happenedAt,
      access_notes: input.accessNotes.trim() || null,
    })
    .eq("id", orderId)
    .select("id, order_code, title, asset_name, area, kind, category, priority, status, supplier_name, technician_name, responsible_name, scheduled_date, scheduled_time, notes, created_at, updated_at, created_by_user_id, created_by_name, check_in_at, check_out_at, last_service_at, maintenance_interval_days, estimated_cost, final_cost, approved_by_name, approved_at, access_notes")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Manutencao nao encontrada.");
  }

  return mapRow(data as MaintenanceOrderRow);
}

export async function cancelMaintenanceOrder(orderId: string): Promise<void> {
  const { error } = await supabase
    .from("maintenance_orders")
    .update({ status: "CANCELADA" })
    .eq("id", orderId);

  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeToMaintenanceOrders(onChange: () => void) {
  const channel = supabase
    .channel("maintenance-orders-feed")
    .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_orders" }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
