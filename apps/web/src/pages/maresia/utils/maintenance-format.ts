import type { MaintenanceOrder } from "../../../features/maintenance/services/maintenance";

export type AssetHealth = {
  percentage: number;
  daysRemaining: number;
  nextServiceDate: string | null;
  statusLabel: string;
  statusTone: string;
  barTone: string;
};

export function toLocalDateTimeValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function nowLocalDateTime() {
  return toLocalDateTimeValue(new Date().toISOString());
}

export function formatDate(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatDateTime(value: string | null) {
  if (!value) return "Nao registrado";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatSimpleDate(value: string | null) {
  if (!value) return "Nao definido";
  return new Date(value).toLocaleDateString("pt-BR", { dateStyle: "short" });
}

export function formatCurrency(value: number | null) {
  if (value === null) return "Nao informado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatFileSize(value: number | null) {
  if (!value) return "Tamanho nao informado";
  if (value >= 1024 * 1024) return `${(value / 1048576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

export function isToday(date: string) {
  return date === new Date().toISOString().slice(0, 10);
}

export function getAssetHealth(order: MaintenanceOrder): AssetHealth {
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
