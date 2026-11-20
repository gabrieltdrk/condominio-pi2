import {
  Filter, Pencil, Plus, Search, ShieldOff, ShieldCheck, Users, X, MailCheck, Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "../../features/layout/components/app-layout";
import { getUser } from "../../features/auth/services/auth";
import { getPlanLimits, PLAN_LABELS, type PlanId } from "../../config/plans";
import { supabase } from "../../lib/supabase";
import { fmtDate } from "../../lib/format";
import {
  inviteUser, listUsers, listCondominiosBasic, resendInvite, setUserRemoved, updateUserRecord,
  type CondominioBrief, type InviteUserPayload, type UpdateUserPayload, type UserRecord,
} from "../../features/dashboard/services/users";
import { listBuildingApartmentOptions, type BuildingApartmentOption } from "../../features/predio/services/predio";
import { SortTh } from "../../components/ui/sort-th";
import { Pagination } from "../../components/ui/pagination";
import {
  formatPhone, isCarPlateValid, isPhoneValid, normalizeCarPlate,
  RESIDENT_TYPE_LABEL,
} from "../../features/dashboard/utils/user-form";
import { type Role, type ResidentType, type SortKey, type FilterDraft } from "./types";
import { FilterPanel } from "./components/filter-panel";
import { InviteModal } from "./components/invite-modal";
import { EditUserModal } from "./components/edit-user-modal";

export default function UsuariosPage() {
  const currentUser = useMemo(() => getUser(), []);
  const isMasterAdmin = currentUser?.role === "MASTER_ADMIN";
  const isAdmin = currentUser?.role === "ADMIN" || isMasterAdmin;
  const isResident = currentUser?.role === "MORADOR";

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [condominios, setCondominios] = useState<CondominioBrief[]>([]);
  const [apartmentOptions, setApartmentOptions] = useState<BuildingApartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [condPlan, setCondPlan] = useState<PlanId>(null);

  // ── URL state ──────────────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const searchText = searchParams.get("q") ?? "";
  const filterRoles = (searchParams.get("role") ?? "").split(",").filter(Boolean) as Role[];
  const filterTipos = (searchParams.get("tipo") ?? "").split(",").filter(Boolean) as ResidentType[];
  const filterHabilitado = (searchParams.get("habilitado") ?? "") as "" | "sim" | "nao";
  const filterCondominioId = searchParams.get("cond") ?? "";
  const sortKey = (searchParams.get("sort") ?? "created_at") as SortKey;
  const sortDir = (searchParams.get("dir") ?? "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const rawSize = parseInt(searchParams.get("size") ?? "10", 10);
  const pageSize = [10, 20, 50].includes(rawSize) ? rawSize : 10;

  // ── UI state ───────────────────────────────────────────────────────────────
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [selectedTower, setSelectedTower] = useState("");

  const [inviteForm, setInviteForm] = useState<InviteUserPayload>({
    email: "", role: "MORADOR", residentType: "PROPRIETARIO", apartmentId: null, condominioId: currentUser?.condominioUUID ?? null,
  });
  const [editForm, setEditForm] = useState<Omit<UpdateUserPayload, "id">>({
    name: "", email: "", phone: "", carPlate: "", petsCount: null,
    role: "MORADOR", residentType: "PROPRIETARIO", status: "ATIVO", apartmentId: null,
  });

  // ── Data loading ───────────────────────────────────────────────────────────
  function loadData() {
    setLoading(true);
    setError("");
    const condId = isMasterAdmin ? (filterCondominioId || undefined) : (currentUser?.condominioUUID ?? undefined);

    if (!isMasterAdmin && currentUser?.condominioUUID) {
      supabase.from("condominios").select("plan").eq("id", currentUser.condominioUUID).single()
        .then(({ data }) => setCondPlan((data?.plan ?? null) as PlanId));
    }

    const promises: Promise<unknown>[] = [
      listUsers(condId).then(setUsers),
      listBuildingApartmentOptions().then(setApartmentOptions),
    ];
    if (isMasterAdmin) promises.push(listCondominiosBasic().then(setCondominios));

    Promise.all(promises)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [filterCondominioId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── URL setters ────────────────────────────────────────────────────────────
  function updateParam(key: string, value: string, resetPage = true) {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      if (resetPage) next.delete("page");
      return next;
    });
  }

  function setSearchText(v: string) { updateParam("q", v); }
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

  function handleSort(key: SortKey) {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      const curKey = prev.get("sort") ?? "created_at";
      const curDir = prev.get("dir") ?? "desc";
      if (curKey === key) {
        const newDir = curDir === "asc" ? "desc" : "asc";
        if (newDir === "desc") next.delete("dir"); else next.set("dir", newDir);
      } else {
        if (key !== "created_at") next.set("sort", key); else next.delete("sort");
        next.delete("dir");
      }
      next.delete("page");
      return next;
    });
  }

  function applyFilters(f: FilterDraft) {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      if (f.roles.length) next.set("role", f.roles.join(",")); else next.delete("role");
      if (f.tipos.length) next.set("tipo", f.tipos.join(",")); else next.delete("tipo");
      if (f.habilitado) next.set("habilitado", f.habilitado); else next.delete("habilitado");
      if (f.condominioId) next.set("cond", f.condominioId); else next.delete("cond");
      if (f.sortKey !== "created_at") next.set("sort", f.sortKey); else next.delete("sort");
      if (f.sortDir !== "desc") next.set("dir", f.sortDir); else next.delete("dir");
      next.delete("page");
      return next;
    });
  }

  // ── Filtering + sorting + pagination ──────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchText.toLowerCase();
    return users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) &&
        !(u.phone ?? "").toLowerCase().includes(q) && !(u.car_plate ?? "").toLowerCase().includes(q) &&
        !u.apartments.some((a) => a.number.toLowerCase().includes(q) || a.tower.toLowerCase().includes(q))) return false;
      if (filterRoles.length && !filterRoles.includes(u.role)) return false;
      if (filterTipos.length && !filterTipos.includes(u.resident_type)) return false;
      if (filterHabilitado === "sim" && u.removed) return false;
      if (filterHabilitado === "nao" && !u.removed) return false;
      return true;
    });
  }, [users, searchText, filterRoles, filterTipos, filterHabilitado]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "email") cmp = a.email.localeCompare(b.email);
      else if (sortKey === "role") cmp = a.role.localeCompare(b.role);
      else cmp = a.created_at.localeCompare(b.created_at);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalFiltered = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const activeFilterCount = (filterRoles.length ? 1 : 0) + (filterTipos.length ? 1 : 0)
    + [filterHabilitado, filterCondominioId].filter(Boolean).length
    + (sortKey !== "created_at" || sortDir !== "desc" ? 1 : 0);

  // ── Limites do plano ───────────────────────────────────────────────────────
  const planLimits = getPlanLimits(condPlan);
  const planLabel = PLAN_LABELS[condPlan ?? "go"] ?? condPlan ?? "go";
  const activeUsers = users.filter((u) => !u.removed);
  const residentCount = activeUsers.filter((u) => u.role === "MORADOR").length;
  const adminCount = activeUsers.filter((u) => u.role === "ADMIN").length;
  const residentLimitReached = !isMasterAdmin && residentCount >= planLimits.maxResidents;
  const adminLimitReached = !isMasterAdmin && adminCount >= planLimits.maxAdmins;

  function checkPlanLimit(role: "ADMIN" | "MORADOR" | "PORTEIRO", previousRole?: "ADMIN" | "MORADOR" | "PORTEIRO") {
    if (isMasterAdmin) return;
    // Só valida se a role está mudando (ou é nova)
    if (role === "MORADOR" && role !== previousRole) {
      if (residentCount >= planLimits.maxResidents) {
        throw new Error(
          `Limite de ${planLimits.maxResidents} moradores do plano ${planLabel} atingido.`,
        );
      }
    }
    if (role === "ADMIN" && role !== previousRole) {
      if (adminCount >= planLimits.maxAdmins) {
        throw new Error(
          `Limite de ${planLimits.maxAdmins} síndico(s)/admin(s) do plano ${planLabel} atingido.`,
        );
      }
    }
  }

  // ── Modals ─────────────────────────────────────────────────────────────────
  function openInvite() {
    setInviteForm({ email: "", role: "MORADOR", residentType: "PROPRIETARIO", apartmentId: null, condominioId: currentUser?.condominioUUID ?? null });
    setSelectedTower("");
    setFormError("");
    setInviteOpen(true);
  }

  function openEdit(u: UserRecord) {
    setEditingUser(u);
    setEditForm({
      name: u.name, email: u.email, phone: u.phone ?? "",
      carPlate: u.car_plate ?? "", petsCount: u.pets_count ?? null,
      role: u.role, residentType: u.resident_type, status: u.status,
      apartmentId: u.apartment_id,
    });
    setSelectedTower(u.apartment_tower ?? "");
    setFormError("");
    setEditOpen(true);
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      checkPlanLimit(inviteForm.role);
      await inviteUser(inviteForm);
      setInviteOpen(false);
      loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao enviar convite.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setFormError("");
    const phone = formatPhone(editForm.phone);
    if (phone && !isPhoneValid(phone)) {
      setFormError("Informe um telefone válido no formato (11) 99999-9999.");
      setSubmitting(false);
      return;
    }
    const plate = normalizeCarPlate(editForm.carPlate);
    if (!isCarPlateValid(plate)) {
      setFormError("Placa inválida. Use ABC-1234 ou ABC1D23.");
      setSubmitting(false);
      return;
    }
    try {
      checkPlanLimit(editForm.role, editingUser.role);
      await updateUserRecord({ id: editingUser.id, ...editForm, phone, carPlate: plate } satisfies UpdateUserPayload);
      setEditOpen(false);
      loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao atualizar usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleRemoved(u: UserRecord) {
    const action = u.removed ? "habilitar" : "desabilitar";
    if (!window.confirm(`Deseja ${action} o usuário ${u.name || u.email}?`)) return;
    try {
      await setUserRemoved(u.id, !u.removed);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Erro ao ${action} usuário.`);
    }
  }

  async function handleResendInvite(u: UserRecord) {
    setResendingId(u.id);
    try {
      await resendInvite(u.email);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reenviar convite.");
    } finally {
      setResendingId(null);
    }
  }

  // ── Apartment selects ──────────────────────────────────────────────────────
  const towerOptions = useMemo(
    () => Array.from(new Set(apartmentOptions.map((a) => a.tower))).sort((a, b) => a.localeCompare(b)),
    [apartmentOptions]
  );
  const availableApartments = useMemo(
    () => apartmentOptions.filter((a) => {
      if (!selectedTower || a.tower !== selectedTower) return false;
      return a.residentId === null || editingUser?.apartment_ids.includes(a.id);
    }),
    [apartmentOptions, selectedTower, editingUser]
  );

  const filterDraft: FilterDraft = {
    roles: filterRoles, tipos: filterTipos,
    habilitado: filterHabilitado, condominioId: filterCondominioId,
    sortKey, sortDir,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Usuários">
      <div className="flex flex-col gap-4 md:h-full">

        {/* Toolbar */}
        <div className="shrink-0 flex items-center gap-3 flex-wrap">
          {!isResident && (
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
          )}
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text" placeholder={isResident ? "Buscar por nome..." : "Buscar por nome, email, telefone, bloco ou placa..."}
              value={searchText} onChange={(e) => setSearchText(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-400 w-full transition-colors"
            />
            {searchText && (
              <button onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={13} />
              </button>
            )}
          </div>
          {isAdmin && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <button
                onClick={openInvite}
                disabled={residentLimitReached && adminLimitReached}
                title={residentLimitReached && adminLimitReached ? `Limite do plano ${planLabel} atingido` : undefined}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold cursor-pointer border-none transition-all shadow-sm shadow-indigo-200"
              >
                <Plus size={15} /> Convidar usuário
              </button>
              {!isMasterAdmin && condPlan && (
                <p className="text-[11px] text-slate-400">
                  {residentCount}/{planLimits.maxResidents === Infinity ? "∞" : planLimits.maxResidents} moradores
                  {" · "}
                  {adminCount}/{planLimits.maxAdmins === Infinity ? "∞" : planLimits.maxAdmins} admin(s)
                </p>
              )}
            </div>
          )}
        </div>

        {error && <p className="shrink-0 text-sm text-red-500">{error}</p>}

        {/* Loading */}
        {loading && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        )}

        {/* Empty */}
        {!loading && pageItems.length === 0 && !error && (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center gap-3 text-center shadow-sm">
            <Users size={36} className="text-gray-300" />
            <p className="text-base text-gray-500">Nenhum usuário encontrado.</p>
          </div>
        )}

        {/* Table */}
        {!loading && pageItems.length > 0 && (
          <div className="hidden md:flex flex-col flex-1 min-h-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50/80">
                    <SortTh col="name" label="Nome" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh col="role" label="Perfil" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    {!isResident && <th className="px-3 py-3 border-b border-gray-100 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase whitespace-nowrap">Tipo</th>}
                    {!isResident && <th className="px-3 py-3 border-b border-gray-100 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase whitespace-nowrap">Habilitado</th>}
                    <th className="px-3 py-3 border-b border-gray-100 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase whitespace-nowrap">Unidade</th>
                    {!isResident && <SortTh col="created_at" label="Cadastro" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                    {isAdmin && <th className="px-3 py-3 border-b border-gray-100 text-center text-xs font-semibold tracking-wider text-gray-500 uppercase">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((u, idx) => (
                    <tr key={u.id} style={{ animationDelay: `${idx * 20}ms` }}
                      className="transition-colors hover:bg-indigo-50/30">
                      <td className="px-3 py-3 border-b border-gray-100">
                        <p className="font-medium text-gray-800">{u.name || <span className="text-gray-400 italic">Pendente</span>}</p>
                        {!isResident && <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-100">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${u.role === "ADMIN" ? "border-indigo-200 bg-indigo-50 text-indigo-600" : u.role === "PORTEIRO" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-gray-200 bg-gray-100 text-gray-600"}`}>
                          {u.role === "ADMIN" ? "Administrador" : u.role === "PORTEIRO" ? "Porteiro" : "Morador"}
                        </span>
                      </td>
                      {!isResident && <td className="px-3 py-3 border-b border-gray-100 text-gray-500 text-sm">{RESIDENT_TYPE_LABEL[u.resident_type]}</td>}
                      {!isResident && (
                        <td className="px-3 py-3 border-b border-gray-100">
                          {u.removed
                            ? <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-rose-600"><ShieldOff size={10} /> Não</span>
                            : <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-600"><ShieldCheck size={10} /> Sim</span>
                          }
                        </td>
                      )}
                      <td className="px-3 py-3 border-b border-gray-100 text-gray-500 text-sm">
                        {u.apartments.length > 0 ? u.apartments.map((a) => `${a.tower} · Apto ${a.number}`).join(", ") : "—"}
                      </td>
                      {!isResident && <td className="px-3 py-3 border-b border-gray-100 text-gray-400 text-sm whitespace-nowrap">{fmtDate(u.created_at)}</td>}
                      {isAdmin && (
                        <td className="px-3 py-3 border-b border-gray-100">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => openEdit(u)} title="Editar"
                              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-gray-400 cursor-pointer transition-colors">
                              <Pencil size={14} />
                            </button>
                            {!u.name && (
                              <button onClick={() => void handleResendInvite(u)} title="Reenviar convite"
                                disabled={resendingId === u.id}
                                className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50 cursor-pointer transition-colors">
                                {resendingId === u.id ? <Loader2 size={14} className="animate-spin" /> : <MailCheck size={14} />}
                              </button>
                            )}
                            <button onClick={() => void handleToggleRemoved(u)}
                              title={u.removed ? "Habilitar" : "Desabilitar"}
                              className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${u.removed ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "border-rose-200 bg-white text-rose-400 hover:bg-rose-50 hover:text-rose-600"}`}>
                              {u.removed ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="shrink-0 px-3 py-2 border-t border-gray-100">
              <Pagination page={safePage} totalPages={totalPages} total={totalFiltered} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} />
            </div>
          </div>
        )}

        {/* Mobile cards */}
        {!loading && pageItems.length > 0 && (
          <div className="md:hidden grid gap-3">
            {pageItems.map((u) => (
              <div key={u.id} className={`bg-white border border-gray-200 rounded-2xl p-4 shadow-sm ${!isResident && u.removed ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{u.name || <span className="text-gray-400 italic text-sm">Pendente</span>}</p>
                    {!isResident && <p className="text-xs text-gray-400">{u.email}</p>}
                  </div>
                  {!isResident && (u.removed
                    ? <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-rose-600 shrink-0"><ShieldOff size={10} /> Desabilitado</span>
                    : <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-600 shrink-0"><ShieldCheck size={10} /> Habilitado</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${u.role === "ADMIN" ? "border-indigo-200 bg-indigo-50 text-indigo-600" : u.role === "PORTEIRO" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-gray-200 bg-gray-100 text-gray-600"}`}>
                    {u.role === "ADMIN" ? "Admin" : u.role === "PORTEIRO" ? "Porteiro" : "Morador"}
                  </span>
                </div>
                {u.apartments.length > 0 && (
                  <p className="text-xs text-gray-500 mb-3">{u.apartments.map((a) => `${a.tower} · Apto ${a.number}`).join(", ")}</p>
                )}
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-indigo-200 hover:text-indigo-600 cursor-pointer transition-colors">Editar</button>
                    {!u.name && (
                      <button onClick={() => void handleResendInvite(u)} disabled={resendingId === u.id}
                        className="flex-1 py-1.5 rounded-lg border border-amber-200 text-xs font-semibold text-amber-600 hover:bg-amber-50 disabled:opacity-50 cursor-pointer transition-colors flex items-center justify-center gap-1">
                        {resendingId === u.id ? <Loader2 size={12} className="animate-spin" /> : <MailCheck size={12} />}
                        Reenviar
                      </button>
                    )}
                    <button onClick={() => void handleToggleRemoved(u)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${u.removed ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-rose-200 text-rose-500 hover:bg-rose-50"}`}>
                      {u.removed ? "Habilitar" : "Desabilitar"}
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div className="bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
              <Pagination page={safePage} totalPages={totalPages} total={totalFiltered} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} />
            </div>
          </div>
        )}
      </div>

      <FilterPanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        initial={filterDraft}
        onApply={applyFilters}
        condominios={condominios}
        isMasterAdmin={isMasterAdmin}
      />

      <InviteModal
        open={inviteOpen}
        inviteForm={inviteForm}
        setInviteForm={setInviteForm}
        submitting={submitting}
        formError={formError}
        selectedTower={selectedTower}
        setSelectedTower={setSelectedTower}
        towerOptions={towerOptions}
        availableApartments={availableApartments}
        onClose={() => setInviteOpen(false)}
        onSubmit={handleInvite}
      />

      <EditUserModal
        open={editOpen}
        editingUser={editingUser}
        editForm={editForm}
        setEditForm={setEditForm}
        submitting={submitting}
        formError={formError}
        selectedTower={selectedTower}
        setSelectedTower={setSelectedTower}
        towerOptions={towerOptions}
        availableApartments={availableApartments}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
      />
    </AppLayout>
  );
}
