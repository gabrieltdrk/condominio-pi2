import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CarFront, CheckCircle2, ParkingSquare, ShieldCheck, Sparkles } from "lucide-react";
import AppLayout from "../features/layout/components/app-layout";
import { listBuildingApartmentOptions, type BuildingApartmentOption } from "../features/predio/services/predio";

type SpotType = "MORADOR" | "VISITANTE" | "SERVICO";
type SpotStatus = "LIVRE" | "OCUPADA" | "RESERVADA" | "MANUTENCAO";

type GarageSpot = {
  id: string;
  code: string;
  zone: string;
  type: SpotType;
  status: SpotStatus;
  apartmentId: string | null;
  apartmentLabel: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleColor: string;
  residentName: string;
  notes: string;
};

const STORAGE_KEY = "garage:spots";
const inputClass = "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

const emptyForm: GarageSpot = {
  id: "",
  code: "",
  zone: "Subsolo A",
  type: "MORADOR",
  status: "LIVRE",
  apartmentId: null,
  apartmentLabel: "",
  vehiclePlate: "",
  vehicleModel: "",
  vehicleColor: "",
  residentName: "",
  notes: "",
};

function apartmentLabel(apartment: BuildingApartmentOption) {
  return `${apartment.tower} · Andar ${apartment.level} · Ap ${apartment.number}`;
}

function createSeedSpots(apartments: BuildingApartmentOption[]): GarageSpot[] {
  return Array.from({ length: 12 }, (_, index) => {
    const apartment = apartments[index];
    const occupied = index < Math.min(6, apartments.length);
    return {
      id: `garage-${index + 1}`,
      code: `G-${String(index + 1).padStart(2, "0")}`,
      zone: index < 6 ? "Subsolo A" : "Subsolo B",
      type: index === 10 ? "VISITANTE" : index === 11 ? "SERVICO" : "MORADOR",
      status: index === 9 ? "MANUTENCAO" : index === 10 ? "RESERVADA" : occupied ? "OCUPADA" : "LIVRE",
      apartmentId: occupied && apartment ? apartment.id : null,
      apartmentLabel: occupied && apartment ? apartmentLabel(apartment) : "",
      vehiclePlate: occupied ? `ABC${index + 1}2${index}` : "",
      vehicleModel: occupied ? ["Civic", "Compass", "Corolla", "Onix", "T-Cross", "HB20"][index % 6] : "",
      vehicleColor: occupied ? ["Preto", "Branco", "Prata", "Cinza"][index % 4] : "",
      residentName: occupied ? `Morador ${index + 1}` : index === 10 ? "Visitante liberado" : "",
      notes: index === 9 ? "Vaga isolada para pintura." : index === 10 ? "Reserva valida ate 22h." : "",
    };
  });
}

function readLocalSpots() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GarageSpot[];
  } catch {
    return null;
  }
}

function saveLocalSpots(spots: GarageSpot[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
}

const statusTone: Record<SpotStatus, string> = {
  LIVRE: "border-emerald-100 bg-emerald-50 text-emerald-700",
  OCUPADA: "border-indigo-100 bg-indigo-50 text-indigo-700",
  RESERVADA: "border-amber-100 bg-amber-50 text-amber-700",
  MANUTENCAO: "border-rose-100 bg-rose-50 text-rose-700",
};

export default function GaragemPage() {
  const [apartmentOptions, setApartmentOptions] = useState<BuildingApartmentOption[]>([]);
  const [spots, setSpots] = useState<GarageSpot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState("");
  const [form, setForm] = useState<GarageSpot>(emptyForm);

  useEffect(() => {
    async function load() {
      try {
        const apartments = await listBuildingApartmentOptions();
        setApartmentOptions(apartments);
        const local = readLocalSpots();
        const nextSpots = local && local.length > 0 ? local : createSeedSpots(apartments);
        setSpots(nextSpots);
        setSelectedSpotId(nextSpots[0]?.id ?? "");
      } finally {
        // no-op
      }
    }

    load();
  }, []);

  useEffect(() => {
    const selected = spots.find((spot) => spot.id === selectedSpotId);
    setForm(selected ?? { ...emptyForm, id: `garage-${Date.now()}`, code: `G-${String(spots.length + 1).padStart(2, "0")}` });
  }, [selectedSpotId, spots]);

  const occupiedCount = useMemo(() => spots.filter((spot) => spot.status === "OCUPADA").length, [spots]);
  const availableCount = useMemo(() => spots.filter((spot) => spot.status === "LIVRE").length, [spots]);
  const reservedCount = useMemo(() => spots.filter((spot) => spot.status === "RESERVADA").length, [spots]);
  const maintenanceCount = useMemo(() => spots.filter((spot) => spot.status === "MANUTENCAO").length, [spots]);

  const groupedSpots = useMemo(() => {
    return spots.reduce<Record<string, GarageSpot[]>>((acc, spot) => {
      acc[spot.zone] = [...(acc[spot.zone] ?? []), spot];
      return acc;
    }, {});
  }, [spots]);

  function resetToNewSpot() {
    const nextId = `garage-${Date.now()}`;
    setSelectedSpotId("");
    setForm({ ...emptyForm, id: nextId, code: `G-${String(spots.length + 1).padStart(2, "0")}` });
  }

  function handleApartmentChange(apartmentId: string) {
    const apartment = apartmentOptions.find((item) => item.id === apartmentId);
    setForm((current) => ({
      ...current,
      apartmentId: apartment?.id ?? null,
      apartmentLabel: apartment ? apartmentLabel(apartment) : "",
    }));
  }

  function handleSave() {
    const nextSpot = { ...form, vehiclePlate: form.vehiclePlate.toUpperCase() };
    const nextSpots = selectedSpotId ? spots.map((spot) => (spot.id === selectedSpotId ? nextSpot : spot)) : [...spots, nextSpot];
    setSpots(nextSpots);
    saveLocalSpots(nextSpots);
    setSelectedSpotId(nextSpot.id);
  }

  function handleDelete() {
    if (!selectedSpotId) return;
    const nextSpots = spots.filter((spot) => spot.id !== selectedSpotId);
    setSpots(nextSpots);
    saveLocalSpots(nextSpots);
    setSelectedSpotId(nextSpots[0]?.id ?? "");
  }

  return (
    <AppLayout title="Garagem">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.42),_transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(34,197,94,0.15),_transparent_22%),linear-gradient(135deg,_#eff6ff_0%,_#ffffff_40%,_#f8fafc_100%)] p-6 shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                <ParkingSquare size={13} />
                Operacao da garagem
              </div>
              <h2 className="mt-4 max-w-2xl text-[clamp(1.9rem,4vw,3.2rem)] font-black leading-none tracking-[-0.05em] text-slate-950">Controle visual de vagas, veiculos e ocupacao por unidade.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">Uma central para saber rapidamente quais vagas estao ocupadas, reservadas, livres ou em manutencao, com vinculo direto a bloco e apartamento.</p>
            </div>

            <div className="rounded-[30px] border border-slate-900/5 bg-slate-950 p-6 text-white shadow-[0_32px_80px_-38px_rgba(15,23,42,0.8)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200/80">Capacidade operacional</p>
              <p className="mt-3 text-[clamp(2rem,4vw,3.3rem)] font-black leading-none tracking-[-0.06em]">{spots.length} vagas</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ocupacao atual</p>
                  <p className="mt-2 text-2xl font-black">{spots.length ? Math.round((occupiedCount / spots.length) * 100) : 0}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Vagas livres</p>
                  <p className="mt-2 text-2xl font-black">{availableCount}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {[
            { icon: CheckCircle2, label: "Livres", value: availableCount, helper: "Disponiveis para uso imediato", tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
            { icon: CarFront, label: "Ocupadas", value: occupiedCount, helper: "Vagas com veiculo vinculado", tone: "border-indigo-100 bg-indigo-50 text-indigo-700" },
            { icon: Sparkles, label: "Reservadas", value: reservedCount, helper: "Liberacoes temporarias e visitantes", tone: "border-amber-100 bg-amber-50 text-amber-700" },
            { icon: AlertTriangle, label: "Manutencao", value: maintenanceCount, helper: "Pontos isolados para intervencao", tone: "border-rose-100 bg-rose-50 text-rose-700" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-[28px] border p-5 shadow-sm ${item.tone}`}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm"><Icon size={20} /></div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.helper}</p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-base font-semibold text-slate-900">Mapa rapido da garagem</h3>
                <p className="mt-1 text-sm text-slate-500">Clique em uma vaga para editar vinculo, placa e status.</p>
              </div>
              <button type="button" onClick={resetToNewSpot} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                Nova vaga
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {Object.entries(groupedSpots).map(([zone, zoneSpots]) => (
                <div key={zone} className="rounded-[26px] border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="m-0 text-sm font-semibold text-slate-900">{zone}</p>
                      <p className="mt-1 text-xs text-slate-500">{zoneSpots.length} vagas nessa area</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                      {zoneSpots.filter((spot) => spot.status === "OCUPADA").length} ocupadas
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {zoneSpots.map((spot) => (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => setSelectedSpotId(spot.id)}
                        className={`rounded-[24px] border p-4 text-left transition ${selectedSpotId === spot.id ? "border-slate-900 bg-white shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="m-0 text-sm font-semibold text-slate-900">{spot.code}</p>
                            <p className="mt-1 text-xs text-slate-500">{spot.apartmentLabel || "Sem unidade vinculada"}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone[spot.status]}`}>
                            {spot.status}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                            <CarFront size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">{spot.vehicleModel || "Sem veiculo"}</p>
                            <p className="truncate text-xs text-slate-500">{spot.vehiclePlate || "Placa nao cadastrada"}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="m-0 text-base font-semibold text-slate-900">{selectedSpotId ? "Editar vaga" : "Nova vaga"}</h3>
                <p className="mt-1 text-sm text-slate-500">Atualize status, unidade vinculada e dados do veiculo.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.code} onChange={(e) => setForm((current) => ({ ...current, code: e.target.value.toUpperCase() }))} placeholder="Codigo da vaga" className={inputClass} />
                <input value={form.zone} onChange={(e) => setForm((current) => ({ ...current, zone: e.target.value }))} placeholder="Setor / subsolo" className={inputClass} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <select value={form.type} onChange={(e) => setForm((current) => ({ ...current, type: e.target.value as SpotType }))} className={inputClass}>
                  <option value="MORADOR">Morador</option>
                  <option value="VISITANTE">Visitante</option>
                  <option value="SERVICO">Servico</option>
                </select>
                <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as SpotStatus }))} className={inputClass}>
                  <option value="LIVRE">Livre</option>
                  <option value="OCUPADA">Ocupada</option>
                  <option value="RESERVADA">Reservada</option>
                  <option value="MANUTENCAO">Manutencao</option>
                </select>
              </div>

              <select value={form.apartmentId ?? ""} onChange={(e) => handleApartmentChange(e.target.value)} className={inputClass}>
                <option value="">Selecione a unidade</option>
                {apartmentOptions.map((option) => (
                  <option key={option.id} value={option.id}>{apartmentLabel(option)}</option>
                ))}
              </select>

              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.residentName} onChange={(e) => setForm((current) => ({ ...current, residentName: e.target.value }))} placeholder="Morador responsavel" className={inputClass} />
                <input value={form.vehiclePlate} onChange={(e) => setForm((current) => ({ ...current, vehiclePlate: e.target.value.toUpperCase() }))} placeholder="Placa" className={inputClass} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.vehicleModel} onChange={(e) => setForm((current) => ({ ...current, vehicleModel: e.target.value }))} placeholder="Modelo do veiculo" className={inputClass} />
                <input value={form.vehicleColor} onChange={(e) => setForm((current) => ({ ...current, vehicleColor: e.target.value }))} placeholder="Cor" className={inputClass} />
              </div>

              <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={4} placeholder="Observacoes da vaga" className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />

              <div className="flex gap-3">
                <button type="button" onClick={handleSave} className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Salvar vaga
                </button>
                <button type="button" onClick={handleDelete} disabled={!selectedSpotId} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
