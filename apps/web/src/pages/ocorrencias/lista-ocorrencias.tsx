import {
  AlertCircle, ArrowDown, ArrowUp, ArrowUpDown,
  ClipboardList, Lock, Plus, ThumbsUp,
} from "lucide-react";
import AppLayout from "../../features/layout/components/app-layout";
import { Badge } from "../../components/ui/badge";
import {
  CATEGORIAS,
  STATUS_COLORS,
  URGENCIA_COLORS,
  URGENCIA_BAR,
  type SortKey,
} from "../../features/ocorrencias/constants/ocorrencias.constants";
import { useOcorrencias } from "../../features/ocorrencias/hooks/use-ocorrencias";
import { OcorrenciaCriarModal } from "../../features/ocorrencias/components/ocorrencia-criar-modal";
import { OcorrenciaDetalheModal } from "../../features/ocorrencias/components/ocorrencia-detalhe-modal";

// ── Component ──────────────────────────────────────────────────────────────
export default function ListaOcorrencias() {
  const {
    loading, error,
    filterStatus, setFilterStatus,
    filterCategoria, setFilterCategoria,
    onlyMine, setOnlyMine,
    sortKey, sortDir,
    novaOpen, setNovaOpen,
    form, setForm,
    submitting, formError,
    anexoFile, setAnexoFile,
    fileInputRef,
    detalhe, setDetalhe,
    editStatus, setEditStatus,
    editResponsavel, setEditResponsavel,
    editRespostaInterna, setEditRespostaInterna,
    editRespostaMorador, setEditRespostaMorador,
    editMotivoCancelamento, setEditMotivoCancelamento,
    editAssunto, setEditAssunto,
    editDescricao, setEditDescricao,
    editCategoria, setEditCategoria,
    editPrivado, setEditPrivado,
    saving, saveError,
    displayed,
    CURTIDAS_DESTAQUE,
    EMPTY_FORM,
    isAdmin,
    fmt, isOwner,
    handleSort, toggleStatusFilter,
    handleCreate, onCategoriaChange, openDetalhe,
    handleSaveAdmin, handleSaveMorador, handleCurtir,
    STATUS_OPTIONS,
  } = useOcorrencias();

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

        {/* ── Header ── */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-indigo-400" />
              <span className="text-sm text-gray-500">
                {loading ? "Carregando..." : `${displayed.length} ocorrência${displayed.length !== 1 ? "s" : ""}`}
              </span>
            </div>
            <button
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold cursor-pointer border-none transition-all shrink-0 shadow-sm shadow-indigo-200"
              onClick={() => { setForm(EMPTY_FORM); setNovaOpen(true); }}
            >
              <Plus size={15} />
              Nova Ocorrência
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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

            <button
              type="button"
              onClick={() => setOnlyMine((value: boolean) => !value)}
              className={`w-full sm:w-auto px-3 py-2.5 border rounded-xl text-sm font-semibold transition-colors ${
                onlyMine
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {onlyMine ? "Mostrando só as minhas" : "Mostrar só as minhas"}
            </button>
          </div>
        </div>

        {/* ── Filtros de status ── */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-400 font-semibold shrink-0">Status:</span>
          <div
            className="flex gap-2 overflow-x-auto py-1 min-w-0 flex-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            <button
              onClick={() => setFilterStatus([])}
              className={`text-xs font-semibold border px-3 py-1.5 rounded-full cursor-pointer transition-all shrink-0 ${
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
                  className={`text-xs font-semibold border px-3 py-1.5 rounded-full cursor-pointer transition-all shrink-0 ${
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
                onClick={() => { setForm(EMPTY_FORM); setNovaOpen(true); }}
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
                  <tr className="bg-linear-to-r from-gray-50 to-indigo-50/30">
                    <th className="w-1 p-0 border-b border-gray-100" />
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
                  {displayed.map((o, idx) => {
                    const destaque = o.curtidas_count >= CURTIDAS_DESTAQUE;
                    return (
                      <tr
                        key={o.id}
                        onClick={() => openDetalhe(o)}
                        style={{ animationDelay: `${idx * 30}ms` }}
                        className={`cursor-pointer transition-all duration-150 hover:bg-indigo-50/50 hover:shadow-sm group ${destaque ? "bg-amber-50/40" : ""}`}
                      >
                        <td className="p-0 w-1 border-b border-gray-100">
                          <div className={`w-1 h-full min-h-12 rounded-sm ${URGENCIA_BAR[o.urgencia]} opacity-70 group-hover:opacity-100 transition-opacity`} />
                        </td>
                        <td className="px-3 py-3 border-b border-gray-100 font-mono text-xs text-gray-500 whitespace-nowrap">
                          {destaque && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 mb-0.5" />}
                          {o.privado && <Lock size={10} className="inline mr-1 text-gray-400 mb-0.5" />}
                          {o.protocolo}
                        </td>
                        {isAdmin && <td className="px-3 py-3 border-b border-gray-100 font-medium text-gray-800 whitespace-nowrap">{o.author_name}</td>}
                        <td className="px-3 py-3 border-b border-gray-100 max-w-56 truncate text-gray-700 font-medium">{o.assunto}</td>
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
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-sm font-semibold cursor-pointer transition-all active:scale-95
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
            {displayed.map((o, idx) => {
              const destaque = o.curtidas_count >= CURTIDAS_DESTAQUE;
              return (
                <div
                  key={o.id}
                  onClick={() => openDetalhe(o)}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className={`bg-white border rounded-2xl p-4 shadow-sm transition-all cursor-pointer active:scale-[0.99] overflow-hidden relative
                    ${destaque ? "border-amber-300 bg-amber-50/30" : "border-gray-200 hover:border-indigo-200 hover:shadow-md"}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${URGENCIA_BAR[o.urgencia]}`} />

                  <div className="pl-2">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-gray-400 truncate flex items-center gap-1">
                          {o.privado && <Lock size={10} className="shrink-0" />}
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
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-semibold cursor-pointer transition-all active:scale-95
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal — Nova ocorrência ── */}
      <OcorrenciaCriarModal
        open={novaOpen}
        form={form}
        onCategoriaChange={onCategoriaChange}
        onFieldChange={(updates) => setForm({ ...form, ...updates })}
        onSubmit={handleCreate}
        onClose={() => setNovaOpen(false)}
        submitting={submitting}
        formError={formError}
        anexoFile={anexoFile}
        onAnexoChange={setAnexoFile}
        fileInputRef={fileInputRef}
      />

      {/* ── Modal — Detalhe / Gestão ── */}
      <OcorrenciaDetalheModal
        detalhe={detalhe}
        isAdmin={isAdmin}
        isOwner={isOwner}
        onClose={() => setDetalhe(null)}
        editStatus={editStatus}
        setEditStatus={setEditStatus}
        editResponsavel={editResponsavel}
        setEditResponsavel={setEditResponsavel}
        editRespostaInterna={editRespostaInterna}
        setEditRespostaInterna={setEditRespostaInterna}
        editRespostaMorador={editRespostaMorador}
        setEditRespostaMorador={setEditRespostaMorador}
        editMotivoCancelamento={editMotivoCancelamento}
        setEditMotivoCancelamento={setEditMotivoCancelamento}
        editAssunto={editAssunto}
        setEditAssunto={setEditAssunto}
        editDescricao={editDescricao}
        setEditDescricao={setEditDescricao}
        editCategoria={editCategoria}
        setEditCategoria={setEditCategoria}
        editPrivado={editPrivado}
        setEditPrivado={setEditPrivado}
        onSaveAdmin={handleSaveAdmin}
        onSaveMorador={handleSaveMorador}
        saving={saving}
        saveError={saveError}
      />
    </AppLayout>
  );
}
