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

async function listProfileRows(): Promise<ProfileRow[]> {
  const admin = getSupabaseAdmin();

  const extended = await admin
    .from("profiles")
    .select("id, name, email, phone, car_plate, pets_count, resident_type, status")
    .order("name");

  if (!extended.error) {
    return (extended.data ?? []) as ProfileRow[];
  }

  const fallback = await admin
    .from("profiles")
    .select("id, name, email")
    .order("name");

  if (fallback.error) {
    return readUsersCache() as ProfileRow[];
  }

  return (fallback.data ?? []) as ProfileRow[];
}

async function fetchBuildingFromSupabase(): Promise<Floor[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("condo_apartments")
    .select("id, tower, level, number, resident_id, resident:profiles!condo_apartments_resident_id_fkey(id, name, email, phone, car_plate, pets_count, resident_type, status)")
    .order("tower")
    .order("level", { ascending: false })
    .order("number");

  if (error) throw error;

  const floorsMap = new Map<string, Floor>();

  for (const row of (data ?? []) as CondoApartmentRow[]) {
    const key = `${row.tower}::${row.level}`;
    if (!floorsMap.has(key)) {
      floorsMap.set(key, { tower: row.tower, level: row.level, apartments: [] });
    }

    floorsMap.get(key)?.apartments.push({
      id: row.id,
      number: row.number,
      floor: row.level,
      resident: row.resident ? profileToResident(row.resident) : null,
    });
  }

  return sortFloors(Array.from(floorsMap.values()));
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
    return await fetchBuildingFromSupabase();
  } catch {
    return applyMockAssignments(getMockBuilding());
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

export async function assignApartment(
  apartmentId: string,
  userId: string | null,
): Promise<void> {
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
    const { error } = await admin
      .from("condo_apartments")
      .update({ resident_id: userId } as never)
      .eq("id", apartmentId);

    if (error) throw error;
  } catch {
    const assignments = getMockAssignments();
    assignments[apartmentId] = { userId, resident: residentSnapshot };
    setMockAssignments(assignments);
  }
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
