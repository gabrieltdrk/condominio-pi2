import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../services/auth";
import DashboardAdmin from "./dashboard/DashboardAdmin";
import DashboardUser from "./dashboard/DashboardUser";
import "../styles/pages/dashboard.css";

export default function Dashboard() {
  const user = getUser();
  const nav = useNavigate();

  useEffect(() => {
    if (!user) nav("/login", { replace: true });
  }, [user, nav]);

  if (!user) return null;

  return user.role === "ADMIN" ? <DashboardAdmin /> : <DashboardUser />;
}