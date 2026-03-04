import { getSupabaseAdmin, supabase } from "../lib/supabase";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MORADOR";
  created_at: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "MORADOR";
};

export async function listUsers(): Promise<UserRecord[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, role, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Erro ao carregar usuários.");
  return data as UserRecord[];
}

export async function createUser(payload: CreateUserPayload): Promise<UserRecord> {
  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { name: payload.name, role: payload.role },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      throw new Error("Email já cadastrado.");
    }
    throw new Error(error.message);
  }

  // O trigger cria o perfil automaticamente; buscamos para retornar
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, email, role, created_at")
    .eq("id", data.user.id)
    .single();

  if (profileError) throw new Error("Usuário criado, mas erro ao carregar perfil.");
  return profile as UserRecord;
}
