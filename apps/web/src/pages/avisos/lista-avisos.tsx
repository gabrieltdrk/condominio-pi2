import {
  ArrowDown, ArrowUp, ArrowUpDown,
  ExternalLink, Megaphone, Paperclip, Pencil, Pin, PinOff, Plus, ThumbsUp, Trash2, X,
} from "lucide-react";
import AppLayout from "../../features/layout/components/app-layout";
import { Badge } from "../../components/ui/badge";
import {
  AVISO_TIPOS,
  AVISO_TIPO_COLORS,
  type AvisoTipo,
} from "../../features/avisos/services/avisos";
import {
  AVISO_TIPO_BAR,
  type AvisoSortKey as SortKey,
} from "../../features/avisos/constants/avisos.constants";
import { useAvisos } from "../../features/avisos/hooks/use-avisos";

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
}

// ── Helpers ────────────────────────────────────────────────────────────────
const inputCls = "px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm outline-none w-full focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

// Parseia "yyyy-mm-dd" ou ISO sem conversão de timezone
function parseDate(d: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  return new Date(d);
}

function fmt(d: string | null) {
  if (!d) return "—";
  const date = parseDate(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

function isExpired(d: string | null) {
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseDate(d) < today;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ListaAvisos() {
  const {
    loading, error,
    filterTipo, setFilterTipo,
    sortKey, sortDir,
    novoOpen, setNovoOpen,
    form, setForm,
    anexoFile, setAnexoFile,
    editAnexoFile, setEditAnexoFile,
    fileInputRef, editFileInputRef,
    submitting, formError,
    editando, setEditando,
    editForm, setEditForm,
    editSubmitting, editError,
    detalhe, setDetalhe,
    displayed,
    CURTIDAS_DESTAQUE,
    isAdmin,
    handleSort, handleCreate, openEditar, handleEdit, handleDelete, handleFixar, handleCurtir,
  } = useAvisos();

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
        className="text-sm font-semibold px-3 py-3 border-b border-gray-100 cursor-pointer select-none whitespace-nowrap text-left text-gray-500 hover:text-indigo-600 transition-colors"
        onClick={() => handleSort(col)}
      >
        <span className="flex items-center gap-1">{label} <SortIcon col={col} /></span>
      </th>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Avisos do Condomínio">
      <div className="grid gap-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-indigo-400" />
            <span className="text-sm text-gray-500">
              {loading ? "Carregando..." : `${displayed.length} aviso${displayed.length !== 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value as AvisoTipo | "")}
              className="px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-700 text-sm font-medium outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value="">Todos os tipos</option>
              {AVISO_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {isAdmin && (
              <button
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold cursor-pointer border-none transition-all shrink-0 shadow-sm shadow-indigo-200"
                onClick={() => { setForm({ titulo: "", descricao: "", tipo: "Informativo", data_expiracao: "", arquivo_url: "" }); setNovoOpen(true); }}
              >
                <Plus size={15} />
                Novo Aviso
              </button>
            )}
          </div>
        </div>

        {/* Error / Empty */}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!loading && displayed.length === 0 && !error && (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center gap-3 text-center shadow-sm">
            <Megaphone size={36} className="text-gray-300" />
            <p className="text-base text-gray-500">Nenhum aviso publicado ainda.</p>
          </div>
        )}

        {/* ── Table desktop (md+) ── */}
        {displayed.length > 0 && (
          <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-linear-to-r from-gray-50 to-indigo-50/30">
                    <th className="w-1 p-0 border-b border-gray-100" />
                    <th className="w-6 px-3 py-3 border-b border-gray-100" />
                    <SortTh col="titulo" label="Título" />
                    <SortTh col="tipo" label="Tipo" />
                    <th className="text-sm font-semibold px-3 py-3 border-b border-gray-100 text-left text-gray-500">Publicado por</th>
                    <SortTh col="created_at" label="Data" />
                    <SortTh col="data_expiracao" label="Expira em" />
                    <SortTh col="curtidas_count" label="Curtidas" />
                    {isAdmin && <th className="text-sm font-semibold px-3 py-3 border-b border-gray-100 text-center text-gray-500">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((a, idx) => {
                    const destaque = a.curtidas_count >= CURTIDAS_DESTAQUE;
                    const expired = isExpired(a.data_expiracao);
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setDetalhe(a)}
                        style={{ animationDelay: `${idx * 30}ms` }}
                        className={`cursor-pointer transition-all duration-150 hover:bg-indigo-50/40 group ${destaque ? "bg-amber-50/40" : ""} ${expired ? "opacity-60" : ""}`}
                      >
                        {/* Barra colorida por tipo */}
                        <td className="p-0 w-1 border-b border-gray-100">
                          <div className={`w-1 h-full min-h-12 ${AVISO_TIPO_BAR[a.tipo]} opacity-70 group-hover:opacity-100 transition-opacity`} />
                        </td>
                        {/* Pin indicator */}
                        <td className="px-3 py-3 border-b border-gray-100 text-center">
                          {a.fixado && <Pin size={13} className="text-indigo-500 inline" />}
                        </td>
                        <td className="px-3 py-3 border-b border-gray-100 max-w-64 truncate text-gray-800 font-medium">
                          {destaque && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 mb-0.5" />}
                          {a.titulo}
                        </td>
                        <td className="px-3 py-3 border-b border-gray-100">
                          <Badge text={a.tipo} cls={AVISO_TIPO_COLORS[a.tipo]} />
                        </td>
                        <td className="px-3 py-3 border-b border-gray-100 text-gray-500 whitespace-nowrap">{a.author_name}</td>
                        <td className="px-3 py-3 border-b border-gray-100 text-gray-400 text-sm whitespace-nowrap">{fmt(a.created_at)}</td>
                        <td className="px-3 py-3 border-b border-gray-100 text-sm whitespace-nowrap">
                          {a.data_expiracao ? (
                            <span className={expired ? "text-rose-500 font-semibold" : "text-gray-400"}>
                              {fmt(a.data_expiracao)}{expired ? " · expirado" : ""}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 border-b border-gray-100">
                          <button
                            onClick={(e) => handleCurtir(e, a)}
                            title={a.user_curtiu ? "Remover curtida" : "Curtir"}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-sm font-semibold cursor-pointer transition-all active:scale-95
                              ${a.user_curtiu
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                                : "bg-white border-gray-200 text-gray-400 hover:border-indigo-200 hover:text-indigo-500"
                              }`}
                          >
                            <ThumbsUp size={13} />
                            {a.curtidas_count > 0 && <span>{a.curtidas_count}</span>}
                          </button>
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-3 border-b border-gray-100" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditar(a)}
                                title="Editar"
                                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-gray-400 cursor-pointer transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleFixar(a)}
                                title={a.fixado ? "Desafixar" : "Fixar"}
                                className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${a.fixado ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-gray-200 text-gray-400 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"}`}
                              >
                                {a.fixado ? <PinOff size={14} /> : <Pin size={14} />}
                              </button>
                              <button
                                onClick={() => handleDelete(a.id)}
                                title="Excluir"
                                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 text-gray-400 cursor-pointer transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Cards mobile ── */}
        {displayed.length > 0 && (
          <div className="md:hidden grid gap-3">
            {displayed.map((a) => {
              const destaque = a.curtidas_count >= CURTIDAS_DESTAQUE;
              const expired = isExpired(a.data_expiracao);
              return (
                <div
                  key={a.id}
                  onClick={() => setDetalhe(a)}
                  className={`bg-white border rounded-2xl shadow-sm cursor-pointer active:scale-[0.99] transition-all overflow-hidden relative
                    ${destaque ? "border-amber-300 bg-amber-50/30" : "border-gray-200 hover:border-indigo-200"}
                    ${expired ? "opacity-60" : ""}`}
                >
                  {/* Barra colorida por tipo */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${AVISO_TIPO_BAR[a.tipo]}`} />
                  <div className="pl-3 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          {a.fixado && <Pin size={12} className="text-indigo-500 shrink-0" />}
                          <Badge text={a.tipo} cls={AVISO_TIPO_COLORS[a.tipo]} />
                        </div>
                        <p className="text-base font-semibold text-gray-800 leading-snug">{a.titulo}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">{a.descricao}</p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{fmt(a.created_at)}</span>
                        {a.data_expiracao && (
                          <span className={expired ? "text-rose-500 font-semibold" : ""}>
                            · expira {fmt(a.data_expiracao)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleCurtir(e, a)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-sm font-semibold cursor-pointer transition-all active:scale-95
                            ${a.user_curtiu ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-gray-200 text-gray-400"}`}
                        >
                          <ThumbsUp size={13} />
                          {a.curtidas_count > 0 && <span>{a.curtidas_count}</span>}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleFixar(a); }}
                            className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${a.fixado ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-gray-200 text-gray-400"}`}
                          >
                            {a.fixado ? <PinOff size={13} /> : <Pin size={13} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal — Novo aviso ── */}
      {novoOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="m-0 text-lg font-semibold text-gray-900">Novo Aviso</h3>
              <button className="p-1.5 rounded-lg border-none bg-transparent text-gray-400 hover:bg-gray-100 cursor-pointer" onClick={() => setNovoOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="grid gap-4" onSubmit={handleCreate}>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-gray-600">Título</label>
                <input
                  type="text"
                  placeholder="Título do aviso"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  required
                  maxLength={120}
                  className={inputCls}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-gray-600">Descrição</label>
                <textarea
                  placeholder="Descreva o aviso com detalhes..."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  required
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-600">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as AvisoTipo })} className={inputCls}>
                    {AVISO_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-600">Data de expiração <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      lang="pt-BR"
                      value={form.data_expiracao}
                      onChange={(e) => setForm({ ...form, data_expiracao: e.target.value })}
                      className={inputCls}
                    />
                    {form.data_expiracao && (
                      <button type="button" onClick={() => setForm({ ...form, data_expiracao: "" })}
                        className="px-3 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-rose-500 hover:border-rose-200 cursor-pointer text-xs shrink-0 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-gray-600">
                  Anexo <span className="text-gray-400 font-normal">(PDF, Word, Imagem — máx 10MB)</span>
                </label>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 border border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={16} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500 flex-1 truncate">
                    {anexoFile ? anexoFile.name : "Clique para selecionar um arquivo"}
                  </span>
                  {anexoFile && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setAnexoFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="text-gray-400 hover:text-rose-500 shrink-0 border-none bg-transparent cursor-pointer">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => setAnexoFile(e.target.files?.[0] ?? null)}
                />
                {form.arquivo_url && !anexoFile && (
                  <p className="text-xs text-indigo-600 flex items-center gap-1">
                    <Paperclip size={11} /> Anexo atual: <a href={form.arquivo_url} target="_blank" rel="noreferrer" className="underline">ver arquivo</a>
                  </p>
                )}
              </div>

              {formError && <p className="text-sm text-red-500 m-0">{formError}</p>}

              <div className="flex justify-end gap-3 mt-1">
                <button type="button" className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors" onClick={() => setNovoOpen(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer border-none transition-all" disabled={submitting}>
                  {submitting ? "Publicando..." : "Publicar aviso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal — Detalhe do aviso ── */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4" onClick={() => setDetalhe(null)}>
          <div
            className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Faixa colorida por tipo */}
            <div className={`-mx-6 -mt-6 h-1 rounded-t-2xl mb-6 ${
              detalhe.tipo === "Segurança" ? "bg-red-400" :
              detalhe.tipo === "Manutenção" ? "bg-amber-400" :
              detalhe.tipo === "Assembleia" ? "bg-indigo-400" :
              detalhe.tipo === "Eventos" ? "bg-emerald-400" : "bg-blue-400"
            }`} />

            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge text={detalhe.tipo} cls={AVISO_TIPO_COLORS[detalhe.tipo]} />
                  {detalhe.fixado && (
                    <span className="flex items-center gap-1 text-[11px] text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full">
                      <Pin size={10} /> Fixado
                    </span>
                  )}
                </div>
                <h3 className="m-0 text-lg font-semibold text-gray-900">{detalhe.titulo}</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Publicado por {detalhe.author_name} · {fmt(detalhe.created_at)}
                  {detalhe.data_expiracao && ` · expira ${fmt(detalhe.data_expiracao)}`}
                </p>
              </div>
              <button className="p-1.5 rounded-lg border-none bg-transparent text-gray-400 hover:bg-gray-100 cursor-pointer shrink-0" onClick={() => setDetalhe(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-4">
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{detalhe.descricao}</p>
            </div>

            {/* Anexo */}
            {detalhe.arquivo_url && (
              <div className="mb-4">
                {isImageUrl(detalhe.arquivo_url) ? (
                  <a href={detalhe.arquivo_url} target="_blank" rel="noreferrer">
                    <img
                      src={detalhe.arquivo_url}
                      alt="Anexo do aviso"
                      className="w-full rounded-xl border border-gray-200 object-contain max-h-72 cursor-zoom-in hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <a
                    href={detalhe.arquivo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50/40 text-indigo-600 text-sm font-semibold hover:bg-indigo-100 transition-colors"
                  >
                    <Paperclip size={15} className="shrink-0" />
                    <span className="truncate flex-1">Ver anexo</span>
                    <ExternalLink size={13} className="shrink-0" />
                  </a>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={(e) => { handleCurtir(e, detalhe); setDetalhe({ ...detalhe, user_curtiu: !detalhe.user_curtiu, curtidas_count: detalhe.user_curtiu ? detalhe.curtidas_count - 1 : detalhe.curtidas_count + 1 }); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition-all active:scale-95
                  ${detalhe.user_curtiu ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-gray-200 text-gray-500 hover:border-indigo-200"}`}
              >
                <ThumbsUp size={15} />
                {detalhe.curtidas_count > 0 ? `${detalhe.curtidas_count} curtida${detalhe.curtidas_count !== 1 ? "s" : ""}` : "Curtir"}
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => openEditar(detalhe)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-gray-600 text-sm font-semibold cursor-pointer transition-colors"
                    >
                      <Pencil size={14} />
                      Editar
                    </button>
                    <button
                      onClick={() => { handleFixar(detalhe); setDetalhe(null); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${detalhe.fixado ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-gray-200 text-gray-600 hover:bg-indigo-50"}`}
                    >
                      {detalhe.fixado ? <PinOff size={14} /> : <Pin size={14} />}
                      {detalhe.fixado ? "Desafixar" : "Fixar"}
                    </button>
                    <button
                      onClick={() => handleDelete(detalhe.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-gray-600 text-sm font-semibold cursor-pointer transition-colors"
                    >
                      <Trash2 size={14} />
                      Excluir
                    </button>
                  </>
                )}
                <button className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors" onClick={() => setDetalhe(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal — Editar aviso ── */}
      {editando && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="m-0 text-lg font-semibold text-gray-900">Editar Aviso</h3>
              <button className="p-1.5 rounded-lg border-none bg-transparent text-gray-400 hover:bg-gray-100 cursor-pointer" onClick={() => setEditando(null)}>
                <X size={20} />
              </button>
            </div>

            <form className="grid gap-4" onSubmit={handleEdit}>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-gray-600">Título</label>
                <input type="text" value={editForm.titulo} onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })} required maxLength={120} className={inputCls} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-gray-600">Descrição</label>
                <textarea value={editForm.descricao} onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })} required rows={4} className={`${inputCls} resize-none`} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-600">Tipo</label>
                  <select value={editForm.tipo} onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value as AvisoTipo })} className={inputCls}>
                    {AVISO_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-600">Data de expiração <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <div className="flex gap-2">
                    <input type="date" lang="pt-BR" value={editForm.data_expiracao} onChange={(e) => setEditForm({ ...editForm, data_expiracao: e.target.value })} className={inputCls} />
                    {editForm.data_expiracao && (
                      <button type="button" onClick={() => setEditForm({ ...editForm, data_expiracao: "" })}
                        className="px-3 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-rose-500 hover:border-rose-200 cursor-pointer text-xs shrink-0 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Anexo no formulário de edição */}
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-gray-600">
                  Anexo <span className="text-gray-400 font-normal">(PDF, Word, Imagem — máx 10MB)</span>
                </label>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 border border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition-colors"
                  onClick={() => editFileInputRef.current?.click()}
                >
                  <Paperclip size={16} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500 flex-1 truncate">
                    {editAnexoFile ? editAnexoFile.name : "Clique para selecionar um arquivo"}
                  </span>
                  {editAnexoFile && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setEditAnexoFile(null); if (editFileInputRef.current) editFileInputRef.current.value = ""; }}
                      className="text-gray-400 hover:text-rose-500 shrink-0 border-none bg-transparent cursor-pointer">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <input ref={editFileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => setEditAnexoFile(e.target.files?.[0] ?? null)} />
                {editForm.arquivo_url && !editAnexoFile && (
                  <p className="text-xs text-indigo-600 flex items-center gap-1">
                    <Paperclip size={11} /> Anexo atual: <a href={editForm.arquivo_url} target="_blank" rel="noreferrer" className="underline">ver arquivo</a>
                  </p>
                )}
              </div>

              {editError && <p className="text-sm text-red-500 m-0">{editError}</p>}
              <div className="flex justify-end gap-3 mt-1">
                <button type="button" className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors" onClick={() => setEditando(null)} disabled={editSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer border-none transition-all" disabled={editSubmitting}>
                  {editSubmitting ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
