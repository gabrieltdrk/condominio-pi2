
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BadgeInfo,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Gauge,
  ParkingSquare,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { listBuildingApartmentOptions, type BuildingApartmentOption } from "../features/predio/services/predio";
import { buildSeedState } from "../features/garage/mock";
import { appendHistory, readGarageState, saveGarageState } from "../features/garage/storage";
import type {
  GarageSpot,
  GarageSpotStatus,
  GarageSpotType,
  GarageState,
  TemporaryReservation,
  TemporaryReservationStatus,
  WaitingListEntry,
} from "../features/garage/types";
const inputClass = "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
const modalShell = "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6";
const modalPanel = "max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl";

type Filters = { tower: string; type: GarageSpotType | "TODOS"; status: GarageSpotStatus | "TODOS"; search: string };

const emptySpot: GarageSpot = {
  id: "",
  code: "",
  tower: "",
  level: "",
  type: "FIXA",
  status: "DISPONIVEL",
  apartmentId: null,
  apartmentLabel: null,
  vehiclePlate: null,
  vehicleModel: null,
  vehicleColor: null,
  residentName: null,
  notes: "",
};

const emptyWait: WaitingListEntry = {
  id: "",
  apartmentId: null,
  apartmentLabel: null,
  residentName: "",
  vehiclePlate: "",
  vehicleModel: "",
  priority: 1,
  criteria: "ORDEM",
  requestedAt: "",
  status: "PENDENTE",
};

const emptyReservation: TemporaryReservation = {
  id: "",
  spotId: null,
  spotCode: null,
  apartmentId: null,
  apartmentLabel: null,
  visitorName: "",
  plate: "",
  startAt: "",
  endAt: "",
  status: "PENDENTE",
  requiresApproval: true,
};
function apartmentLabel(apartment: BuildingApartmentOption) {
  return `${apartment.tower} - Andar ${apartment.level} - Ap ${apartment.number}`;
}

function labelToApartment(apartmentId: string | null, options: BuildingApartmentOption[]) {
  if (!apartmentId) return { apartmentId: null, apartmentLabel: null };
  const found = options.find((item) => item.id === apartmentId);
  return { apartmentId: found?.id ?? null, apartmentLabel: found ? apartmentLabel(found) : null };
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart).getTime() < new Date(bEnd).getTime() && new Date(bStart).getTime() < new Date(aEnd).getTime();
}
export default function GaragemPage() {
  const [apartmentOptions, setApartmentOptions] = useState<BuildingApartmentOption[]>([]);
  const [state, setState] = useState<GarageState | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState("");
  const [spotForm, setSpotForm] = useState<GarageSpot>(emptySpot);
  const [waitForm, setWaitForm] = useState<WaitingListEntry>(emptyWait);
  const [reservationForm, setReservationForm] = useState<TemporaryReservation>(emptyReservation);
  const [filters, setFilters] = useState<Filters>({ tower: "TODOS", type: "TODOS", status: "TODOS", search: "" });
  const [showSpotModal, setShowSpotModal] = useState(false);
  const [showWaitModal, setShowWaitModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [openZone, setOpenZone] = useState<string | null>(null);
  const [zoneInitialized, setZoneInitialized] = useState(false);

  useEffect(() => {
    async function load() {
      const apartments = await listBuildingApartmentOptions();
      setApartmentOptions(apartments);
      const loaded = readGarageState();
      const initialState = loaded ?? buildSeedState(apartments);
      setState(initialState);
      setSelectedSpotId(initialState.spots[0]?.id ?? "");
    }
    load();
  }, []);

  useEffect(() => {
    if (!state) return;
    saveGarageState(state);
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const now = Date.now();
    const updated: TemporaryReservation[] = state.reservations.map((res) =>
      res.status === "ATIVA" && new Date(res.endAt).getTime() < now ? { ...res, status: "VENCIDA" as TemporaryReservationStatus } : res
    );
    if (updated.some((res, idx) => res !== state.reservations[idx])) {
      setState({ ...state, reservations: updated });
    }
  }, [state]);

  useEffect(() => {
    if (!state || !selectedSpotId) return;
    const selected = state.spots.find((spot) => spot.id === selectedSpotId);
    setSpotForm(selected ?? { ...emptySpot, id: `spot-${Date.now()}`, code: `G-${state.spots.length + 1}` });
  }, [selectedSpotId, state]);
  const metrics = useMemo(() => {
    if (!state) return { occupied: 0, available: 0, reserved: 0, blocked: 0, unitsWithoutSpot: 0, activeVisitors: 0 };
    const occupied = state.spots.filter((spot) => spot.status === "OCUPADA").length;
    const available = state.spots.filter((spot) => spot.status === "DISPONIVEL").length;
    const reserved = state.spots.filter((spot) => spot.status === "RESERVADA").length;
    const blocked = state.spots.filter((spot) => spot.status === "BLOQUEADA" || spot.status === "MANUTENCAO").length;
    const fixedAssignments = new Set(state.spots.filter((spot) => spot.type === "FIXA" && spot.apartmentId).map((spot) => spot.apartmentId as string));
    const unitsWithoutSpot = apartmentOptions.filter((apt) => !fixedAssignments.has(apt.id)).length;
    const activeVisitors = state.reservations.filter((res) => res.status === "ATIVA").length;
    return { occupied, available, reserved, blocked, unitsWithoutSpot, activeVisitors };
  }, [state, apartmentOptions]);

  const filteredSpots = useMemo(() => {
    if (!state) return [];
    return state.spots.filter((spot) => {
      if (filters.tower !== "TODOS" && spot.tower !== filters.tower) return false;
      if (filters.type !== "TODOS" && spot.type !== filters.type) return false;
      if (filters.status !== "TODOS" && spot.status !== filters.status) return false;
      if (!filters.search.trim()) return true;
      const term = filters.search.toLowerCase();
      return spot.code.toLowerCase().includes(term) || spot.apartmentLabel?.toLowerCase().includes(term) || spot.vehiclePlate?.toLowerCase().includes(term);
    });
  }, [filters, state]);

  const groupedSpots = useMemo(() => {
    return filteredSpots.reduce<Record<string, GarageSpot[]>>((acc, spot) => {
      const key = `${spot.tower || "Sem torre"} · ${spot.level || "Setor"}`;
      acc[key] = [...(acc[key] ?? []), spot];
      return acc;
    }, {});
  }, [filteredSpots]);

  useEffect(() => {
    const firstKey = Object.keys(groupedSpots)[0];
    if (!zoneInitialized && firstKey) {
      setOpenZone(firstKey);
      setZoneInitialized(true);
    }
  }, [groupedSpots, zoneInitialized]);

  if (!state) {
    return (
      <AppLayout title="Garagem">
        <div className="p-6 text-sm text-slate-500">Carregando dados da garagem...</div>
      </AppLayout>
    );
  }
  function updateSpot(spot: GarageSpot) {
    setState((current) => {
      if (!current) return current;
      const exists = current.spots.some((s) => s.id === spot.id);
      const nextSpots = exists ? current.spots.map((s) => (s.id === spot.id ? spot : s)) : [...current.spots, spot];
      const withHistory = appendHistory(current, {
        spotId: spot.id,
        spotCode: spot.code,
        apartmentLabel: spot.apartmentLabel,
        vehiclePlate: spot.vehiclePlate,
        status: spot.status,
        changedAt: new Date().toISOString(),
        reason: exists ? "Atualizacao manual" : "Nova vaga",
      });
      return { ...withHistory, spots: nextSpots };
    });
    setSelectedSpotId(spot.id);
  }

  function validateSpot(next: GarageSpot) {
    if (!state) return "Estado da garagem nao carregado.";
    if (!next.code.trim()) return "Informe o codigo da vaga.";
    if (!next.tower.trim()) return "Informe torre ou bloco.";
    if (!next.level.trim()) return "Informe o nivel (ex.: Subsolo 1).";
    if ((next.status === "OCUPADA" || next.status === "RESERVADA") && !next.vehiclePlate) return "Preencha a placa do veiculo.";
    const duplicatedCode = state.spots.find((spot) => spot.code === next.code && spot.id !== next.id);
    if (duplicatedCode) return "Ja existe uma vaga com esse codigo.";
    if (next.type === "FIXA" && next.apartmentId) {
      const otherFixed = state.spots.find((spot) => spot.id !== next.id && spot.type === "FIXA" && spot.apartmentId === next.apartmentId);
      if (otherFixed) return "Este apartamento ja possui vaga fixa.";
    }
    return null;
  }

  function handleSaveSpot() {
    if (!state) return;
    const next: GarageSpot = {
      ...spotForm,
      vehiclePlate: spotForm.vehiclePlate?.toUpperCase() ?? null,
      id: spotForm.id || `spot-${Date.now()}`,
      code: spotForm.code || `G-${state.spots.length + 1}`,
    };
    const error = validateSpot(next);
    if (error) return alert(error);
    updateSpot(next);
    setShowSpotModal(false);
  }

  function handleDeleteSpot() {
    if (!selectedSpotId || !state) return;
    setState((current) => {
      if (!current) return current;
      const nextSpots = current.spots.filter((spot) => spot.id !== selectedSpotId);
      return { ...current, spots: nextSpots };
    });
    setSelectedSpotId("");
    setSpotForm({ ...emptySpot, id: `spot-${Date.now()}`, code: `G-${state.spots.length}` });
    setShowSpotModal(false);
  }
  function handleWaitApartment(apartmentId: string) {
    const mapped = labelToApartment(apartmentId, apartmentOptions);
    setWaitForm((current) => ({ ...current, ...mapped }));
  }

  function addToWaitList() {
    if (!state) return;
    if (!waitForm.residentName.trim() || !waitForm.vehiclePlate.trim()) return alert("Informe morador e placa.");
    const entry: WaitingListEntry = {
      ...waitForm,
      id: `wait-${Date.now()}`,
      vehiclePlate: waitForm.vehiclePlate.toUpperCase(),
      requestedAt: new Date().toISOString(),
      status: "PENDENTE",
    };
    setState((current) => {
      if (!current) return current;
      const nextList = [...current.waitlist, entry].sort((a, b) => a.priority - b.priority || new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
      return { ...current, waitlist: nextList };
    });
    setWaitForm(emptyWait);
    setShowWaitModal(false);
  }

  function suggestSpotForWaitlist() {
    if (!state) return null;
    const free = state.spots.filter((spot) => spot.status === "DISPONIVEL" && spot.type !== "CARGA");
    if (free.length === 0) return null;
    const fixed = free.filter((spot) => spot.type === "FIXA");
    if (fixed.length) return fixed[0];
    const rotative = free.filter((spot) => spot.type === "ROTATIVA");
    if (rotative.length) return rotative[0];
    return free[0];
  }

  function assignWait(waitId: string) {
    if (!state) return;
    const request = state.waitlist.find((item) => item.id === waitId);
    if (!request) return;
    const spot = suggestSpotForWaitlist();
    if (!spot) return alert("Nenhuma vaga livre.");

    const updatedSpot: GarageSpot = {
      ...spot,
      status: "RESERVADA",
      apartmentId: request.apartmentId,
      apartmentLabel: request.apartmentLabel,
      residentName: request.residentName,
      vehiclePlate: request.vehiclePlate,
      vehicleModel: request.vehicleModel ?? null,
      type: spot.type === "VISITANTE" ? "VISITANTE" : "ROTATIVA",
      notes: `Reservada para ${request.residentName}`,
    };

    updateSpot(updatedSpot);
    setState((current) => {
      if (!current) return current;
      const nextWait = current.waitlist.filter((item) => item.id !== waitId);
      return { ...current, waitlist: nextWait };
    });
  }

  function handleReservationApartment(apartmentId: string) {
    const mapped = labelToApartment(apartmentId, apartmentOptions);
    setReservationForm((current) => ({ ...current, ...mapped }));
  }

  function handleCreateReservation() {
    if (!state) return;
    if (!reservationForm.visitorName.trim() || !reservationForm.plate.trim() || !reservationForm.startAt || !reservationForm.endAt) return alert("Preencha nome, placa e periodo.");
    const overlapping = state.reservations.find(
      (res) => res.spotId && res.spotId === reservationForm.spotId && res.status !== "CANCELADA" && overlaps(reservationForm.startAt, reservationForm.endAt, res.startAt, res.endAt)
    );
    if (overlapping) return alert("Ja existe reserva nesse horario para a vaga.");

    const next: TemporaryReservation = {
      ...reservationForm,
      id: reservationForm.id || `res-${Date.now()}`,
      plate: reservationForm.plate.toUpperCase(),
      status: reservationForm.requiresApproval ? "PENDENTE" : "ATIVA",
    };

    setState((current) => {
      if (!current) return current;
      const nextReservations = current.reservations.some((res) => res.id === next.id)
        ? current.reservations.map((res) => (res.id === next.id ? next : res))
        : [next, ...current.reservations];
      return { ...current, reservations: nextReservations };
    });

    setReservationForm(emptyReservation);
    setShowReserveModal(false);
  }

  function linkSpotFromReservation(spotId: string | null) {
    if (!spotId) return;
    const spot = state?.spots.find((item) => item.id === spotId);
    if (!spot) return;
    setReservationForm((current) => ({ ...current, spotId, spotCode: spot.code }));
  }

  const waitlistBadge = state.waitlist.filter((item) => item.status === "PENDENTE").length;
  const unitsWithoutSpot = metrics.unitsWithoutSpot;
  return (
    <AppLayout title="Garagem">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                <ParkingSquare size={13} />
                Operacao da garagem
              </div>
              <h2 className="mt-4 max-w-2xl text-[clamp(1.9rem,4vw,3.2rem)] font-black leading-none tracking-[-0.05em] text-slate-950">
                Controle de vagas fixas, rotativas, visitantes e temporada.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                Painel para blocos com menos vagas que apartamentos, fila, reservas temporarias e regras sazonais.
              </p>
            </div>
            <div className="rounded-[30px] border border-slate-900/5 bg-slate-950 p-6 text-white shadow-[0_32px_80px_-38px_rgba(15,23,42,0.8)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200/80">Capacidade operacional</p>
              <p className="mt-3 text-[clamp(2rem,4vw,3.3rem)] font-black leading-none tracking-[-0.06em]">{state.spots.length} vagas</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ocupacao</p>
                  <p className="mt-2 text-2xl font-black">{state.spots.length ? Math.round((metrics.occupied / state.spots.length) * 100) : 0}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Disponiveis</p>
                  <p className="mt-2 text-2xl font-black">{metrics.available}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Fila</p>
                  <p className="mt-2 text-2xl font-black">{waitlistBadge}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { icon: CheckCircle2, label: "Disponiveis", value: metrics.available, helper: "Vagas livres", tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
            { icon: CarFront, label: "Ocupadas", value: metrics.occupied, helper: "Vagas com veiculo", tone: "border-indigo-100 bg-indigo-50 text-indigo-700" },
            { icon: Sparkles, label: "Reservadas", value: metrics.reserved, helper: "Reservas e fila", tone: "border-amber-100 bg-amber-50 text-amber-700" },
            { icon: AlertTriangle, label: "Bloqueadas", value: metrics.blocked, helper: "Manutencao ou bloqueio", tone: "border-rose-100 bg-rose-50 text-rose-700" },
            { icon: Users, label: "Sem vaga", value: unitsWithoutSpot, helper: "Unidades sem vaga fixa", tone: "border-slate-200 bg-white text-slate-800" },
            { icon: CalendarClock, label: "Visitantes", value: metrics.activeVisitors, helper: "Reservas ativas", tone: "border-cyan-100 bg-cyan-50 text-cyan-800" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-[28px] border p-5 shadow-sm ${item.tone}`}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                  <Icon size={20} />
                </div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.helper}</p>
              </div>
            );
          })}
        </section>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-base font-semibold text-slate-900">Fila de alocacao</h3>
                <p className="mt-1 text-sm text-slate-500">Priorize PCD, ordem, sorteio ou rodizio.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{waitlistBadge} pendentes</span>
                <button type="button" onClick={() => setShowWaitModal(true)} className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Nova solicitacao
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {state.waitlist.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">Nenhuma solicitacao pendente.</div>
              ) : (
                state.waitlist.map((item) => (
                  <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-semibold text-slate-900">{item.residentName}</p>
                      <p className="text-xs text-slate-500">{item.apartmentLabel || "Apartamento nao informado"}</p>
                      <p className="text-xs text-slate-500">Placa {item.vehiclePlate} · {item.vehicleModel || "Modelo nao informado"}</p>
                      <p className="text-[11px] text-amber-600">Criterio: {item.criteria} · Prioridade {item.priority}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => assignWait(item.id)}
                        className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        disabled={state.spots.every((spot) => spot.status !== "DISPONIVEL")}
                      >
                        Alocar vaga
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="m-0 text-base font-semibold text-slate-900">Reservas temporarias e visitantes</h3>
            <p className="mt-1 text-sm text-slate-500">Controle sazonal, limite de tempo e liberacao automatica.</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">{state.reservations.filter((res) => res.status === "ATIVA").length} ativas</span>
              <button type="button" onClick={() => setShowReserveModal(true)} className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                Nova reserva
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {state.reservations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">Nenhuma reserva criada.</div>
              ) : (
                state.reservations.map((res) => {
                  const expired = res.status === "VENCIDA";
                  return (
                    <div key={res.id} className={`grid gap-3 rounded-2xl border px-4 py-3 md:grid-cols-[1fr_auto_auto] md:items-center ${expired ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
                      <div className="min-w-0">
                        <p className="m-0 text-sm font-semibold text-slate-900">{res.visitorName} · {res.plate}</p>
                        <p className="text-xs text-slate-500">{res.apartmentLabel || "Vinculo nao informado"}</p>
                        <p className="text-[11px] text-slate-500">{new Date(res.startAt).toLocaleString("pt-BR")} - {new Date(res.endAt).toLocaleString("pt-BR")}</p>
                        {res.spotCode && <p className="text-[11px] text-slate-500">Vaga {res.spotCode}</p>}
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${res.status === "ATIVA" ? "bg-emerald-100 text-emerald-700" : res.status === "VENCIDA" ? "bg-amber-100 text-amber-700" : res.status === "CANCELADA" ? "bg-slate-100 text-slate-600" : "bg-sky-100 text-sky-700"}`}>
                        {res.status}
                      </span>
                      <button
                        type="button"
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => {
                          setReservationForm({ ...res });
                          setShowReserveModal(true);
                        }}
                      >
                        Editar
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              <Gauge size={16} />
              Filtros rapidos
            </div>
            <select value={filters.tower} onChange={(e) => setFilters((cur) => ({ ...cur, tower: e.target.value }))} className={`${inputClass} w-auto min-w-[180px]`}>
              <option value="TODOS">Todas as torres</option>
              {[...new Set(state.spots.map((spot) => spot.tower))].map((tower) => (
                <option key={tower} value={tower}>
                  {tower || "Sem torre"}
                </option>
              ))}
            </select>
            <select value={filters.type} onChange={(e) => setFilters((cur) => ({ ...cur, type: e.target.value as GarageSpotType | "TODOS" }))} className={`${inputClass} w-auto min-w-[170px]`}>
              <option value="TODOS">Todos os tipos</option>
              <option value="FIXA">Fixa</option>
              <option value="ROTATIVA">Rotativa</option>
              <option value="VISITANTE">Visitante</option>
              <option value="PCD">PCD</option>
              <option value="CARGA">Carga e descarga</option>
              <option value="TEMPORARIA">Temporaria</option>
            </select>
            <select value={filters.status} onChange={(e) => setFilters((cur) => ({ ...cur, status: e.target.value as GarageSpotStatus | "TODOS" }))} className={`${inputClass} w-auto min-w-[170px]`}>
              <option value="TODOS">Todos os status</option>
              <option value="DISPONIVEL">Disponivel</option>
              <option value="OCUPADA">Ocupada</option>
              <option value="RESERVADA">Reservada</option>
              <option value="BLOQUEADA">Bloqueada</option>
              <option value="MANUTENCAO">Manutencao</option>
            </select>
            <input value={filters.search} onChange={(e) => setFilters((cur) => ({ ...cur, search: e.target.value }))} placeholder="Buscar por apto, placa ou codigo" className={`${inputClass} w-auto min-w-[220px]`} />
          </div>
        </section>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-base font-semibold text-slate-900">Mapa da garagem</h3>
                <p className="mt-1 text-sm text-slate-500">Setores por torre/subsolo com status visual.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSpotId("");
                  setSpotForm({ ...emptySpot, id: `spot-${Date.now()}`, code: `G-${state.spots.length + 1}` });
                  setShowSpotModal(true);
                }}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Nova vaga
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {Object.entries(groupedSpots).map(([zone, zoneSpots]) => {
                const isOpen = openZone === zone;
                const ordered = [...zoneSpots].sort((a, b) => a.code.localeCompare(b.code, "pt-BR", { numeric: true }));
                const half = Math.ceil(ordered.length / 2);
                const left = ordered.slice(0, half);
                const right = ordered.slice(half);

                return (
                  <div key={zone} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setOpenZone(isOpen ? null : zone)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                    >
                      <div>
                        <p className="m-0 text-sm font-semibold text-slate-900">{zone}</p>
                        <p className="text-[11px] text-slate-500">{zoneSpots.length} vagas · {zoneSpots.filter((s) => s.status === "OCUPADA").length} ocupadas</p>
                      </div>
                      <span className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {isOpen ? "Fechar" : "Abrir"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-3">
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]">
                          <div className="grid gap-2">
                            {left.map((spot) => {
                              const tone = mapSpotTone(spot.status);
                              return (
                                <button
                                  key={spot.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSpotId(spot.id);
                                    setShowSpotModal(true);
                                  }}
                                  className={`rounded-[24px] border-2 p-4 text-left transition ${tone.shell} ${selectedSpotId === spot.id ? "ring-4 ring-slate-900/10 shadow-md" : "hover:-translate-y-0.5 hover:shadow-sm"}`}
                                >
                                  <SpotCard spot={spot} tone={tone} />
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex min-h-full flex-col items-center justify-center rounded-[26px] border border-slate-300/70 bg-[repeating-linear-gradient(180deg,#cbd5e1_0_18px,transparent_18px_42px)] px-3 py-6 text-center">
                            <div className="rounded-full border border-slate-300 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Via</div>
                            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 [writing-mode:vertical-rl] rotate-180">Fluxo de veiculos</p>
                          </div>
                          <div className="grid gap-2">
                            {right.map((spot) => {
                              const tone = mapSpotTone(spot.status);
                              return (
                                <button
                                  key={spot.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSpotId(spot.id);
                                    setShowSpotModal(true);
                                  }}
                                  className={`rounded-[24px] border-2 p-4 text-left transition ${tone.shell} ${selectedSpotId === spot.id ? "ring-4 ring-slate-900/10 shadow-md" : "hover:-translate-y-0.5 hover:shadow-sm"}`}
                                >
                                  <SpotCard spot={spot} tone={tone} align="right" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
      {showWaitModal && (
        <Modal onClose={() => setShowWaitModal(false)} title="Nova solicitacao" icon={<Users size={16} />}>
          <div className="space-y-3">
            <select value={waitForm.apartmentId ?? ""} onChange={(e) => handleWaitApartment(e.target.value)} className={inputClass}>
              <option value="">Selecione o apartamento (opcional)</option>
              {apartmentOptions.map((apt) => (
                <option key={apt.id} value={apt.id}>
                  {apartmentLabel(apt)}
                </option>
              ))}
            </select>
            <input value={waitForm.residentName} onChange={(e) => setWaitForm((cur) => ({ ...cur, residentName: e.target.value }))} placeholder="Nome do morador" className={inputClass} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={waitForm.vehiclePlate} onChange={(e) => setWaitForm((cur) => ({ ...cur, vehiclePlate: e.target.value }))} placeholder="Placa" className={inputClass} />
              <input value={waitForm.vehicleModel} onChange={(e) => setWaitForm((cur) => ({ ...cur, vehicleModel: e.target.value }))} placeholder="Modelo (opcional)" className={inputClass} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Criterio
                <select
                  value={waitForm.criteria}
                  onChange={(e) => setWaitForm((cur) => ({ ...cur, criteria: e.target.value as WaitingListEntry["criteria"] }))}
                  className={`${inputClass} mt-2`}
                >
                  <option value="ORDEM">Ordem de cadastro</option>
                  <option value="PCD">Prioridade PCD</option>
                  <option value="SORTEIO">Sorteio</option>
                  <option value="RODIZIO">Rodizio</option>
                  <option value="CONDUTA">Sindico/funcionario</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Prioridade (1 = alta)
                <input type="number" min={0} max={5} value={waitForm.priority} onChange={(e) => setWaitForm((cur) => ({ ...cur, priority: Number(e.target.value) || 1 }))} className={`${inputClass} mt-2`} />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowWaitModal(false)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
              <button type="button" onClick={addToWaitList} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">Adicionar a fila</button>
            </div>
          </div>
        </Modal>
      )}

      {showReserveModal && (
        <Modal onClose={() => setShowReserveModal(false)} title="Nova reserva" icon={<CalendarClock size={16} />}>
          <div className="space-y-3">
            <input value={reservationForm.visitorName} onChange={(e) => setReservationForm((cur) => ({ ...cur, visitorName: e.target.value }))} placeholder="Visitante ou servico" className={inputClass} />
            <input value={reservationForm.plate} onChange={(e) => setReservationForm((cur) => ({ ...cur, plate: e.target.value }))} placeholder="Placa" className={inputClass} />
            <select value={reservationForm.apartmentId ?? ""} onChange={(e) => handleReservationApartment(e.target.value)} className={inputClass}>
              <option value="">Vincular apartamento</option>
              {apartmentOptions.map((apt) => (
                <option key={apt.id} value={apt.id}>
                  {apartmentLabel(apt)}
                </option>
              ))}
            </select>
            <select value={reservationForm.spotId ?? ""} onChange={(e) => linkSpotFromReservation(e.target.value)} className={inputClass}>
              <option value="">Reservar vaga especifica (opcional)</option>
              {state.spots
                .filter((spot) => spot.type === "VISITANTE" || spot.type === "ROTATIVA" || spot.type === "TEMPORARIA")
                .map((spot) => (
                  <option key={spot.id} value={spot.id}>
                    {spot.code} - {spot.tower} ({spot.status})
                  </option>
                ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="datetime-local" value={reservationForm.startAt} onChange={(e) => setReservationForm((cur) => ({ ...cur, startAt: e.target.value }))} className={inputClass} />
              <input type="datetime-local" value={reservationForm.endAt} onChange={(e) => setReservationForm((cur) => ({ ...cur, endAt: e.target.value }))} className={inputClass} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={reservationForm.requiresApproval} onChange={(e) => setReservationForm((cur) => ({ ...cur, requiresApproval: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
              Exigir aprovacao da portaria
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowReserveModal(false)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
              <button type="button" onClick={handleCreateReservation} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">Salvar reserva</button>
            </div>
          </div>
        </Modal>
      )}

      {showSpotModal && (
        <Modal onClose={() => setShowSpotModal(false)} title={selectedSpotId ? "Editar vaga" : "Nova vaga"} icon={<ShieldCheck size={16} />}>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={spotForm.code} onChange={(e) => setSpotForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))} placeholder="Codigo da vaga" className={inputClass} />
              <input value={spotForm.tower} onChange={(e) => setSpotForm((c) => ({ ...c, tower: e.target.value }))} placeholder="Bloco / torre" className={inputClass} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={spotForm.level} onChange={(e) => setSpotForm((c) => ({ ...c, level: e.target.value }))} placeholder="Setor / subsolo" className={inputClass} />
              <select value={spotForm.type} onChange={(e) => setSpotForm((c) => ({ ...c, type: e.target.value as GarageSpotType }))} className={inputClass}>
                <option value="FIXA">Fixa</option>
                <option value="ROTATIVA">Rotativa</option>
                <option value="VISITANTE">Visitante</option>
                <option value="PCD">PCD</option>
                <option value="CARGA">Carga/descarga</option>
                <option value="TEMPORARIA">Temporaria</option>
              </select>
            </div>
            <select value={spotForm.status} onChange={(e) => setSpotForm((c) => ({ ...c, status: e.target.value as GarageSpotStatus }))} className={inputClass}>
              <option value="DISPONIVEL">Disponivel</option>
              <option value="OCUPADA">Ocupada</option>
              <option value="RESERVADA">Reservada</option>
              <option value="BLOQUEADA">Bloqueada</option>
              <option value="MANUTENCAO">Manutencao</option>
            </select>
            <select
              value={spotForm.apartmentId ?? ""}
              onChange={(e) => {
                const mapped = labelToApartment(e.target.value, apartmentOptions);
                setSpotForm((c) => ({ ...c, ...mapped }));
              }}
              className={inputClass}
            >
              <option value="">Selecione a unidade</option>
              {apartmentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {apartmentLabel(option)}
                </option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={spotForm.residentName ?? ""} onChange={(e) => setSpotForm((c) => ({ ...c, residentName: e.target.value }))} placeholder="Morador responsavel" className={inputClass} />
              <input value={spotForm.vehiclePlate ?? ""} onChange={(e) => setSpotForm((c) => ({ ...c, vehiclePlate: e.target.value.toUpperCase() }))} placeholder="Placa" className={inputClass} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={spotForm.vehicleModel ?? ""} onChange={(e) => setSpotForm((c) => ({ ...c, vehicleModel: e.target.value }))} placeholder="Modelo do veiculo" className={inputClass} />
              <input value={spotForm.vehicleColor ?? ""} onChange={(e) => setSpotForm((c) => ({ ...c, vehicleColor: e.target.value }))} placeholder="Cor" className={inputClass} />
            </div>
            <textarea value={spotForm.notes ?? ""} onChange={(e) => setSpotForm((c) => ({ ...c, notes: e.target.value }))} rows={4} placeholder="Observacoes da vaga" className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowSpotModal(false)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
              <button type="button" onClick={handleSaveSpot} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">Salvar</button>
              <button type="button" onClick={handleDeleteSpot} disabled={!selectedSpotId} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Excluir</button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
type SpotTone = { shell: string; badge: string; car: string; line: string };

function mapSpotTone(status: GarageSpotStatus): SpotTone {
  return {
    DISPONIVEL: {
      shell: "border-emerald-200 bg-emerald-50/90 text-emerald-900",
      badge: "bg-emerald-600 text-white",
      car: "bg-emerald-200 text-emerald-700",
      line: "border-emerald-300",
    },
    OCUPADA: {
      shell: "border-sky-200 bg-sky-50/90 text-sky-950",
      badge: "bg-sky-700 text-white",
      car: "bg-sky-200 text-sky-700",
      line: "border-sky-300",
    },
    RESERVADA: {
      shell: "border-amber-200 bg-amber-50/90 text-amber-950",
      badge: "bg-amber-500 text-white",
      car: "bg-amber-200 text-amber-700",
      line: "border-amber-300",
    },
    BLOQUEADA: {
      shell: "border-rose-200 bg-rose-50/90 text-rose-950",
      badge: "bg-rose-600 text-white",
      car: "bg-rose-200 text-rose-700",
      line: "border-rose-300",
    },
    MANUTENCAO: {
      shell: "border-rose-200 bg-rose-50/90 text-rose-950",
      badge: "bg-rose-600 text-white",
      car: "bg-rose-200 text-rose-700",
      line: "border-rose-300",
    },
  }[status];
}

function SpotCard({ spot, tone, align = "left" }: { spot: GarageSpot; tone: SpotTone; align?: "left" | "right" }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-black tracking-[-0.03em]">{spot.code}</p>
          <p className="mt-1 text-[11px] text-slate-600">
            {spot.type} · {spot.tower}
          </p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone.badge}`}>{spot.status}</span>
      </div>

      <div className={`mt-4 rounded-[20px] border-2 border-dashed ${tone.line} bg-white/70 p-3`}>
        <div className={`flex h-11 w-16 items-center justify-center rounded-2xl ${tone.car} ${align === "right" ? "ml-auto" : ""}`}>
          <CarFront size={20} />
        </div>
        <p className="mt-3 truncate text-sm font-semibold text-slate-800">{spot.vehicleModel || "Sem veiculo"}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{spot.vehiclePlate || "Placa nao cadastrada"}</p>
        <p className="mt-2 truncate text-[11px] text-slate-500">{spot.apartmentLabel || "Sem unidade vinculada"}</p>
        {spot.notes && (
          <p className="mt-2 text-[11px] text-slate-500">
            <BadgeInfo size={12} className="inline mr-1" />
            {spot.notes}
          </p>
        )}
      </div>
    </>
  );
}

function Modal({ title, icon, onClose, children }: { title: string; icon: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <div className={modalShell} onClick={onClose}>
      <div className={modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">{icon}</span>
            <h3 className="m-0 text-lg font-semibold">{title}</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}

