import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import AppLayout from "../../../features/layout/components/app-layout";
import {
  createResourceBooking,
  listResourceBookings,
  type ResourceBooking,
} from "../../../features/agendamentos/services/agendamentos";
import { listRecursos, type Recurso } from "../../../features/agendamentos/services/recursos";
import { getIcone } from "../../../features/agendamentos/utils/icones";
import { getUser } from "../../../features/auth/services/auth";

const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const WEEK_DAYS_LONG = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const WEEK_DAYS_SHORT = ["D","S","T","Q","Q","S","S"];

function pad(v: number) { return String(v).padStart(2, "0"); }
function toKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function timeToMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); }
function durToMin(d: string) { const match = d.match(/^(\d+)h$/); return match ? parseInt(match[1]) * 60 : 60; }
function timesOverlap(sA: string, dA: string, sB: string, dB: string) {
  const a0 = timeToMin(sA), a1 = a0 + durToMin(dA);
  const b0 = timeToMin(sB), b1 = b0 + durToMin(dB);
  return a0 < b1 && b0 < a1;
}
function buildGrid(month: Date) {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d;
  });
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition bg-white";
const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5";

export default function NovoAgendamento() {
  const nav = useNavigate();
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toKey(today), [today]);
  const currentUser = useMemo(() => getUser(), []);

  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [loadingRecursos, setLoadingRecursos] = useState(true);

  const [resource, setResource] = useState("");
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("1h");
  const [pessoas, setPessoas] = useState("1");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [localOpen, setLocalOpen] = useState(false);
  const localRef = useRef<HTMLDivElement>(null);
  const localRefMobile = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (localRef.current && !localRef.current.contains(t)) setLocalOpen(false);
      if (localRefMobile.current && !localRefMobile.current.contains(t)) setLocalOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    Promise.all([listRecursos(true), listResourceBookings()]).then(([recs, bks]) => {
      setRecursos(recs);
      setBookings(bks);
      if (recs.length > 0) setResource(recs[0].slug);
    }).finally(() => setLoadingRecursos(false));
  }, []);

  const resourceBookings = useMemo(
    () => bookings.filter(b => b.resourceId === resource),
    [bookings, resource],
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

  const conflict = useMemo(() => {
    if (!selectedDate || !time) return null;
    return (byDate.get(selectedDate) ?? []).find(b => timesOverlap(time, duration, b.time, b.duration)) ?? null;
  }, [selectedDate, time, duration, byDate]);
  const grid = useMemo(() => buildGrid(currentMonth), [currentMonth]);
  const canGoPrev = startOfMonth(currentMonth).getTime() > startOfMonth(today).getTime();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate) { setErr("Selecione uma data no calendário."); return; }
    if (!time) { setErr("Informe o horário."); return; }
    if (conflict) { setErr("Conflito de horário com reserva existente neste dia."); return; }
    setSaving(true);
    setErr("");
    try {
      const fullNote = [pessoas !== "1" && `${pessoas} pessoa(s)`, note.trim()].filter(Boolean).join(" — ");
      await createResourceBooking({ resourceId: resource, date: selectedDate, time, duration, note: fullNote });
      nav("/agendamentos");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao criar agendamento.");
    } finally {
      setSaving(false);
    }
  }

  // ── Shared calendar renderer ─────────────────────────────────────────────────
  function CalendarGrid({ compact = false }: { compact?: boolean }) {
    const weekDays = compact ? WEEK_DAYS_SHORT : WEEK_DAYS_LONG;
    return (
      <>
        <div className={`flex items-center justify-between ${compact ? "mb-2" : "mb-3"}`}>
          <button type="button" onClick={() => setCurrentMonth(m => addMonths(m, -1))} disabled={!canGoPrev}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className={`font-bold text-gray-800 ${compact ? "text-sm" : "text-sm"}`}>
            {MONTHS_PT[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button type="button" onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {weekDays.map((d, i) => (
            <div key={i} className="py-1 text-center text-[10px] font-bold uppercase text-gray-400">{d}</div>
          ))}
        </div>

        <div className={`grid grid-cols-7 gap-px bg-gray-200 ${compact ? "" : "flex-1 min-h-0 grid-rows-6"}`}>
          {grid.map((day, i) => {
            const key = toKey(day);
            const inMonth = isSameMonth(day, currentMonth);
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const isPast = startOfDay(day).getTime() < startOfDay(today).getTime();
            const dayBookings = byDate.get(key) ?? [];
            const hasBooking = dayBookings.length > 0;
            const disabled = !inMonth || isPast;

            return (
              <button key={`${key}-${i}`} type="button" disabled={disabled}
                onClick={() => !disabled && setSelectedDate(isSelected ? null : key)}
                className={`flex flex-col px-1.5 py-1 text-left transition-colors ${compact ? "min-h-[3rem]" : ""}
                  ${isSelected ? "bg-indigo-600 cursor-pointer"
                    : disabled ? "bg-gray-50 cursor-default"
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
                    <span className="text-[8px] font-bold text-indigo-500 bg-indigo-100 px-0.5 leading-none rounded-sm">Hoje</span>
                  )}
                </div>
                {inMonth && (
                  <div className="mt-auto">
                    {isPast ? (
                      <span className={`flex items-center gap-0.5 text-[9px] ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                        <span className={`h-1 w-1 rounded-full ${isSelected ? "bg-white/50" : "bg-gray-300"}`} />Encerrado
                      </span>
                    ) : hasBooking ? (
                      <span className={`flex items-center gap-0.5 text-[9px] ${isSelected ? "text-white" : "text-rose-600"}`}>
                        <span className={`h-1 w-1 rounded-full ${isSelected ? "bg-white" : "bg-rose-500"}`} />Reservado
                      </span>
                    ) : (
                      <span className={`flex items-center gap-0.5 text-[9px] ${isSelected ? "text-white" : "text-emerald-600"}`}>
                        <span className={`h-1 w-1 rounded-full ${isSelected ? "bg-white" : "bg-emerald-500"}`} />Livre
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400"><span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> Hoje</span>
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Reservado</span>
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400"><span className="h-1.5 w-1.5 rounded-full bg-indigo-600" /> Selecionado</span>
        </div>

        {/* Status banner */}
        {conflict && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
            <AlertTriangle size={14} className="shrink-0 text-rose-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-700">Data já reservada</p>
              <p className="text-xs text-rose-500 mt-0.5">{conflict.authorName} · {conflict.time} ({conflict.duration})</p>
            </div>
          </div>
        )}
        {selectedDate && !conflict && (
          <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-emerald-700 capitalize">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })}
            </p>
            <p className="text-xs text-emerald-500 mt-0.5">Disponível ✓</p>
          </div>
        )}
      </>
    );
  }

  // ── Loading / empty states ────────────────────────────────────────────────────
  if (loadingRecursos) {
    return (
      <AppLayout title="Criar Agendamento">
        <div className="flex justify-center items-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      </AppLayout>
    );
  }
  if (recursos.length === 0) {
    return (
      <AppLayout title="Criar Agendamento">
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <AlertTriangle size={32} className="text-amber-400" />
          <p className="text-sm font-semibold text-gray-600">Nenhuma área comum disponível</p>
          <p className="text-xs text-gray-400">O síndico precisa cadastrar as áreas comuns primeiro.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Criar Agendamento">

      {/* ── DESKTOP ──────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="hidden lg:flex flex-col h-full gap-4 overflow-hidden">

        {/* Row 1: todos os campos em um card */}
        <div className="shrink-0 bg-white rounded-2xl border border-gray-200 px-6 py-4">
          <div className="flex items-end gap-4">

            {/* Responsável */}
            <div className="flex-1 min-w-0">
              <label className={labelCls}>Responsável</label>
              <input type="text" value={currentUser?.name ?? currentUser?.email ?? ""} disabled
                className={`${inputCls} bg-gray-100 text-gray-400 cursor-not-allowed select-none`} />
            </div>

            <div className="w-px self-stretch bg-gray-100" />

            {/* Local — dropdown customizado */}
            <div className="shrink-0" ref={localRef}>
              <label className={labelCls}>Local</label>
              {(() => {
                const selected = recursos.find(r => r.slug === resource);
                const SelectedIcon = selected ? getIcone(selected.icone) : null;
                return (
                  <div className="relative">
                    <button type="button" onClick={() => setLocalOpen(o => !o)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap min-w-[140px] ${
                        localOpen ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      }`}>
                      {SelectedIcon && <SelectedIcon size={14} className={localOpen ? "text-indigo-500" : "text-gray-400"} />}
                      <span className="flex-1 text-left">{selected?.nome ?? "Selecionar"}</span>
                      <ChevronDown size={14} className={`transition-transform ${localOpen ? "rotate-180 text-indigo-400" : "text-gray-400"}`} />
                    </button>
                    {localOpen && (
                      <div className="absolute top-full left-0 mt-1 z-50 min-w-full bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden">
                        {recursos.map(r => {
                          const Icon = getIcone(r.icone);
                          const active = resource === r.slug;
                          return (
                            <button key={r.slug} type="button"
                              onClick={() => { setResource(r.slug); setSelectedDate(null); setLocalOpen(false); }}
                              className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm font-semibold text-left transition-colors whitespace-nowrap ${
                                active ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-50"
                              }`}>
                              <Icon size={14} className={active ? "text-indigo-500" : "text-gray-400"} />
                              {r.nome}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="w-px self-stretch bg-gray-100" />

            {/* Horário */}
            <div className="w-32 shrink-0">
              <label className={labelCls}>Horário <span className="text-red-400">*</span></label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
            </div>

            {/* Duração */}
            <div className="w-32 shrink-0">
              <label className={labelCls}>Duração</label>
              <select value={duration} onChange={e => setDuration(e.target.value)} className={inputCls}>
                <option value="1h">1 hora</option>
                <option value="2h">2 horas</option>
                <option value="3h">3 horas</option>
                <option value="4h">4 horas</option>
              </select>
            </div>

            {/* Pessoas */}
            <div className="w-28 shrink-0">
              <label className={labelCls}>Pessoas</label>
              <input type="number" min="1" max="500" value={pessoas}
                onChange={e => setPessoas(e.target.value)} className={inputCls} />
            </div>

            <div className="w-px self-stretch bg-gray-100" />

            {/* Salvar */}
            <div className="shrink-0 flex flex-col justify-end">
              <button type="submit" disabled={saving || !!conflict}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition cursor-pointer whitespace-nowrap">
                {saving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>

          {err && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0 text-red-500 mt-0.5" />
              <p className="text-xs text-red-600">{err}</p>
            </div>
          )}
        </div>

        {/* Row 2: calendário + observações */}
        <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">

          {/* Calendário */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl border border-gray-200 p-5">
            <CalendarGrid />
          </div>

          {/* Observações + botão */}
          <div className="w-72 shrink-0 flex flex-col bg-white rounded-2xl border border-gray-200 p-5">
            <label className={`${labelCls} mb-1.5`}>Observações</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Descreva o evento, necessidades especiais, configuração do espaço..."
              className={`${inputCls} flex-1 resize-none`} />

          </div>
        </div>
      </form>

      {/* ── MOBILE: cards empilhados ─────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="lg:hidden space-y-5">

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-700">Informações gerais</h3>
          <div>
            <label className={labelCls}>Responsável</label>
            <input type="text" value={currentUser?.name ?? currentUser?.email ?? ""} disabled
              className={`${inputCls} bg-gray-100 text-gray-400 cursor-not-allowed select-none`} />
          </div>
          <div ref={localRefMobile}>
            <label className={labelCls}>Local</label>
            {(() => {
              const selected = recursos.find(r => r.slug === resource);
              const SelectedIcon = selected ? getIcone(selected.icone) : null;
              return (
                <div className="relative">
                  <button type="button" onClick={() => setLocalOpen(o => !o)}
                    className={`flex items-center gap-2 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                      localOpen ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-700"
                    }`}>
                    {SelectedIcon && <SelectedIcon size={14} className={localOpen ? "text-indigo-500" : "text-gray-400"} />}
                    <span className="flex-1 text-left">{selected?.nome ?? "Selecionar"}</span>
                    <ChevronDown size={14} className={`transition-transform ${localOpen ? "rotate-180 text-indigo-400" : "text-gray-400"}`} />
                  </button>
                  {localOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden">
                      {recursos.map(r => {
                        const Icon = getIcone(r.icone);
                        const active = resource === r.slug;
                        return (
                          <button key={r.slug} type="button"
                            onClick={() => { setResource(r.slug); setSelectedDate(null); setLocalOpen(false); }}
                            className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-semibold text-left transition-colors ${
                              active ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-50"
                            }`}>
                            <Icon size={15} className={active ? "text-indigo-500" : "text-gray-400"} />
                            {r.nome}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Horário <span className="text-red-400">*</span></label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Duração</label>
              <select value={duration} onChange={e => setDuration(e.target.value)} className={inputCls}>
                <option value="1h">1h</option>
                <option value="2h">2h</option>
                <option value="3h">3h</option>
                <option value="4h">4h</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Pessoas</label>
              <input type="number" min="1" max="500" value={pessoas}
                onChange={e => setPessoas(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Data da reserva</h3>
          <CalendarGrid compact />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Observações</h3>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
            placeholder="Descreva o evento, necessidades especiais..."
            className={`${inputCls} resize-none`} />
        </div>

        {err && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <AlertTriangle size={14} className="shrink-0 text-red-500 mt-0.5" />
            <p className="text-sm text-red-600">{err}</p>
          </div>
        )}

        <button type="submit" disabled={saving || !!conflict}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition cursor-pointer">
          {saving ? "Salvando..." : "Confirmar agendamento"}
        </button>
      </form>

    </AppLayout>
  );
}
