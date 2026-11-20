# Página: Financeiro (`/financeiro`)

Controle financeiro do condomínio. Acesso para ADMIN e MORADOR.

---

## Disponibilidade por plano

Disponível a partir do **OmniGO**. O link some do sidebar automaticamente se o plano não incluir a funcionalidade (verificado via `src/config/plans.ts`).

---

## Fluxo

- ADMIN visualiza e gerencia lançamentos, cobranças e boletos do condomínio.
- MORADOR visualiza seus próprios boletos e histórico de pagamentos.

---

## Peculiaridades

- Filtrado por `condominioUUID` do usuário logado.
- PORTEIRO não tem acesso a esta página.
