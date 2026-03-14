# Tracking Hub Multi-Plataforma — PlayBet

## Visão Geral

O Tracking Hub é a central de performance e tracking de afiliados da PlayBet, projetada para consolidar métricas de múltiplas plataformas de iGaming (ex: 1win) em um único painel executivo.

---

## Estrutura do Sistema

### Tabelas Reaproveitadas (já existiam)

| Tabela | Papel no Tracking |
|--------|-------------------|
| `platforms` | Cadastro das casas/plataformas (campos: id, name, commission_type, revshare, cpa, currency, etc.) |
| `influencers` | Influenciadores vinculados aos eventos |
| `campanhas` | Campanhas de marketing |
| `conteudo` | Conteúdos/criativos |
| `landing_pages` | Landing pages de destino |
| `landing_page_instances` | Instâncias por influencer |
| `utms` | Links/UTMs existentes |
| `clicks` | Topo do funil de cliques |

> **Nota:** A tabela `platforms` **não possui** coluna `slug`. O postback resolve a plataforma via `ilike` no campo `name`.

### Tabelas Criadas (novas)

| Tabela | Objetivo |
|--------|----------|
| `platform_accounts` | Contas de afiliado por plataforma (nome_conta, moeda, modelo_comissao, manager, etc.) |
| `tracking_links` | Links rastreáveis com tracking_code e SUBIDs |
| `platform_event_mappings` | Tradução de eventos raw → canônicos por plataforma |
| `tracking_events` | Log de eventos reais recebidos via postback/API/manual |
| `tracking_metrics` | Métricas consolidadas diárias (campo de data: `data_ref` tipo DATE) |
| `tracking_snapshots` | Snapshots temporais de dashboards externos (campo de data: `data_snapshot` tipo DATE) |

---

## Schema Real das Tabelas Novas

### platform_accounts
- `id` (uuid PK)
- `platform_id` (uuid FK → platforms)
- `nome_conta` (text NOT NULL)
- `account_external_id` (text)
- `moeda` (text, default 'BRL')
- `modelo_comissao` (text) — revshare, cpa, hybrid
- `revshare_percent` (numeric)
- `cpa_value` (numeric)
- `hybrid_details` (text)
- `manager_name`, `manager_email`, `manager_whatsapp`, `manager_telegram` (text)
- `login_url`, `dashboard_url` (text)
- `notes` (text)
- `is_active` (boolean, default true)
- `is_demo` (boolean, default false)
- `created_at`, `updated_at` (timestamptz)

### tracking_links
- `id` (uuid PK)
- `platform_account_id` (uuid FK → platform_accounts)
- `landing_page_instance_id` (uuid FK → landing_page_instances)
- `landing_page_id` (uuid FK → landing_pages)
- `influencer_id` (uuid FK → influencers)
- `campanha_id` (uuid FK → campanhas)
- `conteudo_id` (uuid FK → conteudo)
- `utm_id` (uuid FK → utms)
- `tracking_code` (text NOT NULL, auto-generated hex)
- `click_id_param_name` (text, default 'sub1')
- `base_url`, `final_url`, `short_url` (text)
- `status` (text, default 'active')
- `notes` (text)
- `is_demo`, `created_at`, `updated_at`

### platform_event_mappings
- `id` (uuid PK)
- `platform_id` (uuid FK → platforms, NOT NULL)
- `platform_account_id` (uuid FK → platform_accounts)
- `raw_event_name` (text NOT NULL) — nome do evento como vem da plataforma
- `canonical_event_name` (text NOT NULL) — nome canônico
- `sub1_field` ... `sub10_field` (text) — mapeamento de SUBIDs
- `amount_field`, `currency_field`, `transaction_id_field`, `user_id_field`, `country_field`, `status_field` (text)
- `is_active` (boolean, default true)
- `notes`, `is_demo`, `created_at`, `updated_at`

### tracking_events
- `id` (uuid PK)
- `platform_id`, `platform_account_id` (uuid FK)
- `tracking_link_id`, `landing_page_instance_id`, `landing_page_id` (uuid FK)
- `influencer_id`, `campanha_id`, `conteudo_id`, `utm_id` (uuid FK)
- `click_id` (text) — ID do clique, aceita qualquer formato
- `platform_user_id` (text)
- `raw_event_name` (text NOT NULL)
- `canonical_event_name` (text NOT NULL)
- `event_timestamp` (timestamptz NOT NULL, default now())
- `transaction_id` (text)
- `amount`, `commission_amount` (numeric)
- `currency` (text, default 'BRL')
- `status`, `country` (text)
- `source_type` (text NOT NULL, default 'postback') — postback, api, manual, csv
- `raw_payload` (jsonb) — payload bruto completo
- `is_duplicate` (boolean, default false)
- `processed_at` (timestamptz)
- `is_demo`, `created_at`, `updated_at`

**Índice de deduplicação:** `idx_tracking_events_dedup_tx` — unique parcial em `(platform_account_id, transaction_id, raw_event_name)` onde ambos NOT NULL.

### tracking_metrics
- `id` (uuid PK)
- `platform_id`, `platform_account_id` (uuid FK)
- `influencer_id`, `campanha_id`, `conteudo_id`, `utm_id` (uuid FK)
- `landing_page_id`, `landing_page_instance_id` (uuid FK)
- `data_ref` (date NOT NULL) — **campo de data de referência**
- `cliques`, `registros`, `ftd`, `redepositos` (integer)
- `deposits_count`, `redeposits_count` (integer)
- `depositos_total`, `redeposit_amount` (numeric)
- `revenue`, `revenue_liquido`, `saque_disponivel` (numeric)
- `custo_trafego`, `custo_influencer`, `cost_amount`, `profit_amount` (numeric)
- `roi`, `epc`, `avg_ticket`, `registration_cr`, `ftd_cr`, `rev_per_registration`, `rev_per_ftd` (numeric)
- `observacoes`, `origem_importacao` (text)
- `is_demo`, `created_at`, `updated_at`

### tracking_snapshots
- `id` (uuid PK)
- `platform_id`, `platform_account_id` (uuid FK)
- `snapshot_type` (text, default 'manual')
- `data_snapshot` (date NOT NULL)
- `hora_snapshot` (time)
- `period_start`, `period_end` (date)
- `cliques`, `registros`, `ftd`, `redepositos` (integer)
- `depositos_total`, `revenue`, `saque_disponivel` (numeric)
- `raw_payload` (jsonb)
- `notes` (text)
- `is_demo`, `created_at`

---

## Fluxo: Do Clique ao Revenue

```
1. Clique na LP
   └─ clicks (tabela existente) + landing_page_instances

2. Geração do Tracking Link
   └─ tracking_links (com tracking_code + SUBIDs)
   └─ Vinculado a: platform_account, influencer, campanha, LP

3. Postback da Plataforma
   └─ Edge Function: /functions/v1/tracking-postback/{nome_plataforma}
   └─ Resolve plataforma via ilike no campo name
   └─ Recebe: event, sub1-sub10, amount, user_id, country
   └─ Consulta platform_event_mappings para traduzir raw → canônico
   └─ Valida UUIDs em campos FK (ignora valores não-UUID)
   └─ Deduplicação por transaction_id + platform_account_id + raw_event_name
   └─ Deduplicação por click_id + raw_event_name em janela de 60s
   └─ Grava em tracking_events com payload bruto

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
| `qualified_player` | Jogador qualificado |

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

**Resiliência:** Campos sub2-sub5 são validados como UUID antes de gravar nas FKs. Se inválidos, são armazenados no `raw_payload` mas não gravados nos campos relacionais.

---

## Como Cadastrar uma Nova Plataforma

1. Ir em **Plataformas** (`/plataformas`) → Criar nova plataforma
2. Ir em **Tracking Hub > Contas** (`/tracking/accounts`) → Criar conta vinculada à plataforma
3. Ir em **Tracking Hub > Mapeamentos** (`/tracking/mappings`) → Criar mapeamentos de eventos (raw → canônico)
4. Configurar a URL de postback na plataforma:
   ```
   https://rcrrbznhatdqcmfyzgbt.supabase.co/functions/v1/tracking-postback/{nome_plataforma}
   ```
   Onde `{nome_plataforma}` é parte do `name` na tabela platforms (ex: `1win`).

---

## Como Usar a Edge Function tracking-postback

### URL
```
POST /functions/v1/tracking-postback/{platform_name}
GET  /functions/v1/tracking-postback/{platform_name}?event=registration&sub1=click123&...
```

### Parâmetros Aceitos
- `event` / `action` / `type` — nome do evento
- `sub1` a `sub10` — SUBIDs (sub2-sub5 validados como UUID)
- `amount` — valor monetário
- `transaction_id` / `tid` — ID da transação
- `user_id` / `player_id` — ID do jogador na plataforma
- `country` — país
- `currency` — moeda
- `commission` — valor de comissão
- `status` — status do evento
- `timestamp` — timestamp do evento

### Deduplicação

1. **Por transaction_id:** Combinação `platform_account_id + transaction_id + raw_event_name` (índice único parcial)
2. **Por click_id (sem transaction_id):** Mesmo `platform_id + click_id + raw_event_name` dentro de janela de 60 segundos
3. **Constraint DB:** Índice único parcial `idx_tracking_events_dedup_tx` como última barreira

### Resiliência
- Aceita payload parcial (só `event` é minimamente necessário)
- Não quebra com valores não-UUID em sub2, sub3, etc.
- FK violations são tratadas com retry sem campos FK
- Payload bruto sempre salvo em `raw_payload`

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
- **Ticket Médio** = depositos_total / (FTD + redepósitos)
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
