import { X } from "lucide-react";
import type { Condominio, FormState } from "../types";
import { PLANS } from "../types";
import { formatCnpj, formatPhone, formatCep } from "../utils/condominio-format";

const inputCls =
  "px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-[13px] outline-none w-full focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";
const readonlyCls =
  "px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-[13px] w-full cursor-not-allowed";

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className={`-mx-4 px-4 sm:-mx-6 sm:px-6 py-2.5 mb-4 ${color}`}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-current">{label}</p>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

type Props = {
  open: boolean;
  editing: Condominio | null;
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  cepLoading: boolean;
  saving: boolean;
  formError: string | null;
  onCepBlur: () => Promise<void>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
};

export function CondominioFormModal({ open, editing, form, set, cepLoading, saving, formError, onCepBlur, onSubmit, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl flex flex-col">
        <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col min-h-0">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 sm:px-6 py-4 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">
              {editing ? "Editar Condomínio" : "Novo Condomínio"}
            </h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            <div className="space-y-0">

              {/* ── Identificação ── */}
              <section className="px-4 sm:px-6 pt-5 pb-4">
                <SectionHeader label="Identificação" color="bg-indigo-50 text-indigo-600" />
                <div className="flex flex-col gap-3">
                  <div>
                    <FieldLabel required>Nome do condomínio</FieldLabel>
                    <input
                      className={inputCls}
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Ex.: Residencial Blainville"
                    />
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1 min-w-0">
                      <FieldLabel>CNPJ</FieldLabel>
                      <input
                        className={inputCls}
                        value={form.cnpj}
                        onChange={(e) => set("cnpj", formatCnpj(e.target.value))}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                    </div>
                    <div className="shrink-0 w-48">
                      <FieldLabel required>Plano</FieldLabel>
                      <select
                        value={form.plan}
                        onChange={(e) => set("plan", e.target.value)}
                        required
                        className={inputCls}
                      >
                        <option value="" disabled>Selecione...</option>
                        {PLANS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="shrink-0 pb-1.5">
                      <FieldLabel>Status</FieldLabel>
                      <div className="flex items-center gap-2.5 pt-1.5">
                        <button
                          type="button"
                          onClick={() => set("active", !form.active)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                            form.active ? "bg-emerald-500" : "bg-red-400"
                          }`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${form.active ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                        <span className={`text-[13px] font-medium ${form.active ? "text-emerald-600" : "text-red-500"}`}>
                          {form.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="border-t border-gray-100" />

              {/* ── Endereço ── */}
              <section className="px-4 sm:px-6 pt-5 pb-4">
                <SectionHeader label="Endereço" color="bg-sky-50 text-sky-600" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>
                      CEP{cepLoading && <span className="ml-1 text-indigo-400 normal-case font-normal">(buscando...)</span>}
                    </FieldLabel>
                    <input
                      className={inputCls}
                      value={form.zip_code}
                      onChange={(e) => set("zip_code", formatCep(e.target.value))}
                      onBlur={() => void onCepBlur()}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                  <div>
                    <FieldLabel>Bairro</FieldLabel>
                    <input className={readonlyCls} value={form.neighborhood} readOnly placeholder="Preenchido pelo CEP" />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Logradouro</FieldLabel>
                    <input className={readonlyCls} value={form.address} readOnly placeholder="Preenchido pelo CEP" />
                  </div>
                  <div>
                    <FieldLabel required>Número</FieldLabel>
                    <input
                      className={inputCls}
                      value={form.number}
                      onChange={(e) => set("number", e.target.value)}
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <FieldLabel>Referência</FieldLabel>
                    <input
                      className={inputCls}
                      value={form.reference}
                      onChange={(e) => set("reference", e.target.value)}
                      placeholder="Próximo a..."
                    />
                  </div>
                  <div>
                    <FieldLabel>Cidade</FieldLabel>
                    <input className={readonlyCls} value={form.city} readOnly placeholder="Preenchido pelo CEP" />
                  </div>
                  <div>
                    <FieldLabel>UF</FieldLabel>
                    <input className={readonlyCls} value={form.state} readOnly placeholder="—" />
                  </div>
                </div>
              </section>

              <div className="border-t border-gray-100" />

              {/* ── Gestão Administrativa ── */}
              <section className="px-4 sm:px-6 pt-5 pb-4">
                <SectionHeader label="Gestão Administrativa" color="bg-violet-50 text-violet-600" />

                <p className="mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Síndico</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
                  <div>
                    <FieldLabel>Nome</FieldLabel>
                    <input
                      className={inputCls}
                      value={form.manager_name}
                      onChange={(e) => set("manager_name", e.target.value)}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <FieldLabel>Telefone de contato</FieldLabel>
                    <input
                      className={inputCls}
                      value={form.manager_phone}
                      onChange={(e) => set("manager_phone", formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>E-mail</FieldLabel>
                    <input
                      type="email"
                      className={inputCls}
                      value={form.manager_email}
                      onChange={(e) => set("manager_email", e.target.value)}
                      placeholder="sindico@email.com"
                    />
                  </div>
                </div>

                <p className="mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Administradora</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Nome da administradora</FieldLabel>
                    <input
                      className={inputCls}
                      value={form.management_company}
                      onChange={(e) => set("management_company", e.target.value)}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div>
                    <FieldLabel>Telefone de contato</FieldLabel>
                    <input
                      className={inputCls}
                      value={form.management_contact_phone}
                      onChange={(e) => set("management_contact_phone", formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>E-mail de contato</FieldLabel>
                    <input
                      type="email"
                      className={inputCls}
                      value={form.management_contact_email}
                      onChange={(e) => set("management_contact_email", e.target.value)}
                      placeholder="contato@administradora.com"
                    />
                  </div>
                </div>
              </section>

              {formError && (
                <div className="mx-4 sm:mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  {formError}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 sm:px-6 py-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar condomínio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
