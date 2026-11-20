# Página: Selecionar Condomínio (`/select-condominium`)

Página legada usada no fluxo Fastify JWT quando o usuário está vinculado a múltiplos condomínios. No fluxo Supabase, a seleção ocorre inline na própria tela de `/login`.

---

## Fluxo (Fastify)

1. Após login, o backend retorna `requiresSelection: true` com lista de condomínios e um `selectionToken` salvo no `sessionStorage`.
2. O usuário é redirecionado para esta página.
3. Ao selecionar um condomínio, chama `selectCondominio(id)` que troca o `selectionToken` por um JWT definitivo.
4. Redireciona para `/dashboard`.

---

## Peculiaridades

- Se não houver `selectionToken` no `sessionStorage`, redireciona imediatamente para `/login`.
- Esta página só é usada quando o backend Fastify está disponível (`VITE_API_URL` definido). No ambiente de produção Vercel sem backend, o fluxo de seleção ocorre inline no `/login`.
