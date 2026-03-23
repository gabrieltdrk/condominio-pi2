import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, Droplet, Users, X } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { getUser } from "../features/auth/services/auth";
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
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const RESOURCES: Resource[] = [
  {
    id: "salao",
    label: "Salao de festas",
    shortLabel: "Salao",
    description: "Ideal para aniversarios e confraternizacoes.",
    icon: Users,
  },
  {
    id: "piscina",
    label: "Piscina",
    shortLabel: "Piscina",
    description: "Agende o dia para uso da piscina.",
    icon: Droplet,
  },
  {
    id: "reuniao",
    label: "Sala de reunioes",
    shortLabel: "Reunioes",
    description: "Use para encontros e reunioes do condominio.",
    icon: CalendarCheck,
  },
];

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const inputClass = "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function buildMonthGrid(month: Date) {
  const firstDay = startOfMonth(month);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function formatFullDate(dateValue: string) {
  return new Date(`${dateValue}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function bookingSort(a: ResourceBooking, b: ResourceBooking) {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.time.localeCompare(b.time);
}

function DayModal({
  open,
  onClose,
  date,
  resource,
  booking,
  currentUserId,
  time,
  setTime,
  duration,
  setDuration,
  note,
  setNote,
  saving,
  onBook,
  onCancel,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  resource: Resource;
  booking: ResourceBooking | null;
  currentUserId?: string;
  time: string;
  setTime: (value: string) => void;
  duration: string;
  setDuration: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  saving: boolean;
  onBook: () => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">{resource.label}</p>
            <h3 className="mt-2 text-xl font-semibold capitalize text-slate-950">{formatFullDate(date)}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {booking ? (
            <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-900">Este dia ja esta reservado</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                <strong>{booking.authorName}</strong> reservou para {booking.time} ({booking.duration}).
              </p>
              {booking.note && <p className="mt-3 break-words text-xs leading-5 text-amber-700">{booking.note}</p>}
              {booking.userId === currentUserId && (
                <button
                  type="button"
                  onClick={() => void onCancel(booking.id)}
                  disabled={saving}
                  className="mt-4 rounded-2xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
                >
                  Cancelar minha reserva
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-semibold text-emerald-900">Dia disponivel</p>
                <p className="mt-2 text-sm leading-6 text-emerald-800">
                  Preencha os dados abaixo para reservar {resource.label.toLowerCase()}.
                </p>
              </div>

              <label className="block">
                <span className={labelClass}>Hora</span>
                <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className={inputClass} />
              </label>

              <label className="block">
                <span className={labelClass}>Duracao</span>
                <select value={duration} onChange={(event) => setDuration(event.target.value)} className={inputClass}>
                  <option value="1h">1 hora</option>
                  <option value="2h">2 horas</option>
                  <option value="3h">3 horas</option>
                </select>
              </label>

              <label className="block">
                <span className={labelClass}>Observacoes</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  className={`${inputClass} resize-none py-3`}
                  placeholder="Ex.: aniversario, confraternizacao, reuniao do bloco..."
                />
              </label>

              <button
                type="button"
                onClick={() => void onBook()}
                disabled={!time || saving}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Confirmar agendamento"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Agendamentos() {
  const today = useMemo(() => new Date(), []);
  const currentUser = useMemo(() => getUser(), []);
  const [selectedResourceId, setSelectedResourceId] = useState(RESOURCES[0].id);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(today));
  const [modalOpen, setModalOpen] = useState(false);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("1h");
  const [note, setNote] = useState("");
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadBookings() {
    setLoading(true);
    setError("");

    try {
      setBookings(await listResourceBookings());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar agendamentos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBookings();
    return subscribeToResourceBookings(() => {
      void loadBookings();
    });
  }, []);

  const selectedResource = useMemo(
    () => RESOURCES.find((resource) => resource.id === selectedResourceId) ?? RESOURCES[0],
    [selectedResourceId],
  );

  const resourceBookings = useMemo(
    () => bookings.filter((booking) => booking.resourceId === selectedResourceId).sort(bookingSort),
    [bookings, selectedResourceId],
  );

  const bookingsByDate = useMemo(() => {
    const next = new Map<string, ResourceBooking[]>();
    for (const booking of resourceBookings) {
      const current = next.get(booking.date) ?? [];
      current.push(booking);
      next.set(booking.date, current);
    }
    return next;
  }, [resourceBookings]);

  const selectedBooking = (bookingsByDate.get(selectedDate) ?? [])[0] ?? null;
  const monthDays = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);
  const monthPrefix = `${currentMonth.getFullYear()}-${pad(currentMonth.getMonth() + 1)}`;
  const monthBookings = useMemo(() => resourceBookings.filter((booking) => booking.date.startsWith(monthPrefix)), [monthPrefix, resourceBookings]);
  const occupiedCount = monthBookings.length;
  const availableCount = monthDays.filter((day) => isSameMonth(day, currentMonth) && !bookingsByDate.has(toDateInputValue(day))).length;
  const nextBookings = useMemo(() => resourceBookings.slice(0, 4), [resourceBookings]);

  function openDay(day: Date) {
    setSelectedDate(toDateInputValue(day));
    setCurrentMonth(startOfMonth(day));
    setMessage("");
    setError("");
    setModalOpen(true);
  }

  async function handleBook() {
    if (!selectedDate || !time || selectedBooking) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await createResourceBooking({
        resourceId: selectedResourceId,
        date: selectedDate,
        time,
        duration,
        note,
      });

      setTime("");
      setNote("");
      setMessage("Reserva criada com sucesso.");
      setModalOpen(false);
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
      setModalOpen(false);
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
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ocupados</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{occupiedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Livres</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{availableCount}</p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap gap-3">
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
                  className={`inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${active ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <Icon size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{resource.label}</span>
                    <span className="block text-xs text-slate-500">{resource.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">{selectedResource.label}</h3>
                <p className="mt-1 text-sm text-slate-500">Toque em um dia para ver a disponibilidade e reservar.</p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <button type="button" onClick={() => setCurrentMonth((value) => addMonths(value, -1))} className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-100">
                  <ChevronLeft size={18} />
                </button>
                <div className="min-w-[180px] text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Mes exibido</p>
                  <h4 className="mt-1 break-words text-lg font-semibold capitalize text-slate-950">{formatMonthTitle(currentMonth)}</h4>
                </div>
                <button type="button" onClick={() => setCurrentMonth((value) => addMonths(value, 1))} className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-100">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto pb-2">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-7 gap-2">
                  {WEEK_DAYS.map((day) => (
                    <div key={day} className="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {day}
                    </div>
                  ))}

                  {monthDays.map((day) => {
                    const key = toDateInputValue(day);
                    const inCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = key === toDateInputValue(today);
                    const isSelected = key === selectedDate;
                    const booking = (bookingsByDate.get(key) ?? [])[0] ?? null;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => openDay(day)}
                        className={`min-h-[78px] rounded-[18px] border px-2.5 py-2 text-left transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                            : inCurrentMonth
                              ? "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300"
                              : "border-slate-200 bg-slate-100/80 text-slate-400"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-sm font-semibold ${!inCurrentMonth && !isSelected ? "text-slate-400" : ""}`}>{day.getDate()}</span>
                          {isToday && (
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSelected ? "bg-white/15 text-white" : "bg-indigo-50 text-indigo-700"}`}>
                              Hoje
                            </span>
                          )}
                        </div>
                        <div className="mt-3">
                          <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${booking ? (isSelected ? "bg-rose-400/20 text-rose-100" : "bg-rose-50 text-rose-700") : (isSelected ? "bg-emerald-400/20 text-emerald-100" : "bg-emerald-50 text-emerald-700")}`}>
                            <span className={`inline-block h-2 w-2 rounded-full ${booking ? "bg-rose-500" : "bg-emerald-500"}`} />
                            {booking ? "Reservado" : "Livre"}
                          </div>
                          {booking && <p className={`mt-1 truncate text-[10px] ${isSelected ? "text-slate-200" : "text-slate-500"}`}>{booking.time}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Proximas reservas</h3>
                <p className="mt-1 text-sm text-slate-500">So o essencial para acompanhar o que vem pela frente.</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {resourceBookings.length} registros
              </div>
            </div>

            {loading ? (
              <div className="mt-4 rounded-[24px] bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Carregando reservas...</div>
            ) : nextBookings.length === 0 ? (
              <div className="mt-4 rounded-[24px] bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Nenhuma reserva encontrada para este local.</div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {nextBookings.map((booking) => (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => {
                      setSelectedDate(booking.date);
                      setCurrentMonth(startOfMonth(new Date(`${booking.date}T12:00:00`)));
                      setModalOpen(true);
                    }}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
                  >
                    <p className="text-sm font-semibold text-slate-900">{new Date(`${booking.date}T12:00:00`).toLocaleDateString("pt-BR")}</p>
                    <p className="mt-1 text-xs text-slate-500">{booking.time} · {booking.duration}</p>
                    <p className="mt-3 text-xs font-medium text-slate-600">{booking.authorName}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}
        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
      </div>

      <DayModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        date={selectedDate}
        resource={selectedResource}
        booking={selectedBooking}
        currentUserId={currentUser?.id}
        time={time}
        setTime={setTime}
        duration={duration}
        setDuration={setDuration}
        note={note}
        setNote={setNote}
        saving={saving}
        onBook={handleBook}
        onCancel={handleCancel}
      />
    </AppLayout>
  );
}
