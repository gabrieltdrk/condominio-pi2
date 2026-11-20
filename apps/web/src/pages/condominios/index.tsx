import { useEffect, useState } from "react";
import { Mail, MapPin, Pencil, Phone, Plus, Search } from "lucide-react";
import AppLayout from "../../features/layout/components/app-layout";
import { supabase } from "../../lib/supabase";
import type { Condominio, FormState } from "./types";
import { emptyForm, PLANS } from "./types";
import { mapsUrl } from "./utils/condominio-format";
import { CondominioFormModal } from "./components/condominio-form-modal";

async function fetchCondominios(): Promise<Condominio[]> {
  const { data, error } = await supabase
    .from("condominios")
    .select("id,name,cnpj,address,city,state,active,zip_code,neighborhood,number,reference,manager_name,manager_phone,manager_email,management_company,management_contact_name,management_contact_phone,management_contact_email,plan")
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
    plan: payload.plan || null,
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
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
      plan: c.plan ?? "",
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
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar.");
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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao alterar status.");
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
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Mapa</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Nome</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Plano</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">CNPJ</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Síndico</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Administradora</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Alterar</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const addressLine = [c.address, c.number].filter(Boolean).join(", ");
                    const cityLine = [c.city, c.state].filter(Boolean).join(" / ");
                    const cepLine = c.zip_code ? `CEP ${c.zip_code}` : "";
                    const subtitle = [addressLine, cityLine, cepLine].filter(Boolean).join(" — ");

                    return (
                      <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <a
                            href={mapsUrl(c)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver no Google Maps"
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <MapPin size={20} />
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{c.name}</p>
                          {subtitle && (
                            <p className="mt-0.5 text-[11px] text-gray-400">{subtitle}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.plan ? (
                            <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-600">
                              {PLANS.find((p) => p.id === c.plan)?.name ?? c.plan}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-500">{c.cnpj || "—"}</td>
                        <td className="px-4 py-3">
                          {c.manager_name || c.manager_phone || c.manager_email ? (
                            <div className="flex flex-col gap-0.5">
                              {c.manager_name && (
                                <p className="font-medium text-gray-700">{c.manager_name}</p>
                              )}
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
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void handleToggleActive(c)}
                            title={c.active ? "Clique para desativar" : "Clique para ativar"}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                              c.active ? "bg-emerald-500" : "bg-red-400"
                            }`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${c.active ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {c.management_company || c.management_contact_phone || c.management_contact_email ? (
                            <div className="flex flex-col gap-0.5">
                              {c.management_company && (
                                <p className="font-medium text-gray-700">{c.management_company}</p>
                              )}
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
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-start gap-1">
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

      <CondominioFormModal
        open={modalOpen}
        editing={editing}
        form={form}
        set={set}
        cepLoading={cepLoading}
        saving={saving}
        formError={formError}
        onCepBlur={handleCepBlur}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </AppLayout>
  );
}
