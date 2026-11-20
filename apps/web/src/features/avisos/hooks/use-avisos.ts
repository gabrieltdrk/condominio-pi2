import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getUser } from "../../auth/services/auth";
import {
  createAviso, deleteAviso, listAvisos, toggleCurtidaAviso,
  toggleFixarAviso, updateAviso, uploadAvisoAnexo,
  type Aviso, type AvisoTipo, type CreateAvisoPayload,
} from "../services/avisos";
import { CURTIDAS_DESTAQUE, type AvisoSortKey } from "../constants/avisos.constants";

const EMPTY_FORM: CreateAvisoPayload = {
  titulo: "", descricao: "", tipo: "Informativo", data_expiracao: "", arquivo_url: "",
};

function parseDate(d: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  return new Date(d);
}

export function isExpiredDate(d: string | null) {
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseDate(d) < today;
}

const VALID_PAGE_SIZES = [10, 20, 50];

export function useAvisos() {
  const user = getUser();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MASTER_ADMIN";

  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchParams, setSearchParams] = useSearchParams();

  // URL-derived state
  const searchText = searchParams.get("q") ?? "";
  const filterTipo = (searchParams.get("tipo") ?? "").split(",").filter(Boolean) as AvisoTipo[];
  const sortKey = (searchParams.get("sort") ?? "created_at") as AvisoSortKey;
  const sortDir = (searchParams.get("dir") ?? "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const rawSize = parseInt(searchParams.get("size") ?? "10", 10);
  const pageSize = VALID_PAGE_SIZES.includes(rawSize) ? rawSize : 10;
  const filterExpirado = (searchParams.get("expirado") ?? "") as "" | "sim" | "nao";
  const filterFixado = (searchParams.get("fixado") ?? "") as "" | "sim" | "nao";

  // UI-only state
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);
  const [form, setForm] = useState<CreateAvisoPayload>(EMPTY_FORM);
  const [formCondominioUUID, setFormCondominioUUID] = useState<string | null>(null);
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [editAnexoFile, setEditAnexoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [editando, setEditando] = useState<Aviso | null>(null);
  const [editForm, setEditForm] = useState<CreateAvisoPayload>(EMPTY_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [detalhe, setDetalhe] = useState<Aviso | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    listAvisos()
      .then(setAvisos)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── URL param setters ───────────────────────────────────────────────────
  function setSearchText(v: string) {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      if (v) next.set("q", v); else next.delete("q");
      next.delete("page");
      return next;
    });
  }

  function setPage(p: number) {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      if (p > 1) next.set("page", String(p)); else next.delete("page");
      return next;
    });
  }

  function setPageSize(s: number) {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      if (s !== 10) next.set("size", String(s)); else next.delete("size");
      next.delete("page");
      return next;
    });
  }

  function handleSort(key: AvisoSortKey) {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      const currentKey = prev.get("sort") ?? "created_at";
      const currentDir = prev.get("dir") ?? "desc";
      if (currentKey === key) {
        const newDir = currentDir === "asc" ? "desc" : "asc";
        if (newDir === "desc") next.delete("dir"); else next.set("dir", newDir);
      } else {
        if (key !== "created_at") next.set("sort", key); else next.delete("sort");
        next.delete("dir");
      }
      next.delete("page");
      return next;
    });
  }

  function applyFilters(filters: {
    filterTipo: AvisoTipo[];
    filterExpirado: "" | "sim" | "nao";
    filterFixado: "" | "sim" | "nao";
    sortKey: AvisoSortKey;
    sortDir: "asc" | "desc";
  }) {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      if (filters.filterTipo.length > 0) next.set("tipo", filters.filterTipo.join(",")); else next.delete("tipo");
      if (filters.filterExpirado) next.set("expirado", filters.filterExpirado); else next.delete("expirado");
      if (filters.filterFixado) next.set("fixado", filters.filterFixado); else next.delete("fixado");
      if (filters.sortKey !== "created_at") next.set("sort", filters.sortKey); else next.delete("sort");
      if (filters.sortDir !== "desc") next.set("dir", filters.sortDir); else next.delete("dir");
      next.delete("page");
      return next;
    });
  }

  // ── Filters + Sort + Pagination ─────────────────────────────────────────
  const filtered = avisos.filter((a) => {
    if (filterTipo.length > 0 && !filterTipo.includes(a.tipo)) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      if (!a.titulo.toLowerCase().includes(q) && !a.descricao.toLowerCase().includes(q)) return false;
    }
    if (filterExpirado === "sim" && !isExpiredDate(a.data_expiracao)) return false;
    if (filterExpirado === "nao" && isExpiredDate(a.data_expiracao)) return false;
    if (filterFixado === "sim" && !a.fixado) return false;
    if (filterFixado === "nao" && a.fixado) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.fixado !== b.fixado) return a.fixado ? -1 : 1;
    let cmp = 0;
    if (sortKey === "titulo") cmp = a.titulo.localeCompare(b.titulo);
    else if (sortKey === "tipo") cmp = a.tipo.localeCompare(b.tipo);
    else if (sortKey === "created_at") cmp = a.created_at.localeCompare(b.created_at);
    else if (sortKey === "data_expiracao") cmp = (a.data_expiracao ?? "").localeCompare(b.data_expiracao ?? "");
    else if (sortKey === "curtidas_count") cmp = a.curtidas_count - b.curtidas_count;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalFiltered = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const activeFilterCount = (filterTipo.length > 0 ? 1 : 0)
    + [filterExpirado, filterFixado].filter(Boolean).length
    + (sortKey !== "created_at" || sortDir !== "desc" ? 1 : 0);

  // ── Handlers ────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      let arquivo_url = form.arquivo_url || undefined;
      if (anexoFile) arquivo_url = await uploadAvisoAnexo(anexoFile);
      await createAviso(
        { ...form, data_expiracao: form.data_expiracao || undefined, arquivo_url },
        formCondominioUUID,
      );
      setNovoOpen(false);
      setForm(EMPTY_FORM);
      setFormCondominioUUID(null);
      setAnexoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar aviso.");
    } finally {
      setSubmitting(false);
    }
  }

  function openEditar(a: Aviso) {
    setEditando(a);
    setEditForm({ titulo: a.titulo, descricao: a.descricao, tipo: a.tipo, data_expiracao: a.data_expiracao ?? "", arquivo_url: a.arquivo_url ?? "" });
    setEditAnexoFile(null);
    setEditError("");
    setDetalhe(null);
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editando) return;
    setEditSubmitting(true);
    setEditError("");
    try {
      let arquivo_url = editForm.arquivo_url || undefined;
      if (editAnexoFile) arquivo_url = await uploadAvisoAnexo(editAnexoFile);
      await updateAviso(editando.id, { ...editForm, data_expiracao: editForm.data_expiracao || undefined, arquivo_url });
      setEditando(null);
      setEditAnexoFile(null);
      load();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja excluir este aviso?")) return;
    try {
      await deleteAviso(id);
      setDetalhe(null);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function handleFixar(a: Aviso) {
    try {
      await toggleFixarAviso(a.id, a.fixado);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao fixar.");
    }
  }

  async function handleCurtir(e: React.MouseEvent, a: Aviso) {
    e.stopPropagation();
    setAvisos((prev) => prev.map((item) =>
      item.id !== a.id ? item : {
        ...item,
        user_curtiu: !item.user_curtiu,
        curtidas_count: item.user_curtiu ? item.curtidas_count - 1 : item.curtidas_count + 1,
      }
    ));
    try {
      await toggleCurtidaAviso(a.id);
    } catch {
      setAvisos((prev) => prev.map((item) =>
        item.id !== a.id ? item : { ...item, user_curtiu: a.user_curtiu, curtidas_count: a.curtidas_count }
      ));
    }
  }

  return {
    avisos, loading, error,
    searchText, setSearchText,
    filterTipo, filterExpirado, filterFixado,
    sortKey, sortDir,
    page, setPage,
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
    load, handleSort, handleCreate, openEditar, handleEdit, handleDelete, handleFixar, handleCurtir,
    applyFilters,
  };
}
