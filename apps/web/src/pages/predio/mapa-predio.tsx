import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PlusSquare } from "lucide-react";
import AppLayout from "../../features/layout/components/app-layout";
import { getUser } from "../../features/auth/services/auth";
import { ApartmentCard } from "../../features/predio/components/apartment-card";
import { MoradorModal } from "../../features/predio/components/morador-modal";
import {
  assignApartment,
  createApartment,
  createBlock,
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
const adminInputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

type ViewMode = "single" | "all";

function formatFloorLabel(level: number) {
  return `${level}º andar`;
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
    case "Vago":
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
  const [selectedTower, setSelectedTower] = useState<string>("Todas");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResidentStatus | "Todos">("Todos");
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [miniPage, setMiniPage] = useState(0);
  const [blockForm, setBlockForm] = useState<CreateBlockInput>({
    tower: "",
    floors: 8,
    apartmentsPerFloor: 4,
  });
  const [apartmentForm, setApartmentForm] = useState<CreateApartmentInput>({
    tower: "Torre A",
    floor: 1,
    number: "",
  });
  const [savingStructure, setSavingStructure] = useState(false);
  const [structureError, setStructureError] = useState("");
  const [structureSuccess, setStructureSuccess] = useState("");

  const loadBuilding = async () => {
    const data = await fetchBuilding();
    setBuilding(data);
    return data;
  };

  async function handleAssign(apartmentId: string, userId: string | null) {
    await assignApartment(apartmentId, userId);
    const refreshed = await loadBuilding();

    if (selectedApt?.id === apartmentId) {
      const updated = refreshed.flatMap((floor) => floor.apartments).find((item) => item.id === apartmentId);
      setSelectedApt(updated ?? null);
    }
  }

  useEffect(() => {
    loadBuilding();
  }, []);

  const towers = useMemo(() => {
    const uniqueTowers = Array.from(new Set(building.map((floor) => floor.tower)));
    return ["Todas", ...uniqueTowers];
  }, [building]);

  useEffect(() => {
    const availableTowers = towers.filter((tower) => tower !== "Todas");
    if (availableTowers.length === 0) return;

    setApartmentForm((current) => {
      if (current.tower && availableTowers.includes(current.tower)) return current;
      return { ...current, tower: selectedTower !== "Todas" ? selectedTower : availableTowers[0] };
    });
  }, [selectedTower, towers]);

  const buildingByTower = useMemo(() => {
    if (selectedTower === "Todas") return building;
    return building.filter((floor) => floor.tower === selectedTower);
  }, [building, selectedTower]);

  const floors = useMemo(() => {
    return [...buildingByTower].sort((a, b) => {
      if (a.level === b.level) return a.tower.localeCompare(b.tower);
      return b.level - a.level;
    });
  }, [buildingByTower]);

  useEffect(() => {
    setMiniPage(0);
    setSelectedApt(null);

    if (floors.length > 0) {
      const firstFloor = floors[0];
      setSelectedFloor({ level: firstFloor.level, tower: firstFloor.tower });
      setViewMode("single");
    } else {
      setSelectedFloor(null);
    }
  }, [selectedTower, floors]);

  const totalMiniPages = Math.ceil(floors.length / FLOORS_PER_PAGE);

  const paginatedMiniFloors = useMemo(() => {
    const start = miniPage * FLOORS_PER_PAGE;
    return floors.slice(start, start + FLOORS_PER_PAGE);
  }, [floors, miniPage]);

  const currentMiniIndex = useMemo(() => {
    if (!selectedFloor) return 0;
    const index = floors.findIndex(
      (floor) => floor.level === selectedFloor.level && floor.tower === selectedFloor.tower,
    );
    return index >= 0 ? index : 0;
  }, [floors, selectedFloor]);

  const currentFloor = floors[currentMiniIndex] ?? floors[0];

  const buildingStats = useMemo(() => {
    const allApartments = floors.flatMap((floor) => floor.apartments);

    return {
      total: allApartments.length,
      proprietarios: allApartments.filter((apt) => apt.resident?.status === "Proprietário").length,
      inquilinos: allApartments.filter((apt) => apt.resident?.status === "Inquilino").length,
      visitantes: allApartments.filter((apt) => apt.resident?.status === "Visitante").length,
      vagos: allApartments.filter((apt) => !apt.resident || apt.resident.status === "Vago").length,
    };
  }, [floors]);

  const floorSummary = useMemo(() => {
    if (!currentFloor) return null;

    const apartments = currentFloor.apartments;
    return {
      total: apartments.length,
      ocupados: apartments.filter((apt) => apt.resident && apt.resident.status !== "Vago").length,
      vagos: apartments.filter((apt) => !apt.resident || apt.resident.status === "Vago").length,
    };
  }, [currentFloor]);

  const hasPrevFloor = currentMiniIndex > 0;
  const hasNextFloor = currentMiniIndex >= 0 && currentMiniIndex < floors.length - 1;

  const filteredFloors = useMemo(() => {
    const baseFloors = viewMode === "all" ? floors : currentFloor ? [currentFloor] : [];

    return baseFloors
      .map((floor) => {
        const apartments = floor.apartments.filter((apt) => {
          const residentStatus = apt.resident?.status ?? "Vago";
          const residentName = apt.resident?.name ?? "";
          const residentEmail = apt.resident?.email ?? "";
          const matchesStatus = statusFilter === "Todos" ? true : residentStatus === statusFilter;

          const term = search.trim().toLowerCase();
          const matchesSearch =
            term.length === 0 ||
            apt.number.toLowerCase().includes(term) ||
            residentName.toLowerCase().includes(term) ||
            residentEmail.toLowerCase().includes(term);

          return matchesStatus && matchesSearch;
        });

        return { ...floor, apartments };
      })
      .filter((floor) => floor.apartments.length > 0 || search || statusFilter !== "Todos");
  }, [floors, currentFloor, search, statusFilter, viewMode]);

  useEffect(() => {
    if (currentMiniIndex >= 0) {
      setMiniPage(Math.floor(currentMiniIndex / FLOORS_PER_PAGE));
    }
  }, [currentMiniIndex]);

  function goToPrevFloor() {
    if (!hasPrevFloor) return;
    const newIndex = Math.max(0, currentMiniIndex - 1);
    const nextFloor = floors[newIndex];
    setSelectedFloor({ level: nextFloor.level, tower: nextFloor.tower });
    setSelectedApt(null);
    setViewMode("single");
    setMiniPage(Math.floor(newIndex / FLOORS_PER_PAGE));
  }

  function goToNextFloor() {
    if (!hasNextFloor) return;
    const newIndex = Math.min(floors.length - 1, currentMiniIndex + 1);
    const nextFloor = floors[newIndex];
    setSelectedFloor({ level: nextFloor.level, tower: nextFloor.tower });
    setSelectedApt(null);
    setViewMode("single");
    setMiniPage(Math.floor(newIndex / FLOORS_PER_PAGE));
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
      setStructureSuccess("Apartamento cadastrado com sucesso.");
    } catch (error) {
      setStructureError(error instanceof Error ? error.message : "Erro ao cadastrar apartamento.");
    } finally {
      setSavingStructure(false);
    }
  }

  return (
    <AppLayout title="Mapa do Prédio">
      <div className="space-y-5">
        {isAdmin && (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-md">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                  <PlusSquare size={13} />
                  Estrutura do condomínio
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-900">Cadastrar novos blocos e apartamentos</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Adicione novas torres com geração automática de unidades ou crie apartamentos avulsos em blocos já existentes.
                </p>
              </div>

              <div className="grid w-full gap-4 xl:max-w-4xl xl:grid-cols-2">
                <form onSubmit={handleCreateBlock} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Novo bloco</h3>
                  <p className="mt-1 text-xs text-slate-500">Cria a torre e monta os apartamentos de todos os andares.</p>

                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nome do bloco</span>
                      <input
                        value={blockForm.tower}
                        onChange={(event) => setBlockForm((current) => ({ ...current, tower: event.target.value }))}
                        placeholder="Ex.: Torre C"
                        className={adminInputClass}
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Quantidade de andares</span>
                        <input
                          type="number"
                          min={1}
                          value={blockForm.floors}
                          onChange={(event) => setBlockForm((current) => ({ ...current, floors: Number(event.target.value) }))}
                          className={adminInputClass}
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Aptos por andar</span>
                        <input
                          type="number"
                          min={1}
                          value={blockForm.apartmentsPerFloor}
                          onChange={(event) =>
                            setBlockForm((current) => ({ ...current, apartmentsPerFloor: Number(event.target.value) }))
                          }
                          className={adminInputClass}
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={savingStructure}
                      className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingStructure ? "Salvando..." : "Cadastrar bloco"}
                    </button>
                  </div>
                </form>

                <form onSubmit={handleCreateApartment} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Novo apartamento</h3>
                  <p className="mt-1 text-xs text-slate-500">Inclui uma unidade nova em um bloco já cadastrado.</p>

                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bloco</span>
                      <select
                        value={apartmentForm.tower}
                        onChange={(event) => setApartmentForm((current) => ({ ...current, tower: event.target.value }))}
                        className={adminInputClass}
                      >
                        {towers.filter((tower) => tower !== "Todas").map((tower) => (
                          <option key={tower} value={tower}>
                            {tower}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Andar</span>
                        <input
                          type="number"
                          min={1}
                          value={apartmentForm.floor}
                          onChange={(event) => setApartmentForm((current) => ({ ...current, floor: Number(event.target.value) }))}
                          className={adminInputClass}
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Número do apartamento</span>
                        <input
                          value={apartmentForm.number}
                          onChange={(event) => setApartmentForm((current) => ({ ...current, number: event.target.value }))}
                          placeholder="Ex.: 305"
                          className={adminInputClass}
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={savingStructure || towers.length <= 1}
                      className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingStructure ? "Salvando..." : "Cadastrar apartamento"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {(structureError || structureSuccess) && (
              <div className="mt-4 space-y-2">
                {structureError ? (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {structureError}
                  </p>
                ) : null}
                {structureSuccess ? (
                  <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {structureSuccess}
                  </p>
                ) : null}
              </div>
            )}
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-md">
              <h2 className="text-lg font-semibold text-slate-900">Visualização do edifício</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Encontre apartamentos por torre, andar, status ou nome do morador.
              </p>
            </div>

            <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-[160px_minmax(260px,1fr)_160px_180px] xl:max-w-5xl">
              <div className="min-w-0">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Torre
                </label>
                <select
                  value={selectedTower}
                  onChange={(event) => setSelectedTower(event.target.value)}
                  className={adminInputClass}
                >
                  {towers.map((tower) => (
                    <option key={tower} value={tower}>
                      {tower}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Buscar
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Ex.: 302 ou Maria"
                  className={adminInputClass}
                />
              </div>

              <div className="min-w-0">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as ResidentStatus | "Todos")}
                  className={adminInputClass}
                >
                  <option value="Todos">Todos</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Visualização
                </label>
                <select
                  value={viewMode}
                  onChange={(event) => setViewMode(event.target.value as ViewMode)}
                  className={adminInputClass}
                >
                  <option value="single">Andar selecionado</option>
                  <option value="all">Prédio completo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2.5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <h3 className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">Legenda</h3>
                {STATUS_OPTIONS.map((status) => (
                  <div key={status} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor(status)}`} />
                    <span>{status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-[11px] font-medium text-slate-500">Total</p>
                <p className="mt-0.5 text-xl font-semibold text-slate-900">{buildingStats.total}</p>
              </div>

              <div className="rounded-xl bg-indigo-50 px-3 py-2.5">
                <p className="text-[11px] font-medium text-indigo-600">Proprietários</p>
                <p className="mt-0.5 text-xl font-semibold text-indigo-700">{buildingStats.proprietarios}</p>
              </div>

              <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
                <p className="text-[11px] font-medium text-emerald-600">Inquilinos</p>
                <p className="mt-0.5 text-xl font-semibold text-emerald-700">{buildingStats.inquilinos}</p>
              </div>

              <div className="rounded-xl bg-amber-50 px-3 py-2.5">
                <p className="text-[11px] font-medium text-amber-600">Visitantes</p>
                <p className="mt-0.5 text-xl font-semibold text-amber-700">{buildingStats.visitantes}</p>
              </div>

              <div className="rounded-xl bg-slate-100 px-3 py-2.5">
                <p className="text-[11px] font-medium text-slate-500">Vagos</p>
                <p className="mt-0.5 text-xl font-semibold text-slate-700">{buildingStats.vagos}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Mini prédio</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">Navegue em blocos de 5 andares.</p>
              </div>

              <div className="overflow-hidden rounded-[24px] bg-slate-100 p-3">
                <div className="mx-auto mb-3 w-full max-w-[150px] rounded-t-3xl bg-slate-300 px-4 py-2 text-center text-xs font-semibold text-slate-700">
                  {selectedTower === "Todas" ? "Edifício" : getShortTowerName(selectedTower)}
                </div>

                <div className="overflow-hidden rounded-[22px] bg-slate-50 p-3">
                  <div className="mb-3 flex flex-nowrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={goToPrevFloor}
                      disabled={!hasPrevFloor}
                      aria-label="Andar anterior"
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <span className="flex-1 whitespace-nowrap text-center text-[11px] font-semibold text-slate-500">
                      {floors.length === 0 ? "0 andares" : `${currentMiniIndex + 1} de ${floors.length}`}
                    </span>

                    <button
                      type="button"
                      onClick={goToNextFloor}
                      disabled={!hasNextFloor}
                      aria-label="Próximo andar"
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {paginatedMiniFloors.map((floor) => {
                      const isActive = currentFloor?.level === floor.level && currentFloor?.tower === floor.tower;

                      return (
                        <button
                          key={`${floor.tower}-${floor.level}`}
                          type="button"
                          onClick={() => {
                            setSelectedFloor({ level: floor.level, tower: floor.tower });
                            setViewMode("single");
                          }}
                          className={`w-full rounded-2xl px-3 py-2 text-left transition ${
                            isActive ? "bg-indigo-50 ring-1 ring-indigo-200" : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-semibold text-slate-700">
                              {formatFloorLabel(floor.level)}
                              {selectedTower === "Todas" ? ` • ${getShortTowerName(floor.tower)}` : ""}
                            </span>
                            <span className="shrink-0 text-[11px] text-slate-500">{floor.apartments.length} aptos</span>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5">
                            {floor.apartments.map((apt) => {
                              const status = apt.resident?.status ?? "Vago";

                              return (
                                <span
                                  key={apt.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedFloor({ level: floor.level, tower: floor.tower });
                                    setSelectedApt(apt);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key !== "Enter" && event.key !== " ") return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setSelectedFloor({ level: floor.level, tower: floor.tower });
                                    setSelectedApt(apt);
                                  }}
                                  title={`Apto ${apt.number}`}
                                  className={`flex h-7 cursor-pointer items-center justify-center rounded-full text-[10px] font-semibold text-white transition hover:scale-[1.03] ${getStatusColor(status)}`}
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

                  {totalMiniPages > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {Array.from({ length: totalMiniPages }).map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setMiniPage(index)}
                          className={`h-2.5 w-2.5 rounded-full transition ${
                            miniPage === index ? "bg-indigo-500" : "bg-slate-300 hover:bg-slate-400"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-semibold text-slate-900">
                  {viewMode === "all"
                    ? selectedTower === "Todas"
                      ? "Prédio completo"
                      : `${selectedTower} completa`
                    : currentFloor
                      ? `${formatFloorLabel(currentFloor.level)} • ${currentFloor.tower}`
                      : "Andar"}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {viewMode === "all"
                    ? "Visualização de todos os andares com os filtros aplicados."
                    : "Visualização focada em um único andar para facilitar a leitura."}
                </p>
              </div>

              {viewMode === "single" && floorSummary && (
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {floorSummary.total} unidades
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {floorSummary.ocupados} ocupados
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {floorSummary.vagos} vagos
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-5">
              {filteredFloors.length > 0 ? (
                filteredFloors.map((floor) => (
                  <div key={`${floor.tower}-${floor.level}`} className="min-w-0 overflow-hidden rounded-[28px] bg-slate-100 p-3 md:p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {formatFloorLabel(floor.level)} • {floor.tower}
                        </p>
                        <p className="text-xs text-slate-500">{floor.apartments.length} apartamentos neste andar</p>
                      </div>
                    </div>

                    <div className="min-w-0 overflow-hidden rounded-[24px] bg-white p-3 ring-1 ring-slate-200 md:p-4">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Corredor do andar
                        </span>
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
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-700">Nenhum apartamento encontrado</p>
                  <p className="mt-2 text-xs text-slate-500">Tente ajustar a busca, o filtro de status ou a torre.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <MoradorModal apartment={selectedApt} onClose={() => setSelectedApt(null)} onAssign={handleAssign} />
    </AppLayout>
  );
}
