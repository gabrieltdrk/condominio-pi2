# Página: Redefinir senha (`/reset-password`)

Página acessada via link enviado por e-mail após solicitar recuperação de senha em `/login`.

---

## Fluxo

1. Usuário clica no link recebido por e-mail.
2. Supabase Auth valida o token na URL.
3. Usuário define uma nova senha via `supabase.auth.updateUser`.
4. Após sucesso, redireciona para `/login`.

---

## Peculiaridades

- Rota pública — não requer autenticação prévia.
- O token de redefinição vem na URL como hash fragment, processado automaticamente pelo cliente Supabase.
