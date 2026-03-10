import { useCallback, useEffect, useRef, useState } from "react";
import { getUser } from "../../auth/services/auth";
import {
  createAviso, deleteAviso, listAvisos, toggleCurtidaAviso,
  toggleFixarAviso, updateAviso, uploadAvisoAnexo,
  type Aviso, type AvisoTipo, type CreateAvisoPayload,
} from "../services/avisos";
import { CURTIDAS_DESTAQUE, type AvisoSortKey } from "../constants/avisos.constants";

const EMPTY_FORM: CreateAvisoPayload = {
  titulo: "",
  descricao: "",
  tipo: "Informativo",
  data_expiracao: "",
  arquivo_url: "",
};

export function useAvisos() {
  const user = getUser();
  const isAdmin = user?.role === "ADMIN";

  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterTipo, setFilterTipo] = useState<AvisoTipo | "">("");
  const [sortKey, setSortKey] = useState<AvisoSortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [novoOpen, setNovoOpen] = useState(false);
  const [form, setForm] = useState<CreateAvisoPayload>(EMPTY_FORM);
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

  // ── Filters + Sort ──────────────────────────────────────────────────────
  const filtered = avisos.filter((a) => {
    if (filterTipo && a.tipo !== filterTipo) return false;
    return true;
  });

  const displayed = [...filtered].sort((a, b) => {
    if (a.fixado !== b.fixado) return a.fixado ? -1 : 1;
    let cmp = 0;
    if (sortKey === "titulo") cmp = a.titulo.localeCompare(b.titulo);
    else if (sortKey === "tipo") cmp = a.tipo.localeCompare(b.tipo);
    else if (sortKey === "created_at") cmp = a.created_at.localeCompare(b.created_at);
    else if (sortKey === "data_expiracao") cmp = (a.data_expiracao ?? "").localeCompare(b.data_expiracao ?? "");
    else if (sortKey === "curtidas_count") cmp = a.curtidas_count - b.curtidas_count;
    return sortDir === "asc" ? cmp : -cmp;
  });

  function handleSort(key: AvisoSortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  // ── Handlers ────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      let arquivo_url = form.arquivo_url || undefined;
      if (anexoFile) arquivo_url = await uploadAvisoAnexo(anexoFile);
      await createAviso({ ...form, data_expiracao: form.data_expiracao || undefined, arquivo_url });
      setNovoOpen(false);
      setForm(EMPTY_FORM);
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
    // state
    avisos, loading, error,
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
    // derived
    filtered, displayed,
    CURTIDAS_DESTAQUE,
    isAdmin,
    // handlers
    load, handleSort, handleCreate, openEditar, handleEdit, handleDelete, handleFixar, handleCurtir,
  };
}
