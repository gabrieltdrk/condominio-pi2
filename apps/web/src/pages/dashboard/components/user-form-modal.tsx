import { X } from "lucide-react";
import type { UpdateUserPayload, UserRecord } from "../../../features/dashboard/services/users";

export type UserFormState = Omit<UpdateUserPayload, "id">;

export const EMPTY_USER_FORM: UserFormState = {
  name: "",
  email: "",
  phone: "",
  carPlate: "",
  petsCount: null,
  role: "MORADOR",
  residentType: "PROPRIETARIO",
  status: "ATIVO",
  apartmentId: null,
};

const inputCls =
  "px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-[13px] outline-none w-full focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

type Props = {
  open: boolean;
  editingUser: UserRecord | null;
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  submitting: boolean;
  formError: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function UserFormModal({ open, editingUser, form, setForm, submitting, formError, onClose, onSubmit }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-1000 p-4">
      <div
        className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="m-0 text-base font-semibold text-gray-900">{editingUser ? "Editar usuário" : "Novo usuário"}</h3>
          <button className="p-1.5 rounded-lg border-none bg-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer transition-colors" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form className="grid gap-4" onSubmit={(e) => void onSubmit(e)}>
          {[
            { id: "u-name", label: "Nome completo", type: "text", placeholder: "Nome completo", key: "name" as const },
            { id: "u-email", label: "Email", type: "email", placeholder: "email@exemplo.com", key: "email" as const },
            { id: "u-phone", label: "Telefone", type: "tel", placeholder: "(11) 99999-9999", key: "phone" as const },
          ].map((f) => (
            <div key={f.id} className="grid gap-1.5">
              <label htmlFor={f.id} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</label>
              <input
                id={f.id}
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                required
                className={inputCls}
              />
            </div>
          ))}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="u-car-plate" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Placa do carro</label>
              <input
                id="u-car-plate"
                type="text"
                placeholder="ABC-1234"
                value={form.carPlate}
                onChange={(e) => setForm({ ...form, carPlate: e.target.value.toUpperCase() })}
                className={inputCls}
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="u-pets-count" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Número de pets</label>
              <input
                id="u-pets-count"
                type="number"
                min={0}
                placeholder="0"
                value={form.petsCount ?? ""}
                onChange={(e) => setForm({ ...form, petsCount: e.target.value === "" ? null : Number(e.target.value) })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="u-role" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Perfil</label>
            <select
              id="u-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "MORADOR" })}
              className={inputCls}
            >
              <option value="MORADOR">Morador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="u-resident-type" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo de morador</label>
            <select
              id="u-resident-type"
              value={form.residentType}
              onChange={(e) => setForm({ ...form, residentType: e.target.value as UpdateUserPayload["residentType"] })}
              className={inputCls}
            >
              <option value="PROPRIETARIO">Proprietário</option>
              <option value="INQUILINO">Inquilino</option>
              <option value="VISITANTE">Visitante</option>
            </select>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="u-status" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
            <select
              id="u-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as UpdateUserPayload["status"] })}
              className={inputCls}
            >
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>

          {formError && <p className="text-xs text-rose-500 m-0">{formError}</p>}

          <div className="flex justify-end gap-2.5 mt-1">
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer border-none transition-colors"
              disabled={submitting}
            >
              {submitting ? "Salvando..." : editingUser ? "Salvar alterações" : "Criar usuário"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
