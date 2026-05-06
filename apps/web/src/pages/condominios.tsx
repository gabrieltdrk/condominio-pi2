import { useEffect, useState } from "react";
import {
  Building2,
  Dumbbell,
  Flame,
  PartyPopper,
  Pencil,
  Plus,
  Search,
  Trash2,
  Waves,
  X,
} from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { supabase } from "../lib/supabase";

type Condominio = {
  id: string;
  name: string;
  cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
  zip_code?: string | null;
  neighborhood?: string | null;
  number?: string | null;
  reference?: string | null;
  manager_name?: string | null;
  manager_phone?: string | null;
  management_company?: string | null;
  has_pool?: boolean;
  pool_count?: number;
  has_gym?: boolean;
  gym_count?: number;
  has_party_room?: boolean;
  party_room_count?: number;
  has_bbq?: boolean;
  bbq_count?: number;
};

type FormState = {
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  active: boolean;
  zip_code: string;
  neighborhood: string;
  number: string;
  reference: string;
  manager_name: string;
  manager_phone: string;
  management_company: string;
  has_pool: boolean;
  pool_count: number;
  has_gym: boolean;
  gym_count: number;
  has_party_room: boolean;
  party_room_count: number;
  has_bbq: boolean;
  bbq_count: number;
};

const emptyForm = (): FormState => ({
  name: "",
  cnpj: "",
  address: "",
  city: "",
  state: "",
  active: true,
  zip_code: "",
  neighborhood: "",
  number: "",
  reference: "",
  manager_name: "",
  manager_phone: "",
  management_company: "",
  has_pool: false,
  pool_count: 0,
  has_gym: false,
  gym_count: 0,
  has_party_room: false,
  party_room_count: 0,
  has_bbq: false,
  bbq_count: 0,
});

async function fetchCondominios(): Promise<Condominio[]> {
  const { data, error } = await supabase
    .from("condominios")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Condominio[];
}

async function saveCondominio(payload: Omit<FormState, never>, id?: string): Promise<Condominio> {
  const body = {
    name: payload.name,
    cnpj: payload.cnpj || null,
    address: payload.address || null,
    city: payload.city || null,
    state: payload.state || null,
    active: payload.active,
    zip_code: payload.zip_code || null,
    neighborhood: payload.neighborhood || null,
    number: payload.number || null,
    reference: payload.reference || null,
    manager_name: payload.manager_name || null,
    manager_phone: payload.manager_phone || null,
    management_company: payload.management_company || null,
    has_pool: payload.has_pool,
    pool_count: payload.pool_count,
    has_gym: payload.has_gym,
    gym_count: payload.gym_count,
    has_party_room: payload.has_party_room,
    party_room_count: payload.party_room_count,
    has_bbq: payload.has_bbq,
    bbq_count: payload.bbq_count,
  };

  if (id) {
    const { data, error } = await supabase
      .from("condominios")
      .update(body)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Condominio;
  }

  const { data, error } = await supabase
    .from("condominios")
    .insert(body)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Condominio;
}

async function deactivateCondominio(id: string): Promise<void> {
  const { error } = await supabase
    .from("condominios")
    .update({ active: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

async function lookupCep(cep: string): Promise<{
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
} | null> {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

const inputCls =
  "px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-[13px] outline-none w-full focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";
const labelCls =
  "block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1";

type AmenityKey = "pool" | "gym" | "party_room" | "bbq";
const amenities: { key: AmenityKey; label: string; icon: React.ElementType }[] = [
  { key: "pool", label: "Piscina", icon: Waves },
  { key: "gym", label: "Academia", icon: Dumbbell },
  { key: "party_room", label: "Salão de Festas", icon: PartyPopper },
  { key: "bbq", label: "Churrasqueira", icon: Flame },
];

export default function CondominiosPage() {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Condominio | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCondominios();
      setCondominios(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(c: Condominio) {
    setEditing(c);
    setForm({
      name: c.name,
      cnpj: c.cnpj ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      active: c.active,
      zip_code: c.zip_code ?? "",
      neighborhood: c.neighborhood ?? "",
      number: c.number ?? "",
      reference: c.reference ?? "",
      manager_name: c.manager_name ?? "",
      manager_phone: c.manager_phone ?? "",
      management_company: c.management_company ?? "",
      has_pool: c.has_pool ?? false,
      pool_count: c.pool_count ?? 0,
      has_gym: c.has_gym ?? false,
      gym_count: c.gym_count ?? 0,
      has_party_room: c.has_party_room ?? false,
      party_room_count: c.party_room_count ?? 0,
      has_bbq: c.has_bbq ?? false,
      bbq_count: c.bbq_count ?? 0,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCepBlur() {
    const cep = form.zip_code.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    const data = await lookupCep(cep);
    setCepLoading(false);
    if (!data) return;
    setForm((prev) => ({
      ...prev,
      address: data.logradouro || prev.address,
      neighborhood: data.bairro || prev.neighborhood,
      city: data.localidade || prev.city,
      state: data.uf || prev.state,
    }));
  }

  function toggleAmenity(key: AmenityKey) {
    const hasKey = `has_${key}` as keyof FormState;
    const countKey = `${key}_count` as keyof FormState;
    const current = form[hasKey] as boolean;
    setForm((prev) => ({
      ...prev,
      [hasKey]: !current,
      [countKey]: !current ? Math.max((prev[countKey] as number) || 0, 1) : 0,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const saved = await saveCondominio(form, editing?.id);
      setCondominios((prev) =>
        editing
          ? prev.map((c) => (c.id === editing.id ? saved : c))
          : [saved, ...prev],
      );
      closeModal();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(c: Condominio) {
    if (!confirm(`Desativar "${c.name}"?`)) return;
    try {
      await deactivateCondominio(c.id);
      setCondominios((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, active: false } : x)),
      );
    } catch (err: any) {
      alert(err.message);
    }
  }

  const filtered = condominios.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.city ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.cnpj ?? "").includes(search),
  );

  return (
    <AppLayout title="Condomínios">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-[13px] text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="Buscar por nome, cidade ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <Plus size={15} />
            Novo Condomínio
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Building2 size={32} className="text-gray-200" />
              <p className="text-sm text-gray-400">
                {search ? "Nenhum resultado encontrado." : "Nenhum condomínio cadastrado."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Nome</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Cidade / UF</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">CNPJ</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Síndico</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Amenidades</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {[c.city, c.state].filter(Boolean).join(" / ") || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-500">{c.cnpj || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{c.manager_name || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {c.has_pool && (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                              🏊 {c.pool_count}
                            </span>
                          )}
                          {c.has_gym && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                              🏋️ {c.gym_count}
                            </span>
                          )}
                          {c.has_party_room && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              🎉 {c.party_room_count}
                            </span>
                          )}
                          {c.has_bbq && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                              🔥 {c.bbq_count}
                            </span>
                          )}
                          {!c.has_pool && !c.has_gym && !c.has_party_room && !c.has_bbq && (
                            <span className="text-gray-300">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            c.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {c.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          {c.active && (
                            <button
                              onClick={() => handleDeactivate(c)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Desativar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  {editing ? "Editar Condomínio" : "Novo Condomínio"}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-6 px-6 py-5">
                {/* Identificação */}
                <section>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Identificação
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Nome *</label>
                      <input
                        className={inputCls}
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        placeholder="Nome do condomínio"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>CNPJ</label>
                      <input
                        className={inputCls}
                        value={form.cnpj}
                        onChange={(e) => set("cnpj", e.target.value)}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Status</label>
                      <select
                        className={inputCls}
                        value={form.active ? "true" : "false"}
                        onChange={(e) => set("active", e.target.value === "true")}
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Endereço */}
                <section>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Endereço
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>
                        CEP{" "}
                        {cepLoading && (
                          <span className="text-indigo-400">(buscando...)</span>
                        )}
                      </label>
                      <input
                        className={inputCls}
                        value={form.zip_code}
                        onChange={(e) => set("zip_code", e.target.value)}
                        onBlur={handleCepBlur}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Bairro</label>
                      <input
                        className={inputCls}
                        value={form.neighborhood}
                        onChange={(e) => set("neighborhood", e.target.value)}
                        placeholder="Bairro"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Logradouro</label>
                      <input
                        className={inputCls}
                        value={form.address}
                        onChange={(e) => set("address", e.target.value)}
                        placeholder="Rua, Av..."
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Número</label>
                      <input
                        className={inputCls}
                        value={form.number}
                        onChange={(e) => set("number", e.target.value)}
                        placeholder="123"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Referência</label>
                      <input
                        className={inputCls}
                        value={form.reference}
                        onChange={(e) => set("reference", e.target.value)}
                        placeholder="Próximo a..."
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Cidade</label>
                      <input
                        className={inputCls}
                        value={form.city}
                        onChange={(e) => set("city", e.target.value)}
                        placeholder="Cidade"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>UF</label>
                      <input
                        className={inputCls}
                        value={form.state}
                        onChange={(e) => set("state", e.target.value)}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </section>

                {/* Gestão Administrativa */}
                <section>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Gestão Administrativa
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Nome do Síndico</label>
                      <input
                        className={inputCls}
                        value={form.manager_name}
                        onChange={(e) => set("manager_name", e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Contato do Síndico</label>
                      <input
                        className={inputCls}
                        value={form.manager_phone}
                        onChange={(e) => set("manager_phone", e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Contato da Administradora</label>
                      <input
                        className={inputCls}
                        value={form.management_company}
                        onChange={(e) => set("management_company", e.target.value)}
                        placeholder="Nome / telefone da administradora"
                      />
                    </div>
                  </div>
                </section>

                {/* Amenidades */}
                <section>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Amenidades
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {amenities.map(({ key, label, icon: Icon }) => {
                      const hasKey = `has_${key}` as keyof FormState;
                      const countKey = `${key}_count` as keyof FormState;
                      const enabled = form[hasKey] as boolean;
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                            enabled
                              ? "border-indigo-200 bg-indigo-50"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleAmenity(key)}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              enabled
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            <Icon size={15} />
                          </button>
                          <span className="flex-1 text-[13px] font-medium text-gray-700">
                            {label}
                          </span>
                          {enabled && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  set(
                                    countKey as any,
                                    Math.max(0, (form[countKey] as number) - 1),
                                  )
                                }
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                              >
                                −
                              </button>
                              <span className="w-5 text-center text-[13px] font-semibold text-gray-800">
                                {form[countKey] as number}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  set(countKey as any, (form[countKey] as number) + 1)
                                }
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {formError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    {formError}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar condomínio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
