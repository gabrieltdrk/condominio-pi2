import { supabase } from "../../../lib/supabase";
import {
  getUser,
  setStoredUser,
  type ResidentType,
  type User,
  type UserStatus,
} from "./auth";

type ProfileRow = {
  name?: string | null;
  role?: string | null;
  phone?: string | null;
  car_plate?: string | null;
  pets_count?: number | null;
  resident_type?: ResidentType | null;
  status?: UserStatus | null;
};

type SaveProfileInput = {
  name: string;
  email: string;
  phone: string;
  carPlate: string;
  petsCount?: number;
};

async function fetchProfile(id: string): Promise<ProfileRow | null> {
  const extended = await supabase
    .from("profiles")
    .select("name, role, phone, car_plate, pets_count, resident_type, status")
    .eq("id", id)
    .single();

  if (!extended.error) {
    return extended.data as ProfileRow;
  }

  const fallback = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", id)
    .single();

  if (fallback.error) return null;
  return fallback.data as ProfileRow;
}

function mergeUser(id: string, email: string, profile: ProfileRow | null) {
  const current = getUser();
  const next: User = {
    id,
    name: profile?.name ?? current?.name ?? email,
    email,
    phone: profile?.phone ?? "",
    role: (profile?.role ?? current?.role ?? "MORADOR") as User["role"],
    residentType: profile?.resident_type ?? current?.residentType ?? undefined,
    status: profile?.status ?? current?.status ?? undefined,
    carPlate: profile?.car_plate ?? current?.carPlate ?? undefined,
    petsCount: profile?.pets_count ?? current?.petsCount ?? undefined,
  };

  setStoredUser(next);
  return next;
}

export async function refreshStoredUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;

  const email = data.session.user.email ?? "";
  const profile = await fetchProfile(data.session.user.id);
  return mergeUser(data.session.user.id, email, profile);
}

export async function saveOwnProfile(input: SaveProfileInput): Promise<User> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  const email = input.email.trim();
  const currentEmail = data.user.email?.trim() ?? "";

  if (email && email.toLowerCase() !== currentEmail.toLowerCase()) {
    const updateAuth = await supabase.auth.updateUser({
      email,
      data: {
        name: input.name.trim(),
        phone: input.phone || null,
        car_plate: input.carPlate || null,
        pets_count: input.petsCount ?? 0,
      },
    });

    if (updateAuth.error) {
      throw new Error(updateAuth.error.message);
    }
  }

  const profileUpdate = await supabase
    .from("profiles")
    .update({
      name: input.name.trim(),
      email,
      phone: input.phone || null,
      car_plate: input.carPlate || null,
      pets_count: input.petsCount ?? 0,
    } as never)
    .eq("id", data.user.id)
    .select("id")
    .maybeSingle();

  if (profileUpdate.error) {
    throw new Error(profileUpdate.error.message);
  }

  if (!profileUpdate.data) {
    throw new Error("Perfil nao encontrado para atualizacao. Avise o administrador para vincular seu cadastro.");
  }

  const freshProfile = await fetchProfile(data.user.id);
  if (!freshProfile) {
    throw new Error("Os dados foram enviados, mas nao foi possivel confirmar o perfil salvo.");
  }

  return mergeUser(data.user.id, email, freshProfile);
}
