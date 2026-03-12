import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/login.tsx";
import Dashboard from "../pages/dashboard.tsx";
import ResetPassword from "../pages/reset-password.tsx";
import ListaOcorrencias from "../pages/ocorrencias/lista-ocorrencias.tsx";
import ListaAvisos from "../pages/avisos/lista-avisos.tsx";
import MapaPredio from "../pages/predio/mapa-predio";
import Agendamentos from "../pages/agendamentos";
import Perfil from "../pages/perfil";
import ProtectedRoute from "./protected-route";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/avisos"
          element={
            <ProtectedRoute>
              <ListaAvisos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ocorrencias"
          element={
            <ProtectedRoute>
              <ListaOcorrencias />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agendamentos"
          element={
            <ProtectedRoute>
              <Agendamentos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Perfil />
            </ProtectedRoute>
          }
        />

        <Route
          path="/predio"
          element={
            <ProtectedRoute>
              <MapaPredio />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}