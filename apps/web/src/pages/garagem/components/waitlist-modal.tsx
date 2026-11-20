import { Users } from "lucide-react";
import type { WaitingListEntry } from "../../../features/garage/types";
import type { BuildingApartmentOption } from "../../../features/predio/services/predio";
import { apartmentLabel } from "../utils/garage-validation";
import { GarageModal } from "./garage-modal";
import { inputClass, plateInputPattern, plateInputTitle } from "../utils/garage-ui";

type Props = {
  waitForm: WaitingListEntry;
  setWaitForm: React.Dispatch<React.SetStateAction<WaitingListEntry>>;
  apartmentOptions: BuildingApartmentOption[];
  onWaitApartment: (id: string) => void;
  onAdd: () => void;
  onClose: () => void;
};

export function WaitlistModal({ waitForm, setWaitForm, apartmentOptions, onWaitApartment, onAdd, onClose }: Props) {
  return (
    <GarageModal title="Nova solicitacao" icon={<Users size={16} />} onClose={onClose}>
      <div className="space-y-3">
        <select value={waitForm.apartmentId ?? ""} onChange={(e) => onWaitApartment(e.target.value)} className={inputClass}>
          <option value="">Selecione o apartamento (opcional)</option>
          {apartmentOptions.map((apt) => (
            <option key={apt.id} value={apt.id}>
              {apartmentLabel(apt)}
            </option>
          ))}
        </select>
        <input
          value={waitForm.residentName}
          onChange={(e) => setWaitForm((cur) => ({ ...cur, residentName: e.target.value }))}
          placeholder="Nome do morador"
          className={inputClass}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={waitForm.vehiclePlate}
            onChange={(e) => setWaitForm((cur) => ({ ...cur, vehiclePlate: e.target.value.toUpperCase() }))}
            placeholder="Placa"
            className={inputClass}
            pattern={plateInputPattern}
            title={plateInputTitle}
          />
          <input
            value={waitForm.vehicleModel}
            onChange={(e) => setWaitForm((cur) => ({ ...cur, vehicleModel: e.target.value }))}
            placeholder="Modelo (opcional)"
            className={inputClass}
          />
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
            <input
              type="number"
              min={0}
              max={5}
              value={waitForm.priority}
              onChange={(e) => setWaitForm((cur) => ({ ...cur, priority: Number(e.target.value) || 1 }))}
              className={`${inputClass} mt-2`}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Adicionar a fila
          </button>
        </div>
      </div>
    </GarageModal>
  );
}
