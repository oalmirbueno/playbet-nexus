# Guia Operacional — Tracking Hub PlayBet

## Resumo Rápido

O Tracking Hub centraliza a performance de todas as casas/plataformas de afiliado em um único painel. Ele recebe dados via **postback** (a plataforma avisa quando acontece um evento) e organiza tudo em métricas consolidadas.

---

## Passo 1 — Cadastrar a Plataforma

1. Acesse **Plataformas** no menu lateral
2. Clique em **Nova Plataforma**
3. Preencha:
   - Nome da casa (ex: "1win", "Betano")
   - Modelo de comissão (RevShare, CPA, Hybrid)
   - Moeda (BRL, USD)
4. Salve

---

## Passo 2 — Cadastrar a Conta

1. Acesse **Tracking Hub → Contas**
2. Clique em **Nova Conta**
3. Preencha:
   - Plataforma (selecione a casa cadastrada)
   - Nome da conta (ex: "1win - Conta Principal")
   - Modelo de comissão + percentual/valor
   - Dados do gerente (nome, email, WhatsApp, Telegram)
   - URL de login do painel de afiliado
   - URL do dashboard
4. Salve

---

## Passo 3 — Configurar Mapeamento de Eventos

Cada casa envia eventos com nomes próprios. O mapeamento traduz para o padrão do sistema.

1. Acesse **Tracking Hub → Mapeamentos**
2. Clique em **Novo Mapeamento**
3. Para cada evento da casa, crie um mapeamento:

| Evento na Casa | Evento Canônico |
|---|---|
| `signup`, `reg`, `cadastro` | `registration` |
| `first_deposit`, `ftd` | `ftd` |
| `deposit`, `dep` | `deposit` |
| `redeposit`, `redep` | `redeposit` |
| `revenue`, `ngr` | `revenue` |

4. Configure os SUBIDs (geralmente o padrão já funciona):
   - sub1 = click_id
   - sub2 = influencer_id
   - sub3 = campanha_id
5. Configure campos extras: amount, transaction_id, user_id, country
6. Salve

---

## Passo 4 — Gerar Tracking Link

1. Acesse **Tracking Hub → Links**
2. Clique em **Novo Link**
3. Vincule: conta da plataforma, influencer, campanha, landing page
4. Preencha a Base URL (link de afiliado da casa)
5. Selecione o parâmetro de click_id (geralmente `sub1`)
6. Salve
7. Use o botão 📋 para copiar o link final
8. Use o botão ⚡ para copiar a URL de postback

---

## Passo 5 — Configurar Postback na Plataforma

1. Acesse o painel de afiliado da casa
2. Procure por: "Postback URL", "S2S Postback", "Tracking", "Conversion tracking"
3. Cole a URL de postback copiada do painel
4. A URL tem o formato:

```
https://rcrrbznhatdqcmfyzgbt.supabase.co/functions/v1/tracking-postback/{nome-plataforma}?event={event}&sub1={click_id}&sub2={influencer_id}&sub3={campanha_id}&amount={amount}&transaction_id={transaction_id}&user_id={user_id}&country={country}
```

5. Substitua os `{placeholders}` pelas macros/tokens da plataforma
6. Salve na plataforma

---

## Passo 6 — Testar

### Teste via terminal/Postman:
```bash
curl "https://rcrrbznhatdqcmfyzgbt.supabase.co/functions/v1/tracking-postback/1win?event=registration&sub1=test-click-123&sub2=inf-test&amount=0&user_id=player123"
```

### Resposta esperada:
```json
{"status":"ok","event_id":"uuid...","canonical_event":"registration"}
```

### Verificar no painel:
1. Acesse **Tracking Hub → Eventos**
2. O evento deve aparecer na lista
3. Clique no 👁 para ver o payload completo

---

## Passo 7 — Validar Deduplicação

Envie o mesmo evento duas vezes com o mesmo `transaction_id`:
```bash
curl "...?event=ftd&sub1=click1&transaction_id=TX-001&amount=100"
curl "...?event=ftd&sub1=click1&transaction_id=TX-001&amount=100"
```

A segunda chamada deve retornar: `{"status":"duplicate"}`

---

## Onde ver o que

| O que | Onde |
|---|---|
| KPIs consolidados | `/tracking` (Tracking Hub) |
| Eventos brutos | `/tracking/events` |
| Configuração de mappings | `/tracking/mappings` |
| Links de tracking | `/tracking/links` |
| Contas por plataforma | `/tracking/accounts` |
| Snapshots | `/tracking/snapshots` |
| Métricas detalhadas | `/tracking/metrics` |

---

## Se der erro

| Problema | O que fazer |
|---|---|
| Erro 500 no postback | Verificar se os parâmetros são válidos. Campos FK aceitam apenas UUID. Valores não-UUID são ignorados automaticamente. |
| Evento não aparece | Verificar se a plataforma está cadastrada. Conferir nome no path da URL. |
| Evento duplicado | Normal! O sistema detecta e marca. Verifique `transaction_id` duplicado. |
| Dashboard vazio | Verificar filtro (Produção/Demo/Todos). Registrar métricas ou esperar postbacks. |
| Mapping não funciona | Verificar se o `raw_event_name` bate exatamente com o que a plataforma envia. |

---

## Filtros Demo/Produção

O painel tem 3 modos:
- **Produção** (padrão): só dados reais
- **Todos**: real + demo
- **Demo**: só dados de teste

Use o seletor no topo das páginas do tracking.

---

## Fluxo Resumido

```
Plataforma → Conta → Mapeamento → Tracking Link → Postback → Evento → Dashboard
```

Comece com 1 casa, 1 conta, 1 influencer. Depois expanda.
