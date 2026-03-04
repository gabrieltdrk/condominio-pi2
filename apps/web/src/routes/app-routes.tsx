import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/login.tsx";
import Dashboard from "../pages/dashboard.tsx";
import ProtectedRoute from "./protected-route";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}