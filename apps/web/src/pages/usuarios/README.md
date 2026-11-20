# Página: Moradores (`/usuarios`)

Gerenciamento de usuários vinculados ao condomínio. Acesso por ADMIN, MORADOR e MASTER_ADMIN — com permissões diferentes.

---

## Permissões por role

| Role | Visualizar | Criar | Editar | Excluir |
|---|---|---|---|---|
| MASTER_ADMIN | Todos | ✅ | ✅ | ✅ |
| ADMIN | Mesmo condomínio | ✅ | ✅ | ✅ |
| MORADOR | Mesmo condomínio | ❌ | ❌ | ❌ |

---

## Fluxo

1. Ao carregar, busca os usuários via `listUsers(condominioUUID)`.
   - ADMIN filtra pelo `condominioUUID` do usuário logado.
   - MASTER_ADMIN vê todos.
2. Busca o plano do condomínio no Supabase para validar limites.
3. Filtros disponíveis: busca por texto, role, tipo de residente e status.

---

## Regra de limite por plano

Ao criar um novo morador (role `MORADOR`), o sistema conta os moradores existentes e compara com o limite do plano:

| Plano | Limite de moradores |
|---|---|
| OmniGO (`go`) | 20 |
| Omni+ (`plus`) | 100 |
| OmniUltra (`ultra`) | Ilimitado |

Se o limite for atingido, o cadastro é bloqueado com mensagem de erro inline no modal.

---

## Modal de criação/edição

Campos: Nome, E-mail, Telefone, Senha (só na criação), Placa, Pets, Role, Tipo de residente, Status, Apartamento.

- Telefone e placa têm validação de formato.
- Apartamento é selecionado a partir da estrutura do edifício (`predio`).

---

## Peculiaridades

- O título da página é "Moradores", não "Usuários".
- MORADOR vê a lista em modo somente leitura — sem botões de criar, editar ou excluir.
- A validação de limite só se aplica ao role `MORADOR`, não a ADMIN ou PORTEIRO.
