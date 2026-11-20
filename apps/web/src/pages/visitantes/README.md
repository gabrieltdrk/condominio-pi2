# Página: Visitantes (`/visitantes`)

Controle de entrada e saída de visitantes. Acesso para ADMIN, MORADOR e PORTEIRO.

---

## Arquivos

| Arquivo | Rota | Descrição |
|---|---|---|
| `index.tsx` | `/visitantes` | Lista e cadastro de visitantes |
| `aprovacao.tsx` | `/visitantes/aprovacao` | Aprovação de entrada pelo morador |
| `cartao.tsx` | `/visitantes/cartao` | Cartão de acesso do visitante (QR code) |

---

## Fluxo

1. Morador ou porteiro cadastra um visitante com nome, documento e data de visita.
2. O sistema gera um link de aprovação enviado ao morador.
3. Morador aprova via `/visitantes/aprovacao`.
4. Visitante recebe cartão de acesso via `/visitantes/cartao`.

---

## Peculiaridades

- As rotas `/visitantes/aprovacao` e `/visitantes/cartao` são **públicas** (sem `ProtectedRoute`) para permitir acesso sem login pelo visitante ou morador via link externo.
