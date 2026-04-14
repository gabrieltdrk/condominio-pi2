export type GarageSpotType = "FIXA" | "ROTATIVA" | "VISITANTE" | "PCD" | "CARGA" | "TEMPORARIA";
export type GarageSpotStatus = "DISPONIVEL" | "OCUPADA" | "RESERVADA" | "BLOQUEADA" | "MANUTENCAO";

export type VehicleType = "CARRO" | "MOTO" | "BICICLETA" | "UTILITARIO";
export type VehicleStatus = "ATIVO" | "VISITANTE" | "TEMPORARIO" | "BLOQUEADO";

export type GarageSpot = {
  id: string;
  code: string;
  tower: string;
  level: string;
  type: GarageSpotType;
  status: GarageSpotStatus;
  apartmentId: string | null;
  apartmentLabel: string | null;
  vehiclePlate: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  residentName: string | null;
  notes?: string;
};

export type Vehicle = {
  id: string;
  plate: string;
  model: string;
  color?: string;
  type: VehicleType;
  apartmentId: string | null;
  apartmentLabel: string | null;
  ownerName: string;
  status: VehicleStatus;
};

export type WaitingListEntry = {
  id: string;
  apartmentId: string | null;
  apartmentLabel: string | null;
  residentName: string;
  vehiclePlate: string;
  vehicleModel?: string;
  priority: number;
  criteria: "ORDEM" | "PCD" | "SORTEIO" | "RODIZIO" | "CONDUTA";
  requestedAt: string;
  status: "PENDENTE" | "ATENDIDA" | "CANCELADA";
};

export type TemporaryReservationStatus = "ATIVA" | "VENCIDA" | "PENDENTE" | "CANCELADA";

export type TemporaryReservation = {
  id: string;
  spotId: string | null;
  spotCode: string | null;
  apartmentId: string | null;
  apartmentLabel: string | null;
  visitorName: string;
  plate: string;
  startAt: string;
  endAt: string;
  status: TemporaryReservationStatus;
  requiresApproval: boolean;
};

export type SeasonalRule = {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  visitorMaxHours: number;
  requireApproval: boolean;
  visitorSpotsLimit: number;
  rotationEnabled: boolean;
};

export type CondominiumGarageSettings = {
  allowFixed: boolean;
  allowRotative: boolean;
  allowVisitor: boolean;
  allowTemporary: boolean;
  maxVehiclesPerUnit: number;
  waitlistMode: "ORDEM" | "PRIORIDADE" | "SORTEIO" | "RODIZIO";
  waitlistRotationDays: number;
  visitorMaxHours: number;
  temporaryNeedsApproval: boolean;
  rotationEnabled: boolean;
};

export type OccupancyHistory = {
  id: string;
  spotId: string;
  spotCode: string;
  apartmentLabel: string | null;
  vehiclePlate: string | null;
  status: GarageSpotStatus;
  changedAt: string;
  reason?: string;
};

export type GarageState = {
  spots: GarageSpot[];
  vehicles: Vehicle[];
  waitlist: WaitingListEntry[];
  reservations: TemporaryReservation[];
  seasonalRules: SeasonalRule[];
  activeSeasonId: string | null;
  settings: CondominiumGarageSettings;
  history: OccupancyHistory[];
};
