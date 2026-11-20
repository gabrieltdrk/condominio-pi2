import { X } from "lucide-react";
import type { MaintenanceOrder } from "../../../features/maintenance/services/maintenance";
import { inputClass, labelClass, textareaClass } from "../utils/maintenance-meta";

export function AccessModal({
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
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">{mode === "checkin" ? "Registrar entrada" : "Registrar saida"}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">{order.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Tecnico: <strong>{order.technicianName}</strong><br />Empresa: <strong>{order.supplierName}</strong></div>
          <label className="block"><span className={labelClass}>{mode === "checkin" ? "Horario real de entrada" : "Horario real de saida"}</span><input type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} className={inputClass} /></label>
          <label className="block"><span className={labelClass}>Observacoes de acesso</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className={textareaClass} placeholder="Ex.: tecnico foi acompanhado ate a cobertura..." /></label>
        </div>
        <div className="border-t border-slate-200 px-6 py-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Fechar</button>
            <button type="button" onClick={() => void onSubmit()} disabled={saving} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{saving ? "Salvando..." : mode === "checkin" ? "Confirmar entrada" : "Confirmar saida"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

