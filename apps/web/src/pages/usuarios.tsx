import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { getUser } from "../features/auth/services/auth";
import {
  createUser,
  deleteUserRecord,
  listUsers,
  updateUserRecord,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserRecord,
} from "../features/dashboard/services/users";
import { listBuildingApartmentOptions, type BuildingApartmentOption } from "../features/predio/services/predio";
import {
  CAR_PLATE_INPUT_TITLE,
  CAR_PLATE_PATTERN,
  formatPhone,
  formatCarPlate,
  isCarPlateValid,
  isPhoneValid,
  normalizeCarPlate,
  PHONE_INPUT_TITLE,
  PHONE_PATTERN,
  RESIDENT_TYPE_LABEL,
  USER_STATUS_LABEL,
} from "../features/dashboard/utils/user-form";

type UserFormState = CreateUserPayload;

const EMPTY_FORM: UserFormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  carPlate: "",
  petsCount: null,
  role: "MORADOR",
  residentType: "PROPRIETARIO",
  status: "ATIVO",
  apartmentId: null,
};

const inputCls =
  "px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-[13px] outline-none w-full focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

function apartmentLabel(apartment: BuildingApartmentOption) {
  return `${apartment.number} · ${apartment.level}o andar`;
}

export default function UsuariosPage() {
  const currentUser = useMemo(() => getUser(), []);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [apartmentOptions, setApartmentOptions] = useState<BuildingApartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"TODOS" | "ADMIN" | "MORADOR" | "PORTEIRO">("TODOS");
  const [typeFilter, setTypeFilter] = useState<"TODOS" | UserFormState["residentType"]>("TODOS");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | UserFormState["status"]>("TODOS");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [selectedTower, setSelectedTower] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function loadPageData() {
    setLoading(true);
    setError("");

    const condominioUUID = currentUser?.role === "ADMIN" ? (currentUser.condominioUUID ?? undefined) : undefined;
    Promise.all([listUsers(condominioUUID), listBuildingApartmentOptions()])
      .then(([loadedUsers, loadedApartments]) => {
        setUsers(loadedUsers);
        setApartmentOptions(loadedApartments);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPageData();
  }, []);

  function openCreateModal() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setSelectedTower("");
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(user: UserRecord) {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      password: "",
      carPlate: user.car_plate ?? "",
      petsCount: user.pets_count ?? null,
      role: user.role,
      residentType: user.resident_type,
      status: user.status,
      apartmentId: user.apartment_id,
    });
    setSelectedTower(user.apartment_tower ?? "");
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUser(null);
    setSelectedTower("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    const phone = formatPhone(form.phone);
    const phoneIsRequired = !editingUser;
    if ((phoneIsRequired && !phone) || (phone && !isPhoneValid(phone))) {
      setFormError("Informe um telefone válido no formato (11) 99999-9999.");
      setSubmitting(false);
      return;
    }

    const normalizedCarPlate = normalizeCarPlate(form.carPlate);
    if (!isCarPlateValid(normalizedCarPlate)) {
      setFormError("Informe uma placa válida no formato ABC-1234 ou ABC1D23.");
      setSubmitting(false);
      return;
    }

    try {
      if (editingUser) {
        await updateUserRecord({
          id: editingUser.id,
          name: form.name,
          email: form.email,
          phone,
          carPlate: normalizedCarPlate,
          petsCount: form.petsCount,
          role: form.role,
          residentType: form.residentType,
          status: form.status,
          apartmentId: form.apartmentId,
        } satisfies UpdateUserPayload);
      } else {
        await createUser({ ...form, phone, carPlate: normalizedCarPlate });
      }

      closeModal();
      loadPageData();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error
          ? err.message
          : editingUser
            ? "Erro ao atualizar usuário."
            : "Erro ao criar usuário."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const towerOptions = useMemo(
    () => Array.from(new Set(apartmentOptions.map((apartment) => apartment.tower))).sort((a, b) => a.localeCompare(b)),
    [apartmentOptions]
  );

  const availableApartments = useMemo(
    () =>
      apartmentOptions.filter((apartment) => {
        if (!selectedTower || apartment.tower !== selectedTower) return false;
        return apartment.residentId === null || editingUser?.apartment_ids.includes(apartment.id);
      }),
    [apartmentOptions, selectedTower, editingUser]
  );

  async function handleDeleteUser(user: UserRecord) {
    if (currentUser?.email === user.email) {
      setError("Não é permitido excluir o usuário que está logado.");
      return;
    }

    if (!window.confirm(`Excluir o usuário ${user.name}? Essa ação remove o acesso ao sistema.`)) {
      return;
    }

    try {
      await deleteUserRecord(user.id);
      loadPageData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir usuário.");
    }
  }

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        term.length === 0 ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.phone ?? "").toLowerCase().includes(term) ||
        (user.car_plate ?? "").toLowerCase().includes(term) ||
        user.apartments.some(
          (apartment) =>
            apartment.tower.toLowerCase().includes(term) || apartment.number.toLowerCase().includes(term),
        );

      const matchesRole = roleFilter === "TODOS" || user.role === roleFilter;
      const matchesType = typeFilter === "TODOS" || user.resident_type === typeFilter;
      const matchesStatus = statusFilter === "TODOS" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesType && matchesStatus;
    });
  }, [users, search, roleFilter, typeFilter, statusFilter]);

  const isReadOnly = currentUser?.role === "MORADOR";

  return (
    <AppLayout title="Moradores">
      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="m-0 text-lg font-semibold text-slate-900">Moradores</h2>
              <p className="mt-1 text-sm text-slate-500">Visualize e filtre os moradores do condomínio.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-65">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, email, telefone, bloco ou placa"
                  className={`${inputCls} pl-9`}
                />
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  <Plus size={15} />
                  Novo usuário
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)} className={inputCls}>
              <option value="TODOS">Todos os perfis</option>
              <option value="ADMIN">Administradores</option>
              <option value="MORADOR">Moradores</option>
              <option value="PORTEIRO">Porteiros</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className={inputCls}>
              <option value="TODOS">Todos os tipos</option>
              <option value="PROPRIETARIO">Proprietario</option>
              <option value="INQUILINO">Inquilino</option>
              <option value="VISITANTE">Visitante</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={inputCls}>
              <option value="TODOS">Todos os status</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="m-0 text-sm font-semibold text-slate-900">Moradores cadastrados</h3>
              <p className="mt-0.5 text-xs text-slate-400">{filteredUsers.length} resultado(s)</p>
            </div>
          </div>

          {loading && <p className="text-sm text-slate-400">Carregando...</p>}
          {error && <p className="text-sm text-rose-500">{error}</p>}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-slate-50">
                    {["Nome", "Contato", "Tipo", "Status", "Perfil", "Unidade", "Detalhes", "Acoes"].map((header, index) => (
                      <th
                        key={header}
                        className={`px-3 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-100 ${index === 7 ? "text-right" : "text-left"}`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-3 py-3">
                        <p className="m-0 font-medium text-slate-800">{user.name}</p>
                        <p className="m-0 mt-0.5 text-[11px] text-slate-400">{user.email}</p>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-500">{user.phone || "-"}</td>
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-500">{RESIDENT_TYPE_LABEL[user.resident_type]}</td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            user.status === "ATIVO"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                              : "border-slate-200 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {USER_STATUS_LABEL[user.status]}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            user.role === "ADMIN"
                              ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                              : user.role === "PORTEIRO"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {user.role === "ADMIN" ? "Administrador" : user.role === "PORTEIRO" ? "Porteiro" : "Morador"}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-500">
                        {user.apartments.length > 0
                          ? user.apartments.map((apartment) => `${apartment.tower} · Apto ${apartment.number}`).join(", ")
                          : "-"}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-slate-500">
                        {[
                          user.car_plate ? `Placa ${user.car_plate}` : null,
                          typeof user.pets_count === "number" ? `${user.pets_count} pet${user.pets_count === 1 ? "" : "s"}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "-"}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        {!isReadOnly && (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(user)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Pencil size={14} />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                            >
                              <Trash2 size={14} />
                              Excluir
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="m-0 px-6 pt-6 text-base font-semibold text-gray-900">{editingUser ? "Editar usuário" : "Novo usuário"}</h3>
              <button
                type="button"
                className="mr-6 mt-6 rounded-lg bg-transparent p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                onClick={closeModal}
              >
                <X size={18} />
              </button>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
              <div className="grid min-h-0 gap-6 overflow-y-auto px-6 pb-4 md:grid-cols-2">
                <div className="grid gap-4">
                  {[
                    { id: "u-name", label: "Nome completo", type: "text", placeholder: "Nome completo", key: "name" as const },
                    { id: "u-email", label: "Email", type: "email", placeholder: "email@exemplo.com", key: "email" as const },
                    { id: "u-phone", label: "Telefone", type: "tel", placeholder: "(11) 99999-9999", key: "phone" as const },
                  ].map((field) => (
                    <div key={field.id} className="grid gap-1.5">
                      <label htmlFor={field.id} className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {field.label}
                      </label>
                      <input
                        id={field.id}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={form[field.key]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [field.key]: field.key === "phone" ? formatPhone(e.target.value) : e.target.value,
                          })
                        }
                        required={field.key === "phone" ? !editingUser : true}
                        pattern={field.key === "phone" ? PHONE_PATTERN : undefined}
                        title={field.key === "phone" ? PHONE_INPUT_TITLE : undefined}
                        inputMode={field.key === "phone" ? "tel" : undefined}
                        maxLength={field.key === "phone" ? 15 : undefined}
                        className={inputCls}
                      />
                    </div>
                  ))}

                  {!editingUser && (
                    <div className="grid gap-1.5">
                      <label htmlFor="u-password" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Senha
                      </label>
                      <input
                        id="u-password"
                        type="password"
                        placeholder="Minimo 6 caracteres"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        minLength={6}
                        className={inputCls}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="grid gap-1.5">
                      <label htmlFor="u-car-plate" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Placa do carro
                      </label>
                      <input
                        id="u-car-plate"
                        value={form.carPlate}
                        onChange={(e) => setForm({ ...form, carPlate: formatCarPlate(e.target.value) })}
                        placeholder="ABC-1234"
                        pattern={CAR_PLATE_PATTERN}
                        title={CAR_PLATE_INPUT_TITLE}
                        maxLength={8}
                        className={inputCls}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label htmlFor="u-pets-count" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Número de pets
                      </label>
                      <input
                        id="u-pets-count"
                        type="number"
                        min={0}
                        value={form.petsCount ?? ""}
                        onChange={(e) => setForm({ ...form, petsCount: e.target.value === "" ? null : Number(e.target.value) })}
                        placeholder="0"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-1.5">
                    <label htmlFor="u-role" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Perfil
                    </label>
                    <select
                      id="u-role"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as UserFormState["role"] })}
                      className={inputCls}
                    >
                      <option value="MORADOR">Morador</option>
                      <option value="PORTEIRO">Porteiro</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>

                  <div className="grid gap-1.5">
                    <label htmlFor="u-resident-type" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Tipo de usuário
                    </label>
                    <select
                      id="u-resident-type"
                      value={form.residentType}
                      onChange={(e) => setForm({ ...form, residentType: e.target.value as UserFormState["residentType"] })}
                      className={inputCls}
                    >
                      <option value="PROPRIETARIO">Proprietario</option>
                      <option value="INQUILINO">Inquilino</option>
                      <option value="VISITANTE">Visitante</option>
                    </select>
                  </div>

                  <div className="grid gap-1.5">
                    <label htmlFor="u-status" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </label>
                    <select
                      id="u-status"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as UserFormState["status"] })}
                      className={inputCls}
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                    </select>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Vinculo com unidade</p>
                    <p className="mt-1 text-xs text-slate-500">Os blocos e apartamentos abaixo usam a mesma base do mapa do edifício.</p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label htmlFor="u-tower" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Bloco
                        </label>
                        <select
                          id="u-tower"
                          value={selectedTower}
                          onChange={(e) => {
                            setSelectedTower(e.target.value);
                            setForm({ ...form, apartmentId: null });
                          }}
                          className={inputCls}
                        >
                          <option value="">Sem bloco</option>
                          {towerOptions.map((tower) => (
                            <option key={tower} value={tower}>
                              {tower}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-1.5">
                        <label htmlFor="u-apartment" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Apartamento
                        </label>
                        <select
                          id="u-apartment"
                          value={form.apartmentId ?? ""}
                          onChange={(e) => setForm({ ...form, apartmentId: e.target.value || null })}
                          className={inputCls}
                          disabled={!selectedTower}
                        >
                          <option value="">{selectedTower ? "Sem apartamento" : "Selecione o bloco"}</option>
                          {availableApartments.map((apartment) => (
                            <option key={apartment.id} value={apartment.id}>
                              {apartmentLabel(apartment)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 px-6 py-4">
                {formError && <p className="mb-3 text-xs text-rose-500">{formError}</p>}
                <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting ? "Salvando..." : editingUser ? "Salvar alterações" : "Criar usuário"}
                </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
