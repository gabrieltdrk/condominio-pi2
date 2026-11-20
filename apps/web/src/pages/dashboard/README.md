# Página: Dashboard (`/dashboard`)

Página inicial pós-login. Redireciona para o dashboard correto com base no role do usuário.

---

## Roteamento por role

| Role | Componente carregado |
|---|---|
| ADMIN / MASTER_ADMIN | `dashboard-admin.tsx` |
| MORADOR / PORTEIRO | `dashboard-user.tsx` |

---

## dashboard-admin

Visão geral do condomínio para o síndico/administrador. Exibe métricas, listagem de moradores, avisos recentes e ações rápidas.

## dashboard-user

Visão do morador. Exibe avisos do condomínio, encomendas pendentes, agendamentos e informações do apartamento.
