import { useMemo, useState } from "react";
import { CalendarDays, CalendarCheck, Users, Droplet } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";

type Resource = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

type Booking = {
  id: string;
  resourceId: string;
  date: string;
  time: string;
  duration: string;
  note: string;
  createdAt: string;
};

const RESOURCES: Resource[] = [
  {
    id: "salao",
    label: "Salão de festas",
    description: "Reserve o salão de festas para aniversários, confraternizações ou eventos.",
    icon: Users,
  },
  {
    id: "piscina",
    label: "Piscina",
    description: "Agende horários para aproveitar a piscina com segurança.",
    icon: Droplet,
  },
  {
    id: "reuniao",
    label: "Sala de reuniões",
    description: "Reserve a sala de reuniões para encontros e reuniões de condomínio.",
    icon: CalendarCheck,
  },
];

export default function Agendamentos() {
  const [selectedResourceId, setSelectedResourceId] = useState(RESOURCES[0].id);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("1h");
  const [note, setNote] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);

  const selectedResource = useMemo(
    () => RESOURCES.find((r) => r.id === selectedResourceId) ?? RESOURCES[0],
    [selectedResourceId],
  );

  const resourceBookings = useMemo(
    () => bookings.filter((b) => b.resourceId === selectedResourceId),
    [bookings, selectedResourceId],
  );

  function handleBook() {
    if (!date || !time) return;

    const newBooking: Booking = {
      id: `${selectedResourceId}-${Date.now()}`,
      resourceId: selectedResourceId,
      date,
      time,
      duration,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };

    setBookings((prev) => [newBooking, ...prev]);
    setNote("");
  }

  function handleCancel(id: string) {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <AppLayout title="Agendamentos">
      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">Agendamentos</h2>
              <p className="mt-1 text-sm text-slate-500">
                Faça reservas para áreas comuns do condomínio (salão de festas, piscina, sala de reuniões e mais).
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays size={18} />
              <span>Agende com antecedência para garantir o melhor horário.</span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Área</h3>
              <p className="text-xs text-slate-500">Escolha onde deseja agendar.</p>

              <div className="mt-3 space-y-2">
                {RESOURCES.map((resource) => {
                  const active = resource.id === selectedResourceId;
                  const Icon = resource.icon;
                  return (
                    <button
                      key={resource.id}
                      type="button"
                      onClick={() => setSelectedResourceId(resource.id)}
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
                        <p className="text-sm font-semibold text-slate-900 truncate">{resource.label}</p>
                        <p className="text-xs text-slate-500 line-clamp-2">{resource.description}</p>
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
                    <span className="text-xs font-semibold text-slate-600">Duração</span>
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
                    <span className="text-xs font-semibold text-slate-600">Observações (opcional)</span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                      placeholder="Ex: Parabéns, entrega de convite, reunião de condomínio..."
                    />
                  </label>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">
                    As reservas são fictícias e não são enviadas ao condomínio. Use para planejar horários.
                  </div>
                  <button
                    type="button"
                    onClick={handleBook}
                    disabled={!date || !time}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Agendar
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Próximas reservas</h3>
                  <span className="text-xs text-slate-500">{resourceBookings.length} agendamentos</span>
                </div>

                {resourceBookings.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Nenhuma reserva encontrada para este local.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {resourceBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {booking.date} • {booking.time} ({booking.duration})
                            </p>
                            {booking.note && (
                              <p className="text-xs text-slate-500 line-clamp-2">{booking.note}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCancel(booking.id)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                          >
                            Cancelar
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400">Reservado em {new Date(booking.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
