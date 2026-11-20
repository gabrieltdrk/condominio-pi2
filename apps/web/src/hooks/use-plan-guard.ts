import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getUser, updateUser } from "../features/auth/services/auth";

/**
 * Busca o plano atual do condomínio diretamente do banco a cada mount.
 * Impede que um usuário manipule o localStorage para fingir ter um plano superior.
 */
export function usePlanGuard() {
  useEffect(() => {
    const user = getUser();
    if (!user || user.role === "MASTER_ADMIN" || !user.condominioUUID) return;

    supabase
      .from("condominios")
      .select("plan")
      .eq("id", user.condominioUUID)
      .single()
      .then(({ data }) => {
        if (data) {
          updateUser({ plan: (data as { plan: string | null }).plan });
        }
      });
  }, []);
}
