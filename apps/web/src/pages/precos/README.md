# Página: Preços (`/precos`)

Página pública de apresentação dos planos. Não requer autenticação.

---

## Planos

| Plano | Preço mensal | Preço anual | Moradores |
|---|---|---|---|
| OmniGO | R$ 109,99 | R$ 87,99 (−20%) | até 20 |
| Omni+ | R$ 169,99 | R$ 135,99 (−20%) | até 100 |
| OmniUltra | Sob consulta | Sob consulta | Ilimitado |

O Omni+ é destacado visualmente como "Mais popular" com fundo `#223555`.

---

## Toggle mensal/anual

- Alterna entre preço mensal e anual.
- No modo anual: exibe o preço com desconto, o preço original riscado ao lado e a tag "20% de desconto · cobrado anualmente".
- OmniUltra exibe "Sob consulta" em ambos os modos, sem riscado.

---

## Tabela comparativa

Exibe todas as funcionalidades com checkmarks (✓) ou traço (—) por plano. Segue exatamente as regras definidas em `src/config/plans.ts`.

---

## FAQ

5 perguntas em accordion expansível:
1. O que é o OmniLar?
2. Posso cancelar a qualquer momento?
3. Funciona para condomínios pequenos?
4. Como funciona o suporte?
5. Há período de teste gratuito?

---

## CTAs

- **OmniGO e Omni+**: botão "Assinar agora".
- **OmniUltra**: botão "Falar com a equipe" → abre WhatsApp `https://wa.me/5513991161032`.
- Botão "Ir ao topo" fixo no canto inferior direito após 300px de scroll.
