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

export type MaintenanceEventType =
  | "ORDEM_CRIADA"
  | "ORDEM_EDITADA"
  | "STATUS_ALTERADO"
  | "APROVACAO_REGISTRADA"
  | "CHECKIN_REGISTRADO"
  | "CHECKOUT_REGISTRADO"
  | "ANEXO_ADICIONADO"
  | "ANEXO_REMOVIDO";

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

export type MaintenanceEvent = {
  id: string;
  orderId: string;
  eventType: MaintenanceEventType;
  title: string;
  description: string;
  actorUserId: string | null;
  actorName: string;
  createdAt: string;
};

export type MaintenanceAttachment = {
  id: string;
  orderId: string;
  fileName: string;
  fileUrl: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number | null;
  createdByUserId: string | null;
  createdByName: string;
  createdAt: string;
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

type MaintenanceEventRow = {
  id: string;
  order_id: string;
  event_type: MaintenanceEventType;
  title: string;
  description: string | null;
  actor_user_id: string | null;
  actor_name: string;
  created_at: string;
};

type MaintenanceAttachmentRow = {
  id: string;
  order_id: string;
  file_name: string;
  file_url: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_by_user_id: string | null;
  created_by_name: string;
  created_at: string;
};

const ORDER_SELECT =
  "id, order_code, title, asset_name, area, kind, category, priority, status, supplier_name, technician_name, responsible_name, scheduled_date, scheduled_time, notes, created_at, updated_at, created_by_user_id, created_by_name, check_in_at, check_out_at, last_service_at, maintenance_interval_days, estimated_cost, final_cost, approved_by_name, approved_at, access_notes";

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

function mapEvent(row: MaintenanceEventRow): MaintenanceEvent {
  return {
    id: row.id,
    orderId: row.order_id,
    eventType: row.event_type,
    title: row.title,
    description: row.description ?? "",
    actorUserId: row.actor_user_id,
    actorName: row.actor_name,
    createdAt: row.created_at,
  };
}

function mapAttachment(row: MaintenanceAttachmentRow): MaintenanceAttachment {
  return {
    id: row.id,
    orderId: row.order_id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    filePath: row.file_path,
    mimeType: row.mime_type ?? "",
    sizeBytes: row.size_bytes,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
  };
}

function getStoragePathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = `/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

function resolveApprovedAt(nextApproverName: string, current: Pick<MaintenanceOrder, "approvedAt" | "approvedByName"> | null) {
  const trimmed = nextApproverName.trim();
  if (!trimmed) return null;
  if (current?.approvedAt && current.approvedByName.trim() === trimmed) return current.approvedAt;
  return new Date().toISOString();
}

async function requireSessionUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  return data.user;
}

async function getMaintenanceOrder(orderId: string): Promise<MaintenanceOrder | null> {
  const { data, error } = await supabase.from("maintenance_orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as MaintenanceOrderRow) : null;
}

export async function listMaintenanceOrders(): Promise<MaintenanceOrder[]> {
  const { data, error } = await supabase
    .from("maintenance_orders")
    .select(ORDER_SELECT)
    .order("scheduled_date", { ascending: false })
    .order("scheduled_time", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MaintenanceOrderRow[]).map(mapRow);
}

export async function listMaintenanceOrderEvents(orderId: string): Promise<MaintenanceEvent[]> {
  const { data, error } = await supabase
    .from("maintenance_order_events")
    .select("id, order_id, event_type, title, description, actor_user_id, actor_name, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as MaintenanceEventRow[]).map(mapEvent);
}

export async function listMaintenanceOrderAttachments(orderId: string): Promise<MaintenanceAttachment[]> {
  const { data, error } = await supabase
    .from("maintenance_order_attachments")
    .select("id, order_id, file_name, file_url, file_path, mime_type, size_bytes, created_by_user_id, created_by_name, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as MaintenanceAttachmentRow[]).map(mapAttachment);
}

export async function createMaintenanceOrder(input: MaintenanceOrderInput): Promise<MaintenanceOrder> {
  const authUser = await requireSessionUser();
  const currentUser = getUser();

  const { data, error } = await supabase
    .from("maintenance_orders")
    .insert({
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
      approved_at: resolveApprovedAt(input.approvedByName, null),
      notes: input.notes.trim() || null,
      created_by_user_id: authUser.id,
      created_by_name: currentUser?.name?.trim() || authUser.email || "Usuario",
    })
    .select(ORDER_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nao foi possivel criar a manutencao.");
  }

  return mapRow(data as MaintenanceOrderRow);
}

export async function updateMaintenanceOrder(orderId: string, input: MaintenanceOrderInput & { status: MaintenanceStatus }): Promise<MaintenanceOrder> {
  const current = await getMaintenanceOrder(orderId);
  if (!current) {
    throw new Error("Manutencao nao encontrada.");
  }

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
      approved_at: resolveApprovedAt(input.approvedByName, current),
      notes: input.notes.trim() || null,
    })
    .eq("id", orderId)
    .select(ORDER_SELECT)
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
    .select(ORDER_SELECT)
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
    .select(ORDER_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Manutencao nao encontrada.");
  }

  return mapRow(data as MaintenanceOrderRow);
}

export async function cancelMaintenanceOrder(orderId: string): Promise<void> {
  const { error } = await supabase.from("maintenance_orders").update({ status: "CANCELADA" }).eq("id", orderId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadMaintenanceAttachment(orderId: string, file: File): Promise<MaintenanceAttachment> {
  const authUser = await requireSessionUser();
  const currentUser = getUser();
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

  if (!allowedTypes.has(file.type)) {
    throw new Error("Envie um arquivo JPG, PNG, WEBP ou PDF.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("O arquivo deve ter no maximo 10 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const upload = await supabase.storage.from("maintenance-evidence").upload(path, file, { upsert: false });
  if (upload.error) throw new Error(upload.error.message);

  const { data: publicUrlData } = supabase.storage.from("maintenance-evidence").getPublicUrl(path);
  const { data, error } = await supabase
    .from("maintenance_order_attachments")
    .insert({
      order_id: orderId,
      file_name: file.name,
      file_url: publicUrlData.publicUrl,
      file_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
      created_by_user_id: authUser.id,
      created_by_name: currentUser?.name?.trim() || authUser.email || "Usuario",
    })
    .select("id, order_id, file_name, file_url, file_path, mime_type, size_bytes, created_by_user_id, created_by_name, created_at")
    .single();

  if (error || !data) {
    await supabase.storage.from("maintenance-evidence").remove([path]);
    throw new Error(error?.message ?? "Nao foi possivel registrar o anexo.");
  }

  return mapAttachment(data as MaintenanceAttachmentRow);
}

export async function deleteMaintenanceAttachment(attachment: Pick<MaintenanceAttachment, "id" | "filePath" | "fileUrl">): Promise<void> {
  const { error } = await supabase.from("maintenance_order_attachments").delete().eq("id", attachment.id);
  if (error) throw new Error(error.message);

  const storagePath = attachment.filePath || getStoragePathFromPublicUrl(attachment.fileUrl, "maintenance-evidence");
  if (storagePath) {
    await supabase.storage.from("maintenance-evidence").remove([storagePath]);
  }
}

export function subscribeToMaintenanceOrders(onChange: () => void) {
  const channel = supabase
    .channel("maintenance-orders-feed")
    .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_orders" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_order_events" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_order_attachments" }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
