## Objetivo

Transformar `Financeiro` na única página de comando financeiro: caixa real (Asaas), revenue atribuído (Tracking), ranking de quem gerou dinheiro, distribuição automática de comissões e fila de saques — tudo com números reais do banco, design limpo e leitura imediata.

## Estrutura da nova página `/financeiro`

```text
┌────────────────────────────────────────────────────────┐
│  HEADER  Período: [Este mês ▾]   Plataforma: [Todas ▾] │
├────────────────────────────────────────────────────────┤
│  CAIXA REAL (Asaas)        REVENUE ATRIBUÍDO (Tracking)│
│  R$ 100.000  saldo + recv  R$ 98.400  soma metrics     │
│  ↑ vs período anterior     Δ -R$ 1.600 (diverg. 1,6%)  │
├────────────────────────────────────────────────────────┤
│  Tabs: [Distribuição] [Influencers] [Gerentes] [Saques]│
├────────────────────────────────────────────────────────┤
│  Conteúdo da tab ativa                                  │
└────────────────────────────────────────────────────────┘
```

### Tab 1 — Distribuição (default)
Aplica a fórmula do `PLAYBET_MODELO_OFICIAL.md` sobre o **caixa Asaas** do período:
- Cards: Bruto · Custos fixos · Líquido · Sócios · Reinvestimento · Comissões
- Tabela "quem recebe o quê" (influencer, gerente, sócio) com valor e botão **Gerar saque** que cria o registro em `saques` já vinculado ao `externalReference`.

### Tab 2 — Influencers (ranking)
Tabela ordenada por revenue, colunas:
`#  Influencer  Plataforma  FTDs  Depósitos  Revenue  % do total  Comissão  Status saque`

### Tab 3 — Gerentes
Mesmo formato, agregado pelo `manager_id` do influencer.

### Tab 4 — Saques
Lista da tabela `saques` com filtro por status, status pintado pelo webhook Asaas (já sincroniza), ação "Reenviar PIX".

## Dados

| Card / Tabela | Fonte |
|---|---|
| Caixa Asaas | edge `asaas-balance` + `saques` confirmados no período |
| Revenue Tracking | `tracking_metrics` agregado por período/plataforma |
| Ranking influencer | `tracking_metrics` join `platform_accounts` join `influencers` |
| Ranking gerente | mesmo, agrupado por `influencers.manager_id` join `managers` |
| Distribuição | `src/lib/distribution.ts` (já existe) recebe o caixa Asaas |
| Saques | `saques` + log `asaas_webhook_events` |

## Componentes a criar

- `src/components/financeiro/PeriodFilter.tsx` — período + plataforma (URL state).
- `src/components/financeiro/KpiDuo.tsx` — par de cards Caixa × Tracking com delta.
- `src/components/financeiro/RankingTable.tsx` — tabela reutilizável (influencer/gerente).
- `src/components/financeiro/DistribuicaoTab.tsx` — usa `DistributionCard` + tabela de pagamentos.
- `src/components/financeiro/SaquesTab.tsx` — extrai a lista atual.
- `src/hooks/useFinanceiroData.ts` — um único hook que retorna `{ caixa, revenue, rankingInfluencers, rankingGerentes, distribuicao, saques }` com React Query.

## Arquivos alterados

- `src/pages/Financeiro.tsx` — reescrita: header + KPIs + tabs (≈250 linhas).
- `src/pages/Reconciliacao.tsx` — vira redirect para `/financeiro?tab=distribuicao` (mantém link antigo).
- `src/App.tsx` — remove rota dedicada de Reconciliação do menu (mantém redirect).
- Sidebar: item "Reconciliação" sai, "Financeiro" ganha badge se houver saque pendente.

## Design

- Tokens semânticos existentes (`bg-card`, `text-muted-foreground`, `border-border`).
- KPIs em grid 2col responsivo, números em `text-3xl font-semibold tabular-nums`.
- Delta com seta + cor semântica (`text-success` / `text-destructive`).
- Tabelas com `tabular-nums`, zebra sutil, header sticky, sem bordas pesadas.
- Empty states profissionais ("Nenhum revenue no período" + CTA configurar tracking).
- Skeletons enquanto carrega — KPIs nunca somem.

## Fora de escopo

- Não mexer no schema (já temos `saques`, `tracking_metrics`, `asaas_webhook_events`).
- Não tocar nas regras de comissão em `RegrasFinanceiras` — só consumir.
- Não criar nova edge function — `asaas-balance` e `asaas-webhook` já cobrem.

## Validação

1. Build + typecheck limpos.
2. Playwright: abrir `/financeiro`, validar que os 4 KPIs/tabs renderizam, screenshot.
3. Conferir que o número da Tab Distribuição = caixa Asaas × % da fórmula.
