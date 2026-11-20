import { ShieldCheck } from "lucide-react";
import type { GarageSpot, GarageSpotStatus, GarageSpotType } from "../../../features/garage/types";
import type { BuildingApartmentOption } from "../../../features/predio/services/predio";
import { apartmentLabel, labelToApartment } from "../utils/garage-validation";
import { GarageModal } from "./garage-modal";
import { inputClass, plateInputPattern, plateInputTitle } from "../utils/garage-ui";

type Props = {
  spotForm: GarageSpot;
  setSpotForm: React.Dispatch<React.SetStateAction<GarageSpot>>;
  apartmentOptions: BuildingApartmentOption[];
  selectedSpotId: string;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function SpotEditModal({ spotForm, setSpotForm, apartmentOptions, selectedSpotId, onSave, onDelete, onClose }: Props) {
  return (
    <GarageModal title={selectedSpotId ? "Editar vaga" : "Nova vaga"} icon={<ShieldCheck size={16} />} onClose={onClose}>
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={spotForm.code}
            onChange={(e) => setSpotForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
            placeholder="Codigo da vaga"
            className={inputClass}
          />
          <input
            value={spotForm.tower}
            onChange={(e) => setSpotForm((c) => ({ ...c, tower: e.target.value }))}
            placeholder="Bloco / torre"
            className={inputClass}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={spotForm.level}
            onChange={(e) => setSpotForm((c) => ({ ...c, level: e.target.value }))}
            placeholder="Setor / subsolo"
            className={inputClass}
          />
          <select
            value={spotForm.type}
            onChange={(e) => setSpotForm((c) => ({ ...c, type: e.target.value as GarageSpotType }))}
            className={inputClass}
          >
            <option value="FIXA">Fixa</option>
            <option value="ROTATIVA">Rotativa</option>
            <option value="VISITANTE">Visitante</option>
            <option value="PCD">PCD</option>
            <option value="CARGA">Carga/descarga</option>
            <option value="TEMPORARIA">Temporaria</option>
          </select>
        </div>
        <select
          value={spotForm.status}
          onChange={(e) => setSpotForm((c) => ({ ...c, status: e.target.value as GarageSpotStatus }))}
          className={inputClass}
        >
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
          <input
            value={spotForm.residentName ?? ""}
            onChange={(e) => setSpotForm((c) => ({ ...c, residentName: e.target.value }))}
            placeholder="Morador responsavel"
            className={inputClass}
          />
          <input
            value={spotForm.vehiclePlate ?? ""}
            onChange={(e) => setSpotForm((c) => ({ ...c, vehiclePlate: e.target.value.toUpperCase() }))}
            placeholder="Placa"
            className={inputClass}
            pattern={plateInputPattern}
            title={plateInputTitle}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={spotForm.vehicleModel ?? ""}
            onChange={(e) => setSpotForm((c) => ({ ...c, vehicleModel: e.target.value }))}
            placeholder="Modelo do veiculo"
            className={inputClass}
          />
          <input
            value={spotForm.vehicleColor ?? ""}
            onChange={(e) => setSpotForm((c) => ({ ...c, vehicleColor: e.target.value }))}
            placeholder="Cor"
            className={inputClass}
          />
        </div>
        <textarea
          value={spotForm.notes ?? ""}
          onChange={(e) => setSpotForm((c) => ({ ...c, notes: e.target.value }))}
          rows={4}
          placeholder="Observacoes da vaga"
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!selectedSpotId}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
      </div>
    </GarageModal>
  );
}
