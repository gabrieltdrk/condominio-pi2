# Página: Edifício (`/predio`)

Mapa interativo do edifício com estrutura de torres, andares e apartamentos. Acesso restrito a ADMIN e MASTER_ADMIN.

---

## Fluxo

1. Exibe a planta do edifício organizada por torres e andares.
2. ADMIN pode cadastrar torres, andares e apartamentos.
3. Cada apartamento pode ser vinculado a um morador.
4. A estrutura do edifício é usada no cadastro de moradores para associar o apartamento correto.

---

## Peculiaridades

- Os dados de apartamentos são usados em `/usuarios` no campo de seleção de apartamento.
- Filtrado por `condominioUUID`.
