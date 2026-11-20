/**
 * Helpers para obter o UUID do condomínio do usuário logado.
 * Elimina o padrão `getUser()?.condominioUUID ?? null` duplicado em 8+ serviços.
 */

import { supabase } from "./supabase";
import { getUser } from "../features/auth/services/auth";

/** Leitura síncrona — retorna null se não houver sessão ou condomínio escolhido. */
export function getCondominioUUID(): string | null {
  return getUser()?.condominioUUID ?? null;
}

/** Lança se o usuário não tiver um condomínio selecionado. */
export function requireCondominioUUID(): string {
  const uuid = getCondominioUUID();
  if (!uuid) throw new Error("Nenhum condomínio selecionado. Faça login novamente.");
  return uuid;
}

/**
 * Versão assíncrona com fallback ao banco.
 * Para serviços que precisam do UUID mesmo quando o localStorage ainda não foi populado.
 */
export async function getCondominioUUIDAsync(): Promise<string | null> {
  const stored = getCondominioUUID();
  if (stored) return stored;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("usuario_condominio")
    .select("condominio_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  return (data as { condominio_id: string } | null)?.condominio_id ?? null;
}
