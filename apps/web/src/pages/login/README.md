# Página: Login (`/login`)

Ponto de entrada da plataforma. Suporta dois modos de autenticação: via Fastify (JWT multi-tenant) e via Supabase direto.

---

## Views

A página alterna entre 5 views usando estado React (`useState`):

| View | Descrição |
|---|---|
| `login` | Formulário principal de e-mail e senha |
| `select` | Dropdown de seleção de condomínio (quando vinculado a mais de um) |
| `forgot` | Formulário de recuperação de senha |
| `sent` | Confirmação de e-mail de recuperação enviado |
| `inactive` | Bloqueio quando todos os condomínios vinculados estão inativos |

---

## Fluxo principal

1. Usuário informa e-mail e senha e clica em **Entrar**.
2. Se `VITE_API_URL` estiver definido → tenta login via Fastify JWT.
   - Se a rede falhar → cai automaticamente no Supabase.
3. Se `VITE_API_URL` não estiver definido → login direto via Supabase.
4. O backend verifica se o usuário está vinculado a condomínios ativos (`usuario_condominio` + `condominios.active`).

### Resultado do login

- **Um condomínio ativo** → salva token e usuário no `localStorage` e redireciona para `/dashboard`.
- **Múltiplos condomínios ativos** → exibe a view `select` com dropdown dos condomínios.
- **Nenhum condomínio ativo** → exibe a view `inactive`.

---

## View: Seleção de condomínio

- Exibe dropdown com os condomínios ativos vinculados ao usuário.
- Abaixo do dropdown, exibe campo travado **"Seu perfil neste condomínio"** com o role do usuário naquele condomínio (lido da tabela `usuario_condominio.role`).
- Ao confirmar, chama `finalizeSupabaseLogin` que salva o `condominioUUID` correto no `localStorage`.

---

## View: Condomínio inativo

Exibida quando todos os condomínios vinculados ao usuário estão com `active = false`. Mostra ícone de telefone e a mensagem:
> "O condomínio vinculado à sua conta está inativo. Entre em contato com o síndico responsável."

---

## Recuperação de senha

Usa `supabase.auth.resetPasswordForEmail` com redirect para `/reset-password`.

---

## Peculiaridades

- O `condominioUUID` salvo no `localStorage` é preservado pelo `refreshStoredUser` — nunca sobrescrito ao recarregar a página, garantindo que o usuário continue vendo os dados do condomínio correto após selecionar.
- O Supabase recebe uma sessão paralela (não-bloqueante) mesmo no fluxo Fastify, para que as políticas RLS funcionem corretamente.
