import { useEffect, useState } from "react";
import { Eye, Pencil, RefreshCw, Trash2 } from "lucide-react";
import AppLayout from "../../components/AppLayout";
import { getToken } from "../../services/auth";
import { listUsers, type UserRecord } from "../../services/users";
import "../../styles/pages/dashboardAdmin.css";

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

export default function DashboardAdmin() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");

  useEffect(() => {
    listUsers(getToken()!)
      .then(setUsers)
      .catch((e: Error) => setUsersError(e.message))
      .finally(() => setUsersLoading(false));
  }, []);

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
      <div className="admin-grid">
        {/* KPIs */}
        <section className="admin-kpis">
          <div className="admin-card admin-span-3">
            <div className="admin-cardHead">
              <div>
                <h3 className="admin-title">Moradores</h3>
                <p className="admin-sub">Ativos no sistema</p>
              </div>
              <span className="admin-badge">Hoje</span>
            </div>
            <div className="admin-kpi">128</div>
            <p className="admin-sub">+2 novos cadastros</p>
          </div>

          <div className="admin-card admin-span-3">
            <div className="admin-cardHead">
              <div>
                <h3 className="admin-title">Reservas</h3>
                <p className="admin-sub">Esta semana</p>
              </div>
              <span className="admin-badge">Semanal</span>
            </div>
            <div className="admin-kpi">12</div>
            <p className="admin-sub">3 aguardando aprovação</p>
          </div>

          <div className="admin-card admin-span-3">
            <div className="admin-cardHead">
              <div>
                <h3 className="admin-title">Ocorrências</h3>
                <p className="admin-sub">Últimas 24h</p>
              </div>
              <span className="admin-badge">Diário</span>
            </div>
            <div className="admin-kpi">3</div>
            <p className="admin-sub">1 crítica • 2 normais</p>
          </div>

          <div className="admin-card admin-span-3">
            <div className="admin-cardHead">
              <div>
                <h3 className="admin-title">Inadimplência</h3>
                <p className="admin-sub">Mês atual</p>
              </div>
              <span className="admin-badge">Financeiro</span>
            </div>
            <div className="admin-kpi">7%</div>
            <p className="admin-sub">9 boletos em atraso</p>
          </div>
        </section>

        {/* Pendências + Ações rápidas */}
        <section className="admin-kpis">
          <div className="admin-card admin-span-7">
            <div className="admin-cardHead">
              <div>
                <h3 className="admin-title">Pendências</h3>
                <p className="admin-sub">Fila de aprovações e validações</p>
              </div>
              <span className="admin-badge">{pendencias.length} itens</span>
            </div>

            <div className="admin-list">
              {pendencias.map((p, idx) => (
                <div className="admin-item" key={idx}>
                  <div>
                    <strong>{p.title}</strong>
                    <small>{p.subtitle}</small>
                  </div>
                  <span className="admin-pill">{p.tag}</span>
                </div>
              ))}
            </div>

            <div className="admin-actions">
              <button className="admin-btn admin-btnPrimary" onClick={() => onAction("Criar aviso")}>
                Criar aviso
              </button>
              <button className="admin-btn" onClick={() => onAction("Gerenciar usuários")}>
                Gerenciar usuários
              </button>
              <button className="admin-btn" onClick={() => onAction("Exportar relatório")}>
                Exportar relatório
              </button>
            </div>
          </div>

          <div className="admin-card admin-span-5">
            <div className="admin-cardHead">
              <div>
                <h3 className="admin-title">Resumo financeiro</h3>
                <p className="admin-sub">Visão rápida do mês</p>
              </div>
              <span className="admin-badge">Mar/2026</span>
            </div>

            <div className="admin-bars">
              {financeiro.map((b) => (
                <div className="admin-barRow" key={b.label}>
                  <div className="admin-barLabel">{b.label}</div>
                  <div className="admin-barTrack">
                    <div className="admin-barFill" style={{ width: `${Math.min(100, Math.max(0, b.value))}%` }} />
                  </div>
                  <div className="admin-barValue">{b.display}</div>
                </div>
              ))}
            </div>

            <div className="admin-actions">
              <button className="admin-btn admin-btnPrimary" onClick={() => onAction("Registrar cobrança")}>
                Registrar cobrança
              </button>
              <button className="admin-btn" onClick={() => onAction("Ver boletos em atraso")}>
                Boletos em atraso
              </button>
            </div>
          </div>
        </section>

        {/* Usuários cadastrados */}
        <section className="admin-kpis">
          <div className="admin-card admin-span-12">
            <div className="admin-cardHead">
              <div>
                <h3 className="admin-title">Usuários cadastrados</h3>
                <p className="admin-sub">Gerencie os acessos ao sistema</p>
              </div>
              <span className="admin-badge">{users.length} usuários</span>
            </div>

            {usersLoading && <p className="admin-sub">Carregando...</p>}
            {usersError && <p style={{ color: "crimson", fontSize: 13 }}>{usersError}</p>}

            {!usersLoading && !usersError && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th style={{ textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>
                        <div className="admin-rowActions">
                          <button className="admin-miniBtn" title="Alterar" onClick={() => onAction(`Alterar ${u.name}`)}>
                            <Pencil size={15} />
                          </button>
                          <button className="admin-miniBtn" title="Apagar" style={{ color: "crimson" }} onClick={() => onAction(`Apagar ${u.name}`)}>
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
        <section className="admin-kpis">
          <div className="admin-card admin-span-12">
            <div className="admin-cardHead">
              <div>
                <h3 className="admin-title">Ocorrências recentes</h3>
                <p className="admin-sub">Acompanhe status e ações</p>
              </div>
              <span className="admin-badge">{ocorrencias.length} registros</span>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Apto</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {ocorrencias.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.apartment}</td>
                    <td>{o.type}</td>
                    <td>{o.status}</td>
                    <td>{o.date}</td>
                    <td>
                      <div className="admin-rowActions">
                        <button className="admin-miniBtn" title="Ver" onClick={() => onAction(`Ver ${o.id}`)}>
                          <Eye size={15} />
                        </button>
                        <button className="admin-miniBtn" title="Atualizar" onClick={() => onAction(`Atualizar ${o.id}`)}>
                          <RefreshCw size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="admin-actions">
              <button className="admin-btn" onClick={() => onAction("Ver todas as ocorrências")}>
                Ver todas
              </button>
              <button className="admin-btn" onClick={() => onAction("Abrir painel de segurança")}>
                Painel de segurança
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}