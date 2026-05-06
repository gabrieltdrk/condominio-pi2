import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getToken, getUser, type UserRole } from "../features/auth/services/auth";

type Props = {
  children: ReactNode;
  adminOnly?: boolean;
  allowedRoles?: UserRole[];
};

export default function ProtectedRoute({ children, adminOnly = false, allowedRoles }: Props) {
  const token = getToken();
  const user = getUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // MASTER_ADMIN não precisa de condominioId — tem acesso irrestrito
  if (user?.role === "MASTER_ADMIN") {
    return children;
  }

  // Usuário autenticado via JWT do Fastify deve ter condominioId resolvido
  // (exceto usuários OAuth do Supabase que entram com condominioId null)
  if (user?.condominioId === undefined) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles && (!user?.role || !allowedRoles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
