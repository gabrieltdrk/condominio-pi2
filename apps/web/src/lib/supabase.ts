import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Cliente padrão (usuário autenticado)
export const supabase = createClient(url, anonKey);

// Cliente admin (service role) — inicializado de forma lazy para não crashar sem a variável
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;
  if (!serviceRoleKey) throw new Error("Criação de usuários não disponível neste ambiente.");
  _supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _supabaseAdmin;
}
