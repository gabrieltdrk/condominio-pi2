import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/login.tsx";
import ChatPage from "../pages/chat";
import Dashboard from "../pages/dashboard.tsx";
import ResetPassword from "../pages/reset-password.tsx";
import ListaOcorrencias from "../pages/ocorrencias/lista-ocorrencias.tsx";
import ListaAvisos from "../pages/avisos/lista-avisos.tsx";
import MapaPredio from "../pages/predio/mapa-predio";
import Agendamentos from "../pages/agendamentos";
import EnquetesPage from "../pages/enquetes";
import EncomendasPage from "../pages/encomendas";
import FinanceiroPage from "../pages/financeiro";
import GaragemPage from "../pages/garagem";
import MaresiaPage from "../pages/maresia";
import Perfil from "../pages/perfil";
import UsuariosPage from "../pages/usuarios";
import VisitantesPage from "../pages/visitantes";
import VisitorApprovalPage from "../pages/visitantes-aprovacao";
import VisitorAccessCardPage from "../pages/visitantes-cartao";
import ProtectedRoute from "./protected-route";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/visitantes/aprovacao" element={<VisitorApprovalPage />} />
        <Route path="/visitantes/cartao" element={<VisitorAccessCardPage />} />
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
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enquetes"
          element={
            <ProtectedRoute>
              <EnquetesPage />
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
          path="/visitantes"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MORADOR", "PORTEIRO"]}>
              <VisitantesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/encomendas"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MORADOR", "PORTEIRO"]}>
              <EncomendasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro"
          element={
            <ProtectedRoute adminOnly>
              <FinanceiroPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/garagem"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "MORADOR", "PORTEIRO"]}>
              <GaragemPage />
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
            <ProtectedRoute adminOnly>
              <MapaPredio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute adminOnly>
              <UsuariosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manutencao"
          element={
            <ProtectedRoute>
              <MaresiaPage />
            </ProtectedRoute>
          }
        />
        <Route path="/maresia" element={<Navigate to="/manutencao" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
