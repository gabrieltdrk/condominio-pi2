import { Paperclip, Upload, X } from "lucide-react";
import type { MaintenanceAttachment, MaintenanceOrder } from "../../../features/maintenance/services/maintenance";
import { STATUS_META, PRIORITY_META } from "../utils/maintenance-meta";
import { formatDate, formatDateTime, formatSimpleDate, formatCurrency, formatFileSize, getAssetHealth } from "../utils/maintenance-format";

export function DetailsModal({
  open,
  order,
  assetHistory,
  attachments,
  canManage,
  saving,
  uploading,
  onClose,
  onEdit,
  onStart,
  onFinish,
  onCancelOrder,
  onUploadImage,
  onDeleteAttachment,
}: {
  open: boolean;
  order: MaintenanceOrder | null;
  assetHistory: MaintenanceOrder[];
  attachments: MaintenanceAttachment[];
  canManage: boolean;
  saving: boolean;
  uploading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onStart: () => void;
  onFinish: () => void;
  onCancelOrder: () => Promise<void>;
  onUploadImage: (file: File) => Promise<void>;
  onDeleteAttachment: (attachment: MaintenanceAttachment) => Promise<void>;
}) {
  if (!open || !order) return null;
  const health = getAssetHealth(order);
  const timeline = [
    { label: "Ordem criada", value: formatDateTime(order.createdAt) },
    { label: "Aprovacao registrada", value: order.approvedAt ? `${formatDateTime(order.approvedAt)} · ${order.approvedByName || "Responsavel"}` : "Nao registrada" },
    { label: "Entrada do tecnico", value: formatDateTime(order.checkInAt) },
    { label: "Saida do tecnico", value: formatDateTime(order.checkOutAt) },
  ];

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_META[order.status].tone}`}>{STATUS_META[order.status].label}</div>
            <h3 className="mt-3 break-words text-2xl font-semibold text-slate-950">{order.title}</h3>
            <p className="mt-1 break-words text-sm text-slate-500">{order.assetName} · {order.area} · {formatDate(order.scheduledDate, order.scheduledTime)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Resumo rapido</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_META[order.status].tone}`}>{STATUS_META[order.status].label}</span>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${PRIORITY_META[order.priority]}`}>{order.priority}</span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">{order.category}</span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">{order.kind}</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0 rounded-2xl border border-white/80 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Ativo</p>
                <p className="mt-2 break-words text-sm font-semibold text-slate-900">{order.assetName}</p>
              </div>
              <div className="min-w-0 rounded-2xl border border-white/80 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Agendamento</p>
                <p className="mt-2 break-words text-sm font-semibold text-slate-900">{formatDate(order.scheduledDate, order.scheduledTime)}</p>
              </div>
              <div className="min-w-0 rounded-2xl border border-white/80 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Codigo</p>
                <p className="mt-2 break-all text-sm font-semibold text-slate-900">{order.orderCode}</p>
              </div>
              <div className="min-w-0 rounded-2xl border border-white/80 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Proxima revisao</p>
                <p className="mt-2 break-words text-sm font-semibold text-slate-900">{formatSimpleDate(health.nextServiceDate)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operacao</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Prestador</p><p className="mt-2 break-words text-sm font-semibold text-slate-900">{order.supplierName}</p><p className="mt-1 break-words text-sm text-slate-600">Tecnico: {order.technicianName}</p><p className="mt-1 break-words text-sm text-slate-600">Responsavel interno: {order.responsibleName}</p></div>
              <div className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Saude do ativo</p><div className="mt-2 flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-900">{order.assetName}</p><p className={`mt-1 break-words text-sm font-medium ${health.statusTone}`}>{health.statusLabel}</p></div><div className="shrink-0 text-right text-sm text-slate-500"><p>{health.percentage}%</p><p>{health.daysRemaining <= 0 ? `${Math.abs(health.daysRemaining)} dias em atraso` : `${health.daysRemaining} dias restantes`}</p></div></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${health.barTone}`} style={{ width: `${health.percentage}%` }} /></div><p className="mt-3 break-words text-xs text-slate-500">Ultima manutencao: {formatSimpleDate(order.lastServiceAt ?? order.checkOutAt)}</p></div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Entrada registrada</p><p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(order.checkInAt)}</p></div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Saida registrada</p><p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(order.checkOutAt)}</p></div>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Financeiro e aprovacao</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Financeiro</p><p className="mt-2 text-sm text-slate-600">Estimado: <span className="font-semibold text-slate-900">{formatCurrency(order.estimatedCost)}</span></p><p className="mt-1 text-sm text-slate-600">Final: <span className="font-semibold text-slate-900">{formatCurrency(order.finalCost)}</span></p></div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Aprovacao</p><p className="mt-2 text-sm font-semibold text-slate-900">{order.approvedByName || "Nao informada"}</p><p className="mt-1 text-sm text-slate-600">{order.approvedAt ? formatDateTime(order.approvedAt) : "Sem data de aprovacao"}</p></div>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Timeline da ordem</p>
                <p className="mt-1 text-xs text-slate-500">Eventos principais desta manutencao em ordem de acompanhamento.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">{timeline.map((item) => <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"><div className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-900" /><div><p className="text-sm font-semibold text-slate-900">{item.label}</p><p className="mt-1 text-xs text-slate-500">{item.value}</p></div></div>)}</div>
          </div>

          <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Evidencias</p>
                <p className="mt-1 text-xs text-slate-500">Imagens, PDFs e comprovantes ligados a esta manutencao.</p>
              </div>
              {canManage && <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><Upload size={16} />{uploading ? "Enviando..." : "Enviar imagem"}<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void onUploadImage(file); }} /></label>}
            </div>
            <div className="mt-4 space-y-3">
              {attachments.length === 0
                ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">Nenhuma evidencia enviada ainda.</div>
                : attachments.map((attachment) => (
                    <div key={attachment.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Paperclip size={16} /></div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{attachment.fileName}</p>
                            <p className="mt-1 text-xs text-slate-500">{formatDateTime(attachment.createdAt)} · {attachment.createdByName} · {formatFileSize(attachment.sizeBytes)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a href={attachment.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><Paperclip size={15} />Abrir</a>
                        {canManage && <button type="button" onClick={() => void onDeleteAttachment(attachment)} className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">Remover</button>}
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>

          {assetHistory.length > 0 && (
            <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Historico recente do ativo</p>
              <div className="mt-4 space-y-3">{assetHistory.map((historyOrder) => <div key={historyOrder.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">{historyOrder.title}</p><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_META[historyOrder.status].tone}`}>{STATUS_META[historyOrder.status].label}</span></div><p className="mt-1 text-xs text-slate-500">{formatDate(historyOrder.scheduledDate, historyOrder.scheduledTime)} · {historyOrder.kind}</p></div>)}</div>
            </div>
          )}
          {order.notes && <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Descricao</p><p className="mt-2 break-words text-sm leading-6 text-slate-700">{order.notes}</p></div>}
          {order.accessNotes && <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Historico de acesso</p><p className="mt-2 break-words text-sm leading-6 text-slate-700">{order.accessNotes}</p></div>}
        </div>

        {canManage && (
          <div className="border-t border-slate-200 px-6 py-4">
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={onEdit} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Editar</button>
              {order.status === "AGENDADA" && <button type="button" onClick={onStart} className="rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700">Registrar entrada</button>}
              {order.status === "EM_ANDAMENTO" && <button type="button" onClick={onFinish} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">Registrar saida</button>}
              {order.status !== "CANCELADA" && order.status !== "CONCLUIDA" && <button type="button" onClick={() => void onCancelOrder()} disabled={saving} className="rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60">Cancelar manutencao</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
