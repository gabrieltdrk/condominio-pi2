import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../../../lib/supabase";

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

const USERS_CACHE_KEY = "dashboard:users-cache";

function normalizeProfile(row: ProfileRow): UserRecord {
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

async function listProfiles(client: SupabaseClient): Promise<UserRecord[]> {
  const extended = await client
    .from("profiles")
    .select("id, name, email, phone, car_plate, pets_count, role, resident_type, status, created_at")
    .order("created_at", { ascending: false });

  if (!extended.error) {
    const users = (extended.data as ProfileRow[]).map(normalizeProfile);
    writeUsersCache(users);
    return users;
  }

  const fallback = await client
    .from("profiles")
    .select("id, name, email, phone, role, resident_type, status, created_at")
    .order("created_at", { ascending: false });

  if (!fallback.error) {
    const users = (fallback.data as ProfileRow[]).map(normalizeProfile);
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

  const users = (basic.data as ProfileRow[]).map(normalizeProfile);
  writeUsersCache(users);
  return users;
}

async function getProfileById(client: SupabaseClient, id: string): Promise<UserRecord> {
  const extended = await client
    .from("profiles")
    .select("id, name, email, phone, car_plate, pets_count, role, resident_type, status, created_at")
    .eq("id", id)
    .single();

  if (!extended.error) {
    const user = normalizeProfile(extended.data as ProfileRow);
    const cachedUsers = readUsersCache().filter((item) => item.id !== user.id);
    writeUsersCache([user, ...cachedUsers]);
    return user;
  }

  const fallback = await client
    .from("profiles")
    .select("id, name, email, phone, role, resident_type, status, created_at")
    .eq("id", id)
    .single();

  if (!fallback.error) {
    const user = normalizeProfile(fallback.data as ProfileRow);
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

  const user = normalizeProfile(basic.data as ProfileRow);
  const cachedUsers = readUsersCache().filter((item) => item.id !== user.id);
  writeUsersCache([user, ...cachedUsers]);
  return user;
}

function updateCachedUser(user: UserRecord) {
  const cachedUsers = readUsersCache().filter((item) => item.id !== user.id);
  writeUsersCache([user, ...cachedUsers]);
}

export async function listUsers(): Promise<UserRecord[]> {
  return listProfiles(getSupabaseAdmin());
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

  const extendedUpsert = await admin
    .from("profiles")
    .upsert({
      id: data.user.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      car_plate: payload.carPlate || null,
      pets_count: payload.petsCount,
      role: payload.role,
      resident_type: payload.residentType,
      status: payload.status,
    } as never);

  if (extendedUpsert.error) {
    const fallbackUpsert = await admin
      .from("profiles")
      .upsert({
        id: data.user.id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
      } as never);

    if (fallbackUpsert.error) {
      throw new Error("Usuario criado, mas erro ao salvar perfil.");
    }
  }

  return getProfileById(admin, data.user.id);
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

  if (extendedUpdate.error) {
    const fallbackUpdate = await admin
      .from("profiles")
      .update({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
      } as never)
      .eq("id", payload.id);

    if (fallbackUpdate.error) {
      throw new Error("Erro ao atualizar perfil do usuario.");
    }
  }

  const user = await getProfileById(admin, payload.id);
  updateCachedUser(user);
  return user;
}
