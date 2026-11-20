# Página: Landing (`/`)

Página pública de apresentação do produto OmniLar. Não requer autenticação.

---

## Seções

| Seção | ID | Descrição |
|---|---|---|
| Navbar | — | Fixa no topo, some ao rolar para baixo e reaparece ao subir |
| Hero | — | Headline, subtítulo e CTAs principais |
| Funcionalidades | `#funcionalidades` | 6 cards com ícones e descrições |
| Como funciona | `#como-funciona` | 3 passos numerados |
| Depoimentos | `#depoimentos` | 3 cards de clientes fictícios |
| CTA final | — | Seção escura com botão de WhatsApp |
| Footer | — | Links e copyright |

---

## Comportamentos

- **Scroll suave**: clicar nos links da navbar desliza até a seção correspondente via `scrollIntoView({ behavior: 'smooth' })`.
- **Navbar hide/show**: oculta ao rolar para baixo, reaparece ao rolar para cima.
- **Animações**: cards de funcionalidades animam com fade-up usando `IntersectionObserver` (hook `useInView`).
- **Botão "Ir ao topo"**: aparece após 300px de scroll, fixo no canto inferior direito.
- **WhatsApp**: botão "Falar com a equipe" abre `https://wa.me/5513991161032`.
- **Preços**: link na navbar redireciona para `/precos`.
- **Entrar**: botão no canto da navbar redireciona para `/login`.
