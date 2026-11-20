import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import AppLayout from "../../features/layout/components/app-layout";
import {
  listRecursos,
  createRecurso,
  updateRecurso,
  deleteRecurso,
  ICONE_OPTIONS,
  type Recurso,
} from "../../features/agendamentos/services/recursos";
import { getIcone } from "../../features/agendamentos/utils/icones";

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

const EMPTY_FORM = { nome: "", descricao: "", icone: "default" };

export default function AreasComuns() {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Recurso | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr("");
    try { setRecursos(await listRecursos()); }
    catch (e) { setErr(e instanceof Error ? e.message : "Erro ao carregar."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErr("");
    setModalOpen(true);
  }

  function openEdit(r: Recurso) {
    setEditing(r);
    setForm({ nome: r.nome, descricao: r.descricao ?? "", icone: r.icone });
    setFormErr("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setFormErr("Nome é obrigatório."); return; }
    setSaving(true);
    setFormErr("");
    try {
      if (editing) {
        await updateRecurso(editing.id, { nome: form.nome, descricao: form.descricao, icone: form.icone });
      } else {
        await createRecurso({ nome: form.nome, descricao: form.descricao, icone: form.icone });
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(r: Recurso) {
    setTogglingId(r.id);
    try { await updateRecurso(r.id, { ativo: !r.ativo }); await load(); }
    finally { setTogglingId(null); }
  }

  async function handleDelete(r: Recurso) {
    if (!window.confirm(`Excluir "${r.nome}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(r.id);
    try { await deleteRecurso(r.id); await load(); }
    catch { alert("Erro ao excluir. Verifique se não há agendamentos vinculados."); }
    finally { setDeletingId(null); }
  }

  return (
    <AppLayout title="Áreas Comuns">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Áreas Comuns</h2>
            <p className="text-sm text-gray-400 mt-0.5">Gerencie os espaços disponíveis para agendamento.</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition cursor-pointer">
            <Plus size={16} /> Nova área
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

        {!loading && !err && recursos.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
              <Plus size={20} className="text-indigo-400" />
            </div>
            <p className="text-sm text-gray-500 font-semibold">Nenhuma área cadastrada</p>
            <p className="text-xs text-gray-400">Adicione os espaços disponíveis no seu condomínio.</p>
          </div>
        )}

        {!loading && recursos.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recursos.map(r => {
              const Icon = getIcone(r.icone);
              return (
                <div key={r.id}
                  className={`rounded-2xl border bg-white p-5 transition-colors ${r.ativo ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                  <div className="flex items-start gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${r.ativo ? "bg-indigo-50" : "bg-gray-100"}`}>
                      <Icon size={20} className={r.ativo ? "text-indigo-600" : "text-gray-400"} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-sm">{r.nome}</p>
                      {r.descricao && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{r.descricao}</p>}
                      <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        r.ativo ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                      }`}>
                        {r.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-1">
                    <button onClick={() => handleToggle(r)} disabled={togglingId === r.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                      title={r.ativo ? "Desativar" : "Ativar"}>
                      {togglingId === r.id
                        ? <Loader2 size={15} className="animate-spin" />
                        : r.ativo ? <ToggleRight size={17} className="text-emerald-500" /> : <ToggleLeft size={17} />}
                    </button>
                    <button onClick={() => openEdit(r)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(r)} disabled={deletingId === r.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Excluir">
                      {deletingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">{editing ? "Editar área" : "Nova área"}</h3>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Nome <span className="text-red-400">*</span>
                  </label>
                  <input type="text" value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Salão de Festas" className={inputCls} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Descrição</label>
                  <input type="text" value={form.descricao}
                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    placeholder="Ex: Ideal para eventos e confraternizações" className={inputCls} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Ícone</label>
                  <div className="grid grid-cols-4 gap-2">
                    {ICONE_OPTIONS.map(opt => {
                      const Icon = getIcone(opt.value);
                      const active = form.icone === opt.value;
                      return (
                        <button key={opt.value} type="button"
                          onClick={() => setForm(f => ({ ...f, icone: opt.value }))}
                          className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors ${
                            active ? "border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
                          }`}>
                          <Icon size={18} className={active ? "text-indigo-600" : "text-gray-400"} />
                          <span className={`text-[10px] font-semibold ${active ? "text-indigo-600" : "text-gray-400"}`}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formErr && <p className="text-xs text-red-500">{formErr}</p>}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setModalOpen(false)}
                    className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl transition cursor-pointer">
                    {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
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
