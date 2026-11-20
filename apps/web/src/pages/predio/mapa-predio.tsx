import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import AppLayout from "../../features/layout/components/app-layout";
import { getUser } from "../../features/auth/services/auth";
import { ApartmentCard } from "../../features/predio/components/apartment-card";
import { MoradorModal } from "../../features/predio/components/morador-modal";
import {
  createApartment,
  createBlock,
  deleteApartment,
  deleteTower,
  fetchBuilding,
  type Apartment,
  type CreateApartmentInput,
  type CreateBlockInput,
  type Floor,
  type ResidentStatus,
} from "../../features/predio/services/predio";

const STATUS_OPTIONS: ResidentStatus[] = ["Proprietário", "Inquilino", "Visitante", "Vago"];
const FLOORS_PER_PAGE = 5;
const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

type ViewMode = "single" | "all";
type StructureModal = "block" | "apartment" | "deleteTower" | null;

type FilterDraft = {
  tower: string;
  status: ResidentStatus | "Todos";
  viewMode: ViewMode;
};

function formatFloorLabel(level: number) {
  return `${level}º andar`;
}

function getShortTowerName(tower: string) {
  return tower.replace(/^Torre\s*/i, "").trim();
}

function getStatusColor(status: ResidentStatus) {
  switch (status) {
    case "Proprietário": return "bg-indigo-400";
    case "Inquilino":    return "bg-emerald-400";
    case "Visitante":    return "bg-amber-400";
    default:             return "bg-slate-300";
  }
}

// ── Filter Panel ──────────────────────────────────────────────────────────────
function FilterPanel({
  open,
  onClose,
  towers,
  initial,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  towers: string[];
  initial: FilterDraft;
  onApply: (f: FilterDraft) => void;
}) {
  const [draft, setDraft] = useState<FilterDraft>(initial);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) setDraft(initial); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function apply() { onApply(draft); onClose(); }
  function clear() { setDraft({ tower: "Todas", status: "Todos", viewMode: "single" }); }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" onClick={onClose} />}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">Filtros e Visualização</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Torre</p>
            <div className="space-y-1.5">
              {["Todas", ...towers].map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="filterTower"
                    checked={draft.tower === t}
                    onChange={() => setDraft((d) => ({ ...d, tower: t }))}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</p>
            <div className="space-y-1.5">
              {(["Todos", ...STATUS_OPTIONS] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="filterStatus"
                    checked={draft.status === s}
                    onChange={() => setDraft((d) => ({ ...d, status: s as ResidentStatus | "Todos" }))}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Visualização</p>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="filterView" checked={draft.viewMode === "single"} onChange={() => setDraft((d) => ({ ...d, viewMode: "single" }))} className="accent-indigo-600" />
                <span className="text-sm text-gray-700">Andar selecionado</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="filterView" checked={draft.viewMode === "all"} onChange={() => setDraft((d) => ({ ...d, viewMode: "all" }))} className="accent-indigo-600" />
                <span className="text-sm text-gray-700">Edifício completo</span>
              </label>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={clear} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">Limpar</button>
          <button onClick={apply} className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer transition-colors">Aplicar</button>
        </div>
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MapaPredio() {
  const user = useMemo(() => getUser(), []);
  const isAdmin = user?.role === "ADMIN";
  const condominioName = user?.condominioName ?? "Edifício";

  const [building, setBuilding] = useState<Floor[]>([]);
  const [selectedApt, setSelectedApt] = useState<Apartment | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<{ level: number; tower: string } | null>(null);
  const [selectedTower, setSelectedTower] = useState("Todas");
  const [towerToDelete, setTowerToDelete] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResidentStatus | "Todos">("Todos");
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [miniPage, setMiniPage] = useState(0);
  const [blockForm, setBlockForm] = useState<CreateBlockInput>({ tower: "", floors: 8, apartmentsPerFloor: 4 });
  const [apartmentForm, setApartmentForm] = useState<CreateApartmentInput>({ tower: "Torre A", floor: 1, number: "" });
  const [savingStructure, setSavingStructure] = useState(false);
  const [structureError, setStructureError] = useState("");
  const [structureSuccess, setStructureSuccess] = useState("");
  const [structureModal, setStructureModal] = useState<StructureModal>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  async function loadBuilding() {
    const data = await fetchBuilding();
    setBuilding(data);
    return data;
  }

  useEffect(() => { loadBuilding(); }, []);

  const towers = useMemo(() => Array.from(new Set(building.map((floor) => floor.tower))), [building]);
  const towerOptions = useMemo(() => towers, [towers]);

  useEffect(() => {
    if (towerOptions.length === 0) { setTowerToDelete(""); return; }
    setTowerToDelete((current) => {
      if (current && towerOptions.includes(current)) return current;
      if (selectedTower !== "Todas" && towerOptions.includes(selectedTower)) return selectedTower;
      return towerOptions[0];
    });
  }, [selectedTower, towerOptions]);

  useEffect(() => {
    if (towerOptions.length === 0) return;
    setApartmentForm((current) => {
      if (towerOptions.includes(current.tower)) return current;
      return { ...current, tower: selectedTower !== "Todas" ? selectedTower : towerOptions[0] };
    });
  }, [selectedTower, towerOptions]);

  const filteredBuilding = useMemo(() => {
    if (selectedTower === "Todas") return building;
    return building.filter((floor) => floor.tower === selectedTower);
  }, [building, selectedTower]);

  const floors = useMemo(
    () => [...filteredBuilding].sort((a, b) => {
      if (a.level === b.level) return a.tower.localeCompare(b.tower);
      return b.level - a.level;
    }),
    [filteredBuilding],
  );

  useEffect(() => {
    setMiniPage(0);
    setSelectedApt(null);
    if (floors.length > 0) {
      setSelectedFloor({ level: floors[0].level, tower: floors[0].tower });
      setViewMode("single");
    } else {
      setSelectedFloor(null);
    }
  }, [selectedTower, floors]);

  const totalMiniPages = Math.ceil(floors.length / FLOORS_PER_PAGE);
  const paginatedMiniFloors = useMemo(
    () => floors.slice(miniPage * FLOORS_PER_PAGE, miniPage * FLOORS_PER_PAGE + FLOORS_PER_PAGE),
    [floors, miniPage],
  );
  const currentFloor = useMemo(() => {
    if (!selectedFloor) return floors[0] ?? null;
    return floors.find((floor) => floor.level === selectedFloor.level && floor.tower === selectedFloor.tower) ?? floors[0] ?? null;
  }, [floors, selectedFloor]);
  const hasPrevPage = miniPage > 0;
  const hasNextPage = miniPage < totalMiniPages - 1;

  const selectedTowerSummary = useMemo(() => {
    const towerFloors = building.filter((floor) => floor.tower === apartmentForm.tower);
    if (towerFloors.length === 0) return null;
    return {
      floors: Math.max(...towerFloors.map((floor) => floor.level)),
      apartmentsPerFloor: Math.max(...towerFloors.map((floor) => floor.apartments.length)),
    };
  }, [apartmentForm.tower, building]);

  const buildingStats = useMemo(() => {
    const apartments = floors.flatMap((floor) => floor.apartments);
    return {
      total: apartments.length,
      proprietarios: apartments.filter((apt) => apt.resident?.status === "Proprietário").length,
      inquilinos: apartments.filter((apt) => apt.resident?.status === "Inquilino").length,
      visitantes: apartments.filter((apt) => apt.activeVisitors.length > 0 || apt.resident?.status === "Visitante").length,
      vagos: apartments.filter((apt) => (!apt.resident || apt.resident.status === "Vago") && apt.activeVisitors.length === 0).length,
    };
  }, [floors]);

  const floorSummary = useMemo(() => {
    if (!currentFloor) return null;
    return {
      total: currentFloor.apartments.length,
      ocupados: currentFloor.apartments.filter((apt) => (apt.resident && apt.resident.status !== "Vago") || apt.activeVisitors.length > 0).length,
      vagos: currentFloor.apartments.filter((apt) => (!apt.resident || apt.resident.status === "Vago") && apt.activeVisitors.length === 0).length,
    };
  }, [currentFloor]);

  const displayedFloors = useMemo(() => {
    const baseFloors = viewMode === "all" ? floors : currentFloor ? [currentFloor] : [];
    return baseFloors
      .map((floor) => ({
        ...floor,
        apartments: floor.apartments.filter((apt) => {
          const residentStatus = apt.activeVisitors.length > 0 ? "Visitante" : apt.resident?.status ?? "Vago";
          return statusFilter === "Todos" || residentStatus === statusFilter;
        }),
      }))
      .filter((floor) => floor.apartments.length > 0 || statusFilter !== "Todos");
  }, [floors, currentFloor, viewMode, statusFilter]);

  const activeFilterCount = [
    selectedTower !== "Todas" ? 1 : 0,
    statusFilter !== "Todos" ? 1 : 0,
    viewMode !== "single" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  function applyFilters(f: FilterDraft) {
    setSelectedTower(f.tower);
    setStatusFilter(f.status);
    setViewMode(f.viewMode);
  }

  async function handleCreateBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingStructure(true);
    setStructureError("");
    setStructureSuccess("");
    try {
      await createBlock(blockForm);
      await loadBuilding();
      setBlockForm({ tower: "", floors: 8, apartmentsPerFloor: 4 });
      setStructureModal(null);
      setStructureSuccess("Bloco cadastrado com sucesso.");
    } catch (error) {
      setStructureError(error instanceof Error ? error.message : "Erro ao cadastrar bloco.");
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleCreateApartment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingStructure(true);
    setStructureError("");
    setStructureSuccess("");
    try {
      await createApartment(apartmentForm);
      await loadBuilding();
      setSelectedTower(apartmentForm.tower);
      setApartmentForm((current) => ({ ...current, number: "" }));
      setStructureModal(null);
      setStructureSuccess("Apartamento cadastrado com sucesso.");
    } catch (error) {
      setStructureError(error instanceof Error ? error.message : "Erro ao cadastrar apartamento.");
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleDeleteSelectedTower() {
    if (!towerToDelete) { setStructureError("Selecione a torre que deseja excluir."); return; }
    if (!window.confirm(`Excluir a ${towerToDelete}? Todos os apartamentos vazios dessa torre serão removidos.`)) return;
    setSavingStructure(true);
    setStructureError("");
    setStructureSuccess("");
    try {
      await deleteTower(towerToDelete);
      await loadBuilding();
      if (selectedTower === towerToDelete) setSelectedTower("Todas");
      setSelectedApt(null);
      setStructureModal(null);
      setStructureSuccess("Bloco excluído com sucesso.");
    } catch (error) {
      setStructureError(error instanceof Error ? error.message : "Erro ao excluir bloco.");
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleDeleteApartmentFromModal(apartment: Apartment) {
    if (!window.confirm(`Excluir o apartamento ${apartment.number}?`)) return;
    setSavingStructure(true);
    setStructureError("");
    setStructureSuccess("");
    try {
      await deleteApartment(apartment.id);
      await loadBuilding();
      setSelectedApt(null);
      setStructureSuccess("Apartamento excluído com sucesso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao excluir apartamento.";
      setStructureError(message);
      throw error;
    } finally {
      setSavingStructure(false);
    }
  }

  function closeStructureModal() {
    if (savingStructure) return;
    setStructureModal(null);
  }

  return (
    <AppLayout title="Mapa do edifício">
      <div className="relative space-y-5">
        {/* ── Hero header ── */}
        <section className="rounded-[28px] border border-slate-100 bg-linear-to-br from-indigo-50 via-white to-slate-50 px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-700">
                  <Building2 size={10} />
                  Mapa do Edifício
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{condominioName}</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {isAdmin ? "Visualize e gerencie torres, unidades e moradores." : "Encontre apartamentos por torre, andar ou status."}
              </p>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setStructureModal("block")} className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">
                  Criar torre
                </button>
                <button type="button" onClick={() => setStructureModal("apartment")} disabled={towerOptions.length === 0} className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
                  Criar apartamento
                </button>
                <button type="button" onClick={() => setStructureModal("deleteTower")} disabled={!towerToDelete} className="inline-flex items-center gap-1.5 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50">
                  Excluir torre
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── KPI cards (estilo enquetes) ── */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Total",         value: buildingStats.total,         sub: "Unidades cadastradas",    cardTone: "border-slate-200 bg-[linear-gradient(180deg,_#fbfcfe,_#f1f5f9)]",   iconTone: "text-slate-700",   icon: "🏢" },
            { label: "Proprietários", value: buildingStats.proprietarios, sub: "Unidades próprias",        cardTone: "border-indigo-200 bg-[linear-gradient(180deg,_#f5f3ff,_#ede9fe)]", iconTone: "text-indigo-700",  icon: "🔑" },
            { label: "Inquilinos",    value: buildingStats.inquilinos,    sub: "Unidades alugadas",        cardTone: "border-emerald-200 bg-[linear-gradient(180deg,_#f7fffb,_#eefcf5)]", iconTone: "text-emerald-700", icon: "📋" },
            { label: "Visitantes",    value: buildingStats.visitantes,    sub: "Unidades com visitantes",  cardTone: "border-amber-200 bg-[linear-gradient(180deg,_#fffaf0,_#fff4dd)]",   iconTone: "text-amber-700",   icon: "👤" },
            { label: "Vagos",         value: buildingStats.vagos,         sub: "Unidades disponíveis",     cardTone: "border-rose-200 bg-[linear-gradient(180deg,_#fff7f8,_#ffecef)]",    iconTone: "text-rose-700",    icon: "🔓" },
          ].map((card) => (
            <div key={card.label} className={`rounded-[30px] border p-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] ${card.cardTone}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/90 bg-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.45)] text-xl`}>
                  {card.icon}
                </div>
                <p className={`text-[2rem] font-black leading-none tracking-[-0.05em] text-slate-900`}>{card.value}</p>
              </div>
              <p className="mt-3 text-base font-semibold text-slate-700">{card.label}</p>
              <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
            </div>
          ))}
        </section>

        {isAdmin && (structureError || structureSuccess) && (
          <div>
            {structureError && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{structureError}</p>}
            {structureSuccess && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{structureSuccess}</p>}
          </div>
        )}

        {/* ── Layout: mini prédio + andares ── */}
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
          {/* ── Mini prédio ── */}
          <aside className="min-w-0 space-y-4 xl:max-w-60">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ring-1 ring-indigo-100">
              <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_35%),linear-gradient(180deg,#f8fbff,#ffffff)] p-4">
                <div className="mb-3 space-y-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Mini prédio</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Navegue pelos andares e selecione apartamentos.</p>
                  </div>
                  <div className="rounded-2xl bg-indigo-100 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Torre ativa</p>
                    <p className="mt-1 text-sm font-semibold text-indigo-900">
                      {selectedTower === "Todas" ? condominioName : selectedTower}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-100 p-3 shadow-inner">
                <div className="mx-auto mb-3 w-full max-w-33 rounded-t-3xl bg-slate-300 px-3 py-2 text-center text-[11px] font-semibold text-slate-700">
                  {selectedTower === "Todas" ? getShortTowerName(condominioName) : getShortTowerName(selectedTower)}
                </div>
                <div className="overflow-hidden rounded-[22px] bg-slate-50 p-3">
                  <div className="mb-3 flex flex-nowrap items-center justify-between gap-2">
                    <button type="button" onClick={() => { if (!hasPrevPage) return; setMiniPage((c) => c - 1); setSelectedApt(null); setViewMode("single"); }} disabled={!hasPrevPage} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={18} /></button>
                    <span className="flex-1 whitespace-nowrap text-center text-[11px] font-semibold text-slate-500">{totalMiniPages === 0 ? "0 páginas" : `Página ${miniPage + 1} de ${totalMiniPages}`}</span>
                    <button type="button" onClick={() => { if (!hasNextPage) return; setMiniPage((c) => c + 1); setSelectedApt(null); setViewMode("single"); }} disabled={!hasNextPage} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={18} /></button>
                  </div>
                  <div className="space-y-1.5">
                    {paginatedMiniFloors.map((floor) => {
                      const isActive = currentFloor?.level === floor.level && currentFloor?.tower === floor.tower;
                      return (
                        <button
                          key={`${floor.tower}-${floor.level}`}
                          type="button"
                          onClick={() => { setSelectedFloor({ level: floor.level, tower: floor.tower }); setViewMode("single"); }}
                          className={`w-full rounded-2xl px-2 py-2 text-left transition ${isActive ? "bg-indigo-50 ring-1 ring-indigo-200" : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"}`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="truncate text-[10px] font-semibold text-slate-700">{formatFloorLabel(floor.level)}{selectedTower === "Todas" ? ` - ${getShortTowerName(floor.tower)}` : ""}</span>
                            <span className="shrink-0 text-[9px] text-slate-500">{floor.apartments.length} aptos</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            {floor.apartments.map((apt) => {
                              const status = apt.resident?.status ?? "Vago";
                              return (
                                <span
                                  key={apt.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => { e.stopPropagation(); setSelectedFloor({ level: floor.level, tower: floor.tower }); setSelectedApt(apt); }}
                                  onKeyDown={(e) => { if (e.key !== "Enter" && e.key !== " ") return; e.preventDefault(); e.stopPropagation(); setSelectedFloor({ level: floor.level, tower: floor.tower }); setSelectedApt(apt); }}
                                  className={`flex h-5 cursor-pointer items-center justify-center rounded-full text-[8px] font-semibold text-white transition hover:scale-[1.03] ${getStatusColor(status)}`}
                                >
                                  {apt.number}
                                </span>
                              );
                            })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </aside>

          {/* ── Painel principal ── */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-4 md:px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-semibold text-slate-900">
                    {viewMode === "all"
                      ? selectedTower === "Todas" ? "Edifício completo" : `${selectedTower} completa`
                      : currentFloor ? `${formatFloorLabel(currentFloor.level)} — ${currentFloor.tower}` : "Andar"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {viewMode === "all" ? "Todos os andares com filtros aplicados." : "Visualização focada em um único andar."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  className={`relative shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border cursor-pointer transition-colors ${activeFilterCount > 0 ? "bg-indigo-50 border-indigo-300 text-indigo-600" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}
                >
                  <SlidersHorizontal size={16} />
                  {activeFilterCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {viewMode === "single" && floorSummary && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{floorSummary.total} unidades</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{floorSummary.ocupados} ocupados</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{floorSummary.vagos} vagos</span>
                  {statusFilter !== "Todos" && (
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">Filtro: {statusFilter}</span>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 py-5 md:px-5">
              <div className="space-y-5">
                {displayedFloors.length > 0 ? displayedFloors.map((floor) => (
                  <div key={`${floor.tower}-${floor.level}`} className="min-w-0 overflow-hidden rounded-[28px] bg-slate-100 p-3 md:p-4">
                    <div className="mb-4">
                      <p className="truncate text-sm font-semibold text-slate-800">{formatFloorLabel(floor.level)} — {floor.tower}</p>
                      <p className="text-xs text-slate-500">{floor.apartments.length} apartamentos neste andar</p>
                    </div>
                    <div className="min-w-0 overflow-hidden rounded-3xl bg-white p-3 ring-1 ring-slate-200 md:p-4">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Corredor do andar</span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {floor.apartments.map((apt) => (
                          <ApartmentCard
                            key={apt.id}
                            apt={apt}
                            isSelected={selectedApt?.id === apt.id}
                            onClick={() => setSelectedApt(apt)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                    <p className="text-sm font-semibold text-slate-700">Nenhum apartamento encontrado</p>
                    <p className="mt-2 text-xs text-slate-500">Tente ajustar o filtro de status ou a torre.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        towers={towerOptions}
        initial={{ tower: selectedTower, status: statusFilter, viewMode }}
        onApply={applyFilters}
      />

      <MoradorModal
        apartment={selectedApt}
        onClose={() => setSelectedApt(null)}
        onReload={async () => {
          const refreshed = await loadBuilding();
          setSelectedApt((current) => {
            if (!current) return null;
            return refreshed.flatMap((f) => f.apartments).find((a) => a.id === current.id) ?? current;
          });
        }}
        onDeleteApartment={handleDeleteApartmentFromModal}
      />

      {isAdmin && structureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-4xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Gerenciamento do edifício</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {structureModal === "block" ? "Criar torre" : structureModal === "apartment" ? "Criar apartamento" : "Excluir torre"}
                </h3>
              </div>
              <button type="button" onClick={closeStructureModal} disabled={savingStructure} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"><X size={18} /></button>
            </div>
            <div className="p-5">
              {structureModal === "block" && (
                <form onSubmit={handleCreateBlock} className="grid gap-4">
                  <label className="grid gap-2 text-sm font-medium text-slate-700"><span>Bloco</span><input value={blockForm.tower} onChange={(e) => setBlockForm((c) => ({ ...c, tower: e.target.value }))} placeholder="Ex.: Torre C" className={inputClass} /></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-slate-700"><span>Quantidade de andares</span><input type="number" min={1} value={blockForm.floors} onChange={(e) => setBlockForm((c) => ({ ...c, floors: Number(e.target.value) }))} className={inputClass} /></label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700"><span>Apartamentos por andar</span><input type="number" min={1} value={blockForm.apartmentsPerFloor} onChange={(e) => setBlockForm((c) => ({ ...c, apartmentsPerFloor: Number(e.target.value) }))} className={inputClass} /></label>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">Os apartamentos serão criados automaticamente usando o padrão do bloco informado.</div>
                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={closeStructureModal} disabled={savingStructure} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
                    <button type="submit" disabled={savingStructure} className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">{savingStructure ? "Salvando..." : "Cadastrar torre"}</button>
                  </div>
                </form>
              )}
              {structureModal === "apartment" && (
                <form onSubmit={handleCreateApartment} className="grid gap-4">
                  <label className="grid gap-2 text-sm font-medium text-slate-700"><span>Bloco</span><select value={apartmentForm.tower} onChange={(e) => setApartmentForm((c) => ({ ...c, tower: e.target.value }))} className={inputClass}>{towerOptions.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-slate-700"><span>Andar</span><input type="number" min={1} value={apartmentForm.floor} onChange={(e) => setApartmentForm((c) => ({ ...c, floor: Number(e.target.value) }))} className={inputClass} /></label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700"><span>Apartamento</span><input value={apartmentForm.number} onChange={(e) => setApartmentForm((c) => ({ ...c, number: e.target.value }))} placeholder="Ex.: 71" className={inputClass} /></label>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">{selectedTowerSummary ? `${apartmentForm.tower} possui ${selectedTowerSummary.floors} andares e até ${selectedTowerSummary.apartmentsPerFloor} apartamentos por andar.` : "Selecione um bloco válido."}</div>
                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={closeStructureModal} disabled={savingStructure} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
                    <button type="submit" disabled={savingStructure || towerOptions.length === 0} className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">{savingStructure ? "Salvando..." : "Cadastrar apartamento"}</button>
                  </div>
                </form>
              )}
              {structureModal === "deleteTower" && (
                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm font-medium text-slate-700"><span>Bloco</span><select value={towerToDelete} onChange={(e) => setTowerToDelete(e.target.value)} className={inputClass}>{towerOptions.length === 0 ? <option value="">Nenhuma torre disponível</option> : null}{towerOptions.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">Se houver moradores vinculados, o sistema bloqueia a exclusão.</div>
                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={closeStructureModal} disabled={savingStructure} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
                    <button type="button" onClick={handleDeleteSelectedTower} disabled={savingStructure || !towerToDelete} className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100">{savingStructure ? "Excluindo..." : "Excluir torre"}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
