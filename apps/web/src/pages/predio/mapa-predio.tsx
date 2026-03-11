import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../features/layout/components/app-layout";
import {
  getMockBuilding,
  type Apartment,
  type Floor,
  type ResidentStatus,
} from "../../features/predio/services/predio";
import { ApartmentCard } from "../../features/predio/components/apartment-card";
import { MoradorModal } from "../../features/predio/components/morador-modal";

const STATUS_OPTIONS: ResidentStatus[] = [
  "Proprietário",
  "Inquilino",
  "Visitante",
  "Vago",
];

const STATUS_BADGE: Record<ResidentStatus, string> = {
  Proprietário: "bg-indigo-100 text-indigo-700",
  Inquilino: "bg-emerald-100 text-emerald-700",
  Visitante: "bg-amber-100 text-amber-700",
  Vago: "bg-gray-100 text-gray-600",
};

const FLOORS_PER_PAGE = 5;

type ViewMode = "single" | "all";

function formatFloorLabel(level: number) {
  return `${level}º andar`;
}

export default function MapaPredio() {
  const building = useMemo<Floor[]>(() => getMockBuilding(), []);
  const [selectedApt, setSelectedApt] = useState<Apartment | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedTower, setSelectedTower] = useState<string>("Todas");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResidentStatus | "Todos">("Todos");
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [miniPage, setMiniPage] = useState(0);

  const towers = useMemo(() => {
    const uniqueTowers = Array.from(new Set(building.map((floor) => floor.tower)));
    return ["Todas", ...uniqueTowers];
  }, [building]);

  const buildingByTower = useMemo(() => {
    if (selectedTower === "Todas") return building;
    return building.filter((floor) => floor.tower === selectedTower);
  }, [building, selectedTower]);

  const floors = useMemo(() => {
    return [...buildingByTower].sort((a, b) => b.level - a.level);
  }, [buildingByTower]);

  useEffect(() => {
    setMiniPage(0);
    setSelectedFloor(null);
  }, [selectedTower]);

  const totalMiniPages = Math.ceil(floors.length / FLOORS_PER_PAGE);

  const paginatedMiniFloors = useMemo(() => {
    const start = miniPage * FLOORS_PER_PAGE;
    return floors.slice(start, start + FLOORS_PER_PAGE);
  }, [floors, miniPage]);

  const currentFloor = useMemo(() => {
    if (selectedFloor !== null) {
      return floors.find((floor) => floor.level === selectedFloor) ?? floors[0];
    }
    return floors[0];
  }, [floors, selectedFloor]);

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

  const filteredFloors = useMemo(() => {
    const baseFloors = viewMode === "all" ? floors : currentFloor ? [currentFloor] : [];

    return baseFloors
      .map((floor) => {
        const apartments = floor.apartments.filter((apt) => {
          const residentStatus = apt.resident?.status ?? "Vago";
          const residentName = apt.resident?.name ?? "";
          const residentEmail = apt.resident?.email ?? "";

          const matchesStatus =
            statusFilter === "Todos" ? true : residentStatus === statusFilter;

          const term = search.trim().toLowerCase();
          const matchesSearch =
            term.length === 0 ||
            apt.number.toLowerCase().includes(term) ||
            residentName.toLowerCase().includes(term) ||
            residentEmail.toLowerCase().includes(term);

          return matchesStatus && matchesSearch;
        });

        return {
          ...floor,
          apartments,
        };
      })
      .filter((floor) => floor.apartments.length > 0 || search || statusFilter !== "Todos");
  }, [floors, currentFloor, search, statusFilter, viewMode]);

  return (
    <AppLayout title="Mapa do Prédio">
      <div className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Visualização do edifício</h2>
              <p className="mt-1 text-sm text-gray-500">
                Navegue por torre, andar e status para encontrar unidades mais rápido.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 md:flex-row xl:max-w-5xl">
              <div className="md:w-52">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Torre
                </label>
                <select
                  value={selectedTower}
                  onChange={(e) => setSelectedTower(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                >
                  {towers.map((tower) => (
                    <option key={tower} value={tower}>
                      {tower}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Buscar morador ou apartamento
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ex: 302 ou Maria"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="md:w-52">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ResidentStatus | "Todos")}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="Todos">Todos</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:w-56">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Visualização
                </label>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as ViewMode)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="single">Andar selecionado</option>
                  <option value="all">Prédio completo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-gray-500">Total</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{buildingStats.total}</p>
            </div>
            <div className="rounded-2xl bg-indigo-50 p-4">
              <p className="text-xs font-medium text-indigo-600">Proprietários</p>
              <p className="mt-1 text-2xl font-semibold text-indigo-700">{buildingStats.proprietarios}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-medium text-emerald-600">Inquilinos</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{buildingStats.inquilinos}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-medium text-amber-600">Visitantes</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700">{buildingStats.visitantes}</p>
            </div>
            <div className="rounded-2xl bg-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500">Vagos</p>
              <p className="mt-1 text-2xl font-semibold text-gray-700">{buildingStats.vagos}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Mini prédio</h3>
              <p className="mt-1 text-xs text-gray-500">
                Navegue em blocos de 5 andares por vez.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-100 p-4 shadow-inner">
              <div className="mx-auto w-full max-w-[170px] rounded-t-3xl bg-slate-300 px-4 py-3 text-center text-xs font-semibold text-slate-700">
                {selectedTower === "Todas" ? "Edifício" : selectedTower}
              </div>

              <div className="rounded-b-3xl bg-slate-200 px-3 py-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setMiniPage((prev) => Math.max(prev - 1, 0))}
                    disabled={miniPage === 0}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anteriores
                  </button>

                  <span className="text-[11px] font-semibold text-slate-600">
                    {floors.length === 0
                      ? "0 andares"
                      : `${miniPage * FLOORS_PER_PAGE + 1}-${Math.min(
                          miniPage * FLOORS_PER_PAGE + FLOORS_PER_PAGE,
                          floors.length
                        )} de ${floors.length}`}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setMiniPage((prev) => Math.min(prev + 1, totalMiniPages - 1))
                    }
                    disabled={miniPage >= totalMiniPages - 1 || totalMiniPages === 0}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Próximos
                  </button>
                </div>

                <div className="space-y-2">
                  {paginatedMiniFloors.map((floor) => {
                    const isActive = currentFloor?.level === floor.level;

                    return (
                      <button
                        key={`${floor.tower}-${floor.level}`}
                        type="button"
                        onClick={() => {
                          setSelectedFloor(floor.level);
                          setViewMode("single");
                        }}
                        className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                          isActive
                            ? "border-indigo-300 bg-white shadow-sm ring-2 ring-indigo-100"
                            : "border-slate-300 bg-slate-50 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">
                            {formatFloorLabel(floor.level)}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {floor.apartments.length} aptos
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-4 gap-1">
                          {floor.apartments.map((apt) => {
                            const status = apt.resident?.status ?? "Vago";
                            return (
                              <span
                                key={apt.id}
                                className={`h-5 rounded-md border ${
                                  status === "Proprietário"
                                    ? "border-indigo-200 bg-indigo-300"
                                    : status === "Inquilino"
                                    ? "border-emerald-200 bg-emerald-300"
                                    : status === "Visitante"
                                    ? "border-amber-200 bg-amber-300"
                                    : "border-gray-300 bg-gray-300"
                                }`}
                              />
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
                          miniPage === index ? "bg-indigo-500" : "bg-slate-400/50 hover:bg-slate-500"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Legenda</p>

              {STATUS_OPTIONS.map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${STATUS_BADGE[status]}`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </aside>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {viewMode === "all"
                    ? selectedTower === "Todas"
                      ? "Prédio completo"
                      : `${selectedTower} completa`
                    : currentFloor
                    ? `${formatFloorLabel(currentFloor.level)} • ${currentFloor.tower}`
                    : "Andar"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {viewMode === "all"
                    ? "Visualização de todos os andares filtrados."
                    : "Visualização focada em um único andar para evitar excesso de informação."}
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
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    {floorSummary.vagos} vagos
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-6">
              {filteredFloors.length > 0 ? (
                filteredFloors.map((floor) => (
                  <div
                    key={`${floor.tower}-${floor.level}`}
                    className="rounded-[32px] border border-slate-200 bg-slate-100 p-4 md:p-6"
                  >
                    <div className="mx-auto max-w-5xl rounded-[28px] bg-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 shadow-sm">
                      Fachada do {formatFloorLabel(floor.level)} • {floor.tower}
                    </div>

                    <div className="mx-auto max-w-5xl rounded-b-[32px] bg-slate-200 px-4 py-6 md:px-8">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-400/60" />
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                          Corredor do andar
                        </span>
                        <div className="h-px flex-1 bg-slate-400/60" />
                      </div>

                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Nenhum apartamento encontrado
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Tente ajustar a busca, o filtro de status ou a torre.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <MoradorModal apartment={selectedApt} onClose={() => setSelectedApt(null)} />
    </AppLayout>
  );
}