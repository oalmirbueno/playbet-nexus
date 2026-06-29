---
name: Smartico TAP puller (Estrela Bet + VUPI)
description: Pull automático do painel Stellar (TheAffiliatePlatform / Smartico). EstrelaBet e VUPI são do mesmo operador, mesma chave de API.
type: feature
---

## Contexto
- **Casas sem postback:** EstrelaBet e VUPI não suportam postback. Solução = pull via API.
- **Plataforma:** TheAffiliatePlatform (TAP) by Smartico. Painel `https://partners.estrelabet.bet.br`.
- **Mesma API key cobre as 2 marcas** (separadas por `brand_id` no `group_by`).
- Secret: `STELLAR_TAP_API_KEY` (gerada manualmente no painel: Account Settings → API → Save & Create API key).

## Endpoint
- `GET https://boapi.smartico.ai/api/af2_media_report_af`
- Header: `Authorization: <api_key>` (bearer estático, sem "Bearer ")
- Params: `aggregation_period=DAY`, `date_from`/`date_to` (YYYY-MM-DD, **to é exclusivo**), `group_by=afp,afp1,afp2,brand_id`
- `afp` = sub1 = click_id, `afp1` = sub2 = influencer_id, `afp2` = sub3 = campanha_id

## Resposta (campos usados)
`visit_count` (cliques), `registration_count`, `ftd_count`, `ftd_total`, `deposit_count`, `deposit_total`, `net_pl` (revenue), `commissions_total`, `brand_name` ("EstrelaBet" / "VUPI").

## Implementação
- Edge function: `supabase/functions/tracking-puller-smartico/index.ts` (verify_jwt=false).
- Cron: `pg_cron` job `tracking-puller-smartico-30min` a cada 30min, janela rolante de 3 dias (cobre conversões tardias).
- Botão manual "Sincronizar Estrela/VUPI" em `/tracking`.
- Saída: upsert em `tracking_metrics` com `origem_importacao='smartico_api_pull'`, chave única por `(data_ref, platform_id, COALESCE(influencer_id, ...))`. Não conflita com `auto_consolidation` (postback).
- Resolução: `brand_name` ILIKE → `platforms` (EstrelaBet/VUPI). `afp1` validado como UUID → influencer_id.

## Onde NÃO mexer
- Postback (`tracking-postback`) continua intocado pras casas que suportam (1win etc.). Os dois sistemas coexistem.
