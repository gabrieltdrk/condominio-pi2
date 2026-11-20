# Página: Condomínios (`/condominios`)

Acesso restrito a **MASTER_ADMIN**. Permite cadastrar, editar e ativar/desativar condomínios na plataforma.

---

## Fluxo

1. Ao entrar, busca todos os condomínios no Supabase (`condominios` tabela) ordenados por nome.
2. A busca filtra por nome, cidade ou CNPJ em tempo real.
3. Clicar em **Novo Condomínio** abre o modal de criação.
4. Clicar no ícone de lápis abre o modal de edição com os dados preenchidos.
5. O toggle de status ativa/desativa o condomínio — desativar bloqueia o login de todos os usuários vinculados.

---

## Modal

### Identificação
- **Nome** (obrigatório): nome do condomínio exibido em toda a plataforma.
- **CNPJ**: formatado automaticamente (`00.000.000/0000-00`).
- **Plano** (obrigatório): define quais funcionalidades e quantos moradores o condomínio pode ter.
- **Status**: toggle ativo/inativo.

### Endereço
- **CEP** (obrigatório): ao sair do campo, consulta a API ViaCEP e preenche automaticamente logradouro, bairro, cidade e UF — esses campos são somente leitura.
- **Número** (obrigatório): preenchido manualmente.
- **Referência**: opcional.

### Gestão Administrativa

**Síndico**
- Nome, telefone (formatado `(00) 00000-0000`) e e-mail.

**Administradora**
- Nome da empresa, telefone de contato e e-mail de contato.

---

## Tabela

| Coluna | Descrição |
|---|---|
| Mapa | Ícone que abre o Google Maps com o endereço completo |
| Nome | Nome + endereço completo abaixo (separado por `—`) |
| CNPJ | CNPJ formatado |
| Síndico | Nome, telefone (WhatsApp) e e-mail clicáveis |
| Status | Toggle verde (ativo) / vermelho (inativo) |
| Administradora | Nome, telefone (WhatsApp) e e-mail clicáveis |
| Alterar | Ícone de lápis para edição |

---

## Planos

Os planos definem o limite de moradores e as funcionalidades disponíveis. São armazenados na coluna `plan` da tabela `condominios`.

| ID no banco | Nome exibido | Moradores | Preço mensal |
|---|---|---|---|
| `go` | OmniGO | até 20 | R$ 109,99 |
| `plus` | Omni+ | até 100 | R$ 169,99 |
| `ultra` | OmniUltra | ilimitado | Sob consulta |

### Funcionalidades por plano

| Funcionalidade | OmniGO | Omni+ | OmniUltra |
|---|---|---|---|
| Avisos e comunicados | ✅ | ✅ | ✅ |
| Controle financeiro | ✅ | ✅ | ✅ |
| Agendamento de áreas | ✅ | ✅ | ✅ |
| Gestão de ocorrências | ❌ | ✅ | ✅ |
| Relatórios financeiros | ❌ | ✅ | ✅ |
| Suporte prioritário | ❌ | ✅ | ✅ |
| Relatórios avançados | ❌ | ❌ | ✅ |
| Suporte dedicado (SLA) | ❌ | ❌ | ✅ |

As regras são definidas em `src/config/plans.ts` e aplicadas no sidebar e no cadastro de moradores.

---

## Regras de negócio

- Desativar um condomínio impede o login de todos os usuários vinculados — ao tentar logar, verão a tela "Entre em contato com o síndico responsável".
- Ao ativar um condomínio inativo, os usuários voltam a conseguir logar normalmente.
- O plano é verificado ao cadastrar moradores: se o limite for atingido, o sistema bloqueia o cadastro com mensagem de erro.
