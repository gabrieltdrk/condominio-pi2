import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getToken, getUser } from "../features/auth/services/auth";

type Props = {
  children: ReactNode;
  adminOnly?: boolean;
};

export default function ProtectedRoute({ children, adminOnly = false }: Props) {
  const token = getToken();
  const user = getUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
