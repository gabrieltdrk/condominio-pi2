import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Building2, Loader2 } from "lucide-react";
import AppLayout from "../../../features/layout/components/app-layout";
import {
  listContas,
  createConta,
  updateConta,
  deleteConta,
  CONTA_TIPO_LABELS,
  type ContaBancaria,
  type ContaTipo,
  type CreateContaPayload,
} from "../../../features/financeiro/services/contas";

const TIPO_OPTIONS: { value: ContaTipo; label: string }[] = [
  { value: "conta_corrente", label: "Conta Corrente" },
  { value: "conta_poupanca", label: "Conta Poupança" },
  { value: "conta_bancaria", label: "Conta Bancária" },
  { value: "caixa", label: "Caixa" },
  { value: "outro", label: "Outro" },
];

const EMPTY_FORM: CreateContaPayload = {
  nome: "",
  tipo: "conta_corrente",
  banco: "",
  agencia: "",
  numero: "",
};

export default function ContasPage() {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContaBancaria | null>(null);
  const [form, setForm] = useState<CreateContaPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      setContas(await listContas());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao carregar contas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErr("");
    setModalOpen(true);
  }

  function openEdit(conta: ContaBancaria) {
    setEditing(conta);
    setForm({ nome: conta.nome, tipo: conta.tipo, banco: conta.banco, agencia: conta.agencia, numero: conta.numero });
    setFormErr("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setFormErr("Nome é obrigatório."); return; }
    if (!form.banco.trim()) { setFormErr("Banco é obrigatório."); return; }
    if (!form.numero.trim()) { setFormErr("Número é obrigatório."); return; }

    setSaving(true);
    setFormErr("");
    try {
      if (editing) {
        await updateConta(editing.id, form);
      } else {
        await createConta(form);
      }
      closeModal();
      await load();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Excluir esta conta? Esta ação não pode ser desfeita.")) return;
    setDeletingId(id);
    try {
      await deleteConta(id);
      await load();
    } catch {
      alert("Erro ao excluir conta.");
    } finally {
      setDeletingId(null);
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

  return (
    <AppLayout title="Contas Bancárias">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Contas</h2>
            <p className="text-sm text-gray-400 mt-0.5">Gerencie as contas bancárias do condomínio.</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            <Plus size={16} />
            Nova conta
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-indigo-400" />
          </div>
        )}

        {err && !loading && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{err}</div>
        )}

        {!loading && !err && contas.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
              <Building2 size={22} className="text-indigo-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Nenhuma conta cadastrada</p>
            <p className="text-xs text-gray-400">Adicione as contas bancárias do condomínio.</p>
          </div>
        )}

        {!loading && contas.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Nome</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 hidden sm:table-cell">Tipo</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 hidden md:table-cell">Banco</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 hidden md:table-cell">Agência</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Número</th>
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contas.map((conta) => (
                  <tr key={conta.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-800">{conta.nome}</td>
                    <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">
                      {CONTA_TIPO_LABELS[conta.tipo] ?? conta.tipo}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{conta.banco}</td>
                    <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{conta.agencia || "—"}</td>
                    <td className="px-5 py-3.5 text-gray-500">{conta.numero}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(conta)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(conta.id)}
                          disabled={deletingId === conta.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          {deletingId === conta.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">
                  {editing ? "Editar conta" : "Nova conta"}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Nome <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Conta principal"
                    className={inputCls}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as ContaTipo }))}
                    className={inputCls}
                  >
                    {TIPO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Banco <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.banco}
                    onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))}
                    placeholder="Ex: Bradesco, Itaú, Nubank..."
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agência</label>
                    <input
                      type="text"
                      value={form.agencia}
                      onChange={(e) => setForm((f) => ({ ...f, agencia: e.target.value }))}
                      placeholder="0000"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Número <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.numero}
                      onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                      placeholder="00000-0"
                      className={inputCls}
                    />
                  </div>
                </div>

                {formErr && <p className="text-xs text-red-500">{formErr}</p>}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition cursor-pointer"
                  >
                    {saving ? "Salvando..." : editing ? "Salvar" : "Criar conta"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
