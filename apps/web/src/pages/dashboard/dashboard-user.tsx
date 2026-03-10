import { useEffect, useState } from "react";
import {
  AlertCircle, ArrowRight, Bell, CheckCircle2,
  ClipboardList, Phone, Plus, Receipt, Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../features/layout/components/app-layout";
import { getUser } from "../../features/auth/services/auth";
import { listOcorrencias, type Ocorrencia, type OcorrenciaStatus } from "../../features/ocorrencias/services/ocorrencias";

const STATUS_COLORS: Record<OcorrenciaStatus, string> = {
  Aberto: "bg-blue-50 text-blue-700 border-blue-200",
  "Em Análise": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Em Atendimento": "bg-orange-50 text-orange-700 border-orange-200",
  "Pendente Terceiros": "bg-purple-50 text-purple-700 border-purple-200",
  Concluído: "bg-green-50 text-green-700 border-green-200",
  Cancelado: "bg-gray-100 text-gray-500 border-gray-200",
};

const URGENCIA_BAR: Record<string, string> = {
  Alta: "bg-red-400",
  Média: "bg-amber-400",
  Baixa: "bg-green-400",
};

// Mock: avisos do condomínio
const AVISOS = [
  { id: 1, titulo: "Reunião de condomínio", data: "15/03", detalhe: "Sábado às 10h no salão" },
  { id: 2, titulo: "Manutenção do elevador", data: "12/03", detalhe: "Bloco B, das 8h às 12h" },
  { id: 3, titulo: "Coleta extra de lixo", data: "10/03", detalhe: "Quarta-feira às 14h" },
];

// Mock: contatos úteis
const CONTATOS = [
  { label: "Portaria", tel: "(11) 3000-0001", icon: Phone, color: "bg-indigo-100 text-indigo-600" },
  { label: "Zeladoria", tel: "(11) 3000-0002", icon: Wrench, color: "bg-amber-100 text-amber-600" },
  { label: "Emergências", tel: "(11) 3000-0099", icon: AlertCircle, color: "bg-rose-100 text-rose-600" },
];

export default function DashboardUser() {
  const nav = useNavigate();
  const user = getUser();
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOcorrencias()
      .then(setOcorrencias)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const abertas = ocorrencias.filter((o) =>
    ["Aberto", "Em Análise", "Em Atendimento", "Pendente Terceiros"].includes(o.status)
  );
  const concluidas = ocorrencias.filter((o) => o.status === "Concluído");
  const recentes = ocorrencias.slice(0, 4);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  const firstName = user?.name?.split(" ")[0] ?? "Morador";

  return (
    <AppLayout title="Área do Morador">
      <div className="grid gap-5">

        {/* Saudação */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 m-0">Olá, {firstName} 👋</h2>
          <p className="text-sm text-gray-400 mt-0.5">Aqui está um resumo da sua área no condomínio.</p>
        </div>

        {/* ── KPIs ── */}
        <section className="grid grid-cols-12 gap-4">

          {/* Abertas */}
          <div className="col-span-12 sm:col-span-4 bg-linear-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <ClipboardList size={18} className="text-indigo-600" />
              </div>
              <span className="text-[11px] text-indigo-600 border border-indigo-200 bg-white px-2 py-1 rounded-full">Em aberto</span>
            </div>
            <p className="text-[32px] font-extrabold tracking-tight text-gray-900 leading-none">
              {loading ? "—" : abertas.length}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-600">Ocorrências ativas</p>
            <p className="mt-0.5 text-[11px] text-gray-400">aguardando resolução</p>
          </div>

          {/* Concluídas */}
          <div className="col-span-12 sm:col-span-4 bg-linear-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-emerald-600" />
              </div>
              <span className="text-[11px] text-emerald-600 border border-emerald-200 bg-white px-2 py-1 rounded-full">Resolvidas</span>
            </div>
            <p className="text-[32px] font-extrabold tracking-tight text-gray-900 leading-none">
              {loading ? "—" : concluidas.length}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-600">Ocorrências concluídas</p>
            <p className="mt-0.5 text-[11px] text-gray-400">de {loading ? "—" : ocorrencias.length} registradas</p>
          </div>

          {/* Boleto (mock) */}
          <div className="col-span-12 sm:col-span-4 bg-linear-to-br from-amber-50 to-white border border-amber-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <Receipt size={18} className="text-amber-600" />
              </div>
              <span className="text-[11px] text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded-full">Em dia ✓</span>
            </div>
            <p className="text-[32px] font-extrabold tracking-tight text-gray-900 leading-none">R$ 580</p>
            <p className="mt-1 text-xs font-semibold text-gray-600">Boleto de março</p>
            <p className="mt-0.5 text-[11px] text-gray-400">vencimento: 10/03/26</p>
          </div>
        </section>

        {/* ── Ação rápida + Avisos + Contatos ── */}
        <section className="grid grid-cols-12 gap-4">

          {/* Ação rápida — Nova ocorrência */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center mb-3">
                <Plus size={20} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 m-0">Abrir ocorrência</h3>
              <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                Reporte problemas, barulho, manutenção ou faça sugestões para o condomínio.
              </p>
            </div>
            <button
              className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold cursor-pointer border-none transition-all w-fit shadow-sm shadow-indigo-200"
              onClick={() => nav("/ocorrencias")}
            >
              <Plus size={15} />
              Nova Ocorrência
            </button>
          </div>

          {/* Avisos do condomínio */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <Bell size={15} className="text-blue-600" />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Avisos</h3>
                <p className="mt-0.5 text-[11px] text-gray-400">Comunicados recentes</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {AVISOS.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors cursor-pointer">
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-md shrink-0 mt-0.5">{a.data}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 leading-tight">{a.titulo}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{a.detalhe}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contatos úteis */}
          <div className="col-span-12 lg:col-span-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                <Phone size={15} className="text-gray-600" />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Contatos úteis</h3>
                <p className="mt-0.5 text-[11px] text-gray-400">Números importantes</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {CONTATOS.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.color}`}>
                      <Icon size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{c.label}</p>
                      <p className="text-[11px] text-gray-400">{c.tel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Ocorrências recentes ── */}
        <section>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <ClipboardList size={15} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="m-0 text-sm font-semibold text-gray-900">Minhas ocorrências recentes</h3>
                  <p className="mt-0.5 text-xs text-gray-400">Últimas registradas</p>
                </div>
              </div>
              <button
                className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline cursor-pointer bg-transparent border-none p-0"
                onClick={() => nav("/ocorrencias")}
              >
                Ver todas <ArrowRight size={13} />
              </button>
            </div>

            {loading && <p className="text-sm text-gray-400">Carregando...</p>}

            {!loading && ocorrencias.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <ClipboardList size={22} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">Nenhuma ocorrência registrada ainda.</p>
                <button
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer border-none transition-colors"
                  onClick={() => nav("/ocorrencias")}
                >
                  Abrir primeira ocorrência
                </button>
              </div>
            )}

            {!loading && recentes.length > 0 && (
              <div className="grid gap-2">
                {recentes.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => nav("/ocorrencias")}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer overflow-hidden relative"
                  >
                    {/* Barra de urgência */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${URGENCIA_BAR[o.urgencia] ?? "bg-gray-300"}`} />

                    <div className="flex-1 min-w-0 pl-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{o.assunto}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{o.protocolo} · {o.categoria} · {fmt(o.created_at)}</p>
                    </div>
                    <span className={`text-[11px] font-semibold border px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${STATUS_COLORS[o.status]}`}>
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
    </AppLayout>
  );
}
