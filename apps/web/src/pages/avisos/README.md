# Página: Avisos (`/avisos`)

Central de comunicados do condomínio. Disponível para todos os roles.

---

## Fluxo

1. Busca o `condominioUUID` do usuário direto na tabela `usuario_condominio` e filtra os avisos por ele (somente `removed = false`).
2. ADMIN pode criar, editar e excluir avisos.
3. MORADOR e PORTEIRO visualizam em modo leitura.

---

## Tipos de aviso

| Tipo         | Cor       |
|--------------|-----------|
| Informativo  | Azul      |
| Manutenção   | Âmbar     |
| Assembleia   | Índigo    |
| Segurança    | Vermelho  |
| Eventos      | Esmeralda |

Cada tipo é exibido como badge colorido tanto na lista quanto nas notificações do sino.

---

## Toolbar e Filtros

A toolbar segue o padrão de tabelas do sistema:

- **Botão de filtro** (ícone) — abre o painel lateral direito. Exibe um badge com a contagem de filtros ativos.
- **Barra de busca** — filtra em tempo real por `titulo` e `descricao`. Sincronizada na URL (`?q=`).
- **Botão "Novo Aviso"** — visível apenas para ADMIN.

### Painel de filtros (drawer direita)

Abre sobrepondo a tela com backdrop. Fecha via botão X, clique no backdrop ou tecla `Escape`.

| Campo       | Tipo           | Comportamento                                  |
|-------------|----------------|------------------------------------------------|
| Tipo        | Checkboxes     | Seleção múltipla. Vazio = todos os tipos.      |
| Expira em   | Radio          | Todos / Ativos / Expirados                     |
| Fixado      | Radio          | Todos / Fixados / Não fixados                  |
| Ordenar por | Select + Radio | Coluna + direção (crescente/decrescente)        |

Filtros só são aplicados ao clicar em **Aplicar**. O botão **Limpar** reseta o draft sem fechar o painel.

---

## Query Params (URL compartilhável)

Todos os filtros, ordenação e paginação vivem na URL. Copiar e compartilhar a URL reproduz exatamente o mesmo estado.

| Param      | Valores                                          | Default        |
|------------|--------------------------------------------------|----------------|
| `q`        | texto livre                                      | —              |
| `tipo`     | tipos separados por vírgula (`Informativo,Segurança`) | —         |
| `expirado` | `sim` \| `nao`                                   | —              |
| `fixado`   | `sim` \| `nao`                                   | —              |
| `sort`     | `titulo` \| `tipo` \| `created_at` \| `data_expiracao` \| `curtidas_count` | `created_at` |
| `dir`      | `asc` \| `desc`                                  | `desc`         |
| `page`     | número                                           | `1`            |
| `size`     | `10` \| `20` \| `50`                             | `10`           |

---

## Paginação

Rodapé da tabela (desktop) e card separado (mobile):

- **Esquerda:** `X–Y de Z` (intervalo da página atual sobre o total filtrado)
- **Direita:** seletor de itens por página + botões `<` página `/` total `>`

---

## Cabeçalhos da tabela

Sempre em maiúsculas (`uppercase tracking-wider text-xs`). Colunas clicáveis para ordenação exibem ícone de seta.

| Coluna       | Ordenável | Observações                                  |
|--------------|-----------|----------------------------------------------|
| (pin)        | Não       | Ícone de fixado; fixados sempre sobem ao topo |
| TÍTULO       | Sim       | Truncado com `max-w-64`; ponto âmbar se destaque |
| TIPO         | Sim       | Badge colorido                               |
| PUBLICADO POR| Não       | Nome do autor (`profiles.name`)              |
| DATA         | Sim       | Data de criação (`dd/mm/aa`)                 |
| EXPIRA EM    | Sim       | Vermelho + "· expirado" se vencido           |
| CURTIDAS     | Sim       | Botão de curtir inline                       |
| AÇÕES        | Não       | Editar / Fixar / Excluir (ADMIN only)        |

---

## Arquivamento automático (pg_cron)

Avisos com `data_expiracao < hoje` são automaticamente arquivados pelo job `expire-avisos-daily`:

- **Coluna:** `removed boolean DEFAULT false` na tabela `avisos`
- **Função:** `expire_avisos_job()` — `SECURITY DEFINER`, bypassa RLS
- **Agendamento:** todo dia à meia-noite (`0 0 * * *` via `pg_cron`)
- **Listagem:** `listAvisos` filtra `.eq("removed", false)` — arquivados nunca aparecem na UI
- **Migration:** `20260508_avisos_removed_pgcron.sql`

> Requer a extensão `pg_cron` habilitada no Supabase (Database → Extensions).

---

## Peculiaridades

- O `condominioUUID` é sempre buscado diretamente na tabela `usuario_condominio` (filtrando `user_id` e `active = true`). Não usa `localStorage`.
- Avisos aparecem no painel de notificações (sino no header) como não lidos até o usuário marcar como lido.
- Avisos com 3+ curtidas recebem destaque visual (fundo âmbar + ponto âmbar no título).
- Fixados sobem sempre ao topo independentemente da ordenação escolhida.
