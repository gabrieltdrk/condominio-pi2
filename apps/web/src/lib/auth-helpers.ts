/**
 * Helpers de autenticação compartilhados entre serviços.
 * Elimina o padrão `requireSessionUser` e `getUserDisplayName` duplicados em 5+ serviços.
 */

import { supabase } from "./supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

/** Retorna o usuário autenticado no Supabase ou lança se não houver sessão. */
export async function requireSessionUser(): Promise<SupabaseUser> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sessão inválida. Faça login novamente.");
  }
  return data.user;
}

/** Retorna o nome de exibição preferencial do usuário. */
export function getUserDisplayName(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  return name?.trim() || email?.trim() || "Usuário";
}
