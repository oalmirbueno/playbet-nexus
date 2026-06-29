# Refatoração: Links, Pessoas, Tracking e Reconciliação

## Objetivo
Tornar o fluxo universal (não focado em 1win), reduzir cliques, organizar hierarquia de pessoas (Squad → Gerente → Influencer → Sócio) e limpar abas redundantes.

## 1. Novo Link Afiliado (TrackingLinkForm)
Esteira única no diálogo, com **criação inline** quando o item não existe:
- **Influencer** → select + botão "+ Novo" (cria direto, slug auto)
- **Landing Page** → select + "+ Nova LP" inline (nome, url base)
- **Plataforma** → select + "+ Nova" inline
- **Link de afiliado bruto** → cola URL → detecta plataforma automaticamente (match por domínio em `platforms.domains`)
- **SubID/slug** → preenchido com slug do influencer (editável)
- **Campanha** (opcional) → select
- **Papel do vínculo** → select compacto
- Preview do link final com `sub1` universal (qualquer casa)
- Botão "Salvar e copiar"

## 2. Detecção universal de plataforma
- Coluna `domains text[]` em `platforms` (ex.: `['1win.com','1wxxxx.com']`)
- Função `detectPlatformByUrl(url, platforms)` no client casa hostname → platform_id
- Remove qualquer lógica hardcoded 1win do form

## 3. Sidebar reorganizado
Estrutura final:
```
VISÃO GERAL → Dashboard
LINKS       → Links Afiliados
TRACKING    → Eventos, Reconciliação, Postbacks
ATIVOS      → Plataformas, Landing Pages (Templates+Instances unificado), Distribuição LP
PESSOAS     → Squads, Gerentes, Influencers, Sócios  (tudo em sub-itens, sem duplicar)
MARKETING   → Campanhas, Conteúdo
FINANCEIRO  → Reconciliação, Comissões, Saques, Asaas
CONFIG
```
- **Remove "Jogos"** do menu principal (mantém tabela, oculta UI)
- "Pessoas" vira hub com 4 abas internas em uma única página

## 4. Página Pessoas (refator)
- Abas: **Squads | Gerentes | Influencers | Sócios**
- Aba Squads: card por squad mostra Gerente responsável + lista de influencers vinculados
- Aba Gerentes: ao clicar, abre painel lateral com seleção de squad + lista de influencers do squad
- Aba Influencers: já existe, mantém com filtro por squad/gerente
- Aba Sócios: migra de `Socios.tsx` pra cá

### DB
- Tabela `squads` (id, name, color, manager_id, monthly_goal)
- `influencers.squad_id` (FK)
- `managers.squad_id` opcional (gerente pode liderar 1 squad)

## 5. Tracking & Reconciliação
- **Eventos**: tabela limpa com filtros (data, plataforma, evento canônico, status), badge de status, sem colunas técnicas redundantes
- **Reconciliação financeira**: dashboard com 3 colunas → Esperado (postback) | Confirmado (plataforma) | Asaas (recebido). Diferenças destacadas. Botão "Marcar reconciliado".
- Universal: nada hardcoded por casa; tudo via `platform_event_mappings`

## 6. Distribuição de LP
- Reorganiza `LPInstances` em board: LP-mãe → instâncias por influencer → link gerado. Botão único "Distribuir para influencer" que abre o mesmo diálogo de Novo Link já com LP preenchida.

---

## Resumo técnico
- 1 migration: `squads`, FKs em `influencers`/`managers`, `platforms.domains text[]`
- Reescrita: `TrackingLinkForm.tsx`, `QuickLinkDialog.tsx`, `Influencers.tsx` (vira `Pessoas.tsx`), `DashboardLayout.tsx`, `TrackingEvents.tsx`, `Reconciliacao.tsx`, `LPInstances.tsx`
- Novos componentes: `InlineCreateCombobox`, `PlatformDetector`, `SquadBoard`
- Remove rota/menu Jogos (mantém dados)

## Ordem de execução
1. Migration (squads + domains)
2. Sidebar + rotas
3. Página Pessoas unificada
4. Form Novo Link com criação inline + detecção universal
5. Tracking Eventos enxuto
6. Reconciliação 3 colunas
7. Distribuição LP

Quer que eu siga nessa ordem ou priorize algum bloco?