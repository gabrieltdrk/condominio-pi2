import type { Apartment, ResidentStatus } from "../services/predio";

const STATUS_STYLES: Record<
  ResidentStatus,
  {
    frame: string;
    glow: string;
    tag: string;
  }
> = {
  Proprietário: {
    frame: "border-indigo-300 bg-indigo-100/80",
    glow: "bg-indigo-300/70",
    tag: "text-indigo-700",
  },
  Inquilino: {
    frame: "border-emerald-300 bg-emerald-100/80",
    glow: "bg-emerald-300/70",
    tag: "text-emerald-700",
  },
  Visitante: {
    frame: "border-amber-300 bg-amber-100/80",
    glow: "bg-amber-300/70",
    tag: "text-amber-700",
  },
  Vago: {
    frame: "border-gray-300 bg-gray-100/80",
    glow: "bg-gray-300/70",
    tag: "text-gray-600",
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
  const name = apt.resident?.name ?? "Apartamento disponível";
  const styles = STATUS_STYLES[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative rounded-[28px] border-2 p-3 text-left transition-all duration-200 ${
        isSelected
          ? "scale-[1.02] border-slate-700 bg-white shadow-lg"
          : "border-slate-300 bg-white shadow-sm hover:-translate-y-1 hover:shadow-md"
      }`}
    >
      <div className="rounded-[22px] border border-slate-300 bg-slate-300 p-2">
        <div
          className={`relative overflow-hidden rounded-[18px] border px-3 pb-3 pt-2 ${styles.frame}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
              Apto {apt.number}
            </span>
            <span className={`text-[11px] font-semibold ${styles.tag}`}>{status}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className={`h-12 rounded-xl border border-white/70 ${styles.glow} shadow-inner`} />
            <div className={`h-12 rounded-xl border border-white/70 ${styles.glow} shadow-inner`} />
            <div className={`h-12 rounded-xl border border-white/70 ${styles.glow} shadow-inner`} />
            <div className={`h-12 rounded-xl border border-white/70 ${styles.glow} shadow-inner`} />
          </div>

          <div className="mt-3 rounded-2xl bg-white/70 px-3 py-2">
            <p className="truncate text-xs font-semibold text-slate-800">{name}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {apt.resident?.email ?? "Sem morador cadastrado"}
            </p>
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </div>
      </div>
    </button>
  );
}