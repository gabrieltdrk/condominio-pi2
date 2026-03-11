import type { Apartment, ResidentStatus } from "../services/predio";

const STATUS_STYLES: Record<ResidentStatus, string> = {
  Proprietário: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Inquilino: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Vago: "bg-gray-50 text-gray-500 border-gray-200",
  Visitante: "bg-amber-50 text-amber-700 border-amber-200",
};

export function ApartmentCard({
  apt,
  onClick,
}: {
  apt: Apartment;
  onClick: () => void;
}) {
  const status = apt.resident?.status ?? "Vago";
  const name = apt.resident?.name ?? "Vago";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 p-3 rounded-2xl border shadow-sm bg-white hover:shadow-md hover:-translate-y-0.5 transition-transform duration-150 text-left"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">Apto {apt.number}</span>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${STATUS_STYLES[status]}`}>
          {status}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
      {apt.resident && (
        <p className="text-xs text-gray-400 truncate">{apt.resident.email}</p>
      )}
    </button>
  );
}
