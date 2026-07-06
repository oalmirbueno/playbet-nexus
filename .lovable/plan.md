## Contexto

Hoje o `stellar-panel-scraper` chama a API `/user/performance/report`, que devolve **agregado por janela** (`period=01/01/0001`) e não expõe dados do dia corrente até o fechamento. Por isso os valores no dashboard divergem do painel real da casa (admin.aff.estrelabetpartners.com), que mostra o **valor real disponível para saque, líquido, já descontado** — e esse valor flutua ao longo do dia.

Solução: trocar a fonte para scraping direto do painel HTML (mesmo painel que você vê), usando as credenciais afiliado que já estão salvas (`ESTRELABET_AFFILIATE_*` e `VUPI_AFFILIATE_*`).

## O que vai mudar

### 1. Nova edge function `affiliate-panel-scraper`
Substitui o `stellar-panel-scraper`. Fluxo:
- Login com credenciais salvas em cada painel afiliado
- Extrai via Firecrawl (com `waitFor` pra SPA renderizar) as telas de:
  - **Dashboard / Saldo**: valor real disponível para saque (líquido)
  - **Relatório de comissões**: comissão bruta do mês, do dia
  - **Performance**: registros, FTDs, depósitos, NGR
  - **Histórico de saques**: cada saque com data/valor/status
- Persiste em `platform_accounts.balance_available`, `tracking_metrics` (métricas diárias) e nova tabela `platform_withdrawals` (histórico)
- Todas as escritas com `origem_importacao='panel_scrape_html'`

### 2. Nova tabela `platform_withdrawals`
Colunas: `platform_account_id`, `withdrawn_at`, `amount`, `status`, `external_id`. Substitui/complementa dados que hoje ficam em `saques`.

### 3. Coluna `balance_available` em `platform_accounts`
Guarda o saldo real do painel + `balance_updated_at`. É o "valor pra saque" autoritativo.

### 4. Camada de cálculo de **Lucro Real** (nova em `src/lib/profitModel.ts`)
Nunca mais mostrar "comissão bruta" como se fosse lucro. Fórmula:

```
lucro_bruto        = comissao_total_periodo (do painel)
lucro_liquido_casa = balance_available (o que sobra no painel após heavy/estornos/chargebacks)
lucro_influenciador= sum(custo_influencer) do periodo  
lucro_real         = lucro_liquido_casa - lucro_influenciador - custo_trafego
```

Dashboard, Financeiro, Portal e Gerente passam a exibir `lucro_real` como métrica principal, com breakdown expansível mostrando cada parcela.

### 5. Refresh on-demand
- Botão "Atualizar do painel" em cada tela financeira
- Hook `usePanelRefresh()` que dispara a edge function e invalida `react-query`
- Trigger automático quando o usuário abre Dashboard/Financeiro (com throttle de 60s)

### 6. Robustez
- Retries com backoff exponencial
- Cache no Redis/DB do último HTML por 60s (evita rate-limit)
- Logs estruturados em `panel_scraper_runs` com screenshot em caso de erro (via Firecrawl screenshot)
- Alertas quando o valor extraído difere >30% da última leitura (possível DOM mudança)
- Testes unitários dos parsers em `src/lib/__tests__/panelParsers.test.ts`

### 7. Descontinuação do fluxo atual
- Marca `stellar-panel-scraper` como deprecated (mantém rodando por 7 dias em paralelo pra comparar)
- Após validação, cron passa a chamar só o novo scraper
- Remove rows `panel_scraper_stellar` das últimas 30 dias e reingere

## Requisitos que preciso confirmar antes

1. **URL do painel VUPI**: você mencionou o da Estrelabet (admin.aff.estrelabetpartners.com/460395), mas não colou o da VUPI. Onde eu logo pra pegar os valores da VUPI?
2. **O que exatamente é "heavy"** no seu vocabulário? É o chargeback/estorno que a casa desconta, certo? Aparece como linha separada no painel ou é embutido no saldo?
3. **Custo do influenciador**: já está sendo lançado em `tracking_metrics.custo_influencer` hoje ou preciso criar fluxo pra inserir?

## Ordem de execução (após aprovação)

```text
1. Migration: platform_withdrawals + balance_available/balance_updated_at
2. Nova função affiliate-panel-scraper (Estrelabet primeiro)
3. Parser + testes
4. Camada de lucro (profitModel.ts) + hook usePanelRefresh
5. Atualizar Dashboard/Financeiro/Portal/Gerente pra usar lucro real
6. Adicionar VUPI ao scraper
7. Trocar cron + limpar dados legados
```
