# Tracking Hub Multi-Plataforma — PlayBet

## Visão Geral

O Tracking Hub é a central de performance e tracking de afiliados da PlayBet, projetada para consolidar métricas de múltiplas plataformas de iGaming (ex: 1win) em um único painel executivo.

---

## Estrutura do Sistema

### Tabelas Reaproveitadas (já existiam)

| Tabela | Papel no Tracking |
|--------|-------------------|
| `platforms` | Cadastro das casas/plataformas |
| `influencers` | Influenciadores vinculados aos eventos |
| `campanhas` | Campanhas de marketing |
| `conteudo` | Conteúdos/criativos |
| `landing_pages` | Landing pages de destino |
| `landing_page_instances` | Instâncias por influencer |
| `utms` | Links/UTMs existentes |
| `clicks` | Topo do funil de cliques |

### Tabelas Criadas (novas)

| Tabela | Objetivo |
|--------|----------|
| `platform_accounts` | Contas de afiliado por plataforma (login, manager, comissão) |
| `tracking_links` | Links rastreáveis com tracking_code e SUBIDs |
| `platform_event_mappings` | Tradução de eventos raw → canônicos por plataforma |
| `tracking_events` | Log de eventos reais recebidos via postback/API/manual |
| `tracking_metrics` | Métricas consolidadas diárias (cliques, FTD, revenue, ROI) |
| `tracking_snapshots` | Snapshots temporais de dashboards externos |

---

## Fluxo: Do Clique ao Revenue

```
1. Clique na LP
   └─ clicks (tabela existente) + landing_page_instances

2. Geração do Tracking Link
   └─ tracking_links (com tracking_code + SUBIDs)
   └─ Vinculado a: platform_account, influencer, campanha, LP

3. Postback da Plataforma
   └─ Edge Function: /functions/v1/tracking-postback/{platform}
   └─ Recebe: event, sub1-sub10, amount, user_id, country
   └─ Consulta platform_event_mappings para traduzir raw → canônico
   └─ Grava em tracking_events com deduplicação

4. Consolidação
   └─ tracking_metrics (diário, por plataforma/influencer/campanha)
   └─ Fórmulas: ROI, EPC, CR, Ticket Médio

5. Dashboard /tracking
   └─ KPIs, funil, rankings, alertas operacionais
```

---

## Eventos Canônicos

| Evento | Descrição |
|--------|-----------|
| `click` | Clique no link de afiliado |
| `registration` | Cadastro do jogador |
| `ftd` | First Time Deposit |
| `deposit` | Qualquer depósito |
| `redeposit` | Depósito recorrente |
| `revenue` | Receita/comissão gerada |
| `withdrawable_revenue` | Revenue sacável |
| `app_install` | Instalação do app |
| `qualified_player` | Jogador qualificado (etapa intermediária) |

---

## Padrão de SUBIDs

| SUBID | Conteúdo |
|-------|----------|
| sub1 | click_id (obrigatório) |
| sub2 | influencer_id |
| sub3 | campanha_id |
| sub4 | conteudo_id |
| sub5 | landing_page_instance_id |
| sub6 | tracking_code |
| sub7 | utm_source |
| sub8 | utm_medium |
| sub9 | utm_campaign |
| sub10 | reservado |

---

## Como Cadastrar uma Nova Plataforma

1. Ir em **Plataformas** (`/plataformas`) → Criar nova plataforma
2. Ir em **Tracking Hub > Contas** (`/tracking/accounts`) → Criar conta vinculada à plataforma
3. Ir em **Tracking Hub > Mapeamentos** (`/tracking/mappings`) → Criar mapeamentos de eventos (raw → canônico)
4. Configurar a URL de postback na plataforma:
   ```
   https://rcrrbznhatdqcmfyzgbt.supabase.co/functions/v1/tracking-postback/{slug_plataforma}
   ```

---

## Como Usar a Edge Function tracking-postback

### URL
```
POST /functions/v1/tracking-postback/{platform_slug}
GET  /functions/v1/tracking-postback/{platform_slug}?event=registration&sub1=click123&...
```

### Parâmetros Aceitos
- `event` / `action` / `type` — nome do evento
- `sub1` a `sub10` — SUBIDs
- `amount` — valor monetário
- `transaction_id` / `tid` — ID da transação
- `user_id` / `player_id` — ID do jogador na plataforma
- `country` — país
- `currency` — moeda
- `commission` — valor de comissão
- `status` — status do evento
- `timestamp` — timestamp do evento

### Deduplicação
Baseada na combinação: `platform_account_id` + `transaction_id` + `raw_event_name` + `event_timestamp`

---

## Telas do Tracking Hub

| Rota | Função |
|------|--------|
| `/tracking` | Dashboard principal com KPIs, gráficos, funil, rankings e alertas |
| `/tracking/accounts` | CRUD de contas por plataforma |
| `/tracking/links` | Gestão de tracking links |
| `/tracking/mappings` | Mapeamento de eventos por plataforma |
| `/tracking/events` | Lista de eventos brutos com inspeção de payload |
| `/tracking/snapshots` | Histórico de snapshots importados |
| `/tracking/metrics` | Registro manual de métricas consolidadas |

---

## Fórmulas Calculadas

- **CR Registro** = registros / cliques
- **CR FTD** = FTD / cliques
- **Ticket Médio** = depósitos_total / (FTD + redepósitos)
- **EPC** = revenue / cliques
- **ROI** = (revenue_líquido - custo_total) / custo_total
- **Rev/Registro** = revenue / registros
- **Rev/FTD** = revenue / FTD

---

## Alertas Operacionais

O dashboard detecta automaticamente:
- Eventos duplicados
- Eventos sem click_id
- Plataformas com muitos cliques e baixo FTD
- Revenue sem saque conciliado
