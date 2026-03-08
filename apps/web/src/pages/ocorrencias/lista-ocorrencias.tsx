import { useEffect, useState } from "react";
import {
  AlertCircle, ArrowDown, ArrowUp, ArrowUpDown,
  ClipboardList, Plus, ThumbsUp, X,
} from "lucide-react";
import AppLayout from "../../components/app-layout";
import { getUser } from "../../services/auth";
import {
  createOcorrencia,
  listOcorrencias,
  toggleCurtida,
  updateOcorrencia,
  PRIORIDADE_POR_CATEGORIA,
  type CreateOcorrenciaPayload,
  type Ocorrencia,
  type OcorrenciaStatus,
  type OcorrenciaUrgencia,
} from "../../services/ocorrencias";

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORIAS = ["Manutenção", "Barulho", "Reclamação", "Sugestão", "Dúvida"];
const LOCALIZACOES = ["Áreas comuns", "Minha unidade", "Garagem", "Portaria"];
const STATUS_OPTIONS: OcorrenciaStatus[] = [
  "Aberto", "Em Análise", "Em Atendimento",
  "Pendente Terceiros", "Concluído", "Cancelado",
];

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
  Média: "bg-amber-50 text-amber-700 border-amber-200",
  Alta: "bg-red-50 text-red-700 border-red-200",
};

const CURTIDAS_DESTAQUE = 3;

type SortKey = "protocolo" | "author_name" | "assunto" | "categoria" | "urgencia" | "status" | "created_at" | "curtidas_count";

const EMPTY_FORM: CreateOcorrenciaPayload = {
  categoria: CATEGORIAS[0],
  localizacao: LOCALIZACOES[0],
  assunto: "",
  descricao: "",
  urgencia: PRIORIDADE_POR_CATEGORIA[CATEGORIAS[0]],
};

// ── Helpers ────────────────────────────────────────────────────────────────
const inputCls = "px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm outline-none w-full focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

function Badge({ text, cls }: { text: string; cls: string }) {
  return (
    <span className={`text-xs font-semibold border px-2.5 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {text}
    </span>
  );
}

const URGENCIA_ORDER: Record<OcorrenciaUrgencia, number> = { Alta: 0, Média: 1, Baixa: 2 };
const STATUS_ORDER: Record<OcorrenciaStatus, number> = {
  Aberto: 0, "Em Análise": 1, "Em Atendimento": 2,
  "Pendente Terceiros": 3, Concluído: 4, Cancelado: 5,
};

// ── Component ──────────────────────────────────────────────────────────────
export default function ListaOcorrencias() {
  const user = getUser();
  const isAdmin = user?.role === "ADMIN";

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [filterStatus, setFilterStatus] = useState<OcorrenciaStatus[]>([]);
  const [filterCategoria, setFilterCategoria] = useState("");

  // Sorting — padrão: mais recente primeiro
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Nova ocorrência modal
  const [novaOpen, setNovaOpen] = useState(false);
  const [form, setForm] = useState<CreateOcorrenciaPayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Detalhe modal
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

  useEffect(() => { load(); }, []);

  // ── Filters + Sort ────────────────────────────────────────────────────────
  const filtered = ocorrencias.filter((o) => {
    if (filterStatus.length > 0 && !filterStatus.includes(o.status)) return false;
    if (filterCategoria && o.categoria !== filterCategoria) return false;
    return true;
  });

  const displayed = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "protocolo") cmp = a.protocolo.localeCompare(b.protocolo);
    else if (sortKey === "author_name") cmp = (a.author_name ?? "").localeCompare(b.author_name ?? "");
    else if (sortKey === "assunto") cmp = a.assunto.localeCompare(b.assunto);
    else if (sortKey === "categoria") cmp = a.categoria.localeCompare(b.categoria);
    else if (sortKey === "urgencia") cmp = URGENCIA_ORDER[a.urgencia] - URGENCIA_ORDER[b.urgencia];
    else if (sortKey === "status") cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    else if (sortKey === "created_at") cmp = a.created_at.localeCompare(b.created_at);
    else if (sortKey === "curtidas_count") cmp = a.curtidas_count - b.curtidas_count;
    return sortDir === "asc" ? cmp : -cmp;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function toggleStatusFilter(s: OcorrenciaStatus) {
    setFilterStatus((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
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

  function onCategoriaChange(cat: string) {
    setForm((f) => ({ ...f, categoria: cat, urgencia: PRIORIDADE_POR_CATEGORIA[cat] ?? "Média" }));
  }

  function openDetalhe(o: Ocorrencia) {
    setDetalhe(o);
    setEditStatus(o.status);
    setEditResponsavel(o.responsavel ?? "");
    setEditRespostaInterna(o.resposta_interna ?? "");
    setEditRespostaMorador(o.resposta_morador ?? "");
    setSaveError("");
  }

  async function handleSaveGestao(e: React.FormEvent<HTMLFormElement>) {
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

  async function handleCurtir(e: React.MouseEvent, o: Ocorrencia) {
    e.stopPropagation(); // não abre o modal ao curtir
    setOcorrencias((prev) =>
      prev.map((item) =>
        item.id !== o.id ? item : {
          ...item,
          user_curtiu: !item.user_curtiu,
          curtidas_count: item.user_curtiu ? item.curtidas_count - 1 : item.curtidas_count + 1,
        }
      )
    );
    try {
      await toggleCurtida(o.id);
    } catch {
      setOcorrencias((prev) =>
        prev.map((item) =>
          item.id !== o.id ? item : { ...item, user_curtiu: o.user_curtiu, curtidas_count: o.curtidas_count }
        )
      );
    }
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  // ── Sort header ────────────────────────────────────────────────────────────
  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={13} className="opacity-30 shrink-0" />;
    return sortDir === "asc"
      ? <ArrowUp size={13} className="text-indigo-600 shrink-0" />
      : <ArrowDown size={13} className="text-indigo-600 shrink-0" />;
  }

  function SortTh({ col, label }: { col: SortKey; label: string }) {
    return (
      <th
        className="text-sm font-semibold px-3 py-3 border-b border-gray-100 cursor-pointer select-none whitespace-nowrap text-left text-gray-500 hover:text-gray-800"
        onClick={() => handleSort(col)}
      >
        <span className="flex items-center gap-1">
          {label} <SortIcon col={col} />
        </span>
      </th>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout title={isAdmin ? "Gestão de Ocorrências" : "Minhas Ocorrências"}>
      <div className="grid gap-4">

        {/* ── Header: contagem + filtro categoria + botão ── */}
        <div className="grid gap-2">
          {/* Linha 1: contagem + botão Nova Ocorrência */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-gray-400" />
              <span className="text-sm text-gray-500">
                {loading ? "Carregando..." : `${displayed.length} ocorrência${displayed.length !== 1 ? "s" : ""}`}
              </span>
            </div>
            <button
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer border-none transition-colors shrink-0"
              onClick={() => { setForm(EMPTY_FORM); setFormError(""); setNovaOpen(true); }}
            >
              <Plus size={15} />
              Nova Ocorrência
            </button>
          </div>

          {/* Linha 2: filtro categoria (admin) */}
          {isAdmin && (
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              className="w-full sm:w-auto px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-700 text-sm font-medium outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value="">Todas as categorias</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {/* ── Filtros de status (chips multi-select, scroll horizontal) ── */}
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-xs text-gray-400 font-semibold shrink-0">Status:</span>
          <div
            className="flex gap-2 overflow-x-auto py-1 flex-1"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            <button
              onClick={() => setFilterStatus([])}
              className={`text-xs font-semibold border px-3 py-1.5 rounded-full cursor-pointer transition-colors shrink-0 ${
                filterStatus.length === 0
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              Todos
            </button>
            {STATUS_OPTIONS.map((s) => {
              const active = filterStatus.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleStatusFilter(s)}
                  className={`text-xs font-semibold border px-3 py-1.5 rounded-full cursor-pointer transition-colors shrink-0 ${
                    active ? STATUS_COLORS[s] : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Empty / Error ── */}
        {!loading && displayed.length === 0 && !error && (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center gap-3 text-center shadow-sm">
            <AlertCircle size={36} className="text-gray-300" />
            <p className="text-base text-gray-500">Nenhuma ocorrência encontrada.</p>
            {!isAdmin && (
              <button
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer border-none transition-colors"
                onClick={() => { setForm(EMPTY_FORM); setFormError(""); setNovaOpen(true); }}
              >
                Abrir primeira ocorrência
              </button>
            )}
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* ── Table — desktop (md+) ── */}
        {displayed.length > 0 && (
          <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <SortTh col="protocolo" label="Protocolo" />
                    {isAdmin && <SortTh col="author_name" label="Morador" />}
                    <SortTh col="assunto" label="Assunto" />
                    {isAdmin && <SortTh col="categoria" label="Categoria" />}
                    <SortTh col="urgencia" label="Prioridade" />
                    <SortTh col="status" label="Status" />
                    <SortTh col="created_at" label="Data" />
                    <SortTh col="curtidas_count" label="Curtidas" />
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((o) => {
                    const destaque = o.curtidas_count >= CURTIDAS_DESTAQUE;
                    return (
                      <tr
                        key={o.id}
                        onClick={() => openDetalhe(o)}
                        className={`cursor-pointer transition-colors hover:bg-indigo-50/40 ${destaque ? "bg-amber-50/40" : ""}`}
                      >
                        <td className="px-3 py-3 border-b border-gray-100 font-mono text-xs text-gray-500 whitespace-nowrap">
                          {destaque && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 mb-0.5" />}
                          {o.protocolo}
                        </td>
                        {isAdmin && <td className="px-3 py-3 border-b border-gray-100 font-medium text-gray-800 whitespace-nowrap">{o.author_name}</td>}
                        <td className="px-3 py-3 border-b border-gray-100 max-w-56 truncate text-gray-700">{o.assunto}</td>
                        {isAdmin && <td className="px-3 py-3 border-b border-gray-100 text-gray-500 whitespace-nowrap">{o.categoria}</td>}
                        <td className="px-3 py-3 border-b border-gray-100">
                          <Badge text={o.urgencia} cls={URGENCIA_COLORS[o.urgencia]} />
                        </td>
                        <td className="px-3 py-3 border-b border-gray-100">
                          <Badge text={o.status} cls={STATUS_COLORS[o.status]} />
                        </td>
                        <td className="px-3 py-3 border-b border-gray-100 text-gray-400 text-sm whitespace-nowrap">{fmt(o.created_at)}</td>
                        <td className="px-3 py-3 border-b border-gray-100">
                          {isAdmin ? (
                            <div className="flex items-center gap-1 text-sm text-gray-400">
                              <ThumbsUp size={13} />
                              {o.curtidas_count > 0 && <span>{o.curtidas_count}</span>}
                            </div>
                          ) : (
                            <button
                              onClick={(e) => handleCurtir(e, o)}
                              title={o.user_curtiu ? "Remover curtida" : "Curtir"}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-sm font-semibold cursor-pointer transition-all
                                ${o.user_curtiu
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                                  : "bg-white border-gray-200 text-gray-400 hover:border-indigo-200 hover:text-indigo-500"
                                }`}
                            >
                              <ThumbsUp size={13} />
                              {o.curtidas_count > 0 && <span>{o.curtidas_count}</span>}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Cards — mobile (< md) ── */}
        {displayed.length > 0 && (
          <div className="md:hidden grid gap-3">
            {displayed.map((o) => {
              const destaque = o.curtidas_count >= CURTIDAS_DESTAQUE;
              return (
                <div
                  key={o.id}
                  onClick={() => openDetalhe(o)}
                  className={`bg-white border rounded-2xl p-4 shadow-sm transition-all cursor-pointer active:scale-[0.99]
                    ${destaque ? "border-amber-300 bg-amber-50/30" : "border-gray-200 hover:border-indigo-200"}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gray-400 truncate">
                        {o.protocolo}{o.author_name && o.author_name !== "—" ? ` — ${o.author_name}` : ""}
                      </p>
                      <p className="text-base font-semibold text-gray-800 mt-0.5 leading-snug">{o.assunto}</p>
                    </div>
                    <Badge text={o.urgencia} cls={URGENCIA_COLORS[o.urgencia]} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge text={o.status} cls={STATUS_COLORS[o.status]} />
                    {isAdmin && (
                      <span className="text-xs font-medium text-gray-500 border border-gray-200 px-2.5 py-0.5 rounded-full">
                        {o.categoria}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">{fmt(o.created_at)}</span>
                    {isAdmin ? (
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <ThumbsUp size={13} />
                        {o.curtidas_count > 0 && <span>{o.curtidas_count}</span>}
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleCurtir(e, o)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-semibold cursor-pointer transition-all
                          ${o.user_curtiu
                            ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                            : "bg-white border-gray-200 text-gray-400"
                          }`}
                      >
                        <ThumbsUp size={13} />
                        {o.curtidas_count > 0 && <span>{o.curtidas_count}</span>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal — Nova ocorrência ── */}
      {novaOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4" onClick={() => setNovaOpen(false)}>
          <div
            className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="m-0 text-lg font-semibold text-gray-900">Nova Ocorrência</h3>
              <button className="p-1.5 rounded-lg border-none bg-transparent text-gray-400 hover:bg-gray-100 cursor-pointer" onClick={() => setNovaOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="grid gap-4" onSubmit={handleCreate}>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-600">Categoria</label>
                  <select value={form.categoria} onChange={(e) => onCategoriaChange(e.target.value)} className={inputCls} required>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-600">Localização</label>
                  <select value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} className={inputCls} required>
                    {LOCALIZACOES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-gray-600">Assunto</label>
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

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-gray-600">Descrição detalhada</label>
                <textarea
                  placeholder="Descreva o ocorrido com o máximo de detalhes..."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  required
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-gray-600">Prioridade</label>
                <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                  <Badge text={form.urgencia} cls={URGENCIA_COLORS[form.urgencia]} />
                  <span className="text-sm text-gray-400">definida automaticamente pela categoria</span>
                </div>
              </div>

              {formError && <p className="text-sm text-red-500 m-0">{formError}</p>}

              <div className="flex justify-end gap-3 mt-1">
                <button type="button" className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors" onClick={() => setNovaOpen(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer border-none transition-colors" disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar ocorrência"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal — Detalhe / Gestão ── */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4" onClick={() => setDetalhe(null)}>
          <div
            className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho — sem badges de prioridade/status */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="m-0 text-lg font-semibold text-gray-900">{detalhe.assunto}</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {detalhe.protocolo} · {detalhe.categoria} · {detalhe.localizacao}
                </p>
              </div>
              <button className="p-1.5 rounded-lg border-none bg-transparent text-gray-400 hover:bg-gray-100 cursor-pointer shrink-0" onClick={() => setDetalhe(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Descrição */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Descrição</p>
              <p className="text-sm text-gray-800 m-0 leading-relaxed">{detalhe.descricao}</p>
            </div>

            {/* Resposta ao morador */}
            {detalhe.resposta_morador && !isAdmin && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 mb-4">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Resposta da administração</p>
                <p className="text-sm text-green-900 m-0">{detalhe.resposta_morador}</p>
              </div>
            )}

            {/* Admin form */}
            {isAdmin && (
              <form className="grid gap-4" onSubmit={handleSaveGestao}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-gray-600">Status</label>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as OcorrenciaStatus)} className={inputCls}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-gray-600">Responsável</label>
                    <input type="text" placeholder="Ex: Zelador João" value={editResponsavel} onChange={(e) => setEditResponsavel(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-600">
                    Nota interna <span className="text-gray-400 font-normal">(não visível ao morador)</span>
                  </label>
                  <textarea value={editRespostaInterna} onChange={(e) => setEditRespostaInterna(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Observações internas..." />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-600">Resposta ao morador</label>
                  <textarea value={editRespostaMorador} onChange={(e) => setEditRespostaMorador(e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="Mensagem que o morador verá..." />
                </div>
                {saveError && <p className="text-sm text-red-500 m-0">{saveError}</p>}
                <div className="flex justify-end gap-3">
                  <button type="button" className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors" onClick={() => setDetalhe(null)} disabled={saving}>Fechar</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer border-none transition-colors" disabled={saving}>
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </form>
            )}

            {!isAdmin && (
              <div className="flex justify-end">
                <button className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors" onClick={() => setDetalhe(null)}>
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
