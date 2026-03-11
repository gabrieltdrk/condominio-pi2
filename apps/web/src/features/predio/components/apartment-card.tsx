import type { Apartment, ResidentStatus } from "../services/predio";

const STATUS_STYLES: Record<
  ResidentStatus,
  {
    accent: string;
    badge: string;
    window: string;
  }
> = {
  Proprietário: {
    accent: "border-indigo-200 bg-indigo-50",
    badge: "bg-indigo-100 text-indigo-700",
    window: "bg-indigo-300/70",
  },
  Inquilino: {
    accent: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    window: "bg-emerald-300/70",
  },
  Visitante: {
    accent: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    window: "bg-amber-300/70",
  },
  Vago: {
    accent: "border-slate-200 bg-slate-50",
    badge: "bg-slate-100 text-slate-600",
    window: "bg-slate-300/70",
  },
};

export function ApartmentCard({
  apt,
  onClick,
  isSelected = false,
}: {
  apt: Apartment;
  onClick: () => void;
  isSelected?: boolean;
}) {
  const status = apt.resident?.status ?? "Vago";
  const name = apt.resident?.name ?? "Disponível";
  const styles = STATUS_STYLES[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group min-w-0 overflow-hidden rounded-[24px] border p-2.5 text-left transition-all duration-200 ${
        isSelected
          ? "border-indigo-300 bg-white shadow-md ring-2 ring-indigo-100"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-sm"
      }`}
    >
      <div
        className={`min-w-0 overflow-hidden rounded-[20px] border px-3 py-3 ${styles.accent}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Apto
            </p>
            <p className="text-lg font-bold leading-none text-slate-900">{apt.number}</p>
          </div>

          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${styles.badge}`}
          >
            {status}
          </span>
        </div>

        <div className="my-4 grid grid-cols-2 gap-2">
          <div className={`h-10 rounded-xl ${styles.window}`} />
          <div className={`h-10 rounded-xl ${styles.window}`} />
          <div className={`h-10 rounded-xl ${styles.window}`} />
          <div className={`h-10 rounded-xl ${styles.window}`} />
        </div>

        <div className="min-w-0 rounded-2xl bg-white/80 px-3 py-2">
          <p className="max-w-full truncate text-sm font-semibold text-slate-800">{name}</p>
          <p className="mt-0.5 max-w-full truncate text-xs text-slate-500">
            {apt.resident ? "Clique para ver detalhes" : "Sem morador cadastrado"}
          </p>
        </div>
      </div>
    </button>
  );
}