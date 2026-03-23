import { getUser } from "../../auth/services/auth";

export type MaintenanceStatus = "AGENDADA" | "EM_ANDAMENTO" | "CONCLUIDA" | "ATRASADA" | "CANCELADA";
export type MaintenancePriority = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
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
  title: string;
  assetName: string;
  area: string;
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
  accessNotes: string;
};

type MaintenanceOrderInput = {
  title: string;
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
  notes: string;
};

type AccessInput = {
  happenedAt: string;
  accessNotes: string;
};

const STORAGE_KEY = "maintenance:orders";
const EVENT_NAME = "maintenance:changed";

const seedOrders: MaintenanceOrder[] = [
  {
    id: "mnt-001",
    title: "Revisao da bomba da cisterna",
    assetName: "Bomba da cisterna",
    area: "Casa de maquinas",
    category: "HIDRAULICA",
    priority: "ALTA",
    status: "AGENDADA",
    supplierName: "Aqua Prime",
    technicianName: "Carlos Henrique",
    responsibleName: "Zeladoria",
    scheduledDate: "2026-03-24",
    scheduledTime: "09:00",
    notes: "Verificar oscilacao de pressao e ruido no motor principal.",
    createdAt: "2026-03-22T13:00:00.000Z",
    updatedAt: "2026-03-22T13:00:00.000Z",
    createdByUserId: null,
    createdByName: "Sistema",
    checkInAt: null,
    checkOutAt: null,
    lastServiceAt: "2026-01-15T15:00:00.000Z",
    maintenanceIntervalDays: 90,
    accessNotes: "",
  },
  {
    id: "mnt-002",
    title: "Inspecao do elevador social",
    assetName: "Elevador social do bloco B",
    area: "Bloco B",
    category: "ELEVADORES",
    priority: "CRITICA",
    status: "EM_ANDAMENTO",
    supplierName: "Elevadores Sigma",
    technicianName: "Marcos Silva",
    responsibleName: "Portaria",
    scheduledDate: "2026-03-23",
    scheduledTime: "10:30",
    notes: "Manutencao preventiva mensal com checklist completo.",
    createdAt: "2026-03-21T16:20:00.000Z",
    updatedAt: "2026-03-23T13:10:00.000Z",
    createdByUserId: null,
    createdByName: "Sistema",
    checkInAt: "2026-03-23T13:05:00.000Z",
    checkOutAt: null,
    lastServiceAt: "2026-02-20T11:00:00.000Z",
    maintenanceIntervalDays: 30,
    accessNotes: "Tecnico liberado pela portaria e acompanhado ate a casa de maquinas.",
  },
  {
    id: "mnt-003",
    title: "Reparo de luminarias da garagem",
    assetName: "Luminarias da garagem",
    area: "Garagem subsolo 1",
    category: "ELETRICA",
    priority: "MEDIA",
    status: "CONCLUIDA",
    supplierName: "Luz & Rede",
    technicianName: "Paulo Roberto",
    responsibleName: "Sindicancia",
    scheduledDate: "2026-03-20",
    scheduledTime: "14:00",
    notes: "Troca de reator e lampadas do corredor central.",
    createdAt: "2026-03-19T11:15:00.000Z",
    updatedAt: "2026-03-20T19:30:00.000Z",
    createdByUserId: null,
    createdByName: "Sistema",
    checkInAt: "2026-03-20T17:05:00.000Z",
    checkOutAt: "2026-03-20T19:20:00.000Z",
    lastServiceAt: "2026-03-20T19:20:00.000Z",
    maintenanceIntervalDays: 120,
    accessNotes: "Servico finalizado sem intercorrencias.",
  },
];

function readStorage(): MaintenanceOrder[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedOrders;

  try {
    const parsed = JSON.parse(raw) as MaintenanceOrder[];
    return parsed.map((order) => ({
      ...order,
      assetName: order.assetName ?? order.title,
      lastServiceAt: order.lastServiceAt ?? order.checkOutAt ?? null,
      maintenanceIntervalDays: Math.max(1, order.maintenanceIntervalDays ?? 90),
    }));
  } catch {
    return seedOrders;
  }
}

function writeStorage(orders: MaintenanceOrder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  window.dispatchEvent(new Event(EVENT_NAME));
}

function nextId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function sortOrders(orders: MaintenanceOrder[]) {
  return [...orders].sort((left, right) => {
    const leftKey = `${left.scheduledDate}T${left.scheduledTime}`;
    const rightKey = `${right.scheduledDate}T${right.scheduledTime}`;
    return rightKey.localeCompare(leftKey);
  });
}

export async function listMaintenanceOrders(): Promise<MaintenanceOrder[]> {
  return sortOrders(readStorage());
}

export async function createMaintenanceOrder(input: MaintenanceOrderInput): Promise<MaintenanceOrder> {
  const currentUser = getUser();
  const timestamp = nowIso();
  const order: MaintenanceOrder = {
    id: nextId(),
    title: input.title.trim(),
    assetName: input.assetName.trim(),
    area: input.area.trim(),
    category: input.category,
    priority: input.priority,
    status: "AGENDADA",
    supplierName: input.supplierName.trim(),
    technicianName: input.technicianName.trim(),
    responsibleName: input.responsibleName.trim(),
    scheduledDate: input.scheduledDate,
    scheduledTime: input.scheduledTime,
    notes: input.notes.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
    createdByUserId: currentUser?.id ?? null,
    createdByName: currentUser?.name ?? "Usuario",
    checkInAt: null,
    checkOutAt: null,
    lastServiceAt: null,
    maintenanceIntervalDays: Math.max(1, Math.round(input.maintenanceIntervalDays)),
    accessNotes: "",
  };

  const orders = readStorage();
  writeStorage([order, ...orders]);
  return order;
}

export async function updateMaintenanceOrder(orderId: string, input: MaintenanceOrderInput & { status: MaintenanceStatus }): Promise<MaintenanceOrder> {
  const orders = readStorage();
  let updatedOrder: MaintenanceOrder | null = null;

  const nextOrders = orders.map((order) => {
    if (order.id !== orderId) return order;

    updatedOrder = {
      ...order,
      title: input.title.trim(),
      assetName: input.assetName.trim(),
      area: input.area.trim(),
      category: input.category,
      priority: input.priority,
      status: input.status,
      supplierName: input.supplierName.trim(),
      technicianName: input.technicianName.trim(),
      responsibleName: input.responsibleName.trim(),
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime,
      maintenanceIntervalDays: Math.max(1, Math.round(input.maintenanceIntervalDays)),
      notes: input.notes.trim(),
      updatedAt: nowIso(),
    };

    return updatedOrder;
  });

  if (!updatedOrder) {
    throw new Error("Manutencao nao encontrada.");
  }

  writeStorage(nextOrders);
  return updatedOrder;
}

export async function registerMaintenanceCheckIn(orderId: string, input: AccessInput): Promise<MaintenanceOrder> {
  const orders = readStorage();
  let updatedOrder: MaintenanceOrder | null = null;

  const nextOrders = orders.map((order) => {
    if (order.id !== orderId) return order;

    updatedOrder = {
      ...order,
      status: "EM_ANDAMENTO",
      checkInAt: input.happenedAt,
      checkOutAt: null,
      accessNotes: input.accessNotes.trim(),
      updatedAt: nowIso(),
    };

    return updatedOrder;
  });

  if (!updatedOrder) {
    throw new Error("Manutencao nao encontrada.");
  }

  writeStorage(nextOrders);
  return updatedOrder;
}

export async function registerMaintenanceCheckOut(orderId: string, input: AccessInput): Promise<MaintenanceOrder> {
  const orders = readStorage();
  let updatedOrder: MaintenanceOrder | null = null;

  const nextOrders = orders.map((order) => {
    if (order.id !== orderId) return order;

    updatedOrder = {
      ...order,
      status: "CONCLUIDA",
      checkOutAt: input.happenedAt,
      lastServiceAt: input.happenedAt,
      accessNotes: input.accessNotes.trim() || order.accessNotes,
      updatedAt: nowIso(),
    };

    return updatedOrder;
  });

  if (!updatedOrder) {
    throw new Error("Manutencao nao encontrada.");
  }

  writeStorage(nextOrders);
  return updatedOrder;
}

export async function cancelMaintenanceOrder(orderId: string): Promise<void> {
  const orders = readStorage();
  const nextOrders = orders.map((order) =>
    order.id === orderId
      ? {
          ...order,
          status: "CANCELADA" as const,
          updatedAt: nowIso(),
        }
      : order,
  );

  writeStorage(nextOrders);
}

export function subscribeToMaintenanceOrders(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };

  window.addEventListener(EVENT_NAME, onChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(EVENT_NAME, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}
