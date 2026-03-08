import { useEffect, useState } from "react";
import { AlertCircle, ClipboardList, Eye, Plus, RefreshCw, X } from "lucide-react";
import AppLayout from "../../components/app-layout";
import { getUser } from "../../services/auth";
import {
  createOcorrencia,
  listOcorrencias,
  updateOcorrencia,
  type CreateOcorrenciaPayload,
  type Ocorrencia,
  type OcorrenciaStatus,
  type OcorrenciaUrgencia,
} from "../../services/ocorrencias";

const CATEGORIAS = ["Manutenção", "Barulho", "Reclamação", "Sugestão", "Dúvida"];
const LOCALIZACOES = ["Áreas comuns", "Minha unidade", "Garagem", "Portaria"];
const URGENCIAS: OcorrenciaUrgencia[] = ["Baixa", "Média", "Alta"];
const STATUS_OPTIONS: OcorrenciaStatus[] = [
  "Aberto",
  "Em Análise",
  "Em Atendimento",
  "Pendente Terceiros",
  "Concluído",
  "Cancelado",
];

const card = "border border-gray-200 rounded-[14px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] p-4";
const btn = "px-3 py-2.5 rounded-[10px] border border-gray-200 bg-white text-gray-900 cursor-pointer font-semibold text-sm";
const btnPrimary = `${btn} bg-gray-900 text-white border-gray-900`;
const inputCls = "px-2.5 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-[13px] outline-none w-full focus:border-gray-900";

const STATUS_COLORS: Record<OcorrenciaStatus, string> = {
  Aberto: "bg-blue-50 text-blue-700 border-blue-200",
  "Em Análise": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Em Atendimento": "bg-orange-50 text-orange-700 border-orange-200",
  "Pendente Terceiros": "bg-purple-50 text-purple-700 border-purple-200",
  Concluído: "bg-green-50 text-green-700 border-green-200",
  Cancelado: "bg-gray-100 text-gray-500 border-gray-200",
};

const URGENCIA_COLORS: Record<OcorrenciaUrgencia, string> = {
  Baixa: "bg-green-50 text-green-700 border-green-200",
  Média: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Alta: "bg-red-50 text-red-700 border-red-200",
};

const EMPTY_FORM: CreateOcorrenciaPayload = {
  categoria: CATEGORIAS[0],
  localizacao: LOCALIZACOES[0],
  assunto: "",
  descricao: "",
  urgencia: "Média",
};

function Badge({ text, cls }: { text: string; cls: string }) {
  return (
    <span className={`text-[11px] font-semibold border px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {text}
    </span>
  );
}

export default function ListaOcorrencias() {
  const user = getUser();
  const isAdmin = user?.role === "ADMIN";

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters (admin only)
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");

  // Nova ocorrência modal
  const [novaOpen, setNovaOpen] = useState(false);
  const [form, setForm] = useState<CreateOcorrenciaPayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Detalhe / gestão modal
  const [detalhe, setDetalhe] = useState<Ocorrencia | null>(null);
  const [editStatus, setEditStatus] = useState<OcorrenciaStatus>("Aberto");
  const [editResponsavel, setEditResponsavel] = useState("");
  const [editRespostaInterna, setEditRespostaInterna] = useState("");
  const [editRespostaMorador, setEditRespostaMorador] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    listOcorrencias()
      .then(setOcorrencias)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  // filtered list
  const filtered = ocorrencias.filter((o) => {
    if (filterStatus && o.status !== filterStatus) return false;
    if (filterCategoria && o.categoria !== filterCategoria) return false;
    return true;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await createOcorrencia(form);
      setNovaOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar ocorrência.");
    } finally {
      setSubmitting(false);
    }
  }

  function openDetalhe(o: Ocorrencia) {
    setDetalhe(o);
    setEditStatus(o.status);
    setEditResponsavel(o.responsavel ?? "");
    setEditRespostaInterna(o.resposta_interna ?? "");
    setEditRespostaMorador(o.resposta_morador ?? "");
    setSaveError("");
  }

  async function handleSaveGestao(e: React.FormEvent) {
    e.preventDefault();
    if (!detalhe) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateOcorrencia(detalhe.id, {
        status: editStatus,
        responsavel: editResponsavel || undefined,
        resposta_interna: editRespostaInterna || undefined,
        resposta_morador: editRespostaMorador || undefined,
      });
      setDetalhe(null);
      load();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  return (
    <AppLayout title={isAdmin ? "Gestão de Ocorrências" : "Minhas Ocorrências"}>
      <div className="grid gap-4">

        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-gray-500" />
            <span className="text-sm text-gray-500">
              {loading ? "Carregando..." : `${filtered.length} ocorrência${filtered.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            {isAdmin && (
              <>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2.5 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-[13px] outline-none focus:border-gray-900"
                >
                  <option value="">Todos os status</option>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  className="px-2.5 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-[13px] outline-none focus:border-gray-900"
                >
                  <option value="">Todas as categorias</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </>
            )}
            <button className={`${btnPrimary} flex items-center gap-1.5`} onClick={() => { setForm(EMPTY_FORM); setFormError(""); setNovaOpen(true); }}>
              <Plus size={15} />
              Nova Ocorrência
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={card}>
          {error && <p className="text-[13px] text-red-600 mb-3">{error}</p>}

          {!loading && filtered.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <AlertCircle size={32} className="text-gray-300" />
              <p className="text-sm text-gray-500">Nenhuma ocorrência encontrada.</p>
              {!isAdmin && (
                <button className={btnPrimary} onClick={() => { setForm(EMPTY_FORM); setFormError(""); setNovaOpen(true); }}>
                  Abrir primeira ocorrência
                </button>
              )}
            </div>
          )}

          {filtered.length > 0 && (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="text-left text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">Protocolo</th>
                  {isAdmin && <th className="text-left text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">Morador</th>}
                  <th className="text-left text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">Assunto</th>
                  <th className="text-left text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">Categoria</th>
                  {isAdmin && <th className="text-left text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">Urgência</th>}
                  <th className="text-left text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">Status</th>
                  <th className="text-left text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">Data</th>
                  <th className="text-right text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2.5 border-b border-gray-200 font-mono text-xs text-gray-600">{o.protocolo}</td>
                    {isAdmin && <td className="px-2 py-2.5 border-b border-gray-200">{o.author_name}</td>}
                    <td className="px-2 py-2.5 border-b border-gray-200 max-w-48 truncate">{o.assunto}</td>
                    <td className="px-2 py-2.5 border-b border-gray-200">{o.categoria}</td>
                    {isAdmin && (
                      <td className="px-2 py-2.5 border-b border-gray-200">
                        <Badge text={o.urgencia} cls={URGENCIA_COLORS[o.urgencia]} />
                      </td>
                    )}
                    <td className="px-2 py-2.5 border-b border-gray-200">
                      <Badge text={o.status} cls={STATUS_COLORS[o.status]} />
                    </td>
                    <td className="px-2 py-2.5 border-b border-gray-200 text-gray-500">{fmt(o.created_at)}</td>
                    <td className="px-2 py-2.5 border-b border-gray-200">
                      <div className="flex gap-2 justify-end">
                        <button
                          className="p-2 rounded-[10px] border border-gray-200 bg-white cursor-pointer"
                          title="Ver / Gerir"
                          onClick={() => openDetalhe(o)}
                        >
                          {isAdmin ? <RefreshCw size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal — Nova ocorrência */}
      {novaOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-1000" onClick={() => setNovaOpen(false)}>
          <div className="bg-white border border-gray-200 rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] w-full max-w-120 p-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="m-0 text-[15px] font-semibold text-gray-900">Nova Ocorrência</h3>
              <button className="bg-transparent border-none cursor-pointer text-gray-500 p-1 flex rounded-md hover:bg-gray-200" onClick={() => setNovaOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="grid gap-3.5" onSubmit={handleCreate}>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Categoria</label>
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={inputCls} required>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Localização</label>
                <select value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} className={inputCls} required>
                  {LOCALIZACOES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Assunto</label>
                <input
                  type="text"
                  placeholder="Título curto do problema"
                  value={form.assunto}
                  onChange={(e) => setForm({ ...form, assunto: e.target.value })}
                  required
                  maxLength={100}
                  className={inputCls}
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Descrição detalhada</label>
                <textarea
                  placeholder="Descreva o ocorrido com o máximo de detalhes..."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  required
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Nível de urgência</label>
                <div className="flex gap-2">
                  {URGENCIAS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setForm({ ...form, urgencia: u })}
                      className={`flex-1 py-2 rounded-lg border text-[13px] font-semibold cursor-pointer transition-colors
                        ${form.urgencia === u
                          ? u === "Alta" ? "bg-red-600 text-white border-red-600"
                            : u === "Média" ? "bg-yellow-500 text-white border-yellow-500"
                            : "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                        }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {formError && <p className="text-xs text-red-600 m-0">{formError}</p>}

              <div className="flex justify-end gap-2.5 mt-1">
                <button type="button" className={btn} onClick={() => setNovaOpen(false)} disabled={submitting}>Cancelar</button>
                <button type="submit" className={btnPrimary} disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar ocorrência"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Detalhe / Gestão */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-1000" onClick={() => setDetalhe(null)}>
          <div className="bg-white border border-gray-200 rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] w-full max-w-130 p-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="m-0 text-[15px] font-semibold text-gray-900">{detalhe.assunto}</h3>
                <p className="mt-0.5 text-xs text-gray-500 m-0">{detalhe.protocolo} · {detalhe.categoria} · {detalhe.localizacao}</p>
              </div>
              <button className="bg-transparent border-none cursor-pointer text-gray-500 p-1 flex rounded-md hover:bg-gray-200" onClick={() => setDetalhe(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Descrição */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 mb-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">Descrição</p>
              <p className="text-[13px] text-gray-800 m-0">{detalhe.descricao}</p>
            </div>

            {/* Resposta ao morador (visible to all) */}
            {detalhe.resposta_morador && !isAdmin && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-3 mb-3">
                <p className="text-xs font-semibold text-green-700 mb-1">Resposta da administração</p>
                <p className="text-[13px] text-green-900 m-0">{detalhe.resposta_morador}</p>
              </div>
            )}

            {/* Admin gestão form */}
            {isAdmin && (
              <form className="grid gap-3.5" onSubmit={handleSaveGestao}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-semibold text-gray-500">Status</label>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as OcorrenciaStatus)} className={inputCls}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-semibold text-gray-500">Responsável</label>
                    <input
                      type="text"
                      placeholder="Ex: Zelador João"
                      value={editResponsavel}
                      onChange={(e) => setEditResponsavel(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold text-gray-500">Nota interna <span className="text-gray-400 font-normal">(não visível ao morador)</span></label>
                  <textarea
                    placeholder="Observações internas, histórico de ações..."
                    value={editRespostaInterna}
                    onChange={(e) => setEditRespostaInterna(e.target.value)}
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold text-gray-500">Resposta ao morador</label>
                  <textarea
                    placeholder="Mensagem que o morador verá no chamado..."
                    value={editRespostaMorador}
                    onChange={(e) => setEditRespostaMorador(e.target.value)}
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                {saveError && <p className="text-xs text-red-600 m-0">{saveError}</p>}

                <div className="flex justify-end gap-2.5 mt-1">
                  <button type="button" className={btn} onClick={() => setDetalhe(null)} disabled={saving}>Fechar</button>
                  <button type="submit" className={btnPrimary} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </form>
            )}

            {!isAdmin && (
              <div className="flex justify-end mt-2">
                <button className={btn} onClick={() => setDetalhe(null)}>Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
