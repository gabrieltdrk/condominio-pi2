import {
  ArrowDown, ArrowUp, ArrowUpDown,
  Megaphone, Pencil, Pin, PinOff, Plus, ThumbsUp, Trash2,
} from "lucide-react";
import AppLayout from "../../features/layout/components/app-layout";
import { Badge } from "../../components/ui/badge";
import {
  AVISO_TIPO_COLORS,
  type AvisoTipo,
  type CreateAvisoPayload,
} from "../../features/avisos/services/avisos";
import {
  AVISO_TIPO_BAR,
  type AvisoSortKey as SortKey,
} from "../../features/avisos/constants/avisos.constants";
import { useAvisos } from "../../features/avisos/hooks/use-avisos";
import { AvisoCriarModal } from "../../features/avisos/components/aviso-criar-modal";
import { AvisoEditarModal } from "../../features/avisos/components/aviso-editar-modal";
import { AvisoDetalheModal } from "../../features/avisos/components/aviso-detalhe-modal";
import { AVISO_TIPOS } from "../../features/avisos/services/avisos";

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

  function handleFormFieldChange(field: keyof CreateAvisoPayload, value: string) {
    setForm({ ...form, [field]: value });
  }

  function handleEditFormFieldChange(field: keyof CreateAvisoPayload, value: string) {
    setEditForm({ ...editForm, [field]: value });
  }

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
                        <td className="p-0 w-1 border-b border-gray-100">
                          <div className={`w-1 h-full min-h-12 ${AVISO_TIPO_BAR[a.tipo]} opacity-70 group-hover:opacity-100 transition-opacity`} />
                        </td>
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
      <AvisoCriarModal
        open={novoOpen}
        form={form}
        onFieldChange={handleFormFieldChange}
        onSubmit={handleCreate}
        onClose={() => setNovoOpen(false)}
        submitting={submitting}
        error={formError}
        anexoFile={anexoFile}
        onAnexoChange={setAnexoFile}
        fileInputRef={fileInputRef}
      />

      {/* ── Modal — Detalhe do aviso ── */}
      <AvisoDetalheModal
        detalhe={detalhe}
        isAdmin={isAdmin}
        onClose={() => setDetalhe(null)}
        onEditar={openEditar}
        onFixar={handleFixar}
        onDelete={handleDelete}
        onCurtir={handleCurtir}
        setDetalhe={setDetalhe}
      />

      {/* ── Modal — Editar aviso ── */}
      <AvisoEditarModal
        editando={editando}
        form={editForm}
        onFieldChange={handleEditFormFieldChange}
        onSubmit={handleEdit}
        onClose={() => setEditando(null)}
        submitting={editSubmitting}
        error={editError}
        anexoFile={editAnexoFile}
        onAnexoChange={setEditAnexoFile}
        fileInputRef={editFileInputRef}
      />
    </AppLayout>
  );
}
