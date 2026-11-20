import { X } from "lucide-react";
import type { InviteUserPayload } from "../../../features/dashboard/services/users";
import type { BuildingApartmentOption } from "../../../features/predio/services/predio";
import { inputCls, apartmentLabel, type Role, type ResidentType } from "../types";

type Props = {
  open: boolean;
  inviteForm: InviteUserPayload;
  setInviteForm: React.Dispatch<React.SetStateAction<InviteUserPayload>>;
  submitting: boolean;
  formError: string;
  selectedTower: string;
  setSelectedTower: (t: string) => void;
  towerOptions: string[];
  availableApartments: BuildingApartmentOption[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
};

export function InviteModal({
  open, inviteForm, setInviteForm, submitting, formError,
  selectedTower, setSelectedTower, towerOptions, availableApartments,
  onClose, onSubmit,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Convidar usuário</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="px-6 py-4 space-y-4">
          <p className="text-xs text-gray-500">Um e-mail será enviado para o usuário completar o cadastro.</p>
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">E-mail *</label>
            <input type="email" required placeholder="email@exemplo.com" value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Perfil</label>
            <select value={inviteForm.role} onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as Role }))} className={inputCls}>
              <option value="MORADOR">Morador</option>
              <option value="PORTEIRO">Porteiro</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</label>
            <select value={inviteForm.residentType} onChange={(e) => setInviteForm((f) => ({ ...f, residentType: e.target.value as ResidentType }))} className={inputCls}>
              <option value="PROPRIETARIO">Proprietário</option>
              <option value="INQUILINO">Inquilino</option>
              <option value="VISITANTE">Visitante</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bloco</label>
              <select value={selectedTower} onChange={(e) => { setSelectedTower(e.target.value); setInviteForm((f) => ({ ...f, apartmentId: null })); }} className={inputCls}>
                <option value="">Sem bloco</option>
                {towerOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Apartamento</label>
              <select value={inviteForm.apartmentId ?? ""} onChange={(e) => setInviteForm((f) => ({ ...f, apartmentId: e.target.value || null }))} disabled={!selectedTower} className={inputCls}>
                <option value="">{selectedTower ? "Sem apto" : "Selecione o bloco"}</option>
                {availableApartments.map((a) => <option key={a.id} value={a.id}>{apartmentLabel(a)}</option>)}
              </select>
            </div>
          </div>
          {formError && <p className="text-xs text-rose-500">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">Cancelar</button>
            <button type="submit" disabled={submitting}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer transition-colors">
              {submitting ? "Enviando..." : "Enviar convite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
