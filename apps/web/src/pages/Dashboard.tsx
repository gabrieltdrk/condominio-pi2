import { getUser } from "../services/auth";
import DashboardAdmin from "./dashboard/DashboardAdmin";
import DashboardUser from "./dashboard/DashboardUser";
import "../styles/pages/dashboard.css";

export default function Dashboard() {
  const user = getUser();
  if (!user) return null;

  return user.role === "ADMIN" ? <DashboardAdmin /> : <DashboardUser />;
}