import { supabase } from "../../../lib/supabase";

export type UserRole = "ADMIN" | "MORADOR";

export type User = {
  name: string;
  role: UserRole;
  email: string;
};

/** Inicia login via Google OAuth — redireciona para Google e volta para /login */
export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/login" },
  });
  if (error) throw new Error(error.message);
}

/**
 * Após o redirect OAuth, o Supabase guarda a sessão automaticamente.
 * Esta função detecta a sessão e popula o localStorage (token + user),
 * retornando o User para que o Login possa redirecionar para /dashboard.
 * Retorna null se não houver sessão OAuth pendente.
 */
export async function checkOAuthSession(): Promise<User | null> {
  // Se já existe token salvo, o login foi via email/password — ignora
  if (localStorage.getItem("token")) return null;

  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  const session = data.session;
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", session.user.id)
    .single();

  const user: User = {
    name: profile?.name ?? session.user.email ?? "",
    email: session.user.email ?? "",
    role: (profile?.role ?? "MORADOR") as UserRole,
  };

  localStorage.setItem("token", session.access_token);
  localStorage.setItem("user", JSON.stringify(user));
  return user;
}

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

/** Envia email com link de recuperação de senha */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset-password",
  });
  if (error) throw new Error(error.message);
}

/** Atualiza a senha do usuário autenticado via link de recuperação */
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
  return raw ? (JSON.parse(raw) as User) : null;
}
