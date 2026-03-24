import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, X } from "lucide-react";
import AppLayout from "../../features/layout/components/app-layout";
import { getUser } from "../../features/auth/services/auth";
import { ApartmentCard } from "../../features/predio/components/apartment-card";
import { MoradorModal } from "../../features/predio/components/morador-modal";
import {
  assignApartment,
  createApartment,
  createBlock,
  deleteApartment,
  deleteTower,
  fetchBuilding,
  getMockBuilding,
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

function formatFloorLabel(level: number) {
  return `${level}o andar`;
}

function getShortTowerName(tower: string) {
  return tower.replace(/^Torre\s*/i, "").trim();
}

function getStatusColor(status: ResidentStatus) {
  switch (status) {
    case "Proprietário":
      return "bg-indigo-400";
    case "Inquilino":
      return "bg-emerald-400";
    case "Visitante":
      return "bg-amber-400";
    default:
      return "bg-slate-300";
  }
}

export default function MapaPredio() {
  const user = useMemo(() => getUser(), []);
  const isAdmin = user?.role === "ADMIN";

  const [building, setBuilding] = useState<Floor[]>(() => getMockBuilding());
  const [selectedApt, setSelectedApt] = useState<Apartment | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<{ level: number; tower: string } | null>(null);
  const [selectedTower, setSelectedTower] = useState("Todas");
  const [towerToDelete, setTowerToDelete] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResidentStatus | "Todos">("Todos");
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [miniPage, setMiniPage] = useState(0);
  const [blockForm, setBlockForm] = useState<CreateBlockInput>({ tower: "", floors: 8, apartmentsPerFloor: 4 });
  const [apartmentForm, setApartmentForm] = useState<CreateApartmentInput>({ tower: "Torre A", floor: 1, number: "" });
  const [savingStructure, setSavingStructure] = useState(false);
  const [structureError, setStructureError] = useState("");
  const [structureSuccess, setStructureSuccess] = useState("");
  const [structureModal, setStructureModal] = useState<StructureModal>(null);

  async function loadBuilding() {
    const data = await fetchBuilding();
    setBuilding(data);
    return data;
  }

  useEffect(() => {
    loadBuilding();
  }, []);

  const towers = useMemo(() => ["Todas", ...Array.from(new Set(building.map((floor) => floor.tower)))], [building]);
  const towerOptions = useMemo(() => towers.filter((tower) => tower !== "Todas"), [towers]);

  useEffect(() => {
    if (towerOptions.length === 0) {
      setTowerToDelete("");
      return;
    }
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
    () =>
      [...filteredBuilding].sort((a, b) => {
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
  const paginatedMiniFloors = useMemo(() => floors.slice(miniPage * FLOORS_PER_PAGE, miniPage * FLOORS_PER_PAGE + FLOORS_PER_PAGE), [floors, miniPage]);
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
    const term = search.trim().toLowerCase();
    return baseFloors
      .map((floor) => ({
        ...floor,
        apartments: floor.apartments.filter((apt) => {
          const residentStatus = apt.activeVisitors.length > 0 ? "Visitante" : apt.resident?.status ?? "Vago";
          const residentName = (apt.resident?.name ?? "").toLowerCase();
          const residentEmail = (apt.resident?.email ?? "").toLowerCase();
          const visitorNames = apt.activeVisitors.map((visitor) => visitor.name.toLowerCase()).join(" ");
          const visitorEmails = apt.activeVisitors.map((visitor) => visitor.email.toLowerCase()).join(" ");
          const matchesStatus = statusFilter === "Todos" || residentStatus === statusFilter;
          const matchesSearch =
            term.length === 0 || apt.number.toLowerCase().includes(term) || residentName.includes(term) || residentEmail.includes(term) || visitorNames.includes(term) || visitorEmails.includes(term);
          return matchesStatus && matchesSearch;
        }),
      }))
      .filter((floor) => floor.apartments.length > 0 || term.length > 0 || statusFilter !== "Todos");
  }, [floors, currentFloor, viewMode, search, statusFilter]);

  function goToPrevPage() {
    if (!hasPrevPage) return;
    setMiniPage((current) => current - 1);
    setSelectedApt(null);
    setViewMode("single");
  }

  function goToNextPage() {
    if (!hasNextPage) return;
    setMiniPage((current) => current + 1);
    setSelectedApt(null);
    setViewMode("single");
  }

  async function handleAssign(apartmentId: string, userId: string | null) {
    await assignApartment(apartmentId, userId);
    const refreshed = await loadBuilding();
    if (selectedApt?.id === apartmentId) {
      const updated = refreshed.flatMap((floor) => floor.apartments).find((item) => item.id === apartmentId);
      setSelectedApt(updated ?? null);
    }
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
    if (!towerToDelete) {
      setStructureError("Selecione a torre que deseja excluir.");
      return;
    }
    if (!window.confirm(`Excluir a ${towerToDelete}? Todos os apartamentos vazios dessa torre serao removidos.`)) return;
    setSavingStructure(true);
    setStructureError("");
    setStructureSuccess("");
    try {
      await deleteTower(towerToDelete);
      await loadBuilding();
      if (selectedTower === towerToDelete) setSelectedTower("Todas");
      setSelectedApt(null);
      setStructureModal(null);
      setStructureSuccess("Bloco excluido com sucesso.");
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
      setStructureSuccess("Apartamento excluido com sucesso.");
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
      <div className="flex flex-col gap-5">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4 md:px-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-2xl">
                {isAdmin ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                    <Building2 size={13} />
                    Gestão da estrutura
                  </div>
                ) : null}
                <h2 className="mt-3 text-lg font-semibold text-slate-900">
                  {isAdmin ? "Gerenciamento do edifício" : "Visualização do edifício"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {isAdmin
                    ? "Visualize apartamentos e gerencie torres, unidades e estrutura no mesmo painel."
                    : "Encontre apartamentos por torre, andar, status ou nome do morador."}
                </p>
              </div>

              {isAdmin ? (
                <div className="w-full xl:max-w-[560px]">
                  <div className="grid gap-3 md:grid-cols-3">
                    <button type="button" onClick={() => setStructureModal("block")} className="inline-flex min-w-0 items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">
                      Criar torre
                    </button>
                    <button type="button" onClick={() => setStructureModal("apartment")} disabled={towerOptions.length === 0} className="inline-flex min-w-0 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                      Criar apartamento
                    </button>
                    <button type="button" onClick={() => setStructureModal("deleteTower")} disabled={!towerToDelete} className="inline-flex min-w-0 items-center justify-center rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
                      Excluir torre
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="px-4 py-4 md:px-5">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              <div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-[11px] font-medium text-slate-500">Total</p><p className="mt-0.5 text-xl font-semibold text-slate-900">{buildingStats.total}</p></div>
              <div className="rounded-xl bg-indigo-50 px-3 py-2.5"><p className="text-[11px] font-medium text-indigo-600">Proprietários</p><p className="mt-0.5 text-xl font-semibold text-indigo-700">{buildingStats.proprietarios}</p></div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2.5"><p className="text-[11px] font-medium text-emerald-600">Inquilinos</p><p className="mt-0.5 text-xl font-semibold text-emerald-700">{buildingStats.inquilinos}</p></div>
              <div className="rounded-xl bg-amber-50 px-3 py-2.5"><p className="text-[11px] font-medium text-amber-600">Visitantes</p><p className="mt-0.5 text-xl font-semibold text-amber-700">{buildingStats.visitantes}</p></div>
              <div className="rounded-xl bg-slate-100 px-3 py-2.5"><p className="text-[11px] font-medium text-slate-500">Vagos</p><p className="mt-0.5 text-xl font-semibold text-slate-700">{buildingStats.vagos}</p></div>
            </div>

            {isAdmin && (structureError || structureSuccess) ? (
              <div className="mt-4">
                {structureError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{structureError}</p> : null}
                {structureSuccess ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{structureSuccess}</p> : null}
              </div>
            ) : null}
          </div>
        </section>

        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-4 xl:max-w-[240px]">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ring-1 ring-indigo-100">
              <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.12),_transparent_35%),linear-gradient(180deg,_#f8fbff,_#ffffff)] p-4">
                <div className="mb-3 space-y-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Mini prédio</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Navegue pelos andares e selecione apartamentos direto no mapa lateral.</p>
                  </div>
                  <div className="rounded-2xl bg-indigo-100 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Torre ativa</p>
                    <p className="mt-1 text-sm font-semibold text-indigo-900">{selectedTower === "Todas" ? "Edificio" : selectedTower}</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-100 p-3 shadow-inner">
                <div className="mx-auto mb-3 w-full max-w-[132px] rounded-t-3xl bg-slate-300 px-3 py-2 text-center text-[11px] font-semibold text-slate-700">{selectedTower === "Todas" ? "Edificio" : getShortTowerName(selectedTower)}</div>
                <div className="overflow-hidden rounded-[22px] bg-slate-50 p-3">
                  <div className="mb-3 flex flex-nowrap items-center justify-between gap-2">
                    <button type="button" onClick={goToPrevPage} disabled={!hasPrevPage} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={18} /></button>
                    <span className="flex-1 whitespace-nowrap text-center text-[11px] font-semibold text-slate-500">{totalMiniPages === 0 ? "0 páginas" : `Página ${miniPage + 1} de ${totalMiniPages}`}</span>
                    <button type="button" onClick={goToNextPage} disabled={!hasNextPage} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={18} /></button>
                  </div>
                  <div className="space-y-1.5">
                    {paginatedMiniFloors.map((floor) => {
                      const isActive = currentFloor?.level === floor.level && currentFloor?.tower === floor.tower;
                      return <button key={`${floor.tower}-${floor.level}`} type="button" onClick={() => { setSelectedFloor({ level: floor.level, tower: floor.tower }); setViewMode("single"); }} className={`w-full rounded-2xl px-2 py-2 text-left transition ${isActive ? "bg-indigo-50 ring-1 ring-indigo-200" : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"}`}><div className="mb-2 flex items-center justify-between gap-2"><span className="truncate text-[10px] font-semibold text-slate-700">{formatFloorLabel(floor.level)}{selectedTower === "Todas" ? ` - ${getShortTowerName(floor.tower)}` : ""}</span><span className="shrink-0 text-[9px] text-slate-500">{floor.apartments.length} aptos</span></div><div className="grid grid-cols-4 gap-1">{floor.apartments.map((apt) => { const status = apt.resident?.status ?? "Vago"; return <span key={apt.id} role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); setSelectedFloor({ level: floor.level, tower: floor.tower }); setSelectedApt(apt); }} onKeyDown={(event) => { if (event.key !== "Enter" && event.key !== " ") return; event.preventDefault(); event.stopPropagation(); setSelectedFloor({ level: floor.level, tower: floor.tower }); setSelectedApt(apt); }} className={`flex h-5 cursor-pointer items-center justify-center rounded-full text-[8px] font-semibold text-white transition hover:scale-[1.03] ${getStatusColor(status)}`}>{apt.number}</span>; })}</div></button>;
                    })}
                  </div>
                </div>
              </div>
            </section>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-4 md:px-5">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-semibold text-slate-900">{viewMode === "all" ? (selectedTower === "Todas" ? "Edifício completo" : `${selectedTower} completa`) : currentFloor ? `${formatFloorLabel(currentFloor.level)} - ${currentFloor.tower}` : "Andar"}</h3>
                <p className="mt-1 text-sm text-slate-500">{viewMode === "all" ? "Visualizacao de todos os andares com os filtros aplicados." : "Visualizacao focada em um unico andar para facilitar a leitura."}</p>
              </div>
              <div className="mt-4 grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 2xl:grid-cols-4">
                <select value={selectedTower} onChange={(event) => setSelectedTower(event.target.value)} className={inputClass}>{towers.map((tower) => <option key={tower} value={tower}>{tower}</option>)}</select>
                <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: 302 ou Maria" className={inputClass} />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ResidentStatus | "Todos")} className={inputClass}><option value="Todos">Todos</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                <select value={viewMode} onChange={(event) => setViewMode(event.target.value as ViewMode)} className={inputClass}><option value="single">Andar selecionado</option><option value="all">Edifício completo</option></select>
              </div>
              {viewMode === "single" && floorSummary && <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{floorSummary.total} unidades</span><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{floorSummary.ocupados} ocupados</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{floorSummary.vagos} vagos</span></div>}
            </div>
            <div className="px-4 py-5 md:px-5">
            <div className="space-y-5">
              {displayedFloors.length > 0 ? displayedFloors.map((floor) => <div key={`${floor.tower}-${floor.level}`} className="min-w-0 overflow-hidden rounded-[28px] bg-slate-100 p-3 md:p-4"><div className="mb-4"><p className="truncate text-sm font-semibold text-slate-800">{formatFloorLabel(floor.level)} - {floor.tower}</p><p className="text-xs text-slate-500">{floor.apartments.length} apartamentos neste andar</p></div><div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-3 ring-1 ring-slate-200 md:p-4"><div className="mb-4 flex items-center gap-3"><div className="h-px flex-1 bg-slate-200" /><span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Corredor do andar</span><div className="h-px flex-1 bg-slate-200" /></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{floor.apartments.map((apt) => <ApartmentCard key={apt.id} apt={apt} isSelected={selectedApt?.id === apt.id} onClick={() => setSelectedApt(apt)} />)}</div></div></div>) : <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center"><p className="text-sm font-semibold text-slate-700">Nenhum apartamento encontrado</p><p className="mt-2 text-xs text-slate-500">Tente ajustar a busca, o filtro de status ou a torre.</p></div>}
            </div>
            </div>
          </section>
        </div>
      </div>

      <MoradorModal apartment={selectedApt} onClose={() => setSelectedApt(null)} onAssign={handleAssign} onDeleteApartment={handleDeleteApartmentFromModal} />

      {isAdmin && structureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Gerenciamento do edifício</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{structureModal === "block" ? "Criar torre" : structureModal === "apartment" ? "Criar apartamento" : "Excluir torre"}</h3>
              </div>
              <button type="button" onClick={closeStructureModal} disabled={savingStructure} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><X size={18} /></button>
            </div>
            <div className="p-5">
              {structureModal === "block" && <form onSubmit={handleCreateBlock} className="grid gap-4"><label className="grid gap-2 text-sm font-medium text-slate-700"><span>Bloco</span><input value={blockForm.tower} onChange={(event) => setBlockForm((current) => ({ ...current, tower: event.target.value }))} placeholder="Ex.: Torre C" className={inputClass} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium text-slate-700"><span>Quantidade de andares</span><input type="number" min={1} value={blockForm.floors} onChange={(event) => setBlockForm((current) => ({ ...current, floors: Number(event.target.value) }))} className={inputClass} /></label><label className="grid gap-2 text-sm font-medium text-slate-700"><span>Apartamentos por andar</span><input type="number" min={1} value={blockForm.apartmentsPerFloor} onChange={(event) => setBlockForm((current) => ({ ...current, apartmentsPerFloor: Number(event.target.value) }))} className={inputClass} /></label></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">Os apartamentos serao criados automaticamente usando o padrao do bloco informado.</div><div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={closeStructureModal} disabled={savingStructure} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button><button type="submit" disabled={savingStructure} className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">{savingStructure ? "Salvando..." : "Cadastrar torre"}</button></div></form>}
              {structureModal === "apartment" && <form onSubmit={handleCreateApartment} className="grid gap-4"><label className="grid gap-2 text-sm font-medium text-slate-700"><span>Bloco</span><select value={apartmentForm.tower} onChange={(event) => setApartmentForm((current) => ({ ...current, tower: event.target.value }))} className={inputClass}>{towerOptions.map((tower) => <option key={tower} value={tower}>{tower}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium text-slate-700"><span>Andar</span><input type="number" min={1} value={apartmentForm.floor} onChange={(event) => setApartmentForm((current) => ({ ...current, floor: Number(event.target.value) }))} className={inputClass} /></label><label className="grid gap-2 text-sm font-medium text-slate-700"><span>Apartamento</span><input value={apartmentForm.number} onChange={(event) => setApartmentForm((current) => ({ ...current, number: event.target.value }))} placeholder="Ex.: 71" className={inputClass} /></label></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">{selectedTowerSummary ? `${apartmentForm.tower} possui ${selectedTowerSummary.floors} andares e ate ${selectedTowerSummary.apartmentsPerFloor} apartamentos por andar.` : "Selecione um bloco valido."}</div><div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={closeStructureModal} disabled={savingStructure} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button><button type="submit" disabled={savingStructure || towerOptions.length === 0} className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">{savingStructure ? "Salvando..." : "Cadastrar apartamento"}</button></div></form>}
              {structureModal === "deleteTower" && <div className="grid gap-4"><label className="grid gap-2 text-sm font-medium text-slate-700"><span>Bloco</span><select value={towerToDelete} onChange={(event) => setTowerToDelete(event.target.value)} className={inputClass}>{towerOptions.length === 0 ? <option value="">Nenhuma torre disponivel</option> : null}{towerOptions.map((tower) => <option key={tower} value={tower}>{tower}</option>)}</select></label><div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">Se houver moradores vinculados, o sistema bloqueia a exclusao.</div><div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={closeStructureModal} disabled={savingStructure} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button><button type="button" onClick={handleDeleteSelectedTower} disabled={savingStructure || !towerToDelete} className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100">{savingStructure ? "Excluindo..." : "Excluir torre"}</button></div></div>}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
