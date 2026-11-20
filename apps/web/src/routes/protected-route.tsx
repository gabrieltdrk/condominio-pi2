import { type ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getToken, getUser } from "../features/auth/services/auth";
import { canAccessRoute } from "../config/rbac";
import type { PlanId } from "../config/plans";
import { supabase } from "../lib/supabase";

type Props = {
  children: ReactNode;
  path?: string;
  adminOnly?: boolean;
  allowedRoles?: string[];
};

export default function ProtectedRoute({ children, path, adminOnly, allowedRoles }: Props) {
  const token = getToken();
  const user = getUser();
  const [plan, setPlan] = useState<PlanId | "loading">("loading");

  useEffect(() => {
    if (!token || user?.role === "MASTER_ADMIN") {
      setPlan(null);
      return;
    }

    const condominioUUID = user?.condominioUUID;
    if (!condominioUUID) {
      setPlan(null);
      return;
    }

    void Promise.resolve(
      supabase
        .from("condominios")
        .select("plan")
        .eq("id", condominioUUID)
        .single()
    ).then(({ data }) => {
      setPlan((data as { plan: string | null } | null)?.plan as PlanId ?? null);
    }).catch(() => setPlan(null));
  }, [token, user?.condominioUUID, user?.role]);

  if (!token) return <Navigate to="/login" replace />;

  if (user?.role === "MASTER_ADMIN") return children;

  if (plan === "loading") return null;

  if (path) {
    const allowed = canAccessRoute(path, user?.role, plan);
    if (!allowed) return <Navigate to="/dashboard" replace />;
    return children;
  }

  // Fallback: legacy adminOnly / allowedRoles
  if (adminOnly && user?.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  if (allowedRoles && (!user?.role || !allowedRoles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
