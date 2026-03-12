import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, Trash2, X, Users, CalendarDays, AlertTriangle, TrendingDown, Clock, CalendarCheck, Megaphone, Building2, BarChart2, Activity, CheckCircle2, UserPlus, FileText, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import AppLayout from "../../features/layout/components/app-layout";
import { createUser, listUsers, updateUserRecord, type CreateUserPayload, type UpdateUserPayload, type UserRecord } from "../../features/dashboard/services/users";
import { listOcorrencias, type Ocorrencia } from "../../features/ocorrencias/services/ocorrencias";

type Pending = { title: string; subtitle: string; tag: string; tagColor: string };
type UserFormState = CreateUserPayload;

const EMPTY_FORM: CreateUserPayload = {
  name: "",
  email: "",
  phone: "",
  password: "",
  carPlate: "",
  petsCount: null,
  role: "MORADOR",
  residentType: "PROPRIETARIO",
  status: "ATIVO",
};

const RESIDENT_TYPE_LABEL: Record<CreateUserPayload["residentType"], string> = {
  PROPRIETARIO: "Proprietário",
  INQUILINO: "Inquilino",
  VISITANTE: "Visitante",
};

const USER_STATUS_LABEL: Record<CreateUserPayload["status"], string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
};

const inputCls = "px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-[13px] outline-none w-full focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

// ── Financial trend data (mock) ──
const financeiroTrend = [
  { mes: "Out", receitas: 24000, despesas: 18000 },
  { mes: "Nov", receitas: 26500, despesas: 19000 },
  { mes: "Dez", receitas: 25000, despesas: 22000 },
  { mes: "Jan", receitas: 27000, despesas: 20000 },
  { mes: "Fev", receitas: 26000, despesas: 19500 },
  { mes: "Mar", receitas: 27300, despesas: 17600 },
];

const DONUT_COLORS = ["#6366f1", "#e2e8f0"];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: { color: string; name: string; value: number }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === "receitas" ? "Receitas" : "Despesas"}: {formatBRL(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function DashboardAdmin() {
  const nav = useNavigate();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [ocorrenciasLoading, setOcorrenciasLoading] = useState(true);
  const [ocorrenciasError, setOcorrenciasError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function loadUsers() {
    setUsersLoading(true);
    setUsersError("");
    listUsers()
      .then(setUsers)
      .catch((e: Error) => setUsersError(e.message))
      .finally(() => setUsersLoading(false));
  }

  useEffect(() => {
    loadUsers();
    listOcorrencias(4)
      .then(setOcorrencias)
      .catch((e: Error) => setOcorrenciasError(e.message))
      .finally(() => setOcorrenciasLoading(false));
  }, []);

  function openCreateModal() { setEditingUser(null); setForm(EMPTY_FORM); setFormError(""); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditingUser(null); }

  function openEditModal(user: UserRecord) {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      password: "",
      carPlate: user.car_plate ?? "",
      petsCount: user.pets_count ?? null,
      role: user.role,
      residentType: user.resident_type,
      status: user.status,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      if (editingUser) {
        await updateUserRecord({
          id: editingUser.id,
          name: form.name,
          email: form.email,
          phone: form.phone,
          carPlate: form.carPlate,
          petsCount: form.petsCount,
          role: form.role,
          residentType: form.residentType,
          status: form.status,
        } satisfies UpdateUserPayload);
      } else {
        await createUser(form);
      }
      closeModal();
      loadUsers();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : editingUser ? "Erro ao atualizar usuário." : "Erro ao criar usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  const inadimplencia = 7;
  const donutData = [{ value: inadimplencia }, { value: 100 - inadimplencia }];

  const abertas = ocorrencias.filter(
    (o) => o.status === "Aberto" || o.status === "Em Análise" || o.status === "Em Atendimento"
  );
  const recentUsers = users.slice(0, 5);

  const pendencias: Pending[] = [
    { title: "Reserva • Salão de festas", subtitle: "Apto 32 • 15/03 • 20:00", tag: "Aprovar", tagColor: "bg-indigo-50 text-indigo-600 border-indigo-200" },
    { title: "Cadastro • Novo morador", subtitle: "Apto 08 • Documento pendente", tag: "Validar", tagColor: "bg-amber-50 text-amber-600 border-amber-200" },
    { title: "Ocorrência • Barulho", subtitle: "Apto 14 • 02/03 • 22:10", tag: "Analisar", tagColor: "bg-rose-50 text-rose-600 border-rose-200" },
  ];

  const kpis = [
    {
      title: "Moradores", sub: "Ativos no sistema", badge: "Hoje", kpi: "128",
      foot: "+2 novos cadastros", icon: Users,
      iconBg: "bg-indigo-100", iconColor: "text-indigo-600",
      gradient: "from-indigo-50 to-white", border: "border-indigo-100",
    },
    {
      title: "Reservas", sub: "Esta semana", badge: "Semanal", kpi: "12",
      foot: "3 aguardando aprovação", icon: CalendarDays,
      iconBg: "bg-violet-100", iconColor: "text-violet-600",
      gradient: "from-violet-50 to-white", border: "border-violet-100",
    },
    {
      title: "Ocorrências", sub: "Em aberto", badge: "Diário", kpi: String(abertas.length),
      foot: `${ocorrencias.length} total cadastradas`, icon: AlertTriangle,
      iconBg: "bg-amber-100", iconColor: "text-amber-600",
      gradient: "from-amber-50 to-white", border: "border-amber-100",
    },
    {
      title: "Inadimplência", sub: "Mês atual", badge: "Financeiro", kpi: "7%",
      foot: "9 boletos em atraso", icon: TrendingDown,
      iconBg: "bg-rose-100", iconColor: "text-rose-600",
      gradient: "from-rose-50 to-white", border: "border-rose-100",
    },
  ];

  return (
    <AppLayout title="Dashboard · Visão Geral">
      <div className="grid gap-5">

        {/* ── KPIs ── */}
        <section className="grid grid-cols-12 gap-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.title}
                className={`col-span-12 sm:col-span-6 lg:col-span-3 bg-linear-to-br ${k.gradient} border ${k.border} rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-9 h-9 rounded-xl ${k.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon size={18} className={k.iconColor} />
                  </div>
                  <span className="text-[11px] text-gray-400 border border-gray-200 bg-white px-2 py-1 rounded-full whitespace-nowrap">
                    {k.badge}
                  </span>
                </div>
                <div className="mt-3 text-[30px] font-extrabold tracking-tight text-gray-900 leading-none">
                  {k.kpi}
                </div>
                <p className="mt-1 text-xs font-semibold text-gray-700">{k.title}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">{k.foot}</p>
              </div>
            );
          })}
        </section>

        {/* ── Financeiro + Inadimplência ── */}
        <section className="grid grid-cols-12 gap-4">

          {/* Resumo Financeiro — line chart */}
          <div className="col-span-12 lg:col-span-8 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Resumo Financeiro</h3>
                <p className="mt-0.5 text-xs text-gray-400">Evolução mensal de receitas e despesas</p>
              </div>
              <span className="text-[11px] text-gray-400 border border-gray-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                Mar/2026
              </span>
            </div>

            {/* Highlight numbers */}
            <div className="flex gap-6 mb-4">
              <div>
                <p className="text-[11px] text-gray-400 mb-0.5">Saldo Atual</p>
                <p className="text-xl font-bold text-gray-900">R$ 52.340</p>
              </div>
              <div>
                <p className="text-[11px] text-emerald-500 mb-0.5">↑ Receitas</p>
                <p className="text-xl font-bold text-emerald-600">R$ 27.300</p>
              </div>
              <div>
                <p className="text-[11px] text-rose-400 mb-0.5">↓ Despesas</p>
                <p className="text-xl font-bold text-rose-500">R$ 17.600</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={financeiroTrend} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="receitas" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="despesas" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="w-5 h-0.5 bg-indigo-500 rounded-full inline-block" />
                Receitas
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="w-5 h-0.5 bg-rose-400 rounded-full inline-block" style={{ borderTop: "2px dashed #f43f5e", background: "none" }} />
                Despesas
              </div>
            </div>
          </div>

          {/* Inadimplência — donut */}
          <div className="col-span-12 lg:col-span-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Inadimplência</h3>
                <p className="mt-0.5 text-xs text-gray-400">Mês atual</p>
              </div>
              <span className="text-[11px] text-rose-500 border border-rose-200 bg-rose-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                Atenção
              </span>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 py-2">
              <div className="relative w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={68}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      <Cell fill={DONUT_COLORS[0]} />
                      <Cell fill={DONUT_COLORS[1]} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-gray-900">{inadimplencia}%</span>
                  <span className="text-[10px] text-gray-400">inadimplentes</span>
                </div>
              </div>

              <div className="mt-4 w-full grid grid-cols-2 gap-2 text-center">
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-2">
                  <p className="text-base font-bold text-rose-600">9</p>
                  <p className="text-[10px] text-rose-400">boletos em atraso</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2">
                  <p className="text-base font-bold text-indigo-600">R$ 7.600</p>
                  <p className="text-[10px] text-indigo-400">em aberto</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pendências + Ações rápidas ── */}
        <section className="grid grid-cols-12 gap-4">

          {/* Pendências */}
          <div className="col-span-12 lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Pendências</h3>
                <p className="mt-0.5 text-xs text-gray-400">Fila de aprovações e validações</p>
              </div>
              <span className="text-[11px] text-gray-400 border border-gray-200 px-2.5 py-1 rounded-full">
                {pendencias.length} itens
              </span>
            </div>

            <div className="grid gap-2.5">
              {pendencias.map((p, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors cursor-default"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-gray-800">{p.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{p.subtitle}</p>
                  </div>
                  <span className={`text-[11px] font-medium border px-2.5 py-1 rounded-full whitespace-nowrap ${p.tagColor}`}>
                    {p.tag}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 flex-wrap mt-4">
              <button
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer border-none transition-colors"
                onClick={() => alert("Criar aviso (mock)")}
              >
                Criar aviso
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer border border-gray-200 transition-colors"
                onClick={() => alert("Gerenciar usuários (mock)")}
              >
                Gerenciar usuários
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer border border-gray-200 transition-colors"
                onClick={() => alert("Exportar relatório (mock)")}
              >
                Exportar relatório
              </button>
            </div>
          </div>

          {/* Cobrança rápida */}
          <div className="col-span-12 lg:col-span-5 bg-linear-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
            <div>
              <span className="text-[11px] text-indigo-600 border border-indigo-200 bg-white px-2.5 py-1 rounded-full">
                Financeiro
              </span>
              <h3 className="mt-3 text-base font-bold text-gray-900">Gestão de cobranças</h3>
              <p className="mt-1 text-xs text-gray-500">
                9 boletos em atraso aguardando ação. Regularize o mês atual antes do vencimento.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: "Recebido", value: "R$ 27.300", sub: "78% da meta", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
                  { label: "Pendente", value: "R$ 7.600", sub: "22% em aberto", color: "text-rose-600", bg: "bg-rose-50 border-rose-100" },
                ].map((s) => (
                  <div key={s.label} className={`${s.bg} border rounded-xl px-3 py-2.5`}>
                    <p className="text-[10px] text-gray-400">{s.label}</p>
                    <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-400">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 mt-5 flex-wrap">
              <button
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer border-none transition-colors"
                onClick={() => alert("Registrar cobrança (mock)")}
              >
                Registrar cobrança
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer border border-gray-200 transition-colors"
                onClick={() => alert("Boletos em atraso (mock)")}
              >
                Boletos em atraso
              </button>
            </div>
          </div>
        </section>

        {/* ── Métricas rápidas ── */}
        <section className="grid grid-cols-12 gap-4">

          {/* A — Tempo médio de resolução */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-violet-600" />
              </div>
              <span className="text-[11px] text-gray-400 border border-gray-200 px-2 py-1 rounded-full">Eficiência</span>
            </div>
            <p className="text-[28px] font-extrabold tracking-tight text-gray-900 leading-none">4.2</p>
            <p className="mt-1 text-xs font-semibold text-gray-700">Dias p/ resolução</p>
            <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600">
              <span>↓ 0.8 dias</span>
              <span className="text-gray-400">vs. mês anterior</span>
            </div>
          </div>

          {/* B — Próximos vencimentos */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white border border-amber-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default bg-linear-to-br from-amber-50 to-white">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <CalendarCheck size={18} className="text-amber-600" />
              </div>
              <span className="text-[11px] text-amber-600 border border-amber-200 bg-amber-50 px-2 py-1 rounded-full">7 dias</span>
            </div>
            <p className="text-[28px] font-extrabold tracking-tight text-gray-900 leading-none">5</p>
            <p className="mt-1 text-xs font-semibold text-gray-700">Cobranças vencendo</p>
            <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-600">
              <span>R$ 2.150</span>
              <span className="text-gray-400">a vencer</span>
            </div>
          </div>

          {/* C — Avisos no mês */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white border border-blue-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default bg-linear-to-br from-blue-50 to-white">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Megaphone size={18} className="text-blue-600" />
              </div>
              <span className="text-[11px] text-gray-400 border border-gray-200 px-2 py-1 rounded-full">Mar/2026</span>
            </div>
            <p className="text-[28px] font-extrabold tracking-tight text-gray-900 leading-none">3</p>
            <p className="mt-1 text-xs font-semibold text-gray-700">Avisos enviados</p>
            <button
              className="mt-2 text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer bg-transparent border-none p-0"
              onClick={() => alert("Criar aviso (mock)")}
            >
              + Criar novo aviso →
            </button>
          </div>

          {/* D — Taxa de ocupação */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default bg-linear-to-br from-emerald-50 to-white">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-emerald-600" />
              </div>
              <span className="text-[11px] text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded-full">94%</span>
            </div>
            <p className="text-[28px] font-extrabold tracking-tight text-gray-900 leading-none">94<span className="text-base font-semibold text-gray-400">/100</span></p>
            <p className="mt-1 text-xs font-semibold text-gray-700">Unidades ocupadas</p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: "94%" }} />
            </div>
          </div>
        </section>

        {/* ── Análise por categoria + Atividade recente ── */}
        <section className="grid grid-cols-12 gap-4">

          {/* E — Ocorrências por categoria */}
          <div className="col-span-12 lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <BarChart2 size={16} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="m-0 text-sm font-semibold text-gray-900">Ocorrências por categoria</h3>
                  <p className="mt-0.5 text-xs text-gray-400">Distribuição do mês atual</p>
                </div>
              </div>
              <span className="text-[11px] text-gray-400 border border-gray-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                {ocorrencias.length} total
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={["Manutenção", "Barulho", "Reclamação", "Sugestão", "Dúvida"].map((cat) => ({
                  name: cat,
                  total: ocorrencias.filter((o) => o.categoria === cat).length,
                }))}
                margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "#f0f4ff" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="total" name="Ocorrências" radius={[6, 6, 0, 0]}>
                  {["Manutenção", "Barulho", "Reclamação", "Sugestão", "Dúvida"].map((_, i) => (
                    <Cell key={i} fill={["#6366f1", "#f59e0b", "#f43f5e", "#10b981", "#3b82f6"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* F — Atividade recente */}
          <div className="col-span-12 lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                <Activity size={16} className="text-gray-600" />
              </div>
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Atividade recente</h3>
                <p className="mt-0.5 text-xs text-gray-400">Últimas ações no sistema</p>
              </div>
            </div>
            <div className="flex flex-col gap-0">
              {[
                { icon: AlertCircle, color: "text-rose-500 bg-rose-50", label: "Nova ocorrência aberta", sub: "Apto 14 · Barulho", time: "há 12 min" },
                { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-50", label: "Ocorrência concluída", sub: "OC-20260005 · Manutenção", time: "há 1h" },
                { icon: UserPlus, color: "text-indigo-500 bg-indigo-50", label: "Novo morador cadastrado", sub: "Apto 08 · Isabela S.", time: "há 3h" },
                { icon: FileText, color: "text-blue-500 bg-blue-50", label: "Aviso publicado", sub: "Reunião de condomínio", time: "há 1 dia" },
                { icon: TrendingDown, color: "text-amber-500 bg-amber-50", label: "Boleto em atraso", sub: "Apto 22 · R$ 580", time: "há 2 dias" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${item.color}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-tight">{item.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{item.sub}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{item.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Usuários cadastrados ── */}
        <section>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Usuários recentes</h3>
                <p className="mt-0.5 text-xs text-gray-400">Últimos cadastros com acesso rápido à edição</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 border border-gray-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                  {recentUsers.length} recentes
                </span>
                <button
                  className="px-3 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer border border-gray-200 transition-colors"
                  onClick={() => nav("/usuarios")}
                >
                  Ver todos
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer border-none transition-colors"
                  onClick={openCreateModal}
                >
                  <Plus size={14} />
                  Novo usuário
                </button>
              </div>
            </div>

            {usersLoading && <p className="text-xs text-gray-400">Carregando...</p>}
            {usersError && <p className="text-xs text-red-500">{usersError}</p>}

            {!usersLoading && !usersError && (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-gray-50">
                    {["Nome completo", "Email", "Telefone", "Tipo", "Status", "Perfil", "Ações"].map((h, i) => (
                      <th
                        key={h}
                        className={`text-xs text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-100 first:rounded-tl-lg last:rounded-tr-lg ${i === 6 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 border-b border-gray-100">
                        <p className="font-medium text-gray-800 m-0">{u.name}</p>
                        {(u.car_plate || typeof u.pets_count === "number") && (
                          <p className="text-[11px] text-gray-400 mt-0.5 mb-0">
                            {[u.car_plate ? `Placa ${u.car_plate}` : null, typeof u.pets_count === "number" ? `${u.pets_count} pet${u.pets_count === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 border-b border-gray-100 text-gray-500">{u.email}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100 text-gray-500">{u.phone || "—"}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100 text-gray-500">{RESIDENT_TYPE_LABEL[u.resident_type]}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${u.status === "ATIVO" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {USER_STATUS_LABEL[u.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-gray-100">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${u.role === "ADMIN" ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {u.role === "ADMIN" ? "Administrador" : "Morador"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-gray-100">
                        <div className="flex gap-1.5 justify-end">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-gray-400 cursor-pointer transition-colors"
                            title="Editar"
                            onClick={() => openEditModal(u)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button type="button" className="p-1.5 rounded-lg border border-gray-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 text-gray-400 cursor-pointer transition-colors" title="Apagar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ── Ocorrências recentes ── */}
        <section>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Ocorrências recentes</h3>
                <p className="mt-0.5 text-xs text-gray-400">Últimas cadastradas no sistema</p>
              </div>
              <span className="text-[11px] text-gray-400 border border-gray-200 px-2.5 py-1 rounded-full">
                {ocorrencias.length} registros
              </span>
            </div>

            {ocorrenciasLoading && <p className="text-xs text-gray-400">Carregando...</p>}
            {ocorrenciasError && <p className="text-xs text-red-500">{ocorrenciasError}</p>}

            {!ocorrenciasLoading && !ocorrenciasError && ocorrencias.length === 0 && (
              <p className="text-xs text-gray-400">Nenhuma ocorrência cadastrada ainda.</p>
            )}

            {!ocorrenciasLoading && ocorrencias.length > 0 && (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-gray-50">
                    {["Protocolo", "Morador", "Categoria", "Status", "Data", ""].map((h, i) => (
                      <th key={i} className={`text-xs text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-100 ${i === 5 ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ocorrencias.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 border-b border-gray-100 font-mono text-xs text-gray-500">{o.protocolo}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100 font-medium text-gray-800">{o.author_name}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100 text-gray-500">{o.categoria}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                          {o.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-gray-100 text-gray-400 text-xs">
                        {new Date(o.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </td>
                      <td className="px-3 py-2.5 border-b border-gray-100">
                        <div className="flex justify-end">
                          <button
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-gray-400 cursor-pointer transition-colors"
                            title="Ver"
                            onClick={() => nav("/ocorrencias")}
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="mt-4">
              <button
                className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer border border-gray-200 transition-colors"
                onClick={() => nav("/ocorrencias")}
              >
                Ver todas
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* ── Modal — Novo usuário ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-1000 p-4">
          <div
            className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="m-0 text-base font-semibold text-gray-900">{editingUser ? "Editar usuário" : "Novo usuário"}</h3>
              <button className="p-1.5 rounded-lg border-none bg-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer transition-colors" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <form className="grid gap-4" onSubmit={handleCreate}>
              {[
                { id: "u-name", label: "Nome completo", type: "text", placeholder: "Nome completo", key: "name" as const },
                { id: "u-email", label: "Email", type: "email", placeholder: "email@exemplo.com", key: "email" as const },
                { id: "u-phone", label: "Telefone", type: "tel", placeholder: "(11) 99999-9999", key: "phone" as const },
              ].map((f) => (
                <div key={f.id} className="grid gap-1.5">
                  <label htmlFor={f.id} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</label>
                  <input
                    id={f.id}
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    required
                    className={inputCls}
                  />
                </div>
              ))}

              {!editingUser && (
                <div className="grid gap-1.5">
                  <label htmlFor="u-password" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Senha</label>
                  <input
                    id="u-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                    className={inputCls}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="u-car-plate" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Placa do carro</label>
                  <input
                    id="u-car-plate"
                    type="text"
                    placeholder="ABC-1234"
                    value={form.carPlate}
                    onChange={(e) => setForm({ ...form, carPlate: e.target.value.toUpperCase() })}
                    className={inputCls}
                  />
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="u-pets-count" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Número de pets</label>
                  <input
                    id="u-pets-count"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={form.petsCount ?? ""}
                    onChange={(e) => setForm({ ...form, petsCount: e.target.value === "" ? null : Number(e.target.value) })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="u-role" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Perfil</label>
                <select
                  id="u-role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "MORADOR" })}
                  className={inputCls}
                >
                  <option value="MORADOR">Morador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="u-resident-type" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo de morador</label>
                <select
                  id="u-resident-type"
                  value={form.residentType}
                  onChange={(e) => setForm({ ...form, residentType: e.target.value as CreateUserPayload["residentType"] })}
                  className={inputCls}
                >
                  <option value="PROPRIETARIO">Proprietário</option>
                  <option value="INQUILINO">Inquilino</option>
                  <option value="VISITANTE">Visitante</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="u-status" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                <select
                  id="u-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as CreateUserPayload["status"] })}
                  className={inputCls}
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>

              {formError && <p className="text-xs text-rose-500 m-0">{formError}</p>}

              <div className="flex justify-end gap-2.5 mt-1">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold cursor-pointer border border-gray-200 transition-colors"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer border-none transition-colors"
                  disabled={submitting}
                >
                  {submitting ? "Salvando..." : editingUser ? "Salvar alterações" : "Criar usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
