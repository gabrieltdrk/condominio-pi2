import { supabase } from "../lib/supabase";

export type UserRole = "ADMIN" | "MORADOR";

export type User = {
  name: string;
  role: UserRole;
  email: string;
};

export async function login(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw new Error(error.message);

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", data.user.id)
    .single();

  const user: User = {
    name: profile?.name ?? data.user.email ?? "",
    email: data.user.email ?? "",
    role: (profile?.role ?? "MORADOR") as UserRole,
  };

  localStorage.setItem("token", data.session.access_token);
  localStorage.setItem("user", JSON.stringify(user));
  return user;
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
  return raw ? (JSON.parse(raw) as User) : null;
}
