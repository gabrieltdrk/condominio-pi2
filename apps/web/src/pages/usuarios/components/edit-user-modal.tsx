import { X } from "lucide-react";
import type { UpdateUserPayload, UserRecord } from "../../../features/dashboard/services/users";
import type { BuildingApartmentOption } from "../../../features/predio/services/predio";
import {
  CAR_PLATE_INPUT_TITLE, CAR_PLATE_PATTERN,
  formatCarPlate, formatPhone,
  PHONE_INPUT_TITLE, PHONE_PATTERN,
} from "../../../features/dashboard/utils/user-form";
import { inputCls, apartmentLabel, type Role, type ResidentType, type UserStatus } from "../types";

type EditForm = Omit<UpdateUserPayload, "id">;

type Props = {
  open: boolean;
  editingUser: UserRecord | null;
  editForm: EditForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>;
  submitting: boolean;
  formError: string;
  selectedTower: string;
  setSelectedTower: (t: string) => void;
  towerOptions: string[];
  availableApartments: BuildingApartmentOption[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
};

export function EditUserModal({
  open, editingUser, editForm, setEditForm, submitting, formError,
  selectedTower, setSelectedTower, towerOptions, availableApartments,
  onClose, onSubmit,
}: Props) {
  if (!open || !editingUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Editar usuário</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 gap-6 overflow-y-auto px-6 py-4 md:grid-cols-2">
            <div className="grid gap-4">
              {([
                { label: "Nome completo", type: "text", key: "name" as const, placeholder: "Nome completo" },
                { label: "Email", type: "email", key: "email" as const, placeholder: "email@exemplo.com" },
                { label: "Telefone", type: "tel", key: "phone" as const, placeholder: "(11) 99999-9999" },
              ]).map((f) => (
                <div key={f.key} className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={editForm[f.key] as string}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, [f.key]: f.key === "phone" ? formatPhone(e.target.value) : e.target.value }))}
                    pattern={f.key === "phone" ? PHONE_PATTERN : undefined}
                    title={f.key === "phone" ? PHONE_INPUT_TITLE : undefined}
                    inputMode={f.key === "phone" ? "tel" : undefined}
                    maxLength={f.key === "phone" ? 15 : undefined}
                    className={inputCls} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Placa</label>
                  <input value={editForm.carPlate} onChange={(e) => setEditForm((prev) => ({ ...prev, carPlate: formatCarPlate(e.target.value) }))}
                    placeholder="ABC-1234" pattern={CAR_PLATE_PATTERN} title={CAR_PLATE_INPUT_TITLE} maxLength={8} className={inputCls} />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pets</label>
                  <input type="number" min={0} value={editForm.petsCount ?? ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, petsCount: e.target.value === "" ? null : Number(e.target.value) }))}
                    placeholder="0" className={inputCls} />
                </div>
              </div>
            </div>
            <div className="grid gap-4 content-start">
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Perfil</label>
                <select value={editForm.role} onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value as Role }))} className={inputCls}>
                  <option value="MORADOR">Morador</option>
                  <option value="PORTEIRO">Porteiro</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</label>
                <select value={editForm.residentType} onChange={(e) => setEditForm((prev) => ({ ...prev, residentType: e.target.value as ResidentType }))} className={inputCls}>
                  <option value="PROPRIETARIO">Proprietário</option>
                  <option value="INQUILINO">Inquilino</option>
                  <option value="VISITANTE">Visitante</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as UserStatus }))} className={inputCls}>
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 grid gap-3">
                <p className="text-sm font-semibold text-gray-700">Unidade</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bloco</label>
                    <select value={selectedTower} onChange={(e) => { setSelectedTower(e.target.value); setEditForm((prev) => ({ ...prev, apartmentId: null })); }} className={inputCls}>
                      <option value="">Sem bloco</option>
                      {towerOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Apartamento</label>
                    <select value={editForm.apartmentId ?? ""} onChange={(e) => setEditForm((prev) => ({ ...prev, apartmentId: e.target.value || null }))} disabled={!selectedTower} className={inputCls}>
                      <option value="">{selectedTower ? "Sem apto" : "Selecione o bloco"}</option>
                      {availableApartments.map((a) => <option key={a.id} value={a.id}>{apartmentLabel(a)}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 px-6 py-4">
            {formError && <p className="mb-3 text-xs text-rose-500">{formError}</p>}
            <div className="flex justify-end gap-2.5">
              <button type="button" onClick={onClose} disabled={submitting}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">Cancelar</button>
              <button type="submit" disabled={submitting}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer transition-colors">
                {submitting ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
