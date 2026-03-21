import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CalendarDays, Droplet, Users } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { supabase } from "../lib/supabase";
import {
  cancelResourceBooking,
  createResourceBooking,
  listResourceBookings,
  subscribeToResourceBookings,
  type ResourceBooking,
} from "../features/agendamentos/services/agendamentos";

type Resource = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const RESOURCES: Resource[] = [
  {
    id: "salao",
    label: "Salao de festas",
    description: "Reserve o salao de festas para aniversarios, confraternizacoes ou eventos.",
    icon: Users,
  },
  {
    id: "piscina",
    label: "Piscina",
    description: "Agende horarios para aproveitar a piscina com seguranca.",
    icon: Droplet,
  },
  {
    id: "reuniao",
    label: "Sala de reunioes",
    description: "Reserve a sala de reunioes para encontros e reunioes de condominio.",
    icon: CalendarCheck,
  },
];

export default function Agendamentos() {
  const [selectedResourceId, setSelectedResourceId] = useState(RESOURCES[0].id);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("1h");
  const [note, setNote] = useState("");
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function loadBookings() {
    setLoading(true);
    setError("");

    try {
      const [{ data: auth }, nextBookings] = await Promise.all([
        supabase.auth.getUser(),
        listResourceBookings(),
      ]);

      setCurrentUserId(auth.user?.id ?? null);
      setBookings(nextBookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar agendamentos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBookings();
    const unsubscribe = subscribeToResourceBookings(() => {
      void loadBookings();
    });

    return unsubscribe;
  }, []);

  const selectedResource = useMemo(
    () => RESOURCES.find((resource) => resource.id === selectedResourceId) ?? RESOURCES[0],
    [selectedResourceId],
  );

  const resourceBookings = useMemo(
    () => bookings.filter((booking) => booking.resourceId === selectedResourceId),
    [bookings, selectedResourceId],
  );

  const selectedDateBooking = useMemo(
    () => resourceBookings.find((booking) => booking.date === date),
    [date, resourceBookings],
  );

  async function handleBook() {
    if (!date || !time || selectedDateBooking) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await createResourceBooking({
        resourceId: selectedResourceId,
        date,
        time,
        duration,
        note,
      });

      setNote("");
      setMessage("Reserva criada com sucesso. Outros moradores ja conseguem ver esta data ocupada.");
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar reserva.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(id: string) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await cancelResourceBooking(id);
      setMessage("Reserva cancelada com sucesso.");
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cancelar reserva.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Agendamentos">
      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">Agendamentos</h2>
              <p className="mt-1 text-sm text-slate-500">
                Reserve areas comuns e acompanhe em tempo real quais datas ja estao ocupadas.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays size={18} />
              <span>Ao reservar, a data fica visivel para os outros moradores.</span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Area</h3>
              <p className="text-xs text-slate-500">Escolha o local que deseja reservar.</p>

              <div className="mt-3 space-y-2">
                {RESOURCES.map((resource) => {
                  const active = resource.id === selectedResourceId;
                  const Icon = resource.icon;

                  return (
                    <button
                      key={resource.id}
                      type="button"
                      onClick={() => {
                        setSelectedResourceId(resource.id);
                        setMessage("");
                        setError("");
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${
                        active
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{resource.label}</p>
                        <p className="line-clamp-2 text-xs text-slate-500">{resource.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{selectedResource.label}</h3>
                    <p className="text-xs text-slate-500">{selectedResource.description}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    <CalendarDays size={14} />
                    Reservas: {resourceBookings.length}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Data</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Hora</span>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Duracao</span>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    >
                      <option value="1h">1 hora</option>
                      <option value="2h">2 horas</option>
                      <option value="3h">3 horas</option>
                    </select>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-600">Observacoes</span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                      placeholder="Ex.: aniversario, confraternizacao, reuniao do bloco..."
                    />
                  </label>
                </div>

                {selectedDateBooking ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Esta data ja esta reservada por {selectedDateBooking.authorName} para {selectedDateBooking.time} ({selectedDateBooking.duration}).
                  </div>
                ) : date ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Data disponivel para reserva neste local.
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">
                    Ao salvar, o agendamento passa a aparecer para quem abrir esta tela.
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleBook()}
                    disabled={!date || !time || !!selectedDateBooking || saving}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : "Agendar"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Proximas reservas</h3>
                  <span className="text-xs text-slate-500">{resourceBookings.length} agendamentos</span>
                </div>

                {loading ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Carregando reservas...
                  </div>
                ) : resourceBookings.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Nenhuma reserva encontrada para este local.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {resourceBookings.map((booking) => (
                      <div key={booking.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {new Date(`${booking.date}T12:00:00`).toLocaleDateString("pt-BR")} • {booking.time} ({booking.duration})
                            </p>
                            <p className="text-xs text-slate-500">Reservado por {booking.authorName}</p>
                            {booking.note && <p className="line-clamp-2 text-xs text-slate-500">{booking.note}</p>}
                          </div>
                          {booking.userId === currentUserId ? (
                            <button
                              type="button"
                              onClick={() => void handleCancel(booking.id)}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                            >
                              Cancelar
                            </button>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Reservado em {new Date(booking.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}
        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
      </div>
    </AppLayout>
  );
}
