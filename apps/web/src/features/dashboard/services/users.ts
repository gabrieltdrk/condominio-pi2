import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../../../lib/supabase";
import { syncApartmentAssignmentForUser } from "../../predio/services/predio";

export type ResidentType = "PROPRIETARIO" | "INQUILINO" | "VISITANTE";
export type UserStatus = "ATIVO" | "INATIVO";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  car_plate: string | null;
  pets_count: number | null;
  role: "ADMIN" | "MORADOR";
  resident_type: ResidentType;
  status: UserStatus;
  apartment_id: string | null;
  apartment_number: string | null;
  apartment_tower: string | null;
  apartment_level: number | null;
  created_at: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
  carPlate: string;
  petsCount: number | null;
  role: "ADMIN" | "MORADOR";
  residentType: ResidentType;
  status: UserStatus;
  apartmentId: string | null;
};

export type UpdateUserPayload = {
  id: string;
  name: string;
  email: string;
  phone: string;
  carPlate: string;
  petsCount: number | null;
  role: "ADMIN" | "MORADOR";
  residentType: ResidentType;
  status: UserStatus;
  apartmentId: string | null;
};

export type ApartmentOption = {
  id: string;
  tower: string;
  level: number;
  number: string;
  resident_id: string | null;
};

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  car_plate?: string | null;
  pets_count?: number | null;
  role?: "ADMIN" | "MORADOR" | null;
  resident_type?: ResidentType | null;
  status?: UserStatus | null;
  created_at?: string | null;
};

type ApartmentAssignmentRow = {
  id: string;
  tower: string;
  level: number;
  number: string;
  resident_id: string | null;
};

const USERS_CACHE_KEY = "dashboard:users-cache";

function normalizeProfile(row: ProfileRow, assignment?: ApartmentAssignmentRow): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? null,
    car_plate: row.car_plate ?? null,
    pets_count: row.pets_count ?? null,
    role: (row.role ?? "MORADOR") as "ADMIN" | "MORADOR",
    resident_type: (row.resident_type ?? "PROPRIETARIO") as ResidentType,
    status: (row.status ?? "ATIVO") as UserStatus,
    apartment_id: assignment?.id ?? null,
    apartment_number: assignment?.number ?? null,
    apartment_tower: assignment?.tower ?? null,
    apartment_level: assignment?.level ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

function readUsersCache(): UserRecord[] {
  const raw = localStorage.getItem(USERS_CACHE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as UserRecord[];
  } catch {
    return [];
  }
}

function writeUsersCache(users: UserRecord[]) {
  localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
}

async function listApartmentAssignments(client: SupabaseClient) {
  const { data, error } = await client
    .from("condo_apartments")
    .select("id, tower, level, number, resident_id")
    .not("resident_id", "is", null);

  if (error) return new Map<string, ApartmentAssignmentRow>();

  return new Map(
    ((data ?? []) as ApartmentAssignmentRow[])
      .filter((row) => row.resident_id)
      .map((row) => [row.resident_id as string, row])
  );
}

async function listProfiles(client: SupabaseClient): Promise<UserRecord[]> {
  const assignments = await listApartmentAssignments(client);
  const extended = await client
    .from("profiles")
    .select("id, name, email, phone, car_plate, pets_count, role, resident_type, status, created_at")
    .order("created_at", { ascending: false });

  if (!extended.error) {
    const users = (extended.data as ProfileRow[]).map((row) => normalizeProfile(row, assignments.get(row.id)));
    writeUsersCache(users);
    return users;
  }

  const fallbackWithoutPhone = await client
    .from("profiles")
    .select("id, name, email, car_plate, pets_count, role, resident_type, status, created_at")
    .order("created_at", { ascending: false });

  if (!fallbackWithoutPhone.error) {
    const users = (fallbackWithoutPhone.data as ProfileRow[]).map((row) => normalizeProfile(row, assignments.get(row.id)));
    writeUsersCache(users);
    return users;
  }

  const fallbackWithoutPhoneAndCarPlate = await client
    .from("profiles")
    .select("id, name, email, pets_count, role, resident_type, status, created_at")
    .order("created_at", { ascending: false });

  if (!fallbackWithoutPhoneAndCarPlate.error) {
    const users = (fallbackWithoutPhoneAndCarPlate.data as ProfileRow[]).map((row) =>
      normalizeProfile(row, assignments.get(row.id)),
    );
    writeUsersCache(users);
    return users;
  }

  const fallback = await client
    .from("profiles")
    .select("id, name, email, role, resident_type, status, created_at")
    .order("created_at", { ascending: false });

  if (!fallback.error) {
    const users = (fallback.data as ProfileRow[]).map((row) => normalizeProfile(row, assignments.get(row.id)));
    writeUsersCache(users);
    return users;
  }

  const basic = await client
    .from("profiles")
    .select("id, name, email, role, created_at")
    .order("created_at", { ascending: false });

  if (basic.error) {
    const cachedUsers = readUsersCache();
    if (cachedUsers.length > 0) return cachedUsers;
    throw new Error("Erro ao carregar usuarios.");
  }

  const users = (basic.data as ProfileRow[]).map((row) => normalizeProfile(row, assignments.get(row.id)));
  writeUsersCache(users);
  return users;
}

async function getProfileById(client: SupabaseClient, id: string): Promise<UserRecord> {
  const assignments = await listApartmentAssignments(client);
  const extended = await client
    .from("profiles")
    .select("id, name, email, phone, car_plate, pets_count, role, resident_type, status, created_at")
    .eq("id", id)
    .single();

  if (!extended.error) {
    const user = normalizeProfile(extended.data as ProfileRow, assignments.get(id));
    const cachedUsers = readUsersCache().filter((item) => item.id !== user.id);
    writeUsersCache([user, ...cachedUsers]);
    return user;
  }

  const fallbackWithoutPhone = await client
    .from("profiles")
    .select("id, name, email, car_plate, pets_count, role, resident_type, status, created_at")
    .eq("id", id)
    .single();

  if (!fallbackWithoutPhone.error) {
    const user = normalizeProfile(fallbackWithoutPhone.data as ProfileRow, assignments.get(id));
    const cachedUsers = readUsersCache().filter((item) => item.id !== user.id);
    writeUsersCache([user, ...cachedUsers]);
    return user;
  }

  const fallbackWithoutPhoneAndCarPlate = await client
    .from("profiles")
    .select("id, name, email, pets_count, role, resident_type, status, created_at")
    .eq("id", id)
    .single();

  if (!fallbackWithoutPhoneAndCarPlate.error) {
    const user = normalizeProfile(fallbackWithoutPhoneAndCarPlate.data as ProfileRow, assignments.get(id));
    const cachedUsers = readUsersCache().filter((item) => item.id !== user.id);
    writeUsersCache([user, ...cachedUsers]);
    return user;
  }

  const fallback = await client
    .from("profiles")
    .select("id, name, email, role, resident_type, status, created_at")
    .eq("id", id)
    .single();

  if (!fallback.error) {
    const user = normalizeProfile(fallback.data as ProfileRow, assignments.get(id));
    const cachedUsers = readUsersCache().filter((item) => item.id !== user.id);
    writeUsersCache([user, ...cachedUsers]);
    return user;
  }

  const basic = await client
    .from("profiles")
    .select("id, name, email, role, created_at")
    .eq("id", id)
    .single();

  if (basic.error) throw new Error("Usuario salvo, mas erro ao carregar perfil.");

  const user = normalizeProfile(basic.data as ProfileRow, assignments.get(id));
  const cachedUsers = readUsersCache().filter((item) => item.id !== user.id);
  writeUsersCache([user, ...cachedUsers]);
  return user;
}

function updateCachedUser(user: UserRecord) {
  const cachedUsers = readUsersCache().filter((item) => item.id !== user.id);
  writeUsersCache([user, ...cachedUsers]);
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildUserRecordFromPayload(id: string, payload: Omit<CreateUserPayload, "password">): UserRecord {
  return {
    id,
    name: payload.name,
    email: payload.email,
    phone: payload.phone || null,
    car_plate: payload.carPlate || null,
    pets_count: payload.petsCount,
    role: payload.role,
    resident_type: payload.residentType,
    status: payload.status,
    apartment_id: payload.apartmentId,
    apartment_number: null,
    apartment_tower: null,
    apartment_level: null,
    created_at: new Date().toISOString(),
  };
}

async function upsertProfileWithFallbacks(
  admin: SupabaseClient,
  payload: {
    id: string;
    name: string;
    email: string;
    phone: string;
    carPlate: string;
    petsCount: number | null;
    role: "ADMIN" | "MORADOR";
    residentType: ResidentType;
    status: UserStatus;
  }
) {
  const attempts = [0, 250, 750];
  let lastError: string | null = null;

  for (const delay of attempts) {
    if (delay > 0) await sleep(delay);

    const extendedUpsert = await admin.from("profiles").upsert({
      id: payload.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      car_plate: payload.carPlate || null,
      pets_count: payload.petsCount,
      role: payload.role,
      resident_type: payload.residentType,
      status: payload.status,
    } as never);

    if (!extendedUpsert.error) {
      return;
    }

    lastError = extendedUpsert.error.message;

    const fallbackUpsert = await admin.from("profiles").upsert({
      id: payload.id,
      name: payload.name,
      email: payload.email,
      car_plate: payload.carPlate || null,
      pets_count: payload.petsCount,
      role: payload.role,
      resident_type: payload.residentType,
      status: payload.status,
    } as never);

    if (!fallbackUpsert.error) {
      return;
    }

    lastError = fallbackUpsert.error.message;

    const basicFallbackUpsert = await admin.from("profiles").upsert({
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      resident_type: payload.residentType,
      status: payload.status,
    } as never);

    if (!basicFallbackUpsert.error) {
      return;
    }

    lastError = basicFallbackUpsert.error.message;
  }

  throw new Error(lastError ?? "Usuario criado, mas erro ao salvar perfil.");
}

async function updateProfileWithFallbacks(
  admin: SupabaseClient,
  payload: UpdateUserPayload
) {
  const attempts = [0, 250, 750];
  let lastError: string | null = null;

  for (const delay of attempts) {
    if (delay > 0) await sleep(delay);

    const extendedUpdate = await admin
      .from("profiles")
      .update({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        car_plate: payload.carPlate || null,
        pets_count: payload.petsCount,
        role: payload.role,
        resident_type: payload.residentType,
        status: payload.status,
      } as never)
      .eq("id", payload.id);

    if (!extendedUpdate.error) {
      return;
    }

    lastError = extendedUpdate.error.message;

    const fallbackUpdate = await admin
      .from("profiles")
      .update({
        name: payload.name,
        email: payload.email,
        car_plate: payload.carPlate || null,
        pets_count: payload.petsCount,
        role: payload.role,
        resident_type: payload.residentType,
        status: payload.status,
      } as never)
      .eq("id", payload.id);

    if (!fallbackUpdate.error) {
      return;
    }

    lastError = fallbackUpdate.error.message;

    const basicFallbackUpdate = await admin
      .from("profiles")
      .update({
        name: payload.name,
        email: payload.email,
        role: payload.role,
        resident_type: payload.residentType,
        status: payload.status,
      } as never)
      .eq("id", payload.id);

    if (!basicFallbackUpdate.error) {
      return;
    }

    lastError = basicFallbackUpdate.error.message;
  }

  throw new Error(lastError ?? "Erro ao atualizar perfil do usuario.");
}

export async function listUsers(): Promise<UserRecord[]> {
  return listProfiles(getSupabaseAdmin());
}

export async function listApartmentOptions(): Promise<ApartmentOption[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("condo_apartments")
    .select("id, tower, level, number, resident_id")
    .order("tower")
    .order("level")
    .order("number");

  if (error) return [];
  return (data ?? []) as ApartmentOption[];
}

export async function createUser(payload: CreateUserPayload): Promise<UserRecord> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      name: payload.name,
      role: payload.role,
      phone: payload.phone,
      car_plate: payload.carPlate,
      pets_count: payload.petsCount,
      resident_type: payload.residentType,
      status: payload.status,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      throw new Error("Email ja cadastrado.");
    }
    throw new Error(error.message);
  }

  await upsertProfileWithFallbacks(admin, {
    id: data.user.id,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    carPlate: payload.carPlate,
    petsCount: payload.petsCount,
    role: payload.role,
    residentType: payload.residentType,
    status: payload.status,
  });

  const fallbackUser = buildUserRecordFromPayload(data.user.id, payload);
  updateCachedUser(fallbackUser);
  await syncApartmentAssignmentForUser(data.user.id, payload.apartmentId);

  try {
    const user = await getProfileById(admin, data.user.id);
    updateCachedUser(user);
    return user;
  } catch {
    return fallbackUser;
  }
}

export async function updateUserRecord(payload: UpdateUserPayload): Promise<UserRecord> {
  const admin = getSupabaseAdmin();

  const authUpdate = await admin.auth.admin.updateUserById(payload.id, {
    email: payload.email,
    user_metadata: {
      name: payload.name,
      role: payload.role,
      phone: payload.phone,
      car_plate: payload.carPlate,
      pets_count: payload.petsCount,
      resident_type: payload.residentType,
      status: payload.status,
    },
  });

  if (authUpdate.error) {
    throw new Error(authUpdate.error.message);
  }

  await updateProfileWithFallbacks(admin, payload);

  const fallbackUser = buildUserRecordFromPayload(payload.id, payload);
  updateCachedUser(fallbackUser);
  await syncApartmentAssignmentForUser(payload.id, payload.apartmentId);

  try {
    const user = await getProfileById(admin, payload.id);
    updateCachedUser(user);
    return user;
  } catch {
    return fallbackUser;
  }
}
