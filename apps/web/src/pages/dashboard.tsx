import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../services/auth";
import DashboardAdmin from "./dashboard/dashboard-admin";
import DashboardUser from "./dashboard/dashboard-user";

export default function Dashboard() {
  const user = getUser();
  const nav = useNavigate();

  useEffect(() => {
    if (!user) nav("/login", { replace: true });
  }, [user, nav]);

  if (!user) return null;

  return user.role === "ADMIN" ? <DashboardAdmin /> : <DashboardUser />;
}