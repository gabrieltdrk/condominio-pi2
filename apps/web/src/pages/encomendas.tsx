import { useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, Clock3, Package, PackageCheck, PlusCircle, Search, Trash2, UserRound, X } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { getUser } from "../features/auth/services/auth";
import {
  createDelivery,
  deleteDelivery,
  listDeliveries,
  listDeliveryApartmentOptions,
  markDeliveryPickedUp,
  subscribeToDeliveries,
  type Delivery,
  type DeliveryApartmentOption,
  type DeliveryStatus,
  uploadDeliveryPhoto,
} from "../features/encomendas/services/encomendas";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

const statusTone: Record<DeliveryStatus, { chip: string; card: string }> = {
  RECEBIDA: {
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    card: "border-amber-100 bg-amber-50/60",
  },
  AVISADA: {
    chip: "border-sky-200 bg-sky-50 text-sky-700",
    card: "border-sky-100 bg-sky-50/60",
  },
  RETIRADA: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    card: "border-emerald-100 bg-emerald-50/60",
  },
};

function formatDateTime(value: string | null) {
  if (!value) return "Nao registrado";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function apartmentLabel(apartment: DeliveryApartmentOption) {
  return `${apartment.tower} · Andar ${apartment.level} · Ap ${apartment.number}`;
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_120px_-35px_rgba(15,23,42,0.45)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <h3 className="m-0 text-lg font-semibold text-slate-950">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[calc(90vh-92px)] overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </div>
    </>
  );
}

export default function EncomendasPage() {
  const user = getUser();
  const canManage = user?.role === "ADMIN" || user?.role === "PORTEIRO";

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [apartments, setApartments] = useState<DeliveryApartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyDeliveryId, setBusyDeliveryId] = useState<string | null>(null);
  const [pickupName, setPickupName] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODAS" | DeliveryStatus>("TODAS");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    apartmentId: "",
    carrier: "",
    trackingCode: "",
    description: "",
    notes: "",
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [nextDeliveries, nextApartments] = await Promise.all([listDeliveries(), listDeliveryApartmentOptions()]);
        if (!active) return;
        setDeliveries(nextDeliveries);
        setApartments(nextApartments);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Nao foi possivel carregar as encomendas.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    const unsubscribe = subscribeToDeliveries(() => {
      void load();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const stats = useMemo(() => {
    const pending = deliveries.filter((delivery) => delivery.status !== "RETIRADA").length;
    const notified = deliveries.filter((delivery) => delivery.status === "AVISADA").length;
    const pickedToday = deliveries.filter((delivery) => {
      if (!delivery.pickedUpAt) return false;
      const today = new Date().toDateString();
      return new Date(delivery.pickedUpAt).toDateString() === today;
    }).length;

    return {
      total: deliveries.length,
      pending,
      notified,
      pickedToday,
    };
  }, [deliveries]);

  const selectedDelivery = selectedDeliveryId ? deliveries.find((delivery) => delivery.id === selectedDeliveryId) ?? null : null;
  const deleteTarget = deleteTargetId ? deliveries.find((delivery) => delivery.id === deleteTargetId) ?? null : null;
  const selectedApartment = apartments.find((apartment) => apartment.id === form.apartmentId) ?? null;
  const filteredDeliveries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return deliveries.filter((delivery) => {
      const matchesStatus = statusFilter === "TODAS" ? true : delivery.status === statusFilter;
      const haystack = [delivery.apartmentLabel, delivery.recipientName, delivery.carrier, delivery.description, delivery.trackingCode]
        .join(" ")
        .toLowerCase();
      const matchesSearch = query ? haystack.includes(query) : true;
      return matchesStatus && matchesSearch;
    });
  }, [deliveries, search, statusFilter]);

  async function handleCreateDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;

    if (!form.apartmentId || !form.carrier.trim()) {
      setError("Selecione o apartamento e informe a transportadora.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      const photoUrl = photoFile ? await uploadDeliveryPhoto(photoFile) : "";
      await createDelivery({
        ...form,
        photoUrl,
      });
      setForm({
        apartmentId: "",
        carrier: "",
        trackingCode: "",
        description: "",
        notes: "",
      });
      setPhotoFile(null);
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel cadastrar a encomenda.");
    } finally {
      setCreating(false);
    }
  }

  async function handleMarkPickedUp(deliveryId: string) {
    if (!pickupName.trim()) {
      setError("Informe quem retirou a encomenda.");
      return;
    }

    try {
      setBusyDeliveryId(deliveryId);
      setError("");
      await markDeliveryPickedUp(deliveryId, pickupName);
      setPickupName("");
      setSelectedDeliveryId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar a retirada.");
    } finally {
      setBusyDeliveryId(null);
    }
  }

  async function handleDeleteDelivery(delivery: Delivery) {
    try {
      setBusyDeliveryId(delivery.id);
      setError("");
      await deleteDelivery(delivery);
      setDeleteTargetId(null);
      setSelectedDeliveryId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel excluir a encomenda.");
    } finally {
      setBusyDeliveryId(null);
    }
  }

  return (
    <AppLayout title="Encomendas">
      <div className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
        ) : null}

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                <Package size={13} />
                Portaria e recebimentos
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">Central de encomendas do condominio</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Registre o recebimento, vincule ao apartamento e o morador recebe notificacao automaticamente.
              </p>
            </div>

            {canManage ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <PlusCircle size={16} />
                Nova encomenda
              </button>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { icon: Package, label: "Total", value: String(stats.total), tone: "border-slate-200 bg-slate-50 text-slate-700" },
              { icon: Clock3, label: "Pendentes", value: String(stats.pending), tone: "border-amber-100 bg-amber-50 text-amber-700" },
              { icon: BellRing, label: "Avisadas", value: String(stats.notified), tone: "border-sky-100 bg-sky-50 text-sky-700" },
              { icon: PackageCheck, label: "Retiradas hoje", value: String(stats.pickedToday), tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={`inline-flex items-center gap-3 rounded-full border px-4 py-2.5 ${item.tone}`}>
                  <Icon size={15} />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]">{item.label}</span>
                  <span className="text-sm font-bold">{item.value}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por apartamento, morador, transportadora ou rastreio"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(["TODAS", "AVISADA", "RETIRADA"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                      statusFilter === status
                        ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:text-sky-700"
                    }`}
                  >
                    {status === "TODAS" ? "Todas" : status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[30px] border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
              Carregando encomendas...
            </div>
          ) : null}

          {!loading && filteredDeliveries.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
              Nenhuma encomenda encontrada com esses filtros.
            </div>
          ) : null}

          {filteredDeliveries.map((delivery) => (
            <article key={delivery.id} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 text-base font-semibold text-slate-950">{delivery.description || "Encomenda registrada"}</h3>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusTone[delivery.status].chip}`}>
                      {delivery.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-600">{delivery.apartmentLabel} • {delivery.recipientName} • {delivery.carrier}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      Recebida em {formatDateTime(delivery.receivedAt)}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      Rastreio {delivery.trackingCode || "Nao informado"}
                    </span>
                    {delivery.photoUrl ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Com foto</span>
                    ) : null}
                  </div>
                </div>

                <div className={`grid gap-2 sm:grid-cols-2 xl:w-[380px] rounded-[24px] border p-4 ${statusTone[delivery.status].card}`}>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Morador</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{delivery.recipientName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Notificacao</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{formatDateTime(delivery.notifiedAt)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPickupName(delivery.pickedUpByName || delivery.recipientName);
                    setSelectedDeliveryId(delivery.id);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                >
                  Ver detalhes
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>

      {createOpen ? (
        <ModalShell title="Nova encomenda" subtitle="Cadastre a chegada, vincule ao apartamento e a notificacao sera gerada automaticamente." onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreateDelivery} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Apartamento</span>
              <select value={form.apartmentId} onChange={(event) => setForm((current) => ({ ...current, apartmentId: event.target.value }))} className={`mt-1 ${inputClass}`}>
                <option value="">Selecione o apartamento</option>
                {apartments.map((apartment) => (
                  <option key={apartment.id} value={apartment.id}>
                    {apartmentLabel(apartment)} - {apartment.residentName}
                  </option>
                ))}
              </select>
            </label>

            {selectedApartment ? (
              <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-4 py-4">
                <div className="flex items-center gap-2 text-sky-700">
                  <UserRound size={16} />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">Morador que sera notificado</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedApartment.residentName}</p>
              </div>
            ) : null}

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Foto da encomenda</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                className={`mt-1 ${inputClass}`}
              />
              {photoFile ? <p className="mt-2 text-xs text-slate-500">{photoFile.name}</p> : null}
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Transportadora</span>
                <input
                  value={form.carrier}
                  onChange={(event) => setForm((current) => ({ ...current, carrier: event.target.value }))}
                  placeholder="Ex.: Mercado Livre, Correios"
                  className={`mt-1 ${inputClass}`}
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Codigo de rastreio</span>
                <input
                  value={form.trackingCode}
                  onChange={(event) => setForm((current) => ({ ...current, trackingCode: event.target.value }))}
                  placeholder="Opcional"
                  className={`mt-1 ${inputClass}`}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Descricao</span>
              <input
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Ex.: Caixa pequena, pedido da farmacia"
                className={`mt-1 ${inputClass}`}
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Observacoes</span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                rows={4}
                placeholder="Observacoes da portaria"
                className={`mt-1 resize-none ${inputClass}`}
              />
            </label>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlusCircle size={16} />
                {creating ? "Registrando..." : "Registrar encomenda"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {selectedDelivery ? (
        <ModalShell
          title={selectedDelivery.description || "Detalhes da encomenda"}
          subtitle={`${selectedDelivery.apartmentLabel} • ${selectedDelivery.recipientName}`}
          onClose={() => setSelectedDeliveryId(null)}
        >
          <div className="space-y-5">
            {selectedDelivery.photoUrl ? (
              <img src={selectedDelivery.photoUrl} alt={selectedDelivery.description || "Encomenda"} className="h-56 w-full rounded-[28px] object-cover" />
            ) : null}

            <div className={`rounded-[28px] border p-5 ${statusTone[selectedDelivery.status].card}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusTone[selectedDelivery.status].chip}`}>
                  {selectedDelivery.status}
                </span>
                <span className="rounded-full border border-white bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {selectedDelivery.carrier}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-white bg-white/80 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Recebimento</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{formatDateTime(selectedDelivery.receivedAt)}</p>
                </div>
                <div className="rounded-[22px] border border-white bg-white/80 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Notificacao enviada</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{formatDateTime(selectedDelivery.notifiedAt)}</p>
                </div>
              </div>
            </div>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Rastreio</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{selectedDelivery.trackingCode || "Nao informado"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Registrada por</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{selectedDelivery.createdByName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Quem retirou</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{selectedDelivery.pickedUpByName || "Ainda nao retirada"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Retirada</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{formatDateTime(selectedDelivery.pickedUpAt)}</p>
                </div>
              </div>

              {selectedDelivery.notes ? (
                <div className="mt-4 rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Observacoes</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{selectedDelivery.notes}</p>
                </div>
              ) : null}
            </section>

            {canManage && selectedDelivery.status !== "RETIRADA" ? (
              <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-slate-500">
                  <PackageCheck size={16} />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">Registrar retirada</span>
                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <input
                    value={pickupName}
                    onChange={(event) => setPickupName(event.target.value)}
                    placeholder="Quem retirou a encomenda"
                    className={`flex-1 ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleMarkPickedUp(selectedDelivery.id)}
                    disabled={busyDeliveryId === selectedDelivery.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle2 size={16} />
                    {busyDeliveryId === selectedDelivery.id ? "Salvando..." : "Confirmar retirada"}
                  </button>
                </div>
              </section>
            ) : null}

            {canManage ? (
              <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="m-0 text-sm font-semibold text-rose-700">Excluir registro</p>
                    <p className="mt-1 text-sm text-rose-600">Use somente quando a encomenda tiver sido cadastrada por engano.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(selectedDelivery.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        </ModalShell>
      ) : null}

      {deleteTarget ? (
        <ModalShell
          title="Excluir encomenda"
          subtitle={`${deleteTarget.apartmentLabel} • ${deleteTarget.recipientName}`}
          onClose={() => setDeleteTargetId(null)}
        >
          <div className="space-y-5">
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
              Essa acao remove o registro da encomenda. Use apenas quando o cadastro tiver sido feito por engano.
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDelivery(deleteTarget)}
                disabled={busyDeliveryId === deleteTarget.id}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                {busyDeliveryId === deleteTarget.id ? "Excluindo..." : "Confirmar exclusao"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </AppLayout>
  );
}
