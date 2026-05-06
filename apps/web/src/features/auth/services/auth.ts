import { supabase } from "../../../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export type UserRole = "MASTER_ADMIN" | "ADMIN" | "MORADOR" | "PORTEIRO";
export type ResidentType = "PROPRIETARIO" | "INQUILINO" | "VISITANTE";
export type UserStatus = "ATIVO" | "INATIVO";

export type User = {
  id?: string | number;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  condominioId?: number | null;
  condominioName?: string;
  residentType?: ResidentType;
  status?: UserStatus;
  carPlate?: string;
  petsCount?: number;
  avatarUrl?: string;
};

export type CondominioOption = {
  id: number;
  name: string;
  role: UserRole;
};

export type LoginResult =
  | { requiresSelection: false; user: User }
  | {
      requiresSelection: true;
      condominios: CondominioOption[];
      selectionToken: string;
      userName: string;
    };

// ─── Storage helpers ─────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getSelectionToken(): string | null {
  return sessionStorage.getItem("selectionToken");
}

export function getUser(): User | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  return JSON.parse(raw) as User;
}

export function setStoredUser(user: User): User {
  localStorage.setItem("user", JSON.stringify(user));
  return user;
}

export function updateUser(updated: Partial<User>): User | null {
  const current = getUser();
  if (!current) return null;
  return setStoredUser({ ...current, ...updated });
}

export function getCondominioId(): number | null {
  return getUser()?.condominioId ?? null;
}

// ─── Login (dual-auth: Fastify JWT + Supabase session) ───────────────────────

export async function login(email: string, password: string): Promise<LoginResult> {
  // Fastify: valida credenciais e resolve condomínio(s)
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).message ?? "Email ou senha inválidos.");
  }

  const data = await res.json();

  // Supabase: mantém sessão paralela para RLS (não-bloqueante)
  supabase.auth.signInWithPassword({ email, password }).catch(() => undefined);

  if (data.requiresSelection) {
    sessionStorage.setItem("selectionToken", data.selectionToken);
    return {
      requiresSelection: true,
      condominios: data.condominios as CondominioOption[],
      selectionToken: data.selectionToken,
      userName: data.user?.name ?? "",
    };
  }

  const user: User = {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    phone: data.user.phone ?? "",
    role: data.user.role as UserRole,
    condominioId: data.user.condominioId ?? null,
    condominioName: data.user.condominioName ?? "",
  };

  localStorage.setItem("token", data.token);
  setStoredUser(user);

  return { requiresSelection: false, user };
}

// ─── Seleção de condomínio ───────────────────────────────────────────────────

export async function selectCondominio(condominioId: number): Promise<User> {
  const selectionToken = getSelectionToken();
  if (!selectionToken) throw new Error("Sessão expirada. Faça login novamente.");

  const res = await fetch(`${API_URL}/auth/select-condominio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${selectionToken}`,
    },
    body: JSON.stringify({ condominioId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).message ?? "Erro ao selecionar condomínio.");
  }

  const data = await res.json();
  sessionStorage.removeItem("selectionToken");

  const user: User = {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    phone: data.user.phone ?? "",
    role: data.user.role as UserRole,
    condominioId: data.user.condominioId,
    condominioName: data.user.condominioName ?? "",
  };

  localStorage.setItem("token", data.token);
  setStoredUser(user);

  return user;
}

// ─── OAuth (Google) ───────────────────────────────────────────────────────────

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, phone, car_plate, pets_count, resident_type, status, avatar_url")
    .eq("id", session.user.id)
    .single();

  const user: User = {
    id: session.user.id,
    name: profile?.name ?? session.user.email ?? "",
    email: session.user.email ?? "",
    phone: profile?.phone ?? "",
    role: (profile?.role as UserRole) ?? "MORADOR",
    condominioId: null,
    residentType: profile?.resident_type ?? undefined,
    status: profile?.status ?? undefined,
    carPlate: profile?.car_plate ?? undefined,
    petsCount: profile?.pets_count ?? undefined,
    avatarUrl: profile?.avatar_url ?? undefined,
  };

  localStorage.setItem("token", session.access_token);
  setStoredUser(user);
  return user;
}

// ─── Password reset ───────────────────────────────────────────────────────────

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

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout() {
  await supabase.auth.signOut();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("selectionToken");
}
