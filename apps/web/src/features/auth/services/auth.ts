import { supabase } from "../../../lib/supabase";

export type UserRole = "ADMIN" | "MORADOR" | "PORTEIRO";
export type ResidentType = "PROPRIETARIO" | "INQUILINO" | "VISITANTE";
export type UserStatus = "ATIVO" | "INATIVO";
const DEFAULT_ADMIN_EMAIL = "admin@condominio.com";

export type User = {
  id?: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  residentType?: ResidentType;
  status?: UserStatus;
  carPlate?: string;
  petsCount?: number;
};

type ProfileData = {
  name?: string | null;
  role?: string | null;
  phone?: string | null;
  car_plate?: string | null;
  pets_count?: number | null;
  resident_type?: ResidentType | null;
  status?: UserStatus | null;
};

function resolveUserRole(email: string, role?: string | null): UserRole {
  if (email.trim().toLowerCase() === DEFAULT_ADMIN_EMAIL) {
    return "ADMIN";
  }

  return (role ?? "MORADOR") as UserRole;
}

async function getProfile(id: string): Promise<ProfileData | null> {
  const extended = await supabase
    .from("profiles")
    .select("name, role, phone, car_plate, pets_count, resident_type, status")
    .eq("id", id)
    .single();

  if (!extended.error) {
    return extended.data as ProfileData;
  }

  const fallback = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", id)
    .single();

  if (fallback.error) return null;
  return fallback.data as ProfileData;
}

/** Inicia login via Google OAuth - redireciona para Google e volta para /login */
export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/login" },
  });
  if (error) throw new Error(error.message);
}

export async function checkOAuthSession(): Promise<User | null> {
  if (localStorage.getItem("token")) return null;

  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  const session = data.session;
  const profile = await getProfile(session.user.id);

  const user: User = {
    id: session.user.id,
    name: profile?.name ?? session.user.email ?? "",
    email: session.user.email ?? "",
    phone: profile?.phone ?? "",
    role: resolveUserRole(session.user.email ?? "", profile?.role),
    residentType: profile?.resident_type ?? undefined,
    status: profile?.status ?? undefined,
    carPlate: profile?.car_plate ?? undefined,
    petsCount: profile?.pets_count ?? undefined,
  };

  localStorage.setItem("token", session.access_token);
  localStorage.setItem("user", JSON.stringify(user));
  return user;
}

export async function login(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw new Error(error.message);

  const profile = await getProfile(data.user.id);

  const user: User = {
    id: data.user.id,
    name: profile?.name ?? data.user.email ?? "",
    email: data.user.email ?? "",
    phone: profile?.phone ?? "",
    role: resolveUserRole(data.user.email ?? "", profile?.role),
    residentType: profile?.resident_type ?? undefined,
    status: profile?.status ?? undefined,
    carPlate: profile?.car_plate ?? undefined,
    petsCount: profile?.pets_count ?? undefined,
  };

  localStorage.setItem("token", data.session.access_token);
  localStorage.setItem("user", JSON.stringify(user));
  return user;
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset-password",
  });
  if (error) throw new Error(error.message);
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function logout() {
  await supabase.auth.signOut();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUser(): User | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;

  const user = JSON.parse(raw) as User;
  const nextRole = resolveUserRole(user.email, user.role);

  if (nextRole !== user.role) {
    const nextUser = { ...user, role: nextRole };
    localStorage.setItem("user", JSON.stringify(nextUser));
    return nextUser;
  }

  return user;
}

export function setStoredUser(user: User) {
  const next = { ...user, role: resolveUserRole(user.email, user.role) };
  localStorage.setItem("user", JSON.stringify(next));
  return next;
}

export function updateUser(updated: Partial<User>) {
  const current = getUser();
  if (!current) return null;
  return setStoredUser({ ...current, ...updated });
}
