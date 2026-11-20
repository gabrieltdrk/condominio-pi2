import { getSupabaseAdmin } from "../../../lib/supabase";
import { getUser } from "../../auth/services/auth";

export type ResidentStatus = "Proprietário" | "Inquilino" | "Vago" | "Visitante";

export type Resident = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  status: ResidentStatus;
  carPlate?: string;
  petsCount?: number;
};

export type ActiveVisitor = {
  id: string;
  name: string;
  email: string;
  checkedInAt: string | null;
  expectedCheckOut: string;
};

export type Apartment = {
  id: string;
  number: string;
  floor: number;
  resident: Resident | null;
  residents: Resident[];
  activeVisitors: ActiveVisitor[];
};

export type Floor = {
  level: number;
  tower: string;
  apartments: Apartment[];
};

export type CreateBlockInput = {
  tower: string;
  floors: number;
  apartmentsPerFloor: number;
};

export type CreateApartmentInput = {
  tower: string;
  floor: number;
  number: string;
};

export type BuildingApartmentOption = {
  id: string;
  tower: string;
  level: number;
  number: string;
  residentId: string | null;
  residentName: string | null;
  residentEmail: string | null;
};

export type TowerSummary = {
  tower: string;
  floors: number;
  apartmentsPerFloor: number;
};

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  car_plate?: string | null;
  pets_count?: number | null;
  resident_type?: "PROPRIETARIO" | "INQUILINO" | "VISITANTE" | null;
  status?: "ATIVO" | "INATIVO" | null;
};

type CondoApartmentRow = {
  id: string;
  tower: string;
  level: number;
  number: string;
  resident_id: string | null;
  resident?: ProfileRow | null;
  apt_residents?: Array<{ user_id: string; profile: ProfileRow | null }> | null;
};

type VisitorRequestActiveRow = {
  id: string;
  apartment_id: string | null;
  checked_in_at: string | null;
  expected_check_out: string;
  guests?: Array<{
    id: string;
    full_name: string;
    email: string | null;
    is_primary: boolean;
  }> | null;
};

function mapResidentStatus(residentType?: string | null, status?: string | null): ResidentStatus {
  if (status === "INATIVO" || residentType === "VISITANTE") return "Visitante";
  if (residentType === "INQUILINO") return "Inquilino";
  return "Proprietário";
}

function profileToResident(profile: ProfileRow): Resident {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? "",
    status: mapResidentStatus(profile.resident_type, profile.status),
    carPlate: profile.car_plate ?? "",
    petsCount: profile.pets_count ?? 0,
  };
}

function sortFloors(floors: Floor[]) {
  return floors.sort((a, b) => {
    if (a.tower === b.tower) return b.level - a.level;
    return a.tower.localeCompare(b.tower);
  });
}

function normalizeTowerName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^torre\s+/i.test(trimmed) ? trimmed : `Torre ${trimmed}`;
}

function compareApartmentNumbers(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

function summarizeTowerRows(rows: Array<{ tower: string; level: number }>, floorApartmentCounts?: Map<string, number>) {
  const summaries = new Map<string, TowerSummary>();

  for (const row of rows) {
    const current = summaries.get(row.tower);
    summaries.set(row.tower, {
      tower: row.tower,
      floors: Math.max(current?.floors ?? 0, row.level),
      apartmentsPerFloor: Math.max(current?.apartmentsPerFloor ?? 0, floorApartmentCounts?.get(`${row.tower}::${row.level}`) ?? 0),
    });
  }

  return Array.from(summaries.values()).sort((a, b) => a.tower.localeCompare(b.tower));
}

function rowsToFloors(rows: CondoApartmentRow[]): Floor[] {
  const floorsMap = new Map<string, Floor>();

  for (const row of rows) {
    const key = `${row.tower}::${row.level}`;
    if (!floorsMap.has(key)) {
      floorsMap.set(key, { tower: row.tower, level: row.level, apartments: [] });
    }

    let residents: Resident[] = [];
    if (row.apt_residents && row.apt_residents.length > 0) {
      residents = row.apt_residents.map((r) =>
        r.profile
          ? profileToResident(r.profile)
          : { id: r.user_id, name: r.user_id, email: "", phone: "", status: "Vago" as const },
      );
    } else if (row.resident) {
      residents = [profileToResident(row.resident)];
    }

    const resident = residents[0] ?? null;
    floorsMap.get(key)?.apartments.push({
      id: row.id,
      number: row.number,
      floor: row.level,
      resident,
      residents,
      activeVisitors: [],
    });
  }

  const floors = Array.from(floorsMap.values()).map((floor) => ({
    ...floor,
    apartments: [...floor.apartments].sort((a, b) => compareApartmentNumbers(a.number, b.number)),
  }));

  return sortFloors(floors);
}

function mapActiveVisitors(rows: VisitorRequestActiveRow[]) {
  const visitorsByApartment = new Map<string, ActiveVisitor[]>();

  for (const row of rows) {
    if (!row.apartment_id) continue;
    const primaryGuest = row.guests?.find((guest) => guest.is_primary) ?? row.guests?.[0];
    if (!primaryGuest) continue;

    const current = visitorsByApartment.get(row.apartment_id) ?? [];
    current.push({
      id: row.id,
      name: primaryGuest.full_name,
      email: primaryGuest.email ?? "",
      checkedInAt: row.checked_in_at,
      expectedCheckOut: row.expected_check_out,
    });
    visitorsByApartment.set(row.apartment_id, current);
  }

  return visitorsByApartment;
}

async function fetchActiveVisitorsByApartment(): Promise<Map<string, ActiveVisitor[]>> {
  try {
    const admin = getSupabaseAdmin();
    const result = await admin
      .from("visitor_requests")
      .select("id, apartment_id, checked_in_at, expected_check_out, guests:visitor_request_guests(id, full_name, email, is_primary)")
      .eq("status", "CHECKED_IN");

    if (result.error) return new Map<string, ActiveVisitor[]>();
    return mapActiveVisitors((result.data ?? []) as VisitorRequestActiveRow[]);
  } catch {
    return new Map<string, ActiveVisitor[]>();
  }
}

function attachActiveVisitors(floors: Floor[], visitorsByApartment: Map<string, ActiveVisitor[]>) {
  return floors.map((floor) => ({
    ...floor,
    apartments: floor.apartments.map((apartment) => ({
      ...apartment,
      activeVisitors: visitorsByApartment.get(apartment.id) ?? [],
    })),
  }));
}

async function fetchBuildingFromSupabase(): Promise<Floor[]> {
  const admin = getSupabaseAdmin();
  const condominioUUID = getUser()?.condominioUUID ?? null;

  // Fetch apartments filtered by condominio (include null for legacy unmigrated data)
  const aptsQuery = condominioUUID
    ? admin
        .from("condo_apartments")
        .select("id, tower, level, number, resident_id")
        .or(`condominio_id.eq.${condominioUUID},condominio_id.is.null`)
        .order("tower")
        .order("level", { ascending: false })
        .order("number")
    : admin
        .from("condo_apartments")
        .select("id, tower, level, number, resident_id")
        .order("tower")
        .order("level", { ascending: false })
        .order("number");

  const aptsResult = await aptsQuery;
  if (aptsResult.error) throw aptsResult.error;

  const apts = aptsResult.data as Array<{ id: string; tower: string; level: number; number: string; resident_id: string | null }>;
  const aptIds = apts.map((a) => a.id);

  if (aptIds.length === 0) return [];

  // Fetch junction rows
  const jRes = await admin
    .from("condo_apartment_residents")
    .select("apartment_id, user_id")
    .in("apartment_id", aptIds);

  if (!jRes.error && jRes.data && jRes.data.length > 0) {
    const userIds = [...new Set((jRes.data as Array<{ user_id: string }>).map((r) => r.user_id))];
    const profilesRes = await admin
      .from("profiles")
      .select("id, name, email, phone, car_plate, pets_count, resident_type, status")
      .in("id", userIds);

    const profileMap = new Map<string, ProfileRow>(
      ((profilesRes.data ?? []) as ProfileRow[]).map((p) => [p.id, p]),
    );

    const aptResidentsMap = new Map<string, Array<{ user_id: string; profile: ProfileRow | null }>>();
    for (const row of jRes.data as Array<{ apartment_id: string; user_id: string }>) {
      const list = aptResidentsMap.get(row.apartment_id) ?? [];
      list.push({ user_id: row.user_id, profile: profileMap.get(row.user_id) ?? null });
      aptResidentsMap.set(row.apartment_id, list);
    }

    return rowsToFloors(apts.map((a) => ({
      ...a,
      apt_residents: aptResidentsMap.get(a.id) ?? [],
    })));
  }

  // No junction data — use legacy resident_id
  return rowsToFloors(apts.map((a) => ({ ...a, apt_residents: [] })));
}

export async function fetchBuilding(): Promise<Floor[]> {
  const visitorsByApartment = await fetchActiveVisitorsByApartment();
  const floors = await fetchBuildingFromSupabase();
  return attachActiveVisitors(floors, visitorsByApartment);
}

export async function fetchUsers(): Promise<{ id: string; name: string; email: string; role: string }[]> {
  const admin = getSupabaseAdmin();
  const condominioUUID = getUser()?.condominioUUID ?? null;

  let query = admin
    .from("profiles")
    .select("id, name, email, role, resident_type")
    .order("name");

  if (condominioUUID) {
    const { data: ucRows } = await admin
      .from("usuario_condominio")
      .select("user_id")
      .eq("condominio_id", condominioUUID)
      .eq("active", true);
    const userIds = (ucRows ?? []).map((r: { user_id: string }) => r.user_id);
    if (userIds.length > 0) {
      query = (query as never as { in: (col: string, ids: string[]) => typeof query }).in("id", userIds) as typeof query;
    }
  }

  const result = await query;
  if (result.error) throw result.error;
  return ((result.data ?? []) as Array<{ id: string; name: string; email: string; role?: string | null }>).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? "MORADOR",
  }));
}

export async function addApartmentResident(apartmentId: string, userId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("condo_apartment_residents")
    .insert([{ apartment_id: apartmentId, user_id: userId }] as never);
  if (error) {
    if (error.code === "23505") throw new Error("Este morador já está vinculado a este apartamento.");
    throw new Error(error.message);
  }
}

export async function removeApartmentResident(apartmentId: string, userId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("condo_apartment_residents")
    .delete()
    .eq("apartment_id", apartmentId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function listBuildingApartmentOptions(): Promise<BuildingApartmentOption[]> {
  const floors = await fetchBuilding();

  return floors
    .flatMap((floor) =>
      floor.apartments.map((apartment) => ({
        id: apartment.id,
        tower: floor.tower,
        level: floor.level,
        number: apartment.number,
        residentId: apartment.resident?.id ?? null,
        residentName: apartment.resident?.name ?? null,
        residentEmail: apartment.resident?.email ?? null,
      })),
    )
    .sort((a, b) => {
      if (a.tower !== b.tower) return a.tower.localeCompare(b.tower);
      if (a.level !== b.level) return a.level - b.level;
      return compareApartmentNumbers(a.number, b.number);
    });
}

export async function createBlock(input: CreateBlockInput): Promise<void> {
  const tower = normalizeTowerName(input.tower);
  const floors = Math.max(1, Math.floor(input.floors));
  const apartmentsPerFloor = Math.max(1, Math.floor(input.apartmentsPerFloor));

  if (!tower) throw new Error("Informe o nome do bloco.");
  if (floors < 1) throw new Error("Informe ao menos um andar.");
  if (apartmentsPerFloor < 1) throw new Error("Informe ao menos um apartamento por andar.");

  const building = await fetchBuilding();
  const existingTower = building.some((floor) => floor.tower.toLowerCase() === tower.toLowerCase());
  if (existingTower) throw new Error("Esse bloco já existe.");

  const admin = getSupabaseAdmin();
  const condominioUUID = getUser()?.condominioUUID ?? null;

  const rows = [];
  for (let floor = floors; floor >= 1; floor--) {
    for (let i = 1; i <= apartmentsPerFloor; i++) {
      rows.push({
        tower,
        level: floor,
        number: `${floor}${i}`,
        resident_id: null,
        ...(condominioUUID ? { condominio_id: condominioUUID } : {}),
      });
    }
  }

  const { error } = await admin.from("condo_apartments").insert(rows as never);
  if (error) throw new Error(error.message);
}

export async function createApartment(input: CreateApartmentInput): Promise<void> {
  const tower = normalizeTowerName(input.tower);
  const floor = Math.max(1, Math.floor(input.floor));
  const number = input.number.trim();

  if (!tower) throw new Error("Informe o bloco.");
  if (!number) throw new Error("Informe o número do apartamento.");

  const building = await fetchBuilding();
  const exists = building.some(
    (f) => f.tower.toLowerCase() === tower.toLowerCase() &&
      f.apartments.some((a) => a.number.toLowerCase() === number.toLowerCase()),
  );
  if (exists) throw new Error("Já existe um apartamento com esse número nesse bloco.");

  const admin = getSupabaseAdmin();
  const condominioUUID = getUser()?.condominioUUID ?? null;
  const { error } = await admin
    .from("condo_apartments")
    .insert([{ tower, level: floor, number, resident_id: null, ...(condominioUUID ? { condominio_id: condominioUUID } : {}) }] as never);

  if (error) throw new Error(error.message);
}

export async function deleteApartment(apartmentId: string): Promise<void> {
  const building = await fetchBuilding();
  const apartment = building.flatMap((floor) => floor.apartments).find((a) => a.id === apartmentId);

  if (!apartment) throw new Error("Apartamento não encontrado.");
  if (apartment.residents.length > 0) throw new Error("Desvincule os moradores antes de excluir este apartamento.");

  const { error } = await getSupabaseAdmin().from("condo_apartments").delete().eq("id", apartmentId);
  if (error) throw new Error(error.message);
}

export async function deleteTower(tower: string): Promise<void> {
  const normalizedTower = normalizeTowerName(tower);
  const building = await fetchBuilding();
  const apartments = building
    .filter((floor) => normalizeTowerName(floor.tower).toLowerCase() === normalizedTower.toLowerCase())
    .flatMap((floor) => floor.apartments);

  if (apartments.length === 0) throw new Error("Bloco não encontrado.");
  if (apartments.some((a) => a.residents.length > 0)) throw new Error("Desvincule os moradores antes de excluir o bloco.");

  const apartmentIds = apartments.map((a) => a.id);
  const { error } = await getSupabaseAdmin().from("condo_apartments").delete().in("id", apartmentIds);
  if (error) throw new Error(error.message);
}

export async function listTowerSummaries(): Promise<TowerSummary[]> {
  const building = await fetchBuilding();
  const floorApartmentCounts = new Map<string, number>();

  for (const floor of building) {
    floorApartmentCounts.set(`${floor.tower}::${floor.level}`, floor.apartments.length);
  }

  const buildingRows = building.map((floor) => ({ tower: floor.tower, level: floor.level }));
  return summarizeTowerRows(buildingRows, floorApartmentCounts);
}
