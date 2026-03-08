import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, Trash2, X, Users, CalendarDays, AlertTriangle, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import AppLayout from "../../components/app-layout";
import { createUser, listUsers, type CreateUserPayload, type UserRecord } from "../../services/users";
import { listOcorrencias, type Ocorrencia } from "../../services/ocorrencias";

type Pending = { title: string; subtitle: string; tag: string; tagColor: string };

const EMPTY_FORM: CreateUserPayload = { name: "", email: "", password: "", role: "MORADOR" };

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

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateUserPayload>(EMPTY_FORM);
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
      .catch(() => {})
      .finally(() => setOcorrenciasLoading(false));
  }, []);

  function openModal() { setForm(EMPTY_FORM); setFormError(""); setModalOpen(true); }
  function closeModal() { setModalOpen(false); }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await createUser(form);
      closeModal();
      loadUsers();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  const inadimplencia = 7;
  const donutData = [{ value: inadimplencia }, { value: 100 - inadimplencia }];

  const abertas = ocorrencias.filter(
    (o) => o.status === "Aberto" || o.status === "Em Análise" || o.status === "Em Atendimento"
  );

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

        {/* ── Usuários cadastrados ── */}
        <section>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Usuários cadastrados</h3>
                <p className="mt-0.5 text-xs text-gray-400">Gerencie os acessos ao sistema</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 border border-gray-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                  {users.length} usuários
                </span>
                <button
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer border-none transition-colors"
                  onClick={openModal}
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
                    {["Nome", "Email", "Perfil", "Ações"].map((h, i) => (
                      <th
                        key={h}
                        className={`text-xs text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-100 first:rounded-tl-lg last:rounded-tr-lg ${i === 3 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 border-b border-gray-100 font-medium text-gray-800">{u.name}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100 text-gray-500">{u.email}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${u.role === "ADMIN" ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {u.role === "ADMIN" ? "Administrador" : "Morador"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-gray-100">
                        <div className="flex gap-1.5 justify-end">
                          <button className="p-1.5 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-gray-400 cursor-pointer transition-colors" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button className="p-1.5 rounded-lg border border-gray-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 text-gray-400 cursor-pointer transition-colors" title="Apagar">
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

            {!ocorrenciasLoading && ocorrencias.length === 0 && (
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-1000 p-4" onClick={closeModal}>
          <div
            className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="m-0 text-base font-semibold text-gray-900">Novo usuário</h3>
              <button className="p-1.5 rounded-lg border-none bg-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer transition-colors" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <form className="grid gap-4" onSubmit={handleCreate}>
              {[
                { id: "u-name", label: "Nome", type: "text", placeholder: "Nome completo", key: "name" as const },
                { id: "u-email", label: "Email", type: "email", placeholder: "email@exemplo.com", key: "email" as const },
                { id: "u-password", label: "Senha", type: "password", placeholder: "Mínimo 6 caracteres", key: "password" as const },
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
                    minLength={f.key === "password" ? 6 : undefined}
                    className={inputCls}
                  />
                </div>
              ))}

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
                  {submitting ? "Salvando..." : "Criar usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
