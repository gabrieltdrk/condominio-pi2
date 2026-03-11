import { useMemo, useState } from "react";
import AppLayout from "../../features/layout/components/app-layout";
import { getMockBuilding, type Apartment, type Floor } from "../../features/predio/services/predio";
import { ApartmentCard } from "../../features/predio/components/apartment-card";
import { MoradorModal } from "../../features/predio/components/morador-modal";

function formatFloorLabel(level: number) {
  return `Andar ${level}`;
}

export default function MapaPredio() {
  const building = useMemo<Floor[]>(() => getMockBuilding(), []);
  const [selectedApt, setSelectedApt] = useState<Apartment | null>(null);

  const floors = useMemo(() => {
    return [...building].sort((a, b) => b.level - a.level);
  }, [building]);

  return (
    <AppLayout title="Mapa do Prédio">
      <div className="grid gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Visão geral</h2>
            <p className="mt-2 text-xs text-gray-500">
              Clique em um apartamento para ver os dados do morador. Esta tela usa dados mockados enquanto
              o backend não estiver pronto.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-xs text-gray-500">Proprietário</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-500">Inquilino</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-500">Visitante</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                <span className="text-xs text-gray-500">Vago</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Legenda</h2>
            <p className="mt-2 text-xs text-gray-500">A cada andar há 4 apartamentos. As cores indicam o status do morador.</p>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">Proprietário</p>
                  <p className="text-[11px] text-gray-400">Morador titular do apartamento</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">Inquilino</p>
                  <p className="text-[11px] text-gray-400">Apartamento alugado</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">Visitante</p>
                  <p className="text-[11px] text-gray-400">Temporário / hóspede</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-gray-300" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">Vago</p>
                  <p className="text-[11px] text-gray-400">Sem morador cadastrado</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {floors.map((floor) => (
            <div key={floor.level} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{formatFloorLabel(floor.level)}</h3>
                  <p className="text-xs text-gray-400">{floor.apartments.length} apartamentos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {floor.apartments.map((apt) => (
                  <ApartmentCard
                    key={apt.id}
                    apt={apt}
                    onClick={() => setSelectedApt(apt)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <MoradorModal apartment={selectedApt} onClose={() => setSelectedApt(null)} />
    </AppLayout>
  );
}
