import { useEffect, useState } from "react";
import { Mail, MapPin, Pencil, Phone, Plus, Search, X } from "lucide-react";
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
  manager_email?: string | null;
  management_company?: string | null;
  management_contact_name?: string | null;
  management_contact_phone?: string | null;
  management_contact_email?: string | null;
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
  manager_email: string;
  management_company: string;
  management_contact_name: string;
  management_contact_phone: string;
  management_contact_email: string;
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
  manager_email: "",
  management_company: "",
  management_contact_name: "",
  management_contact_phone: "",
  management_contact_email: "",
});

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatCnpj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCep(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function mapsUrl(c: Condominio): string {
  const parts = [c.address, c.number, c.neighborhood, c.city, c.state, c.zip_code]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts)}`;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function fetchCondominios(): Promise<Condominio[]> {
  const { data, error } = await supabase
    .from("condominios")
    .select("id,name,cnpj,address,city,state,active,zip_code,neighborhood,number,reference,manager_name,manager_phone,manager_email,management_company,management_contact_name,management_contact_phone,management_contact_email")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Condominio[];
}

async function saveCondominio(payload: FormState, id?: string): Promise<Condominio> {
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
    manager_email: payload.manager_email || null,
    management_company: payload.management_company || null,
    management_contact_name: payload.management_contact_name || null,
    management_contact_phone: payload.management_contact_phone || null,
    management_contact_email: payload.management_contact_email || null,
  };

  if (id) {
    const { data, error } = await supabase.from("condominios").update(body).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data as Condominio;
  }

  const { data, error } = await supabase.from("condominios").insert(body).select().single();
  if (error) throw new Error(error.message);
  return data as Condominio;
}

async function toggleCondominioActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("condominios").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
}

async function lookupCep(cep: string): Promise<{ logradouro: string; bairro: string; localidade: string; uf: string } | null> {
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputCls =
  "px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-[13px] outline-none w-full focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";
const readonlyCls =
  "px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-[13px] w-full cursor-not-allowed";

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className={`-mx-6 px-6 py-2.5 mb-4 ${color}`}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-current">{label}</p>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setCondominios(await fetchCondominios());
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
      manager_email: c.manager_email ?? "",
      management_company: c.management_company ?? "",
      management_contact_name: c.management_contact_name ?? "",
      management_contact_phone: c.management_contact_phone ?? "",
      management_contact_email: c.management_contact_email ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Nome é obrigatório."); return; }
    setSaving(true);
    setFormError(null);
    try {
      const saved = await saveCondominio(form, editing?.id);
      setCondominios((prev) =>
        editing ? prev.map((c) => (c.id === editing.id ? saved : c)) : [saved, ...prev],
      );
      closeModal();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(c: Condominio) {
    const next = !c.active;
    if (!next && !confirm(`Desativar "${c.name}"? Usuários vinculados não conseguirão fazer login.`)) return;
    try {
      await toggleCondominioActive(c.id, next);
      setCondominios((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: next } : x)));
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
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <MapPin size={32} className="text-gray-200" />
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
                    <th className="px-16 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-36">Olhe no mapa</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">CNPJ</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Síndico</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Administradora</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const addressLine = [c.address, c.number].filter(Boolean).join(", ");
                    const cityLine = [c.city, c.state].filter(Boolean).join(" / ");
                    const cepLine = c.zip_code ? `CEP ${c.zip_code}` : "";
                    const subtitle = [addressLine, cityLine, cepLine].filter(Boolean).join(" · ");

                    return (
                      <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{c.name}</p>
                          {subtitle && (
                            <p className="mt-0.5 text-[11px] text-gray-400">{subtitle}</p>
                          )}
                        </td>
                        <td className="px-16 py-3 text-center">
                          <a
                            href={mapsUrl(c)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver no Google Maps"
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:bg-sky-50 hover:text-sky-500 transition-colors"
                          >
                            <MapPin size={15} />
                          </a>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-500">{c.cnpj || "—"}</td>
                        {/* Síndico */}
                        <td className="px-4 py-3">
                          {c.manager_name ? (
                            <div>
                              <p className="font-medium text-gray-700">{c.manager_name}</p>
                              <div className="mt-0.5 flex items-center gap-2">
                                {c.manager_phone && (
                                  <a
                                    href={`https://wa.me/55${c.manager_phone.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`WhatsApp: ${c.manager_phone}`}
                                    className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline"
                                  >
                                    <Phone size={11} />
                                    {c.manager_phone}
                                  </a>
                                )}
                                {c.manager_email && (
                                  <a
                                    href={`mailto:${c.manager_email}`}
                                    title={c.manager_email}
                                    className="inline-flex items-center gap-1 text-[11px] text-indigo-500 hover:underline"
                                  >
                                    <Mail size={11} />
                                    {c.manager_email}
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(c)}
                            title={c.active ? "Clique para desativar" : "Clique para ativar"}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                              c.active ? "bg-emerald-500" : "bg-red-400"
                            }`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${c.active ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </td>
                        {/* Administradora */}
                        <td className="px-4 py-3">
                          {c.management_company ? (
                            <div>
                              <p className="font-medium text-gray-700">{c.management_company}</p>
                              <div className="mt-0.5 flex items-center gap-2">
                                {c.management_contact_phone && (
                                  <a
                                    href={`https://wa.me/55${c.management_contact_phone.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`WhatsApp: ${c.management_contact_phone}`}
                                    className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline"
                                  >
                                    <Phone size={11} />
                                    {c.management_contact_phone}
                                  </a>
                                )}
                                {c.management_contact_email && (
                                  <a
                                    href={`mailto:${c.management_contact_email}`}
                                    title={c.management_contact_email}
                                    className="inline-flex items-center gap-1 text-[11px] text-indigo-500 hover:underline"
                                  >
                                    <Mail size={11} />
                                    {c.management_contact_email}
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
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
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl flex flex-col">
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
                <h2 className="text-sm font-semibold text-gray-900">
                  {editing ? "Editar Condomínio" : "Novo Condomínio"}
                </h2>
                <button type="button" onClick={closeModal} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                  <X size={16} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                <div className="space-y-0">

                  {/* ── Identificação ── */}
                  <section className="px-6 pt-5 pb-4">
                    <SectionHeader label="Identificação" color="bg-indigo-50 text-indigo-600" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <FieldLabel required>Nome do condomínio</FieldLabel>
                        <input
                          className={inputCls}
                          value={form.name}
                          onChange={(e) => set("name", e.target.value)}
                          placeholder="Ex.: Residencial Blainville"
                        />
                      </div>
                      <div>
                        <FieldLabel>CNPJ</FieldLabel>
                        <input
                          className={inputCls}
                          value={form.cnpj}
                          onChange={(e) => set("cnpj", formatCnpj(e.target.value))}
                          placeholder="00.000.000/0000-00"
                          maxLength={18}
                        />
                      </div>
                      <div>
                        <FieldLabel>Status</FieldLabel>
                        <div className="flex items-center gap-3 pt-1.5">
                          <button
                            type="button"
                            onClick={() => set("active", !form.active)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                              form.active ? "bg-emerald-500" : "bg-red-400"
                            }`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${form.active ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                          <span className={`text-[13px] font-medium ${form.active ? "text-emerald-600" : "text-red-500"}`}>
                            {form.active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="border-t border-gray-100" />

                  {/* ── Endereço ── */}
                  <section className="px-6 pt-5 pb-4">
                    <SectionHeader label="Endereço" color="bg-sky-50 text-sky-600" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel required>
                          CEP{cepLoading && <span className="ml-1 text-indigo-400 normal-case font-normal">(buscando...)</span>}
                        </FieldLabel>
                        <input
                          className={inputCls}
                          value={form.zip_code}
                          onChange={(e) => set("zip_code", formatCep(e.target.value))}
                          onBlur={handleCepBlur}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                      </div>
                      <div>
                        <FieldLabel>Bairro</FieldLabel>
                        <input className={readonlyCls} value={form.neighborhood} readOnly placeholder="Preenchido pelo CEP" />
                      </div>
                      <div className="sm:col-span-2">
                        <FieldLabel>Logradouro</FieldLabel>
                        <input className={readonlyCls} value={form.address} readOnly placeholder="Preenchido pelo CEP" />
                      </div>
                      <div>
                        <FieldLabel required>Número</FieldLabel>
                        <input
                          className={inputCls}
                          value={form.number}
                          onChange={(e) => set("number", e.target.value)}
                          placeholder="123"
                        />
                      </div>
                      <div>
                        <FieldLabel>Referência</FieldLabel>
                        <input
                          className={inputCls}
                          value={form.reference}
                          onChange={(e) => set("reference", e.target.value)}
                          placeholder="Próximo a..."
                        />
                      </div>
                      <div>
                        <FieldLabel>Cidade</FieldLabel>
                        <input className={readonlyCls} value={form.city} readOnly placeholder="Preenchido pelo CEP" />
                      </div>
                      <div>
                        <FieldLabel>UF</FieldLabel>
                        <input className={readonlyCls} value={form.state} readOnly placeholder="—" />
                      </div>
                    </div>
                  </section>

                  <div className="border-t border-gray-100" />

                  {/* ── Gestão Administrativa ── */}
                  <section className="px-6 pt-5 pb-4">
                    <SectionHeader label="Gestão Administrativa" color="bg-violet-50 text-violet-600" />

                    {/* Síndico */}
                    <p className="mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Síndico</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
                      <div>
                        <FieldLabel>Nome</FieldLabel>
                        <input
                          className={inputCls}
                          value={form.manager_name}
                          onChange={(e) => set("manager_name", e.target.value)}
                          placeholder="Nome completo"
                        />
                      </div>
                      <div>
                        <FieldLabel>Telefone de contato</FieldLabel>
                        <input
                          className={inputCls}
                          value={form.manager_phone}
                          onChange={(e) => set("manager_phone", formatPhone(e.target.value))}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <FieldLabel>E-mail</FieldLabel>
                        <input
                          type="email"
                          className={inputCls}
                          value={form.manager_email}
                          onChange={(e) => set("manager_email", e.target.value)}
                          placeholder="sindico@email.com"
                        />
                      </div>
                    </div>

                    {/* Administradora */}
                    <p className="mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Administradora</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Nome da administradora</FieldLabel>
                        <input
                          className={inputCls}
                          value={form.management_company}
                          onChange={(e) => set("management_company", e.target.value)}
                          placeholder="Nome da empresa"
                        />
                      </div>
                      <div>
                        <FieldLabel>Telefone de contato</FieldLabel>
                        <input
                          className={inputCls}
                          value={form.management_contact_phone}
                          onChange={(e) => set("management_contact_phone", formatPhone(e.target.value))}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <FieldLabel>E-mail de contato</FieldLabel>
                        <input
                          type="email"
                          className={inputCls}
                          value={form.management_contact_email}
                          onChange={(e) => set("management_contact_email", e.target.value)}
                          placeholder="contato@administradora.com"
                        />
                      </div>
                    </div>
                  </section>

                  {formError && (
                    <div className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                      {formError}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 shrink-0">
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
