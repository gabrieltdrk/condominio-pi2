import { getSupabaseAdmin } from "../../../lib/supabase";

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

export type Apartment = {
  id: string;
  number: string;
  floor: number;
  resident: Resident | null;
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
};

const MOCK_ASSIGNMENTS_KEY = "predio:assignments";
const CUSTOM_APARTMENTS_KEY = "predio:custom-apartments";
const USERS_CACHE_KEY = "dashboard:users-cache";

type CachedUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  car_plate?: string | null;
  pets_count?: number | null;
  role?: string | null;
  resident_type?: "PROPRIETARIO" | "INQUILINO" | "VISITANTE" | null;
  status?: "ATIVO" | "INATIVO" | null;
};

type MockAssignment = {
  userId: string | null;
  resident: Resident | null;
};

type CustomApartmentRow = {
  id: string;
  tower: string;
  level: number;
  number: string;
  resident_id: string | null;
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

function readUsersCache(): CachedUser[] {
  const raw = localStorage.getItem(USERS_CACHE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as CachedUser[];
  } catch {
    return [];
  }
}

function getMockAssignments(): Record<string, MockAssignment> {
  const raw = localStorage.getItem(MOCK_ASSIGNMENTS_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, MockAssignment>;
  } catch {
    return {};
  }
}

function setMockAssignments(next: Record<string, MockAssignment>) {
  localStorage.setItem(MOCK_ASSIGNMENTS_KEY, JSON.stringify(next));
}

function normalizeTowerName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^torre\s+/i.test(trimmed) ? trimmed : `Torre ${trimmed}`;
}

function compareApartmentNumbers(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

function readCustomApartments(): CustomApartmentRow[] {
  const raw = localStorage.getItem(CUSTOM_APARTMENTS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as CustomApartmentRow[];
  } catch {
    return [];
  }
}

function setCustomApartments(rows: CustomApartmentRow[]) {
  localStorage.setItem(CUSTOM_APARTMENTS_KEY, JSON.stringify(rows));
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

function rowsToFloors(rows: Array<CondoApartmentRow | CustomApartmentRow>): Floor[] {
  const floorsMap = new Map<string, Floor>();

  for (const row of rows) {
    const key = `${row.tower}::${row.level}`;
    if (!floorsMap.has(key)) {
      floorsMap.set(key, { tower: row.tower, level: row.level, apartments: [] });
    }

    floorsMap.get(key)?.apartments.push({
      id: row.id,
      number: row.number,
      floor: row.level,
      resident: "resident" in row && row.resident ? profileToResident(row.resident) : null,
    });
  }

  const floors = Array.from(floorsMap.values()).map((floor) => ({
    ...floor,
    apartments: [...floor.apartments].sort((a, b) => compareApartmentNumbers(a.number, b.number)),
  }));

  return sortFloors(floors);
}

function mergeFloors(base: Floor[], extra: Floor[]): Floor[] {
  const merged = new Map<string, Floor>();

  for (const floor of [...base, ...extra]) {
    const key = `${floor.tower}::${floor.level}`;
    const current = merged.get(key);

    if (!current) {
      merged.set(key, { ...floor, apartments: [...floor.apartments] });
      continue;
    }

    const apartmentMap = new Map(
      current.apartments.map((apartment) => [`${apartment.floor}::${apartment.number}`, apartment]),
    );

    for (const apartment of floor.apartments) {
      apartmentMap.set(`${apartment.floor}::${apartment.number}`, apartment);
    }

    current.apartments = Array.from(apartmentMap.values()).sort((a, b) => compareApartmentNumbers(a.number, b.number));
  }

  return sortFloors(Array.from(merged.values()));
}

async function mergeWithCustomApartments(floors: Floor[]): Promise<Floor[]> {
  const custom = readCustomApartments();
  if (custom.length === 0) return floors;
  return mergeFloors(floors, rowsToFloors(custom));
}

function createLocalApartmentId(tower: string, level: number, number: string) {
  return `local-${tower.toLowerCase().replace(/\s+/g, "-")}-${level}-${number.toLowerCase()}`;
}

async function listProfileRows(): Promise<ProfileRow[]> {
  const admin = getSupabaseAdmin();

  const extended = await admin
    .from("profiles")
    .select("id, name, email, phone, car_plate, pets_count, resident_type, status")
    .order("name");

  if (!extended.error) {
    return (extended.data ?? []) as ProfileRow[];
  }

  const fallbackWithoutPhone = await admin
    .from("profiles")
    .select("id, name, email, car_plate, pets_count, resident_type, status")
    .order("name");

  if (!fallbackWithoutPhone.error) {
    return (fallbackWithoutPhone.data ?? []) as ProfileRow[];
  }

  const fallbackWithoutPhoneAndCarPlate = await admin
    .from("profiles")
    .select("id, name, email, pets_count, resident_type, status")
    .order("name");

  if (!fallbackWithoutPhoneAndCarPlate.error) {
    return (fallbackWithoutPhoneAndCarPlate.data ?? []) as ProfileRow[];
  }

  const fallback = await admin
    .from("profiles")
    .select("id, name, email, resident_type, status")
    .order("name");

  if (fallback.error) {
    return readUsersCache() as ProfileRow[];
  }

  return (fallback.data ?? []) as ProfileRow[];
}

async function fetchBuildingFromSupabase(): Promise<Floor[]> {
  const admin = getSupabaseAdmin();
  const extended = await admin
    .from("condo_apartments")
    .select("id, tower, level, number, resident_id, resident:profiles!condo_apartments_resident_id_fkey(id, name, email, phone, car_plate, pets_count, resident_type, status)")
    .order("tower")
    .order("level", { ascending: false })
    .order("number");

  if (!extended.error) {
    return rowsToFloors((extended.data ?? []) as CondoApartmentRow[]);
  }

  const fallback = await admin
    .from("condo_apartments")
    .select("id, tower, level, number, resident_id, resident:profiles!condo_apartments_resident_id_fkey(id, name, email, car_plate, pets_count, resident_type, status)")
    .order("tower")
    .order("level", { ascending: false })
    .order("number");

  if (!fallback.error) {
    return rowsToFloors((fallback.data ?? []) as CondoApartmentRow[]);
  }

  const fallbackWithoutCarPlate = await admin
    .from("condo_apartments")
    .select("id, tower, level, number, resident_id, resident:profiles!condo_apartments_resident_id_fkey(id, name, email, pets_count, resident_type, status)")
    .order("tower")
    .order("level", { ascending: false })
    .order("number");

  if (!fallbackWithoutCarPlate.error) {
    return rowsToFloors((fallbackWithoutCarPlate.data ?? []) as CondoApartmentRow[]);
  }

  const basic = await admin
    .from("condo_apartments")
    .select("id, tower, level, number, resident_id, resident:profiles!condo_apartments_resident_id_fkey(id, name, email)")
    .order("tower")
    .order("level", { ascending: false })
    .order("number");

  if (basic.error) throw basic.error;

  return rowsToFloors((basic.data ?? []) as CondoApartmentRow[]);
}

async function applyMockAssignments(floors: Floor[]): Promise<Floor[]> {
  const assignments = getMockAssignments();
  if (Object.keys(assignments).length === 0) return floors;

  const profiles = await listProfileRows();
  const byId = new Map(profiles.map((profile) => [profile.id, profileToResident(profile)]));

  return floors.map((floor) => ({
    ...floor,
    apartments: floor.apartments.map((apartment) => {
      const assignment = assignments[apartment.id];
      if (assignment === undefined) return apartment;

      return {
        ...apartment,
        resident: assignment.userId
          ? (byId.get(assignment.userId) ?? assignment.resident ?? apartment.resident)
          : null,
      };
    }),
  }));
}

export async function fetchBuilding(): Promise<Floor[]> {
  try {
    const supabaseFloors = await fetchBuildingFromSupabase();
    const merged = await mergeWithCustomApartments(supabaseFloors);
    return applyMockAssignments(merged);
  } catch {
    const merged = await mergeWithCustomApartments(getMockBuilding());
    return applyMockAssignments(merged);
  }
}

export async function fetchUsers(): Promise<{ id: string; name: string; email: string; role: string }[]> {
  try {
    const admin = getSupabaseAdmin();
    const extended = await admin
      .from("profiles")
      .select("id, name, email, role")
      .order("name");

    if (extended.error) throw extended.error;
    return ((extended.data ?? []) as Array<{ id: string; name: string; email: string; role?: string | null }>).map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role ?? "MORADOR",
    }));
  } catch {
    return readUsersCache().map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role ?? "MORADOR",
    }));
  }
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
      })),
    )
    .sort((a, b) => {
      if (a.tower !== b.tower) return a.tower.localeCompare(b.tower);
      if (a.level !== b.level) return a.level - b.level;
      return compareApartmentNumbers(a.number, b.number);
    });
}

export async function syncApartmentAssignmentForUser(userId: string, apartmentId: string | null): Promise<void> {
  const assignments = getMockAssignments();

  for (const [key, assignment] of Object.entries(assignments)) {
    if (key === apartmentId || assignment.userId === userId && apartmentId === null) {
      delete assignments[key];
    }
  }

  setMockAssignments(assignments);

  try {
    const admin = getSupabaseAdmin();

    if (!apartmentId) return;

    const target = await admin
      .from("condo_apartments")
      .select("id, resident_id")
      .eq("id", apartmentId)
      .single();

    const targetRow = target.data as { id: string; resident_id: string | null } | null;
    if (target.error || !targetRow) throw new Error("Apartamento selecionado não foi encontrado.");

    if (targetRow.resident_id && targetRow.resident_id !== userId) {
      throw new Error("Este apartamento já está vinculado a outro usuário.");
    }

    const assign = await admin
      .from("condo_apartments")
      .update({ resident_id: userId } as never)
      .eq("id", apartmentId);

    if (assign.error) throw assign.error;
  } catch {
    if (!apartmentId) return;

    const cachedUsers = readUsersCache();
    const cachedUser = cachedUsers.find((user) => user.id === userId);
    assignments[apartmentId] = {
      userId,
      resident: cachedUser
        ? {
            id: cachedUser.id,
            name: cachedUser.name,
            email: cachedUser.email,
            phone: cachedUser.phone ?? "",
            status: mapResidentStatus(cachedUser.resident_type, cachedUser.status),
            carPlate: cachedUser.car_plate ?? "",
            petsCount: cachedUser.pets_count ?? 0,
          }
        : null,
    };
    setMockAssignments(assignments);
  }
}

export async function assignApartment(
  apartmentId: string,
  userId: string | null,
): Promise<void> {
  if (!apartmentId) return;

  if (userId) {
    await syncApartmentAssignmentForUser(userId, apartmentId);
    return;
  }

  const cachedUsers = readUsersCache();
  const cachedUser = userId ? cachedUsers.find((user) => user.id === userId) : null;
  const residentSnapshot = cachedUser
    ? {
        id: cachedUser.id,
        name: cachedUser.name,
        email: cachedUser.email,
        phone: cachedUser.phone ?? "",
        status: mapResidentStatus(cachedUser.resident_type, cachedUser.status),
        carPlate: cachedUser.car_plate ?? "",
        petsCount: cachedUser.pets_count ?? 0,
      }
    : null;

  try {
    const admin = getSupabaseAdmin();
    const clearTarget = await admin
      .from("condo_apartments")
      .update({ resident_id: null } as never)
      .eq("id", apartmentId);

    if (clearTarget.error) throw clearTarget.error;

    const { error } = await admin
      .from("condo_apartments")
      .update({ resident_id: userId } as never)
      .eq("id", apartmentId);

    if (error) throw error;
  } catch {
    const assignments = getMockAssignments();
    if (userId) {
      assignments[apartmentId] = { userId, resident: residentSnapshot };
    } else {
      delete assignments[apartmentId];
    }
    setMockAssignments(assignments);
  }
}

function buildBlockApartments({ tower, floors, apartmentsPerFloor }: CreateBlockInput): CustomApartmentRow[] {
  const normalizedTower = normalizeTowerName(tower);
  const rows: CustomApartmentRow[] = [];

  for (let floor = floors; floor >= 1; floor -= 1) {
    for (let apartmentIndex = 1; apartmentIndex <= apartmentsPerFloor; apartmentIndex += 1) {
      const number = `${floor}${String(apartmentIndex).padStart(2, "0")}`;
      rows.push({
        id: createLocalApartmentId(normalizedTower, floor, number),
        tower: normalizedTower,
        level: floor,
        number,
        resident_id: null,
      });
    }
  }

  return rows;
}

async function ensureNoDuplicateApartment(tower: string, _floor: number, number: string) {
  const building = await fetchBuilding();
  const exists = building.some(
    (item) =>
      item.tower.toLowerCase() === tower.toLowerCase() &&
      item.apartments.some((apartment) => apartment.number.toLowerCase() === number.toLowerCase()),
  );

  if (exists) {
    throw new Error("Já existe um apartamento com esse número nesse bloco.");
  }
}

async function ensureFloorWithinTowerLimit(tower: string, floor: number) {
  const building = await fetchBuilding();
  const towerFloors = building.filter((item) => item.tower.toLowerCase() === tower.toLowerCase());

  if (towerFloors.length === 0) {
    throw new Error("Bloco não encontrado.");
  }

  const maxFloor = Math.max(...towerFloors.map((item) => item.level));
  if (floor > maxFloor) {
    throw new Error(`Esse bloco possui apenas ${maxFloor} andar(es).`);
  }
}

async function ensureFloorApartmentCapacity(tower: string, floor: number) {
  const building = await fetchBuilding();
  const towerFloors = building.filter((item) => item.tower.toLowerCase() === tower.toLowerCase());

  if (towerFloors.length === 0) {
    throw new Error("Bloco não encontrado.");
  }

  const maxApartmentsPerFloor = Math.max(...towerFloors.map((item) => item.apartments.length));
  const targetFloor = towerFloors.find((item) => item.level === floor);
  const currentApartments = targetFloor?.apartments.length ?? 0;

  if (currentApartments >= maxApartmentsPerFloor) {
    throw new Error(`Esse andar já atingiu o limite de ${maxApartmentsPerFloor} apartamento(s).`);
  }
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
  if (existingTower) {
    throw new Error("Esse bloco já existe.");
  }

  const rows = buildBlockApartments({ tower, floors, apartmentsPerFloor });

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("condo_apartments").insert(
      rows.map((row) => ({
        tower: row.tower,
        level: row.level,
        number: row.number,
        resident_id: null,
      })) as never,
    );

    if (error) throw error;
  } catch {
    const current = readCustomApartments();
    setCustomApartments([...current, ...rows]);
  }
}

export async function createApartment(input: CreateApartmentInput): Promise<void> {
  const tower = normalizeTowerName(input.tower);
  const floor = Math.max(1, Math.floor(input.floor));
  const number = input.number.trim();

  if (!tower) throw new Error("Informe o bloco.");
  if (!number) throw new Error("Informe o número do apartamento.");

  await ensureFloorWithinTowerLimit(tower, floor);
  await ensureFloorApartmentCapacity(tower, floor);
  await ensureNoDuplicateApartment(tower, floor, number);

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("condo_apartments")
      .insert([{ tower, level: floor, number, resident_id: null }] as never);

    if (error) throw error;
  } catch {
    const current = readCustomApartments();
    current.push({
      id: createLocalApartmentId(tower, floor, number),
      tower,
      level: floor,
      number,
      resident_id: null,
    });
    setCustomApartments(current);
  }
}

export async function deleteApartment(apartmentId: string): Promise<void> {
  const building = await fetchBuilding();
  const apartment = building.flatMap((floor) => floor.apartments).find((item) => item.id === apartmentId);

  if (!apartment) {
    throw new Error("Apartamento não encontrado.");
  }

  if (apartment.resident?.id) {
    throw new Error("Desvincule o morador antes de excluir este apartamento.");
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("condo_apartments").delete().eq("id", apartmentId);
    if (error) throw error;
  } catch {
    setCustomApartments(readCustomApartments().filter((item) => item.id !== apartmentId));
  }
}

export async function deleteTower(tower: string): Promise<void> {
  const building = await fetchBuilding();
  const apartments = building
    .filter((floor) => floor.tower.toLowerCase() === tower.toLowerCase())
    .flatMap((floor) => floor.apartments);

  if (apartments.length === 0) {
    throw new Error("Bloco não encontrado.");
  }

  if (apartments.some((apartment) => apartment.resident?.id)) {
    throw new Error("Desvincule os moradores antes de excluir o bloco.");
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("condo_apartments").delete().eq("tower", tower);
    if (error) throw error;
  } catch {
    setCustomApartments(readCustomApartments().filter((item) => item.tower.toLowerCase() !== tower.toLowerCase()));
  }
}

export async function listTowerSummaries(): Promise<TowerSummary[]> {
  const building = await fetchBuilding();
  const floorApartmentCounts = new Map<string, number>();

  for (const floor of building) {
    floorApartmentCounts.set(`${floor.tower}::${floor.level}`, floor.apartments.length);
  }

  const buildingRows = building.map((floor) => ({ tower: floor.tower, level: floor.level }));
  if (buildingRows.length > 0) {
    return summarizeTowerRows(buildingRows, floorApartmentCounts);
  }

  const custom = readCustomApartments();
  const customCounts = new Map<string, number>();
  for (const apartment of custom) {
    const key = `${apartment.tower}::${apartment.level}`;
    customCounts.set(key, (customCounts.get(key) ?? 0) + 1);
  }

  return summarizeTowerRows(custom.map((item) => ({ tower: item.tower, level: item.level })), customCounts);
}


export function getMockBuilding(): Floor[] {
  const floors: Floor[] = [
    {
      tower: "Torre A",
      level: 7,
      apartments: [
        { id: "A-701", number: "701", floor: 7, resident: { name: "Fernanda Nascimento", email: "fernanda.nascimento@example.com", phone: "(11) 99999-0051", status: "Proprietário", carPlate: "ABC-1234", petsCount: 1 } },
        { id: "A-702", number: "702", floor: 7, resident: { name: "Ricardo Lima", email: "ricardo.lima@example.com", phone: "(11) 99999-0052", status: "Inquilino" } },
        { id: "A-703", number: "703", floor: 7, resident: null },
        { id: "A-704", number: "704", floor: 7, resident: { name: "Patrícia Alves", email: "patricia.alves@example.com", phone: "(11) 99999-0054", status: "Visitante" } },
      ],
    },
    {
      tower: "Torre A",
      level: 6,
      apartments: [
        { id: "A-601", number: "601", floor: 6, resident: { name: "Bruno Costa", email: "bruno.costa@example.com", phone: "(11) 99999-0061", status: "Proprietário" } },
        { id: "A-602", number: "602", floor: 6, resident: { name: "Juliana Freitas", email: "juliana.freitas@example.com", phone: "(11) 99999-0062", status: "Inquilino" } },
        { id: "A-603", number: "603", floor: 6, resident: null },
        { id: "A-604", number: "604", floor: 6, resident: { name: "Marco Silva", email: "marco.silva@example.com", phone: "(11) 99999-0064", status: "Proprietário" } },
      ],
    },
    {
      tower: "Torre A",
      level: 5,
      apartments: [
        { id: "A-501", number: "501", floor: 5, resident: { name: "Carlos Souza", email: "carlos.souza@example.com", phone: "(11) 99999-0001", status: "Proprietário" } },
        { id: "A-502", number: "502", floor: 5, resident: { name: "Mariana Silva", email: "mariana.silva@example.com", phone: "(11) 99999-0002", status: "Inquilino" } },
        { id: "A-503", number: "503", floor: 5, resident: null },
        { id: "A-504", number: "504", floor: 5, resident: { name: "Ricardo Gomes", email: "ricardo.gomes@example.com", phone: "(11) 99999-0004", status: "Proprietário" } },
      ],
    },
    {
      tower: "Torre A",
      level: 4,
      apartments: [
        { id: "A-401", number: "401", floor: 4, resident: { name: "Patrícia Lima", email: "patricia.lima@example.com", phone: "(11) 99999-0011", status: "Inquilino" } },
        { id: "A-402", number: "402", floor: 4, resident: { name: "João Pereira", email: "joao.pereira@example.com", phone: "(11) 99999-0012", status: "Proprietário" } },
        { id: "A-403", number: "403", floor: 4, resident: null },
        { id: "A-404", number: "404", floor: 4, resident: { name: "Letícia Castro", email: "leticia.castro@example.com", phone: "(11) 99999-0014", status: "Visitante" } },
      ],
    },
    {
      tower: "Torre A",
      level: 3,
      apartments: [
        { id: "A-301", number: "301", floor: 3, resident: { name: "Eduardo Ramos", email: "eduardo.ramos@example.com", phone: "(11) 99999-0021", status: "Proprietário" } },
        { id: "A-302", number: "302", floor: 3, resident: { name: "Ana Paula", email: "ana.paula@example.com", phone: "(11) 99999-0022", status: "Inquilino" } },
        { id: "A-303", number: "303", floor: 3, resident: null },
        { id: "A-304", number: "304", floor: 3, resident: { name: "Lucas Almeida", email: "lucas.almeida@example.com", phone: "(11) 99999-0024", status: "Proprietário" } },
      ],
    },
    {
      tower: "Torre A",
      level: 2,
      apartments: [
        { id: "A-201", number: "201", floor: 2, resident: { name: "Fernanda Costa", email: "fernanda.costa@example.com", phone: "(11) 99999-0031", status: "Inquilino" } },
        { id: "A-202", number: "202", floor: 2, resident: { name: "Rafael Oliveira", email: "rafael.oliveira@example.com", phone: "(11) 99999-0032", status: "Proprietário" } },
        { id: "A-203", number: "203", floor: 2, resident: null },
        { id: "A-204", number: "204", floor: 2, resident: { name: "Carla Mendes", email: "carla.mendes@example.com", phone: "(11) 99999-0034", status: "Visitante" } },
      ],
    },
    {
      tower: "Torre A",
      level: 1,
      apartments: [
        { id: "A-101", number: "101", floor: 1, resident: { name: "Gabriel Ferreira", email: "gabriel.ferreira@example.com", phone: "(11) 99999-0041", status: "Proprietário" } },
        { id: "A-102", number: "102", floor: 1, resident: { name: "Marisa Souza", email: "marisa.souza@example.com", phone: "(11) 99999-0042", status: "Inquilino" } },
        { id: "A-103", number: "103", floor: 1, resident: null },
        { id: "A-104", number: "104", floor: 1, resident: { name: "Renato Alves", email: "renato.alves@example.com", phone: "(11) 99999-0044", status: "Proprietário" } },
      ],
    },
    {
      tower: "Torre B",
      level: 7,
      apartments: [
        { id: "B-701", number: "701", floor: 7, resident: { name: "Ana Rita", email: "ana.rita@example.com", phone: "(11) 98888-0051", status: "Proprietário" } },
        { id: "B-702", number: "702", floor: 7, resident: null },
        { id: "B-703", number: "703", floor: 7, resident: { name: "Rafael Santos", email: "rafael.santos@example.com", phone: "(11) 98888-0053", status: "Inquilino" } },
        { id: "B-704", number: "704", floor: 7, resident: { name: "Lívia Gomes", email: "livia.gomes@example.com", phone: "(11) 98888-0054", status: "Visitante" } },
      ],
    },
    {
      tower: "Torre B",
      level: 6,
      apartments: [
        { id: "B-601", number: "601", floor: 6, resident: { name: "Eduardo Pires", email: "eduardo.pires@example.com", phone: "(11) 98888-0061", status: "Proprietário" } },
        { id: "B-602", number: "602", floor: 6, resident: { name: "Mariana Costa", email: "mariana.costa@example.com", phone: "(11) 98888-0062", status: "Inquilino" } },
        { id: "B-603", number: "603", floor: 6, resident: null },
        { id: "B-604", number: "604", floor: 6, resident: { name: "Caio Rocha", email: "caio.rocha@example.com", phone: "(11) 98888-0064", status: "Proprietário" } },
      ],
    },
    {
      tower: "Torre B",
      level: 5,
      apartments: [
        { id: "B-501", number: "501", floor: 5, resident: { name: "Juliana Rocha", email: "juliana.rocha@example.com", phone: "(11) 98888-0001", status: "Inquilino" } },
        { id: "B-502", number: "502", floor: 5, resident: null },
        { id: "B-503", number: "503", floor: 5, resident: { name: "Thiago Martins", email: "thiago.martins@example.com", phone: "(11) 98888-0003", status: "Proprietário" } },
        { id: "B-504", number: "504", floor: 5, resident: { name: "Beatriz Nunes", email: "beatriz.nunes@example.com", phone: "(11) 98888-0004", status: "Visitante" } },
      ],
    },
    {
      tower: "Torre B",
      level: 4,
      apartments: [
        { id: "B-401", number: "401", floor: 4, resident: { name: "Felipe Barros", email: "felipe.barros@example.com", phone: "(11) 98888-0011", status: "Proprietário" } },
        { id: "B-402", number: "402", floor: 4, resident: null },
        { id: "B-403", number: "403", floor: 4, resident: { name: "Larissa Melo", email: "larissa.melo@example.com", phone: "(11) 98888-0013", status: "Inquilino" } },
        { id: "B-404", number: "404", floor: 4, resident: { name: "André Luiz", email: "andre.luiz@example.com", phone: "(11) 98888-0014", status: "Proprietário" } },
      ],
    },
    {
      tower: "Torre B",
      level: 3,
      apartments: [
        { id: "B-301", number: "301", floor: 3, resident: null },
        { id: "B-302", number: "302", floor: 3, resident: { name: "Priscila Campos", email: "priscila.campos@example.com", phone: "(11) 98888-0022", status: "Visitante" } },
        { id: "B-303", number: "303", floor: 3, resident: { name: "Murilo Freitas", email: "murilo.freitas@example.com", phone: "(11) 98888-0023", status: "Inquilino" } },
        { id: "B-304", number: "304", floor: 3, resident: { name: "Vanessa Duarte", email: "vanessa.duarte@example.com", phone: "(11) 98888-0024", status: "Proprietário" } },
      ],
    },
    {
      tower: "Torre B",
      level: 2,
      apartments: [
        { id: "B-201", number: "201", floor: 2, resident: { name: "Sérgio Teixeira", email: "sergio.teixeira@example.com", phone: "(11) 98888-0031", status: "Proprietário" } },
        { id: "B-202", number: "202", floor: 2, resident: null },
        { id: "B-203", number: "203", floor: 2, resident: { name: "Camila Prado", email: "camila.prado@example.com", phone: "(11) 98888-0033", status: "Inquilino" } },
        { id: "B-204", number: "204", floor: 2, resident: { name: "Igor Santos", email: "igor.santos@example.com", phone: "(11) 98888-0034", status: "Visitante" } },
      ],
    },
    {
      tower: "Torre B",
      level: 1,
      apartments: [
        { id: "B-101", number: "101", floor: 1, resident: { name: "Helena Moraes", email: "helena.moraes@example.com", phone: "(11) 98888-0041", status: "Proprietário" } },
        { id: "B-102", number: "102", floor: 1, resident: { name: "Otávio Ribeiro", email: "otavio.ribeiro@example.com", phone: "(11) 98888-0042", status: "Inquilino" } },
        { id: "B-103", number: "103", floor: 1, resident: null },
        { id: "B-104", number: "104", floor: 1, resident: { name: "Bianca Leal", email: "bianca.leal@example.com", phone: "(11) 98888-0044", status: "Proprietário" } },
      ],
    },
  ];

  return floors;
}
