import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import AppLayout from "../../features/layout/components/app-layout";
import { getUser } from "../../features/auth/services/auth";
import {
  listResourceBookings,
  subscribeToResourceBookings,
  type ResourceBooking,
} from "../../features/agendamentos/services/agendamentos";
import { listRecursos, type Recurso } from "../../features/agendamentos/services/recursos";
import { getIcone } from "../../features/agendamentos/utils/icones";

const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const WEEK_DAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function pad(v: number) { return String(v).padStart(2, "0"); }
function toKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function buildGrid(month: Date) {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
function fmtDateCard(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}

export default function Agendamentos() {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toKey(today), [today]);
  const currentUser = useMemo(() => getUser(), []);

  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<string>("");
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState<"cal" | "list">("cal");

  async function load() {
    setLoading(true);
    try {
      const [recs, bks] = await Promise.all([listRecursos(true), listResourceBookings()]);
      setRecursos(recs);
      setBookings(bks);
      if (recs.length > 0 && !selectedResource) setSelectedResource(recs[0].slug);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    return subscribeToResourceBookings(() => void listResourceBookings().then(setBookings));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resourceBookings = useMemo(
    () => bookings.filter(b => b.resourceId === selectedResource),
    [bookings, selectedResource],
  );

  const byDate = useMemo(() => {
    const m = new Map<string, ResourceBooking[]>();
    for (const b of resourceBookings) {
      const arr = m.get(b.date) ?? [];
      arr.push(b);
      m.set(b.date, arr);
    }
    return m;
  }, [resourceBookings]);

  const listBookings = useMemo(() => {
    if (selectedDate) {
      return byDate.get(selectedDate) ?? [];
    }
    const todayStart = startOfDay(today).getTime();
    return resourceBookings
      .filter(b => new Date(`${b.date}T12:00:00`).getTime() >= todayStart)
      .slice(0, 50);
  }, [resourceBookings, byDate, selectedDate, today]);

  const grid = useMemo(() => buildGrid(currentMonth), [currentMonth]);
  const canGoPrev = startOfMonth(currentMonth).getTime() > startOfMonth(today).getTime();

  function selectDay(d: Date) {
    const key = toKey(d);
    setSelectedDate(prev => prev === key ? null : key);
  }

  function BookingList() {
    return (
      <>
        <div className="shrink-0 px-5 py-4 border-b border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500 mb-1">
            {selectedDate
              ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long" })
              : "Próximos agendamentos"}
          </p>
          <h3 className="text-base font-bold text-gray-900">Agendamentos</h3>
          <p className="text-xs text-gray-400 mt-0.5">Não perca os eventos agendados</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-500" />
            </div>
          )}
          {!loading && recursos.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
              <CalendarDays size={24} className="text-gray-200" />
              <p className="text-xs text-gray-400">Nenhuma área comum cadastrada.</p>
              <p className="text-[11px] text-gray-300">O síndico deve configurar as áreas comuns.</p>
            </div>
          )}
          {!loading && recursos.length > 0 && listBookings.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CalendarDays size={24} className="text-gray-200" />
              <p className="text-xs text-gray-400">
                {selectedDate ? "Nenhum agendamento neste dia." : "Nenhum agendamento futuro."}
              </p>
            </div>
          )}
          {listBookings.map(b => {
            const recurso = recursos.find(r => r.slug === b.resourceId);
            return (
              <div key={b.id}
                onClick={() => setSelectedDate(b.date)}
                className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-gray-900 leading-tight">
                    {recurso?.nome ?? b.resourceId}
                  </span>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                    {b.time}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{b.authorName}</p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-400">
                  <CalendarDays size={11} />
                  <span>{fmtDateCard(b.date)}</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{b.duration}</p>
                {b.note && <p className="mt-2 text-[11px] text-gray-500 line-clamp-2">{b.note}</p>}
                {b.userId === currentUser?.id && (
                  <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    Minha reserva
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  }

  function CalendarPanel() {
    return (
      <>
        <div className="shrink-0 flex flex-col gap-3 px-5 py-4 border-b border-gray-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentMonth(m => addMonths(m, -1))} disabled={!canGoPrev}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[160px] text-center text-base font-bold text-gray-900">
              {MONTHS_PT[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => { setCurrentMonth(startOfMonth(today)); setSelectedDate(todayKey); }}
              className="ml-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors">
              Hoje
            </button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {recursos.map(r => {
              const Icon = getIcone(r.icone);
              return (
                <button key={r.slug}
                  onClick={() => { setSelectedResource(r.slug); setSelectedDate(null); }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    selectedResource === r.slug ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"
                  }`}>
                  <Icon size={13} />
                  <span className="hidden sm:inline">{r.nome}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 grid grid-cols-7 border-b border-gray-100">
          {WEEK_DAYS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-gray-400">{d}</div>
          ))}
        </div>

        {recursos.length === 0 && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-8">
            <CalendarDays size={32} className="text-gray-200" />
            <p className="text-sm text-gray-400 font-semibold">Nenhuma área comum configurada</p>
            <p className="text-xs text-gray-300">O síndico deve cadastrar as áreas comuns do condomínio.</p>
          </div>
        )}

        {recursos.length > 0 && (
          <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-6 gap-px bg-gray-200 overflow-hidden">
            {grid.map((day, i) => {
              const key = toKey(day);
              const inMonth = isSameMonth(day, currentMonth);
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              const dayBookings = byDate.get(key) ?? [];
              const hasBooking = dayBookings.length > 0;
              const isPast = startOfDay(day).getTime() < startOfDay(today).getTime();

              return (
                <button key={`${key}-${i}`} type="button"
                  onClick={() => inMonth && selectDay(day)}
                  className={`flex flex-col px-2 py-1.5 text-left transition-colors ${
                    isSelected ? "bg-indigo-600 cursor-pointer"
                    : !inMonth || isPast ? "bg-gray-50 cursor-default"
                    : "bg-white hover:bg-indigo-50/40 cursor-pointer"
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold leading-none ${
                      isSelected ? "text-white"
                      : !inMonth ? "text-gray-300"
                      : isToday ? "text-indigo-600"
                      : isPast ? "text-gray-400"
                      : "text-gray-800"
                    }`}>{day.getDate()}</span>
                    {isToday && !isSelected && (
                      <span className="text-[9px] font-bold text-indigo-500 bg-indigo-100 px-1 py-0.5 leading-none rounded-sm">Hoje</span>
                    )}
                  </div>

                  {inMonth && (
                    <div className="mt-auto">
                      {isPast ? (
                        <>
                          <span className={`flex items-center gap-1 text-[10px] ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white/50" : "bg-gray-300"}`} />Encerrado
                          </span>
                          {hasBooking && !isSelected && (
                            <span className="text-[10px] text-rose-400 font-semibold">{dayBookings[0].time}</span>
                          )}
                        </>
                      ) : hasBooking ? (
                        <span className={`flex items-center gap-1 text-[10px] ${isSelected ? "text-white" : "text-rose-600"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-rose-500"}`} />
                          {dayBookings.length > 1 ? `${dayBookings.length} reservas` : "Reservado"}
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1 text-[10px] ${isSelected ? "text-white" : "text-emerald-600"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-emerald-500"}`} />Livre
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  return (
    <AppLayout title="Agendamentos">
      <div className="mb-3 flex gap-2 md:hidden">
        {(["cal","list"] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${
              mobileTab === tab ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600"
            }`}>
            {tab === "cal" ? "Calendário" : "Lista"}
          </button>
        ))}
      </div>

      <div className="hidden md:flex h-full gap-4 overflow-hidden">
        <div className="w-72 shrink-0 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
          <BookingList />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <CalendarPanel />
        </div>
      </div>

      <div className="md:hidden flex flex-col h-full overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {mobileTab === "cal"
          ? <CalendarPanel />
          : <div className="flex flex-col h-full overflow-hidden bg-gray-50"><BookingList /></div>
        }
      </div>
    </AppLayout>
  );
}
