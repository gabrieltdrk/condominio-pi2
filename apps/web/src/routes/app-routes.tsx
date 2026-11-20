import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "../pages/landing/index.tsx";
import Precos from "../pages/precos/index.tsx";
import Login from "../pages/login/index.tsx";
import SelectCondominium from "../pages/select-condominium/index.tsx";
import ResetPassword from "../pages/reset-password/index.tsx";
import Dashboard from "../pages/dashboard/index.tsx";
import ListaAvisos from "../pages/avisos/lista-avisos.tsx";
import ListaOcorrencias from "../pages/ocorrencias/lista-ocorrencias.tsx";
import MapaPredio from "../pages/predio/mapa-predio";
import DocumentosList from "../pages/predio/documentos/index.tsx";
import DocumentosNovo from "../pages/predio/documentos/novo.tsx";
import DocumentoDetalhe from "../pages/predio/documentos/[id].tsx";
import AreasComuns from "../pages/areas-comuns/index.tsx";
import ChatPage from "../pages/chat/index.tsx";
import Agendamentos from "../pages/agendamentos/index.tsx";
import NovoAgendamento from "../pages/agendamentos/novo/index.tsx";
import EnquetesPage from "../pages/enquetes/index.tsx";
import EncomendasPage from "../pages/encomendas/index.tsx";
import FinanceiroPage from "../pages/financeiro/index.tsx";
import ContasPage from "../pages/financeiro/contas/index.tsx";
import FornecedoresPage from "../pages/financeiro/fornecedores/index.tsx";
import BalancetePage from "../pages/financeiro/balancete/index.tsx";
import GaragemPage from "../pages/garagem/index.tsx";
import MaresiaPage from "../pages/maresia/index.tsx";
import Perfil from "../pages/perfil/index.tsx";
import UsuariosPage from "../pages/usuarios/index.tsx";
import VisitantesPage from "../pages/visitantes/index.tsx";
import VisitorApprovalPage from "../pages/visitantes/aprovacao.tsx";
import VisitorAccessCardPage from "../pages/visitantes/cartao.tsx";
import CondominiosPage from "../pages/condominios/index.tsx";
import PlanosPage from "../pages/planos/index.tsx";
import CompletarPerfil from "../pages/completar-perfil/index.tsx";
import ProtectedRoute from "./protected-route";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/precos" element={<Precos />} />
        <Route path="/login" element={<Login />} />
        <Route path="/select-condominium" element={<SelectCondominium />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/completar-perfil" element={<CompletarPerfil />} />
        <Route path="/visitantes/aprovacao" element={<VisitorApprovalPage />} />
        <Route path="/visitantes/cartao" element={<VisitorAccessCardPage />} />
        <Route path="/dashboard"    element={<ProtectedRoute path="/dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="/avisos"       element={<ProtectedRoute path="/avisos"><ListaAvisos /></ProtectedRoute>} />
        <Route path="/chat"         element={<ProtectedRoute path="/chat"><ChatPage /></ProtectedRoute>} />
        <Route path="/enquetes"     element={<ProtectedRoute path="/enquetes"><EnquetesPage /></ProtectedRoute>} />
        <Route path="/ocorrencias"  element={<ProtectedRoute path="/ocorrencias"><ListaOcorrencias /></ProtectedRoute>} />
        <Route path="/agendamentos"      element={<ProtectedRoute path="/agendamentos"><Agendamentos /></ProtectedRoute>} />
        <Route path="/agendamentos/novo" element={<ProtectedRoute path="/agendamentos/novo"><NovoAgendamento /></ProtectedRoute>} />
        <Route path="/visitantes"   element={<ProtectedRoute path="/visitantes"><VisitantesPage /></ProtectedRoute>} />
        <Route path="/encomendas"   element={<ProtectedRoute path="/encomendas"><EncomendasPage /></ProtectedRoute>} />
        <Route path="/financeiro"         element={<ProtectedRoute path="/financeiro"><FinanceiroPage /></ProtectedRoute>} />
        <Route path="/financeiro/contas"       element={<ProtectedRoute path="/financeiro/contas"><ContasPage /></ProtectedRoute>} />
        <Route path="/financeiro/fornecedores" element={<ProtectedRoute path="/financeiro/fornecedores"><FornecedoresPage /></ProtectedRoute>} />
        <Route path="/financeiro/balancete"    element={<ProtectedRoute path="/financeiro/balancete"><BalancetePage /></ProtectedRoute>} />
        <Route path="/garagem"      element={<ProtectedRoute path="/garagem"><GaragemPage /></ProtectedRoute>} />
        <Route path="/perfil"       element={<ProtectedRoute path="/perfil"><Perfil /></ProtectedRoute>} />
        <Route path="/predio"        element={<ProtectedRoute path="/predio"><MapaPredio /></ProtectedRoute>} />
        <Route path="/predio/documentos"      element={<ProtectedRoute path="/predio/documentos"><DocumentosList /></ProtectedRoute>} />
        <Route path="/predio/documentos/novo" element={<ProtectedRoute path="/predio/documentos/novo"><DocumentosNovo /></ProtectedRoute>} />
        <Route path="/predio/documentos/:id"  element={<ProtectedRoute path="/predio/documentos"><DocumentoDetalhe /></ProtectedRoute>} />
        <Route path="/areas-comuns"  element={<ProtectedRoute path="/areas-comuns"><AreasComuns /></ProtectedRoute>} />
        <Route path="/usuarios"     element={<ProtectedRoute path="/usuarios"><UsuariosPage /></ProtectedRoute>} />
        <Route path="/manutencao"   element={<ProtectedRoute path="/manutencao"><MaresiaPage /></ProtectedRoute>} />
        <Route path="/condominios"  element={<ProtectedRoute path="/condominios"><CondominiosPage /></ProtectedRoute>} />
        <Route path="/planos"       element={<ProtectedRoute path="/planos"><PlanosPage /></ProtectedRoute>} />
        <Route path="/maresia"      element={<Navigate to="/manutencao" replace />} />
        <Route path="/relatorios"   element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
