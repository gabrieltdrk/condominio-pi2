import {
  Filter, Megaphone, Pencil, Pin, PinOff, Plus, Search, ThumbsUp, Trash2, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AppLayout from "../../features/layout/components/app-layout";
import { Badge } from "../../components/ui/badge";
import {
  AVISO_TIPO_COLORS, AVISO_TIPOS,
  type AvisoTipo, type CreateAvisoPayload,
} from "../../features/avisos/services/avisos";
import { type AvisoSortKey as SortKey } from "../../features/avisos/constants/avisos.constants";
import { useAvisos, isExpiredDate } from "../../features/avisos/hooks/use-avisos";
import { SortTh } from "../../components/ui/sort-th";
import { Pagination } from "../../components/ui/pagination";
import { AvisoCriarModal } from "../../features/avisos/components/aviso-criar-modal";
import { AvisoEditarModal } from "../../features/avisos/components/aviso-editar-modal";
import { AvisoDetalheModal } from "../../features/avisos/components/aviso-detalhe-modal";

function fmt(d: string | null) {
  if (!d) return "—";
  const s = d;
  let date: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, day] = s.split("-").map(Number);
    date = new Date(y, m - 1, day);
  } else {
    date = new Date(s);
  }
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear()).slice(2)}`;
}

// ── Sort header ─────────────────────────────────────────────────────────────
// ── Filter Panel ─────────────────────────────────────────────────────────────
type FilterDraft = {
  filterTipo: AvisoTipo[];
  filterExpirado: "" | "sim" | "nao";
  filterFixado: "" | "sim" | "nao";
  sortKey: SortKey;
  sortDir: "asc" | "desc";
};

function FilterPanel({ open, onClose, initial, onApply }: {
  open: boolean;
  onClose: () => void;
  initial: FilterDraft;
  onApply: (f: FilterDraft) => void;
}) {
  const [draft, setDraft] = useState<FilterDraft>(initial);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function apply() { onApply(draft); onClose(); }
  function clear() {
    setDraft({ filterTipo: [], filterExpirado: "", filterFixado: "", sortKey: "created_at", sortDir: "desc" });
  }

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "created_at", label: "Data de publicação" },
    { key: "titulo", label: "Título" },
    { key: "tipo", label: "Tipo" },
    { key: "data_expiracao", label: "Expira em" },
    { key: "curtidas_count", label: "Curtidas" },
  ];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">Filtros e Ordenação</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Tipo */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tipo</p>
            <div className="space-y-1.5">
              {AVISO_TIPOS.map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.filterTipo.includes(t)}
                    onChange={() => setDraft((d) => ({
                      ...d,
                      filterTipo: d.filterTipo.includes(t)
                        ? d.filterTipo.filter((x) => x !== t)
                        : [...d.filterTipo, t],
                    }))}
                    className="accent-indigo-600 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Expiração */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Expira em</p>
            <div className="space-y-1.5">
              {([["", "Todos"], ["nao", "Ativos"], ["sim", "Expirados"]] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="expirado"
                    checked={draft.filterExpirado === val}
                    onChange={() => setDraft((d) => ({ ...d, filterExpirado: val }))}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Fixado */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Fixado</p>
            <div className="space-y-1.5">
              {([["", "Todos"], ["sim", "Fixados"], ["nao", "Não fixados"]] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fixado"
                    checked={draft.filterFixado === val}
                    onChange={() => setDraft((d) => ({ ...d, filterFixado: val }))}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Ordenar por */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ordenar por</p>
            <select
              value={draft.sortKey}
              onChange={(e) => setDraft((d) => ({ ...d, sortKey: e.target.value as SortKey }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-indigo-400 bg-white"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <div className="flex gap-2 mt-2">
              {(["desc", "asc"] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => setDraft((d) => ({ ...d, sortDir: dir }))}
                  className={`flex-1 py-1.5 text-sm rounded-lg border cursor-pointer transition-colors ${draft.sortDir === dir ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  {dir === "desc" ? "Decrescente" : "Crescente"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={clear}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Limpar
          </button>
          <button
            onClick={apply}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ListaAvisos() {
  const {
    loading, error,
    searchText, setSearchText,
    filterTipo, filterExpirado, filterFixado,
    sortKey, sortDir,
    setPage,
    pageSize, setPageSize,
    totalFiltered, totalPages, safePage,
    filterPanelOpen, setFilterPanelOpen,
    activeFilterCount,
    novoOpen, setNovoOpen,
    form, setForm,
    formCondominioUUID, setFormCondominioUUID,
    anexoFile, setAnexoFile,
    editAnexoFile, setEditAnexoFile,
    fileInputRef, editFileInputRef,
    submitting, formError,
    editando, setEditando,
    editForm, setEditForm,
    editSubmitting, editError,
    detalhe, setDetalhe,
    pageItems,
    CURTIDAS_DESTAQUE,
    isAdmin,
    handleSort, handleCreate, openEditar, handleEdit, handleDelete, handleFixar, handleCurtir,
    applyFilters,
  } = useAvisos();

  function handleFormFieldChange(field: keyof CreateAvisoPayload, value: string | null) {
    setForm({ ...form, [field]: value });
  }

  function handleEditFormFieldChange(field: keyof CreateAvisoPayload, value: string | null) {
    setEditForm({ ...editForm, [field]: value });
  }

  const filterDraft: FilterDraft = { filterTipo, filterExpirado, filterFixado, sortKey, sortDir };

  return (
    <AppLayout title="Avisos do Condomínio">
      <div className="flex flex-col gap-4 md:h-full">

        {/* ── Toolbar ── */}
        <div className="shrink-0 flex items-center gap-3 flex-wrap">
          {/* Filter button */}
          <button
            onClick={() => setFilterPanelOpen(true)}
            className={`relative shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border cursor-pointer transition-colors ${activeFilterCount > 0 ? "bg-indigo-50 border-indigo-300 text-indigo-600" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}
          >
            <Filter size={15} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Search input — ocupa o restante da linha */}
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-400 w-full transition-colors"
            />
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

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

        {/* Error */}
        {error && <p className="shrink-0 text-sm text-red-500">{error}</p>}

        {/* Loading skeleton */}
        {loading && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && pageItems.length === 0 && !error && (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center gap-3 text-center shadow-sm">
            <Megaphone size={36} className="text-gray-300" />
            <p className="text-base text-gray-500">
              {totalFiltered === 0 && searchText ? "Nenhum aviso encontrado para esta busca." : "Nenhum aviso publicado ainda."}
            </p>
          </div>
        )}

        {/* ── Table desktop (md+) ── */}
        {!loading && pageItems.length > 0 && (
          <div className="hidden md:flex flex-col flex-1 min-h-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50/80">
                    <th className="w-6 px-3 py-3 border-b border-gray-100 text-xs font-semibold tracking-wider text-gray-400 uppercase text-center">
                      <Pin size={12} className="inline" />
                    </th>
                    <SortTh col="titulo" label="Título" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh col="tipo" label="Tipo" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-3 py-3 border-b border-gray-100 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase whitespace-nowrap">
                      Publicado por
                    </th>
                    <SortTh col="created_at" label="Data" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh col="data_expiracao" label="Expira em" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh col="curtidas_count" label="Curtidas" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    {isAdmin && (
                      <th className="px-3 py-3 border-b border-gray-100 text-center text-xs font-semibold tracking-wider text-gray-500 uppercase">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((a, idx) => {
                    const destaque = a.curtidas_count >= CURTIDAS_DESTAQUE;
                    const expired = isExpiredDate(a.data_expiracao);
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setDetalhe(a)}
                        style={{ animationDelay: `${idx * 20}ms` }}
                        className={`cursor-pointer transition-all duration-150 hover:bg-indigo-50/40 group ${destaque ? "bg-amber-50/40" : ""} ${expired ? "opacity-60" : ""}`}
                      >
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

            {/* Pagination */}
            <div className="shrink-0 px-3 py-2 border-t border-gray-100">
              <Pagination
                page={safePage}
                totalPages={totalPages}
                total={totalFiltered}
                pageSize={pageSize}
                setPage={setPage}
                setPageSize={setPageSize}
              />
            </div>
          </div>
        )}

        {/* ── Cards mobile ── */}
        {!loading && pageItems.length > 0 && (
          <div className="md:hidden grid gap-3">
            {pageItems.map((a) => {
              const destaque = a.curtidas_count >= CURTIDAS_DESTAQUE;
              const expired = isExpiredDate(a.data_expiracao);
              return (
                <div
                  key={a.id}
                  onClick={() => setDetalhe(a)}
                  className={`bg-white border rounded-2xl shadow-sm cursor-pointer active:scale-[0.99] transition-all overflow-hidden
                    ${destaque ? "border-amber-300 bg-amber-50/30" : "border-gray-200 hover:border-indigo-200"}
                    ${expired ? "opacity-60" : ""}`}
                >
                  <div className="p-4">
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

            {/* Mobile pagination */}
            <div className="bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
              <Pagination
                page={safePage}
                totalPages={totalPages}
                total={totalFiltered}
                pageSize={pageSize}
                setPage={setPage}
                setPageSize={setPageSize}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Filter Panel ── */}
      <FilterPanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        initial={filterDraft}
        onApply={applyFilters}
      />

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
        onCondominioChange={setFormCondominioUUID}
        selectedCondominioUUID={formCondominioUUID}
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
