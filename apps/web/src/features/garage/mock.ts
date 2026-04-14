import type { BuildingApartmentOption } from "../predio/services/predio";
import type {
  CondominiumGarageSettings,
  GarageSpot,
  GarageState,
  SeasonalRule,
  TemporaryReservation,
  Vehicle,
  WaitingListEntry,
} from "./types";

const towers = ["A", "B"];

function selectApartment(apartments: BuildingApartmentOption[], index: number) {
  const apartment = apartments[index % apartments.length];
  return apartment
    ? {
        apartmentId: apartment.id,
        apartmentLabel: `${apartment.tower} - Andar ${apartment.level} - Ap ${apartment.number}`,
      }
    : { apartmentId: null, apartmentLabel: null };
}

function seedSpots(apartments: BuildingApartmentOption[]): GarageSpot[] {
  return Array.from({ length: 22 }, (_, idx) => {
    const type = idx >= 16 ? "ROTATIVA" : idx >= 14 ? "VISITANTE" : idx === 13 ? "PCD" : "FIXA";
    const status = idx === 5 ? "MANUTENCAO" : idx === 14 ? "RESERVADA" : idx < 9 ? "OCUPADA" : "DISPONIVEL";
    const tower = `Torre ${towers[idx % towers.length]}`;
    const level = idx < 11 ? "Subsolo 1" : "Subsolo 2";
    const baseApartment = idx < apartments.length ? selectApartment(apartments, idx) : { apartmentId: null, apartmentLabel: null };

    return {
      id: `spot-${idx + 1}`,
      code: `G-${String(idx + 1).padStart(2, "0")}`,
      tower,
      level,
      type,
      status,
      ...baseApartment,
      vehiclePlate: status === "OCUPADA" ? `ABC${idx + 1}${idx}` : null,
      vehicleModel: status === "OCUPADA" ? ["Civic", "Compass", "Corolla", "Onix", "T-Cross", "HB20"][idx % 6] : null,
      vehicleColor: status === "OCUPADA" ? ["Preto", "Branco", "Prata", "Cinza"][idx % 4] : null,
      residentName: status === "OCUPADA" ? `Morador ${idx + 1}` : null,
      notes: idx === 5 ? "Pintura de faixa até sexta." : idx === 14 ? "Reserva visitante até 22h." : "",
    };
  });
}

function seedVehicles(apartments: BuildingApartmentOption[]): Vehicle[] {
  return apartments.slice(0, 12).map((apt, idx) => ({
    id: `veh-${idx + 1}`,
    plate: `ABC${idx + 1}${idx}`,
    model: ["Civic", "Compass", "Corolla", "Onix", "Tracker", "HB20"][idx % 6],
    color: ["Preto", "Branco", "Prata", "Vermelho"][idx % 4],
    type: idx % 5 === 0 ? "MOTO" : "CARRO",
    apartmentId: apt.id,
      apartmentLabel: `${apt.tower} - Andar ${apt.level} - Ap ${apt.number}`,
    ownerName: `Morador ${idx + 1}`,
    status: "ATIVO",
  }));
}

function seedWaitList(apartments: BuildingApartmentOption[]): WaitingListEntry[] {
  return [
    {
      id: "wait-1",
      ...selectApartment(apartments, 3),
      residentName: "Morador sem vaga",
      vehiclePlate: "XYZ1A23",
      vehicleModel: "Kwid",
      priority: 1,
      criteria: "ORDEM",
      requestedAt: new Date().toISOString(),
      status: "PENDENTE",
    },
    {
      id: "wait-2",
      ...selectApartment(apartments, 8),
      residentName: "Morador PCD",
      vehiclePlate: "PCD9A99",
      vehicleModel: "Corolla",
      priority: 0,
      criteria: "PCD",
      requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      status: "PENDENTE",
    },
  ];
}

function seedReservations(spots: GarageSpot[], apartments: BuildingApartmentOption[]): TemporaryReservation[] {
  return [
    {
      id: "res-1",
      spotId: spots.find((s) => s.type === "VISITANTE")?.id ?? null,
      spotCode: spots.find((s) => s.type === "VISITANTE")?.code ?? null,
      ...selectApartment(apartments, 1),
      visitorName: "Visitante João",
      plate: "VIS1A23",
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
      status: "ATIVA",
      requiresApproval: true,
    },
    {
      id: "res-2",
      spotId: null,
      spotCode: null,
      ...selectApartment(apartments, 5),
      visitorName: "Equipe manutenção",
      plate: "SRV-9090",
      startAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      endAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      status: "VENCIDA",
      requiresApproval: false,
    },
  ];
}

const seasonalRules: SeasonalRule[] = [
  {
    id: "season-santos",
    name: "Alta temporada Baixada",
    periodStart: `${new Date().getFullYear()}-12-15`,
    periodEnd: `${new Date().getFullYear() + 1}-02-20`,
    visitorMaxHours: 6,
    requireApproval: true,
    visitorSpotsLimit: 6,
    rotationEnabled: true,
  },
  {
    id: "season-pascoa",
    name: "Páscoa e feriado prolongado",
    periodStart: `${new Date().getFullYear()}-03-25`,
    periodEnd: `${new Date().getFullYear()}-04-05`,
    visitorMaxHours: 4,
    requireApproval: true,
    visitorSpotsLimit: 4,
    rotationEnabled: false,
  },
];

const defaultSettings: CondominiumGarageSettings = {
  allowFixed: true,
  allowRotative: true,
  allowVisitor: true,
  allowTemporary: true,
  maxVehiclesPerUnit: 2,
  waitlistMode: "PRIORIDADE",
  waitlistRotationDays: 15,
  visitorMaxHours: 6,
  temporaryNeedsApproval: true,
  rotationEnabled: true,
};

export function buildSeedState(apartments: BuildingApartmentOption[]): GarageState {
  const spots = seedSpots(apartments);
  const vehicles = seedVehicles(apartments);
  const waitlist = seedWaitList(apartments);
  const reservations = seedReservations(spots, apartments);

  return {
    spots,
    vehicles,
    waitlist,
    reservations,
    seasonalRules,
    activeSeasonId: seasonalRules[0]?.id ?? null,
    settings: defaultSettings,
    history: [],
  };
}
