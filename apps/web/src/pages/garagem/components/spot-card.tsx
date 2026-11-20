import { BadgeInfo, CarFront } from "lucide-react";
import type { GarageSpot, GarageSpotStatus } from "../../../features/garage/types";

export type SpotTone = { shell: string; badge: string; car: string; line: string };

export function mapSpotTone(status: GarageSpotStatus): SpotTone {
  return {
    DISPONIVEL: {
      shell: "border-emerald-200 bg-emerald-50/90 text-emerald-900",
      badge: "bg-emerald-600 text-white",
      car: "bg-emerald-200 text-emerald-700",
      line: "border-emerald-300",
    },
    OCUPADA: {
      shell: "border-sky-200 bg-sky-50/90 text-sky-950",
      badge: "bg-sky-700 text-white",
      car: "bg-sky-200 text-sky-700",
      line: "border-sky-300",
    },
    RESERVADA: {
      shell: "border-amber-200 bg-amber-50/90 text-amber-950",
      badge: "bg-amber-500 text-white",
      car: "bg-amber-200 text-amber-700",
      line: "border-amber-300",
    },
    BLOQUEADA: {
      shell: "border-rose-200 bg-rose-50/90 text-rose-950",
      badge: "bg-rose-600 text-white",
      car: "bg-rose-200 text-rose-700",
      line: "border-rose-300",
    },
    MANUTENCAO: {
      shell: "border-rose-200 bg-rose-50/90 text-rose-950",
      badge: "bg-rose-600 text-white",
      car: "bg-rose-200 text-rose-700",
      line: "border-rose-300",
    },
  }[status];
}

export function SpotCard({ spot, tone, align = "left" }: { spot: GarageSpot; tone: SpotTone; align?: "left" | "right" }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-black tracking-[-0.03em]">{spot.code}</p>
          <p className="mt-1 text-[11px] text-slate-600">
            {spot.type} · {spot.tower}
          </p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone.badge}`}>{spot.status}</span>
      </div>

      <div className={`mt-4 rounded-[20px] border-2 border-dashed ${tone.line} bg-white/70 p-3`}>
        <div className={`flex h-11 w-16 items-center justify-center rounded-2xl ${tone.car} ${align === "right" ? "ml-auto" : ""}`}>
          <CarFront size={20} />
        </div>
        <p className="mt-3 truncate text-sm font-semibold text-slate-800">{spot.vehicleModel || "Sem veiculo"}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{spot.vehiclePlate || "Placa nao cadastrada"}</p>
        <p className="mt-2 truncate text-[11px] text-slate-500">{spot.apartmentLabel || "Sem unidade vinculada"}</p>
        {spot.notes && (
          <p className="mt-2 text-[11px] text-slate-500">
            <BadgeInfo size={12} className="inline mr-1" />
            {spot.notes}
          </p>
        )}
      </div>
    </>
  );
}

export function CompactSpotCard({ spot, tone, direction }: { spot: GarageSpot; tone: SpotTone; direction: "up" | "down" }) {
  return (
    <div className="flex h-full flex-col justify-between gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 truncate text-xs font-black tracking-[-0.02em]">{spot.code}</p>
          <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">{spot.apartmentLabel || "Sem unidade"}</p>
        </div>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${tone.badge}`}>{spot.status}</span>
      </div>
      <div className={`mx-auto flex h-10 w-16 items-center justify-center rounded-xl ${tone.car}`}>
        <CarFront size={20} className={direction === "up" ? "rotate-180" : ""} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-800">{spot.vehicleModel || "Sem veiculo"}</p>
        <p className="truncate text-[10px] text-slate-500">{spot.vehiclePlate || "Placa nao cadastrada"}</p>
      </div>
    </div>
  );
}
