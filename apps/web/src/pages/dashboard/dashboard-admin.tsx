import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import AppLayout from "../../components/app-layout";
import { createUser, listUsers, type CreateUserPayload, type UserRecord } from "../../services/users";

type Pending = {
  title: string;
  subtitle: string;
  tag: string;
};

type Occurrence = {
  id: string;
  apartment: string;
  type: string;
  status: "Nova" | "Em análise" | "Resolvida";
  date: string;
};

const EMPTY_FORM: CreateUserPayload = { name: "", email: "", password: "", role: "MORADOR" };

const card = "border border-gray-200 rounded-[14px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] p-4";
const btn = "px-3 py-2.5 rounded-[10px] border border-gray-200 bg-white text-gray-900 cursor-pointer font-semibold text-sm";
const btnPrimary = `${btn} bg-gray-900 text-white border-gray-900`;

export default function DashboardAdmin() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");

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
  }, []);

  function openModal() {
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function handleCreate(e: React.FormEvent) {
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

  // Mock (depois troca por API)
  const pendencias: Pending[] = [
    { title: "Reserva • Salão de festas", subtitle: "Apto 32 • 15/03 • 20:00", tag: "Aprovar" },
    { title: "Cadastro • Novo morador", subtitle: "Apto 08 • Documento pendente", tag: "Validar" },
    { title: "Ocorrência • Barulho", subtitle: "Apto 14 • 02/03 • 22:10", tag: "Analisar" },
  ];

  const ocorrencias: Occurrence[] = [
    { id: "OC-1021", apartment: "14", type: "Barulho", status: "Em análise", date: "03/03" },
    { id: "OC-1019", apartment: "08", type: "Manutenção", status: "Nova", date: "03/03" },
    { id: "OC-1012", apartment: "32", type: "Segurança", status: "Resolvida", date: "02/03" },
    { id: "OC-1007", apartment: "05", type: "Elevador", status: "Resolvida", date: "01/03" },
  ];

  const financeiro = [
    { label: "Recebido no mês", value: 78, display: "R$ 27.300" },
    { label: "Em aberto", value: 22, display: "R$ 7.600" },
    { label: "Inadimplência", value: 7, display: "7%" },
  ];

  function onAction(action: string) {
    alert(`Ação: ${action} (mock)`);
  }

  return (
    <AppLayout title="Dashboard do Administrador">
      <div className="grid gap-4">

        {/* KPIs */}
        <section className="grid grid-cols-12 gap-4">
          {[
            { title: "Moradores", sub: "Ativos no sistema", badge: "Hoje", kpi: "128", foot: "+2 novos cadastros" },
            { title: "Reservas", sub: "Esta semana", badge: "Semanal", kpi: "12", foot: "3 aguardando aprovação" },
            { title: "Ocorrências", sub: "Últimas 24h", badge: "Diário", kpi: "3", foot: "1 crítica • 2 normais" },
            { title: "Inadimplência", sub: "Mês atual", badge: "Financeiro", kpi: "7%", foot: "9 boletos em atraso" },
          ].map((k) => (
            <div key={k.title} className={`${card} col-span-12 lg:col-span-3`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="m-0 text-sm font-semibold text-gray-900">{k.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">{k.sub}</p>
                </div>
                <span className="text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-full whitespace-nowrap">{k.badge}</span>
              </div>
              <div className="mt-2.5 text-[28px] font-bold tracking-tight">{k.kpi}</div>
              <p className="mt-1 text-xs text-gray-500">{k.foot}</p>
            </div>
          ))}
        </section>

        {/* Pendências + Resumo financeiro */}
        <section className="grid grid-cols-12 gap-4">
          {/* Pendências */}
          <div className={`${card} col-span-12 lg:col-span-7`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Pendências</h3>
                <p className="mt-1 text-xs text-gray-500">Fila de aprovações e validações</p>
              </div>
              <span className="text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-full whitespace-nowrap">{pendencias.length} itens</span>
            </div>

            <div className="grid gap-2.5 mt-3">
              {pendencias.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 bg-white">
                  <div>
                    <strong className="text-[13px]">{p.title}</strong>
                    <small className="block mt-0.5 text-gray-500 text-xs">{p.subtitle}</small>
                  </div>
                  <span className="text-xs border border-gray-200 text-gray-500 px-2.5 py-1.5 rounded-full">{p.tag}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 flex-wrap mt-3">
              <button className={btnPrimary} onClick={() => onAction("Criar aviso")}>Criar aviso</button>
              <button className={btn} onClick={() => onAction("Gerenciar usuários")}>Gerenciar usuários</button>
              <button className={btn} onClick={() => onAction("Exportar relatório")}>Exportar relatório</button>
            </div>
          </div>

          {/* Resumo financeiro */}
          <div className={`${card} col-span-12 lg:col-span-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Resumo financeiro</h3>
                <p className="mt-1 text-xs text-gray-500">Visão rápida do mês</p>
              </div>
              <span className="text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-full whitespace-nowrap">Mar/2026</span>
            </div>

            <div className="grid gap-2.5 mt-3">
              {financeiro.map((b) => (
                <div key={b.label} style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px", gap: 10, alignItems: "center" }}>
                  <div className="text-xs text-gray-500">{b.label}</div>
                  <div className="h-2.5 rounded-full bg-[#eef2f7] border border-gray-200 overflow-hidden">
                    <div className="h-full bg-gray-900 rounded-full" style={{ width: `${Math.min(100, Math.max(0, b.value))}%` }} />
                  </div>
                  <div className="text-right text-xs text-gray-500">{b.display}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 flex-wrap mt-3">
              <button className={btnPrimary} onClick={() => onAction("Registrar cobrança")}>Registrar cobrança</button>
              <button className={btn} onClick={() => onAction("Ver boletos em atraso")}>Boletos em atraso</button>
            </div>
          </div>
        </section>

        {/* Usuários cadastrados */}
        <section className="grid grid-cols-12 gap-4">
          <div className={`${card} col-span-12`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Usuários cadastrados</h3>
                <p className="mt-1 text-xs text-gray-500">Gerencie os acessos ao sistema</p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-full whitespace-nowrap">{users.length} usuários</span>
                <button className={`${btnPrimary} flex items-center gap-1.5`} onClick={openModal} title="Novo usuário">
                  <Plus size={15} />
                  Novo usuário
                </button>
              </div>
            </div>

            {usersLoading && <p className="mt-1 text-xs text-gray-500">Carregando...</p>}
            {usersError && <p className="text-[13px] text-red-600">{usersError}</p>}

            {!usersLoading && !usersError && (
              <table className="w-full border-collapse mt-3 text-[13px]">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">Nome</th>
                    <th className="text-left text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">Email</th>
                    <th className="text-left text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">Role</th>
                    <th className="text-right text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-2 py-2.5 border-b border-gray-200">{u.name}</td>
                      <td className="px-2 py-2.5 border-b border-gray-200">{u.email}</td>
                      <td className="px-2 py-2.5 border-b border-gray-200">{u.role}</td>
                      <td className="px-2 py-2.5 border-b border-gray-200">
                        <div className="flex gap-2 justify-end">
                          <button className="p-2 rounded-[10px] border border-gray-200 bg-white cursor-pointer" title="Alterar" onClick={() => onAction(`Alterar ${u.name}`)}>
                            <Pencil size={15} />
                          </button>
                          <button className="p-2 rounded-[10px] border border-gray-200 bg-white cursor-pointer text-red-600" title="Apagar" onClick={() => onAction(`Apagar ${u.name}`)}>
                            <Trash2 size={15} />
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

        {/* Ocorrências recentes */}
        <section className="grid grid-cols-12 gap-4">
          <div className={`${card} col-span-12`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold text-gray-900">Ocorrências recentes</h3>
                <p className="mt-1 text-xs text-gray-500">Acompanhe status e ações</p>
              </div>
              <span className="text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-full whitespace-nowrap">{ocorrencias.length} registros</span>
            </div>

            <table className="w-full border-collapse mt-3 text-[13px]">
              <thead>
                <tr>
                  {["ID", "Apto", "Tipo", "Status", "Data"].map((h) => (
                    <th key={h} className="text-left text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">{h}</th>
                  ))}
                  <th className="text-right text-xs text-gray-500 font-semibold px-2 py-2.5 border-b border-gray-200">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ocorrencias.map((o) => (
                  <tr key={o.id}>
                    <td className="px-2 py-2.5 border-b border-gray-200">{o.id}</td>
                    <td className="px-2 py-2.5 border-b border-gray-200">{o.apartment}</td>
                    <td className="px-2 py-2.5 border-b border-gray-200">{o.type}</td>
                    <td className="px-2 py-2.5 border-b border-gray-200">{o.status}</td>
                    <td className="px-2 py-2.5 border-b border-gray-200">{o.date}</td>
                    <td className="px-2 py-2.5 border-b border-gray-200">
                      <div className="flex gap-2 justify-end">
                        <button className="p-2 rounded-[10px] border border-gray-200 bg-white cursor-pointer" title="Ver" onClick={() => onAction(`Ver ${o.id}`)}>
                          <Eye size={15} />
                        </button>
                        <button className="p-2 rounded-[10px] border border-gray-200 bg-white cursor-pointer" title="Atualizar" onClick={() => onAction(`Atualizar ${o.id}`)}>
                          <RefreshCw size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex gap-2.5 flex-wrap mt-3">
              <button className={btn} onClick={() => onAction("Ver todas as ocorrências")}>Ver todas</button>
              <button className={btn} onClick={() => onAction("Abrir painel de segurança")}>Painel de segurança</button>
            </div>
          </div>
        </section>
      </div>

      {/* Modal — Novo usuário */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-1000" onClick={closeModal}>
          <div className="bg-white border border-gray-200 rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] w-full max-w-110 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="m-0 text-[15px] font-semibold text-gray-900">Novo usuário</h3>
              <button className="bg-transparent border-none cursor-pointer text-gray-500 p-1 flex rounded-md hover:bg-gray-200 hover:text-gray-900" onClick={closeModal} title="Fechar">
                <X size={18} />
              </button>
            </div>

            <form className="grid gap-3.5" onSubmit={handleCreate}>
              {[
                { id: "u-name", label: "Nome", type: "text", placeholder: "Nome completo", key: "name" as const },
                { id: "u-email", label: "Email", type: "email", placeholder: "email@exemplo.com", key: "email" as const },
                { id: "u-password", label: "Senha", type: "password", placeholder: "Mínimo 6 caracteres", key: "password" as const },
              ].map((f) => (
                <div key={f.id} className="grid gap-1.5">
                  <label htmlFor={f.id} className="text-xs font-semibold text-gray-500">{f.label}</label>
                  <input
                    id={f.id}
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    required
                    minLength={f.key === "password" ? 6 : undefined}
                    className="px-2.5 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-[13px] outline-none w-full focus:border-gray-900"
                  />
                </div>
              ))}

              <div className="grid gap-1.5">
                <label htmlFor="u-role" className="text-xs font-semibold text-gray-500">Perfil</label>
                <select
                  id="u-role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "MORADOR" })}
                  className="px-2.5 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-[13px] outline-none w-full focus:border-gray-900"
                >
                  <option value="MORADOR">Morador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              {formError && <p className="text-xs text-red-600 m-0">{formError}</p>}

              <div className="flex justify-end gap-2.5 mt-1">
                <button type="button" className={btn} onClick={closeModal} disabled={submitting}>Cancelar</button>
                <button type="submit" className={btnPrimary} disabled={submitting}>
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
