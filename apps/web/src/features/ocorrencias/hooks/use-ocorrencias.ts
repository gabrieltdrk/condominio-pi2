import { useCallback, useEffect, useRef, useState } from "react";
import { getUser } from "../../auth/services/auth";
import {
  createOcorrencia, getCurrentUserId, listOcorrencias, toggleCurtida,
  updateOcorrencia, updateOcorrenciaMorador, uploadOcorrenciaAnexo,
  PRIORIDADE_POR_CATEGORIA,
  type CreateOcorrenciaPayload, type Ocorrencia, type OcorrenciaStatus,
} from "../services/ocorrencias";
import {
  CATEGORIAS, LOCALIZACOES, STATUS_OPTIONS, URGENCIA_ORDER, STATUS_ORDER, CURTIDAS_DESTAQUE,
  type SortKey,
} from "../constants/ocorrencias.constants";

const EMPTY_FORM: CreateOcorrenciaPayload = {
  categoria: CATEGORIAS[0],
  localizacao: LOCALIZACOES[0],
  assunto: "",
  descricao: "",
  urgencia: PRIORIDADE_POR_CATEGORIA[CATEGORIAS[0]],
  privado: false,
};

export function useOcorrencias() {
  const user = getUser();
  const isAdmin = user?.role === "ADMIN";

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<OcorrenciaStatus[]>([]);
  const [filterCategoria, setFilterCategoria] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Nova ocorrência modal
  const [novaOpen, setNovaOpen] = useState(false);
  const [form, setForm] = useState<CreateOcorrenciaPayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detalhe modal
  const [detalhe, setDetalhe] = useState<Ocorrencia | null>(null);
  // Admin fields
  const [editStatus, setEditStatus] = useState<OcorrenciaStatus>("Aberto");
  const [editResponsavel, setEditResponsavel] = useState("");
  const [editRespostaInterna, setEditRespostaInterna] = useState("");
  const [editRespostaMorador, setEditRespostaMorador] = useState("");
  const [editMotivoCancelamento, setEditMotivoCancelamento] = useState("");
  // Morador edit fields
  const [editAssunto, setEditAssunto] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  const [editPrivado, setEditPrivado] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    listOcorrencias()
      .then(setOcorrencias)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    getCurrentUserId().then(setCurrentUserId);
  }, [load]);

  // ── Filters + Sort ──────────────────────────────────────────────────────
  const filtered = ocorrencias.filter((o) => {
    if (filterStatus.length > 0 && !filterStatus.includes(o.status)) return false;
    if (filterCategoria && o.categoria !== filterCategoria) return false;
    if (onlyMine && currentUserId && o.created_by !== currentUserId) return false;
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

  // ── Handlers ────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      let arquivo_url: string | undefined;
      if (anexoFile) arquivo_url = await uploadOcorrenciaAnexo(anexoFile);
      await createOcorrencia({ ...form, arquivo_url });
      setNovaOpen(false);
      setForm(EMPTY_FORM);
      setAnexoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar ocorrência.");
    } finally {
      setSubmitting(false);
    }
  }

  function onCategoriaChange(cat: string) {
    setForm((f) => ({ ...f, categoria: cat, urgencia: PRIORIDADE_POR_CATEGORIA[cat] ?? "Média", privado: cat === "Barulho" ? true : f.privado }));
  }

  function openDetalhe(o: Ocorrencia) {
    setDetalhe(o);
    // Admin fields
    setEditStatus(o.status);
    setEditResponsavel(o.responsavel ?? "");
    setEditRespostaInterna(o.resposta_interna ?? "");
    setEditRespostaMorador(o.resposta_morador ?? "");
    setEditMotivoCancelamento(o.motivo_cancelamento ?? "");
    // Morador fields
    setEditAssunto(o.assunto);
    setEditDescricao(o.descricao);
    setEditCategoria(o.categoria);
    setEditPrivado(o.privado);
    setSaveError("");
  }

  async function handleSaveAdmin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!detalhe) return;
    if (editStatus === "Cancelado" && !editMotivoCancelamento.trim()) {
      setSaveError("Informe o motivo do cancelamento.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await updateOcorrencia(detalhe.id, {
        status: editStatus,
        responsavel: editResponsavel || null,
        resposta_interna: editRespostaInterna || null,
        resposta_morador: editRespostaMorador || null,
        motivo_cancelamento: editStatus === "Cancelado" ? editMotivoCancelamento.trim() : null,
      });
      setDetalhe(null);
      load();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMorador(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!detalhe) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateOcorrenciaMorador(detalhe.id, {
        assunto: editAssunto || undefined,
        descricao: editDescricao || undefined,
        categoria: editCategoria || undefined,
        privado: editPrivado,
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
    e.stopPropagation();
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

  const isOwner = (o: Ocorrencia) => !!currentUserId && o.created_by === currentUserId;

  return {
    // state
    ocorrencias, loading, error, currentUserId,
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
    // derived
    filtered, displayed,
    CURTIDAS_DESTAQUE,
    EMPTY_FORM,
    isAdmin,
    // helpers
    fmt, isOwner,
    // handlers
    load, handleSort, toggleStatusFilter,
    handleCreate, onCategoriaChange, openDetalhe,
    handleSaveAdmin, handleSaveMorador, handleCurtir,
    // constants (re-exported for convenience)
    STATUS_OPTIONS,
  };
}
