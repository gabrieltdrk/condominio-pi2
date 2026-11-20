import { X } from "lucide-react";
import type { MaintenanceCategory, MaintenanceKind, MaintenancePriority, MaintenanceStatus } from "../../../features/maintenance/services/maintenance";
import { inputClass, labelClass, textareaClass, CATEGORY_OPTIONS, KIND_OPTIONS, PRIORITY_OPTIONS, STATUS_META } from "../utils/maintenance-meta";

export type OrderFormState = {
  title: string;
  kind: MaintenanceKind;
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
  estimatedCost: string;
  finalCost: string;
  approvedByName: string;
  notes: string;
};

function requiredLabel(label: string) {
  return <>{label}<span className="ml-1 text-rose-500">*</span></>;
}

export function OrderFormModal({
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
      <div className="flex max-h-[92vh] w-full max-w-3xl min-w-0 flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
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
          <div className="mb-5 rounded-[24px] border border-sky-100 bg-sky-50 px-4 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Preenchimento guiado</p>
            <p className="mt-1">Campos com <span className="font-semibold text-rose-500">*</span> sao obrigatorios. Custos, aprovacao e observacoes podem ser preenchidos depois.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2"><span className={labelClass}>{requiredLabel("Titulo do servico")}</span><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} placeholder="Ex.: Revisao da bomba da cisterna" /></label>
            <label className="block"><span className={labelClass}>Tipo</span><select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as MaintenanceKind }))} className={inputClass}>{KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="block"><span className={labelClass}>{requiredLabel("Item monitorado")}</span><input value={form.assetName} onChange={(event) => setForm((current) => ({ ...current, assetName: event.target.value }))} className={inputClass} placeholder="Ex.: Elevador social" /></label>
            <label className="block"><span className={labelClass}>{requiredLabel("Area")}</span><input value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} className={inputClass} placeholder="Ex.: Casa de maquinas" /></label>
            <label className="block"><span className={labelClass}>Categoria</span><select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as MaintenanceCategory }))} className={inputClass}>{CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="block"><span className={labelClass}>Prioridade</span><select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as MaintenancePriority }))} className={inputClass}>{PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            {mode === "edit" && <label className="block"><span className={labelClass}>Status</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as MaintenanceStatus }))} className={inputClass}>{Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label>}
            <label className="block"><span className={labelClass}>{requiredLabel("Empresa prestadora")}</span><input value={form.supplierName} onChange={(event) => setForm((current) => ({ ...current, supplierName: event.target.value }))} className={inputClass} placeholder="Ex.: Elevadores Sigma" /></label>
            <label className="block"><span className={labelClass}>{requiredLabel("Tecnico responsavel")}</span><input value={form.technicianName} onChange={(event) => setForm((current) => ({ ...current, technicianName: event.target.value }))} className={inputClass} placeholder="Nome de quem vem executar" /></label>
            <label className="block"><span className={labelClass}>{requiredLabel("Responsavel interno")}</span><input value={form.responsibleName} onChange={(event) => setForm((current) => ({ ...current, responsibleName: event.target.value }))} className={inputClass} placeholder="Ex.: Portaria" /></label>
            <label className="block"><span className={labelClass}>{requiredLabel("Data prevista")}</span><input type="date" value={form.scheduledDate} onChange={(event) => setForm((current) => ({ ...current, scheduledDate: event.target.value }))} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>{requiredLabel("Horario previsto")}</span><input type="time" value={form.scheduledTime} onChange={(event) => setForm((current) => ({ ...current, scheduledTime: event.target.value }))} className={inputClass} /></label>
            <label className="block md:col-span-2"><span className={labelClass}>{requiredLabel("Ciclo de manutencao em dias")}</span><input type="number" min="1" value={form.maintenanceIntervalDays} onChange={(event) => setForm((current) => ({ ...current, maintenanceIntervalDays: event.target.value }))} className={inputClass} placeholder="Ex.: 90" /><p className="mt-2 text-xs text-slate-500">Esse valor alimenta o indicador de saude do ativo e a previsao da proxima revisao.</p></label>
            <label className="block"><span className={labelClass}>Custo estimado</span><input type="number" min="0" step="0.01" value={form.estimatedCost} onChange={(event) => setForm((current) => ({ ...current, estimatedCost: event.target.value }))} className={inputClass} placeholder="Ex.: 450.00" /></label>
            <label className="block"><span className={labelClass}>Custo final</span><input type="number" min="0" step="0.01" value={form.finalCost} onChange={(event) => setForm((current) => ({ ...current, finalCost: event.target.value }))} className={inputClass} placeholder="Ex.: 480.00" /></label>
            <label className="block md:col-span-2"><span className={labelClass}>Aprovado por</span><input value={form.approvedByName} onChange={(event) => setForm((current) => ({ ...current, approvedByName: event.target.value }))} className={inputClass} placeholder="Ex.: Sindico / Administradora" /></label>
            <label className="block md:col-span-2"><span className={labelClass}>Observacoes</span><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} className={textareaClass} placeholder="Informacoes importantes para a equipe e para a portaria." /></label>
          </div>
        </div>
        <div className="border-t border-slate-200 px-6 py-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancelar</button>
            <button type="button" onClick={() => void onSubmit()} disabled={saving} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{saving ? "Salvando..." : mode === "create" ? "Criar manutencao" : "Salvar alteracoes"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
