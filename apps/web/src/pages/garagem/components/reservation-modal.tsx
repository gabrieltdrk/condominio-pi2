import { CalendarClock } from "lucide-react";
import type { GarageState, TemporaryReservation } from "../../../features/garage/types";
import type { BuildingApartmentOption } from "../../../features/predio/services/predio";
import { apartmentLabel } from "../utils/garage-validation";
import { GarageModal } from "./garage-modal";
import { inputClass, plateInputPattern, plateInputTitle } from "../utils/garage-ui";

type Props = {
  reservationForm: TemporaryReservation;
  setReservationForm: React.Dispatch<React.SetStateAction<TemporaryReservation>>;
  apartmentOptions: BuildingApartmentOption[];
  spots: GarageState["spots"];
  onReservationApartment: (id: string) => void;
  onLinkSpot: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
};

export function ReservationModal({
  reservationForm, setReservationForm, apartmentOptions, spots,
  onReservationApartment, onLinkSpot, onCreate, onClose,
}: Props) {
  return (
    <GarageModal title="Nova reserva" icon={<CalendarClock size={16} />} onClose={onClose}>
      <div className="space-y-3">
        <input
          value={reservationForm.visitorName}
          onChange={(e) => setReservationForm((cur) => ({ ...cur, visitorName: e.target.value }))}
          placeholder="Visitante ou servico"
          className={inputClass}
        />
        <input
          value={reservationForm.plate}
          onChange={(e) => setReservationForm((cur) => ({ ...cur, plate: e.target.value.toUpperCase() }))}
          placeholder="Placa"
          className={inputClass}
          pattern={plateInputPattern}
          title={plateInputTitle}
        />
        <select value={reservationForm.apartmentId ?? ""} onChange={(e) => onReservationApartment(e.target.value)} className={inputClass}>
          <option value="">Vincular apartamento</option>
          {apartmentOptions.map((apt) => (
            <option key={apt.id} value={apt.id}>
              {apartmentLabel(apt)}
            </option>
          ))}
        </select>
        <select value={reservationForm.spotId ?? ""} onChange={(e) => onLinkSpot(e.target.value)} className={inputClass}>
          <option value="">Reservar vaga especifica (opcional)</option>
          {spots
            .filter((spot) => spot.type === "VISITANTE" || spot.type === "ROTATIVA" || spot.type === "TEMPORARIA")
            .map((spot) => (
              <option key={spot.id} value={spot.id}>
                {spot.code} - {spot.tower} ({spot.status})
              </option>
            ))}
        </select>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="datetime-local"
            value={reservationForm.startAt}
            onChange={(e) => setReservationForm((cur) => ({ ...cur, startAt: e.target.value }))}
            className={inputClass}
          />
          <input
            type="datetime-local"
            value={reservationForm.endAt}
            onChange={(e) => setReservationForm((cur) => ({ ...cur, endAt: e.target.value }))}
            className={inputClass}
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={reservationForm.requiresApproval}
            onChange={(e) => setReservationForm((cur) => ({ ...cur, requiresApproval: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          />
          Exigir aprovacao da portaria
        </label>
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
            onClick={onCreate}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Salvar reserva
          </button>
        </div>
      </div>
    </GarageModal>
  );
}
