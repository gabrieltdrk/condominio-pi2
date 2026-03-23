import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, Clock3, Plus, ScanLine, Search, ShieldAlert, Wrench, X } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { getUser } from "../features/auth/services/auth";
import {
  cancelMaintenanceOrder,
  createMaintenanceOrder,
  listMaintenanceOrders,
  registerMaintenanceCheckIn,
  registerMaintenanceCheckOut,
  subscribeToMaintenanceOrders,
  updateMaintenanceOrder,
  type MaintenanceCategory,
  type MaintenanceOrder,
  type MaintenancePriority,
  type MaintenanceStatus,
} from "../features/maintenance/services/maintenance";

const inputClass = "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
const textareaClass = "mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";
const MAP_PAGE_SIZE = 6;

const STATUS_META: Record<MaintenanceStatus, { label: string; tone: string }> = {
  AGENDADA: { label: "Agendada", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  EM_ANDAMENTO: { label: "Em andamento", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  CONCLUIDA: { label: "Concluida", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  ATRASADA: { label: "Atrasada", tone: "border-rose-200 bg-rose-50 text-rose-700" },
  CANCELADA: { label: "Cancelada", tone: "border-slate-200 bg-slate-100 text-slate-600" },
};

const PRIORITY_META: Record<MaintenancePriority, string> = {
  BAIXA: "border-slate-200 bg-slate-100 text-slate-600",
  MEDIA: "border-sky-200 bg-sky-50 text-sky-700",
  ALTA: "border-amber-200 bg-amber-50 text-amber-700",
  CRITICA: "border-rose-200 bg-rose-50 text-rose-700",
};

const CATEGORY_OPTIONS: Array<{ value: MaintenanceCategory; label: string }> = [
  { value: "HIDRAULICA", label: "Hidraulica" },
  { value: "ELETRICA", label: "Eletrica" },
  { value: "ESTRUTURAL", label: "Estrutural" },
  { value: "ELEVADORES", label: "Elevadores" },
  { value: "LIMPEZA", label: "Limpeza" },
  { value: "SEGURANCA", label: "Seguranca" },
  { value: "JARDINAGEM", label: "Jardinagem" },
  { value: "PINTURA", label: "Pintura" },
  { value: "CLIMATIZACAO", label: "Climatizacao" },
  { value: "OUTROS", label: "Outros" },
];

const PRIORITY_OPTIONS: Array<{ value: MaintenancePriority; label: string }> = [
  { value: "BAIXA", label: "Baixa" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Critica" },
];

type OrderFormState = {
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
  maintenanceIntervalDays: string;
  notes: string;
};

type AssetHealth = {
  percentage: number;
  daysRemaining: number;
  nextServiceDate: string | null;
  statusLabel: string;
  statusTone: string;
  barTone: string;
};

function toLocalDateTimeValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function nowLocalDateTime() {
  return toLocalDateTimeValue(new Date().toISOString());
}

function formatDate(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "Nao registrado";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatSimpleDate(value: string | null) {
  if (!value) return "Nao definido";
  return new Date(value).toLocaleDateString("pt-BR", { dateStyle: "short" });
}

function isToday(date: string) {
  return date === new Date().toISOString().slice(0, 10);
}

function getAssetHealth(order: MaintenanceOrder): AssetHealth {
  const interval = Math.max(1, order.maintenanceIntervalDays || 1);
  const baseReference = order.lastServiceAt ?? order.checkOutAt ?? `${order.scheduledDate}T${order.scheduledTime}:00`;
  const baseTime = new Date(baseReference).getTime();
  const elapsedDays = Math.max(0, Math.floor((Date.now() - baseTime) / 86400000));
  const daysRemaining = interval - elapsedDays;
  const percentage = Math.max(0, Math.min(100, Math.round((daysRemaining / interval) * 100)));
  const nextServiceDate = Number.isNaN(baseTime) ? null : new Date(baseTime + interval * 86400000).toISOString();

  if (daysRemaining <= 0) {
    return { percentage, daysRemaining, nextServiceDate, statusLabel: "Chamar tecnico agora", statusTone: "text-rose-700", barTone: "bg-rose-500" };
  }

  if (percentage <= 20) {
    return { percentage, daysRemaining, nextServiceDate, statusLabel: "Saude baixa", statusTone: "text-amber-700", barTone: "bg-amber-500" };
  }

  return { percentage, daysRemaining, nextServiceDate, statusLabel: "Saude em dia", statusTone: "text-emerald-700", barTone: "bg-emerald-500" };
}

function emptyForm(): OrderFormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    title: "",
    assetName: "",
    area: "",
    category: "HIDRAULICA",
    priority: "MEDIA",
    status: "AGENDADA",
    supplierName: "",
    technicianName: "",
    responsibleName: "",
    scheduledDate: today,
    scheduledTime: "09:00",
    maintenanceIntervalDays: "90",
    notes: "",
  };
}

function formFromOrder(order: MaintenanceOrder): OrderFormState {
  return {
    title: order.title,
    assetName: order.assetName,
    area: order.area,
    category: order.category,
    priority: order.priority,
    status: order.status,
    supplierName: order.supplierName,
    technicianName: order.technicianName,
    responsibleName: order.responsibleName,
    scheduledDate: order.scheduledDate,
    scheduledTime: order.scheduledTime,
    maintenanceIntervalDays: String(order.maintenanceIntervalDays),
    notes: order.notes,
  };
}

function OrderFormModal({
  open,
  mode,
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  form: OrderFormState;
  setForm: React.Dispatch<React.SetStateAction<OrderFormState>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">Central de manutencao</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">{mode === "create" ? "Nova manutencao" : "Editar manutencao"}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2"><span className={labelClass}>Titulo do servico</span><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} placeholder="Ex.: Revisao da bomba da cisterna" /></label>
            <label className="block"><span className={labelClass}>Item monitorado</span><input value={form.assetName} onChange={(event) => setForm((current) => ({ ...current, assetName: event.target.value }))} className={inputClass} placeholder="Ex.: Elevador social" /></label>
            <label className="block"><span className={labelClass}>Area</span><input value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} className={inputClass} placeholder="Ex.: Casa de maquinas" /></label>
            <label className="block"><span className={labelClass}>Categoria</span><select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as MaintenanceCategory }))} className={inputClass}>{CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="block"><span className={labelClass}>Prioridade</span><select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as MaintenancePriority }))} className={inputClass}>{PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            {mode === "edit" && <label className="block"><span className={labelClass}>Status</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as MaintenanceStatus }))} className={inputClass}>{Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label>}
            <label className="block"><span className={labelClass}>Empresa prestadora</span><input value={form.supplierName} onChange={(event) => setForm((current) => ({ ...current, supplierName: event.target.value }))} className={inputClass} placeholder="Ex.: Elevadores Sigma" /></label>
            <label className="block"><span className={labelClass}>Tecnico responsavel</span><input value={form.technicianName} onChange={(event) => setForm((current) => ({ ...current, technicianName: event.target.value }))} className={inputClass} placeholder="Nome de quem vem executar" /></label>
            <label className="block"><span className={labelClass}>Responsavel interno</span><input value={form.responsibleName} onChange={(event) => setForm((current) => ({ ...current, responsibleName: event.target.value }))} className={inputClass} placeholder="Ex.: Portaria" /></label>
            <label className="block"><span className={labelClass}>Data prevista</span><input type="date" value={form.scheduledDate} onChange={(event) => setForm((current) => ({ ...current, scheduledDate: event.target.value }))} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Horario previsto</span><input type="time" value={form.scheduledTime} onChange={(event) => setForm((current) => ({ ...current, scheduledTime: event.target.value }))} className={inputClass} /></label>
            <label className="block md:col-span-2"><span className={labelClass}>Ciclo de manutencao em dias</span><input type="number" min="1" value={form.maintenanceIntervalDays} onChange={(event) => setForm((current) => ({ ...current, maintenanceIntervalDays: event.target.value }))} className={inputClass} placeholder="Ex.: 90" /></label>
            <label className="block md:col-span-2"><span className={labelClass}>Observacoes</span><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} className={textareaClass} placeholder="Informacoes importantes para a equipe e para a portaria." /></label>
          </div>
        </div>
        <div className="border-t border-slate-200 px-6 py-4"><div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end"><button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancelar</button><button type="button" onClick={() => void onSubmit()} disabled={saving} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{saving ? "Salvando..." : mode === "create" ? "Criar manutencao" : "Salvar alteracoes"}</button></div></div>
      </div>
    </div>
  );
}

function AccessModal({
  open,
  mode,
  value,
  setValue,
  notes,
  setNotes,
  order,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "checkin" | "checkout";
  value: string;
  setValue: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  order: MaintenanceOrder | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  if (!open || !order) return null;

  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-[32px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">{mode === "checkin" ? "Registrar entrada" : "Registrar saida"}</p><h3 className="mt-2 text-xl font-semibold text-slate-950">{order.title}</h3></div>
          <button type="button" onClick={onClose} className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Tecnico: <strong>{order.technicianName}</strong><br />Empresa: <strong>{order.supplierName}</strong></div>
          <label className="block"><span className={labelClass}>{mode === "checkin" ? "Horario real de entrada" : "Horario real de saida"}</span><input type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} className={inputClass} /></label>
          <label className="block"><span className={labelClass}>Observacoes de acesso</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className={textareaClass} placeholder="Ex.: tecnico foi acompanhado ate a cobertura..." /></label>
        </div>
        <div className="border-t border-slate-200 px-6 py-4"><div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end"><button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Fechar</button><button type="button" onClick={() => void onSubmit()} disabled={saving} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{saving ? "Salvando..." : mode === "checkin" ? "Confirmar entrada" : "Confirmar saida"}</button></div></div>
      </div>
    </div>
  );
}

function DetailsModal({
  open,
  order,
  canManage,
  saving,
  onClose,
  onEdit,
  onStart,
  onFinish,
  onCancelOrder,
}: {
  open: boolean;
  order: MaintenanceOrder | null;
  canManage: boolean;
  saving: boolean;
  onClose: () => void;
  onEdit: () => void;
  onStart: () => void;
  onFinish: () => void;
  onCancelOrder: () => Promise<void>;
}) {
  if (!open || !order) return null;
  const health = getAssetHealth(order);

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_META[order.status].tone}`}>{STATUS_META[order.status].label}</div>
            <h3 className="mt-3 text-2xl font-semibold text-slate-950">{order.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{order.assetName} · {order.area} · {formatDate(order.scheduledDate, order.scheduledTime)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Prestador</p><p className="mt-2 text-sm font-semibold text-slate-900">{order.supplierName}</p><p className="mt-1 text-sm text-slate-600">Tecnico: {order.technicianName}</p><p className="mt-1 text-sm text-slate-600">Responsavel interno: {order.responsibleName}</p></div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Classificacao</p><div className="mt-2 flex flex-wrap gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${PRIORITY_META[order.priority]}`}>{order.priority}</span><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">{order.category}</span></div></div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 md:col-span-2"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Saude do ativo</p><p className="mt-2 text-sm font-semibold text-slate-900">{order.assetName}</p><p className={`mt-1 text-sm font-medium ${health.statusTone}`}>{health.statusLabel}</p></div><div className="text-right text-sm text-slate-500"><p>{health.percentage}%</p><p>Proxima revisao: {formatSimpleDate(health.nextServiceDate)}</p></div></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${health.barTone}`} style={{ width: `${health.percentage}%` }} /></div><div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>Ultima manutencao: {formatSimpleDate(order.lastServiceAt ?? order.checkOutAt)}</span><span>{health.daysRemaining <= 0 ? `${Math.abs(health.daysRemaining)} dias em atraso` : `${health.daysRemaining} dias restantes`}</span></div></div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Entrada registrada</p><p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(order.checkInAt)}</p></div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Saida registrada</p><p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(order.checkOutAt)}</p></div>
          </div>
          {order.notes && <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Descricao</p><p className="mt-2 break-words text-sm leading-6 text-slate-700">{order.notes}</p></div>}
          {order.accessNotes && <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Historico de acesso</p><p className="mt-2 break-words text-sm leading-6 text-slate-700">{order.accessNotes}</p></div>}
        </div>
        {canManage && <div className="border-t border-slate-200 px-6 py-4"><div className="flex flex-wrap gap-3"><button type="button" onClick={onEdit} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Editar</button>{order.status === "AGENDADA" && <button type="button" onClick={onStart} className="rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700">Registrar entrada</button>}{order.status === "EM_ANDAMENTO" && <button type="button" onClick={onFinish} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">Registrar saida</button>}{order.status !== "CANCELADA" && order.status !== "CONCLUIDA" && <button type="button" onClick={() => void onCancelOrder()} disabled={saving} className="rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60">Cancelar manutencao</button>}</div></div>}
      </div>
    </div>
  );
}

export default function MaresiaPage() {
  const user = useMemo(() => getUser(), []);
  const canManage = user?.role === "ADMIN" || user?.role === "PORTEIRO";
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | "TODOS">("TODOS");
  const [mapPage, setMapPage] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceOrder | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<OrderFormState>(emptyForm);
  const [accessMode, setAccessMode] = useState<"checkin" | "checkout" | null>(null);
  const [accessDateTime, setAccessDateTime] = useState(nowLocalDateTime());
  const [accessNotes, setAccessNotes] = useState("");

  async function loadOrders() {
    setLoading(true);
    try {
      setOrders(await listMaintenanceOrders());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar manutencoes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
    return subscribeToMaintenanceOrders(() => {
      void loadOrders();
    });
  }, []);

  useEffect(() => {
    setMapPage(1);
  }, [search, statusFilter]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== "TODOS" && order.status !== statusFilter) return false;
      if (!term) return true;
      return `${order.title} ${order.assetName} ${order.area} ${order.supplierName} ${order.technicianName}`.toLowerCase().includes(term);
    });
  }, [orders, search, statusFilter]);

  const ordersWithHealth = useMemo(
    () =>
      filteredOrders.map((order) => ({
        order,
        health: getAssetHealth(order),
      })),
    [filteredOrders],
  );

  const mapTotalPages = Math.max(1, Math.ceil(ordersWithHealth.length / MAP_PAGE_SIZE));
  const visibleOrdersWithHealth = useMemo(() => {
    const safePage = Math.min(mapPage, mapTotalPages);
    const start = (safePage - 1) * MAP_PAGE_SIZE;
    return ordersWithHealth.slice(start, start + MAP_PAGE_SIZE);
  }, [mapPage, mapTotalPages, ordersWithHealth]);

  useEffect(() => {
    if (mapPage > mapTotalPages) {
      setMapPage(mapTotalPages);
    }
  }, [mapPage, mapTotalPages]);

  const stats = useMemo(() => ({
    scheduled: orders.filter((order) => order.status === "AGENDADA").length,
    inProgress: orders.filter((order) => order.status === "EM_ANDAMENTO").length,
    completed: orders.filter((order) => order.status === "CONCLUIDA").length,
    today: orders.filter((order) => isToday(order.scheduledDate)).length,
  }), [orders]);

  const todayOrders = useMemo(() => orders.filter((order) => isToday(order.scheduledDate)).slice(0, 4), [orders]);

  const buildingOverview = useMemo(() => {
    const activeOrders = orders.filter((order) => order.status !== "CANCELADA");
    const healthEntries = activeOrders.map((order) => ({ order, health: getAssetHealth(order) }));
    const overallHealth = healthEntries.length === 0 ? 100 : Math.round(healthEntries.reduce((sum, entry) => sum + entry.health.percentage, 0) / healthEntries.length);
    const healthyCount = healthEntries.filter((entry) => entry.health.percentage > 60).length;
    const warningCount = healthEntries.filter((entry) => entry.health.percentage > 20 && entry.health.percentage <= 60).length;
    const urgentCount = healthEntries.filter((entry) => entry.health.percentage <= 20).length;
    const nextCritical = [...healthEntries]
      .filter((entry) => entry.health.percentage <= 40)
      .sort((left, right) => left.health.daysRemaining - right.health.daysRemaining)
      .slice(0, 3);

    return {
      overallHealth,
      healthyCount,
      warningCount,
      urgentCount,
      totalTracked: healthEntries.length,
      nextCritical,
    };
  }, [orders]);

  function openCreateModal() {
    setFormMode("create");
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openDetails(order: MaintenanceOrder) {
    setSelectedOrder(order);
    setDetailsOpen(true);
  }

  function openEditModal() {
    if (!selectedOrder) return;
    setFormMode("edit");
    setForm(formFromOrder(selectedOrder));
    setFormOpen(true);
  }

  function openAccessModal(mode: "checkin" | "checkout") {
    if (!selectedOrder) return;
    setAccessMode(mode);
    setAccessDateTime(nowLocalDateTime());
    setAccessNotes(selectedOrder.accessNotes);
  }

  async function handleSubmitForm() {
    if (!form.title.trim() || !form.assetName.trim() || !form.area.trim() || !form.supplierName.trim() || !form.technicianName.trim() || !form.responsibleName.trim()) {
      setError("Preencha os campos principais da manutencao.");
      return;
    }

    if (!Number.isFinite(Number(form.maintenanceIntervalDays)) || Number(form.maintenanceIntervalDays) <= 0) {
      setError("Informe um ciclo de manutencao valido em dias.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = { ...form, maintenanceIntervalDays: Number(form.maintenanceIntervalDays) };
      if (formMode === "create") {
        await createMaintenanceOrder(payload);
        setMessage("Manutencao criada com sucesso.");
      } else if (selectedOrder) {
        await updateMaintenanceOrder(selectedOrder.id, payload);
        setMessage("Manutencao atualizada com sucesso.");
      }

      setFormOpen(false);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar manutencao.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAccessSubmit() {
    if (!selectedOrder || !accessMode || !accessDateTime) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const happenedAt = new Date(accessDateTime).toISOString();
      if (accessMode === "checkin") {
        await registerMaintenanceCheckIn(selectedOrder.id, { happenedAt, accessNotes });
        setMessage("Entrada registrada com sucesso.");
      } else {
        await registerMaintenanceCheckOut(selectedOrder.id, { happenedAt, accessNotes });
        setMessage("Saida registrada com sucesso.");
      }

      setAccessMode(null);
      setDetailsOpen(false);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar acesso.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelOrder() {
    if (!selectedOrder) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await cancelMaintenanceOrder(selectedOrder.id);
      setMessage("Manutencao cancelada com sucesso.");
      setDetailsOpen(false);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cancelar manutencao.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Manutencao">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_26%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_46%,_#eef2ff_100%)] p-6 shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_380px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700"><Wrench size={13} /> Central de manutencao</div>
              <h2 className="mt-4 max-w-3xl text-[clamp(1.9rem,4vw,3rem)] font-black leading-none tracking-[-0.05em] text-slate-950">Panorama de manutencao do predio.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">A ideia aqui e voce bater o olho e entender a situacao geral do condominio: o que esta saudavel, o que pede atencao e o que ja pede nova chamada tecnica.</p>
              {canManage && <button type="button" onClick={openCreateModal} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"><Plus size={16} /> Nova manutencao</button>}
            </div>
            <div className="rounded-[30px] border border-slate-200 bg-white/90 p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Saude geral do predio</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-black tracking-[-0.05em] text-slate-950">{buildingOverview.overallHealth}%</p>
                  <p className="mt-1 text-sm text-slate-500">{buildingOverview.totalTracked} itens monitorados</p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${buildingOverview.overallHealth <= 20 ? "bg-rose-100 text-rose-700" : buildingOverview.overallHealth <= 60 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{buildingOverview.overallHealth <= 20 ? "Estado critico" : buildingOverview.overallHealth <= 60 ? "Em observacao" : "Operacao estavel"}</div>
              </div>
              <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100">
                <div className={`${buildingOverview.overallHealth <= 20 ? "bg-rose-500" : buildingOverview.overallHealth <= 60 ? "bg-amber-500" : "bg-emerald-500"} h-full rounded-full`} style={{ width: `${buildingOverview.overallHealth}%` }} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Saudavel</p><p className="mt-2 text-2xl font-black text-slate-950">{buildingOverview.healthyCount}</p></div>
                <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Atencao</p><p className="mt-2 text-2xl font-black text-slate-950">{buildingOverview.warningCount}</p></div>
                <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">Urgente</p><p className="mt-2 text-2xl font-black text-slate-950">{buildingOverview.urgentCount}</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Leitura rapida do condominio</h3>
                <p className="mt-1 text-sm text-slate-500">Um resumo do que esta acontecendo agora no predio.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[{ icon: CalendarClock, label: "Agendadas", value: stats.scheduled, tone: "border-sky-100 bg-sky-50 text-sky-700" }, { icon: ScanLine, label: "Em andamento", value: stats.inProgress, tone: "border-amber-100 bg-amber-50 text-amber-700" }, { icon: CheckCircle2, label: "Concluidas", value: stats.completed, tone: "border-emerald-100 bg-emerald-50 text-emerald-700" }, { icon: Clock3, label: "Hoje", value: stats.today, tone: "border-slate-200 bg-slate-100 text-slate-700" }].map((item) => {
                const Icon = item.icon;
                return <div key={item.label} className={`rounded-[24px] border p-4 ${item.tone}`}><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm"><Icon size={18} /></div><p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{item.value}</p></div>;
              })}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700"><AlertTriangle size={20} /></div><div><h3 className="text-base font-semibold text-slate-900">Pontos de atencao</h3><p className="mt-1 text-sm text-slate-500">Os itens mais proximos de nova chamada.</p></div></div>
            <div className="mt-4 space-y-3">{buildingOverview.nextCritical.length === 0 ? <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Nenhum ponto critico no momento.</div> : buildingOverview.nextCritical.map(({ order, health }) => <button key={order.id} type="button" onClick={() => openDetails(order)} className="w-full rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{order.assetName}</p><p className="mt-1 text-xs text-slate-500">{order.area}</p></div><p className={`text-xs font-semibold ${health.statusTone}`}>{health.percentage}%</p></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${health.barTone}`} style={{ width: `${health.percentage}%` }} /></div><p className="mt-2 text-xs text-slate-500">{health.daysRemaining <= 0 ? "Precisa chamar tecnico novamente" : `${health.daysRemaining} dias restantes`}</p></button>)}</div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div><h3 className="text-base font-semibold text-slate-900">Mapa de manutencao</h3><p className="mt-1 text-sm text-slate-500">Uma lista mais direta para entender rapido cada item do predio.</p></div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative block"><Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por item, area ou tecnico" className="h-11 w-full min-w-[280px] rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></label>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as MaintenanceStatus | "TODOS")} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"><option value="TODOS">Todos os status</option>{Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select>
              </div>
            </div>
            <div className="mt-5">
              {loading ? <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Carregando manutencoes...</div> : ordersWithHealth.length === 0 ? <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Nenhuma manutencao encontrada.</div> : <><div className="grid gap-3 2xl:grid-cols-2">{visibleOrdersWithHealth.map(({ order, health }) => <article key={order.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${STATUS_META[order.status].tone}`}>{STATUS_META[order.status].label}</span><span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${PRIORITY_META[order.priority]}`}>{order.priority}</span></div><h4 className="mt-2 truncate text-base font-semibold text-slate-950">{order.assetName}</h4><p className="mt-1 truncate text-xs text-slate-500">{order.area} · {order.technicianName}</p></div><button type="button" onClick={() => openDetails(order)} className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Abrir</button></div><div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]"><div className="min-w-0"><div className="flex items-center justify-between gap-2"><p className={`text-lg font-black tracking-[-0.05em] ${health.statusTone}`}>{health.percentage}%</p><p className="text-[11px] text-slate-500">{health.daysRemaining <= 0 ? "Atrasado" : `${health.daysRemaining} dias`}</p></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${health.barTone}`} style={{ width: `${health.percentage}%` }} /></div><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500"><span className={health.statusTone}>{health.statusLabel}</span><span>Revisao: {formatSimpleDate(health.nextServiceDate)}</span><span>Ciclo: {order.maintenanceIntervalDays} dias</span></div></div><div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600"><p className="font-semibold text-slate-900">{order.title}</p><p className="mt-1 line-clamp-2">{order.technicianName}</p></div></div></article>)}</div><div className="mt-4 flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Pagina {mapPage} de {mapTotalPages} · {ordersWithHealth.length} manutencoes encontradas</p><div className="flex gap-2"><button type="button" onClick={() => setMapPage((current) => Math.max(1, current - 1))} disabled={mapPage === 1} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">Anterior</button><button type="button" onClick={() => setMapPage((current) => Math.min(mapTotalPages, current + 1))} disabled={mapPage === mapTotalPages} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">Proxima</button></div></div></>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><ShieldAlert size={20} /></div><div><h3 className="text-base font-semibold text-slate-900">Hoje no predio</h3><p className="mt-1 text-sm text-slate-500">Resumo rapido das visitas tecnicas agendadas para hoje.</p></div></div>
              <div className="mt-4 space-y-3">{todayOrders.length === 0 ? <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Nenhuma manutencao programada para hoje.</div> : todayOrders.map((order) => <button key={order.id} type="button" onClick={() => openDetails(order)} className="w-full rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"><p className="text-sm font-semibold text-slate-900">{order.title}</p><p className="mt-1 text-xs text-slate-500">{order.scheduledTime} · {order.technicianName}</p><p className="mt-3 text-xs text-slate-500">{order.area}</p></button>)}</div>
            </div>
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><ClipboardList size={20} /></div><div><h3 className="text-base font-semibold text-slate-900">Fluxo sugerido</h3><p className="mt-1 text-sm text-slate-500">Uma referencia clara para uso da equipe.</p></div></div>
              <div className="mt-4 space-y-3">{["Cadastre o item monitorado, o tecnico e o ciclo em dias.", "Quando o prestador chegar, abra a ordem e registre a entrada.", "Ao finalizar o servico, registre a saida para recarregar a barra de saude.", "Use o modal de detalhes para revisar historico e decidir a proxima chamada."].map((item, index) => <div key={item} className="flex items-start gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{index + 1}</div><p className="text-sm leading-6 text-slate-700">{item}</p></div>)}</div>
            </div>
          </div>
        </section>

        {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}
        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
      </div>

      <OrderFormModal open={formOpen} mode={formMode} form={form} setForm={setForm} saving={saving} onClose={() => setFormOpen(false)} onSubmit={handleSubmitForm} />
      <DetailsModal open={detailsOpen} order={selectedOrder} canManage={canManage} saving={saving} onClose={() => setDetailsOpen(false)} onEdit={openEditModal} onStart={() => openAccessModal("checkin")} onFinish={() => openAccessModal("checkout")} onCancelOrder={handleCancelOrder} />
      <AccessModal open={accessMode !== null} mode={accessMode ?? "checkin"} value={accessDateTime} setValue={setAccessDateTime} notes={accessNotes} setNotes={setAccessNotes} order={selectedOrder} saving={saving} onClose={() => setAccessMode(null)} onSubmit={handleAccessSubmit} />
    </AppLayout>
  );
}
