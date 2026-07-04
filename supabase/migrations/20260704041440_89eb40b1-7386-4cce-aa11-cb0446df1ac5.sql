ALTER TABLE public.tracking_metrics
ADD COLUMN IF NOT EXISTS tracking_link_id uuid REFERENCES public.tracking_links(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tracking_metrics_tracking_link_id
ON public.tracking_metrics(tracking_link_id)
WHERE tracking_link_id IS NOT NULL;

DROP INDEX IF EXISTS public.idx_tracking_metrics_auto_consolidation_account_safe;
CREATE UNIQUE INDEX idx_tracking_metrics_auto_consolidation_link_safe
ON public.tracking_metrics (
  data_ref,
  COALESCE(platform_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(platform_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(tracking_link_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(influencer_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(campanha_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
WHERE origem_importacao = 'auto_consolidation';

DROP INDEX IF EXISTS public.idx_tracking_metrics_smartico_pull_account_safe;
CREATE UNIQUE INDEX idx_tracking_metrics_smartico_pull_link_safe
ON public.tracking_metrics (
  data_ref,
  COALESCE(platform_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(platform_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(tracking_link_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(influencer_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(campanha_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
WHERE origem_importacao = 'smartico_api_pull';

CREATE OR REPLACE FUNCTION public.reconsolidate_tracking_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row public.tracking_events%ROWTYPE;
BEGIN
  FOR _row IN
    SELECT DISTINCT ON (
      (x.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date,
      x.platform_id,
      x.platform_account_id,
      x.tracking_link_id,
      x.influencer_id,
      x.campanha_id
    ) x.*
    FROM (
      SELECT CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN OLD ELSE NULL END AS r
      UNION ALL
      SELECT CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN NEW ELSE NULL END AS r
    ) s
    CROSS JOIN LATERAL (SELECT (s.r).* ) x
    WHERE s.r IS NOT NULL
      AND COALESCE(x.is_demo, false) = false
  LOOP
    DELETE FROM public.tracking_metrics
    WHERE origem_importacao = 'auto_consolidation'
      AND COALESCE(is_demo, false) = false
      AND data_ref = ((_row.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date)
      AND platform_id IS NOT DISTINCT FROM _row.platform_id
      AND platform_account_id IS NOT DISTINCT FROM _row.platform_account_id
      AND tracking_link_id IS NOT DISTINCT FROM _row.tracking_link_id
      AND influencer_id IS NOT DISTINCT FROM _row.influencer_id
      AND campanha_id IS NOT DISTINCT FROM _row.campanha_id;

    INSERT INTO public.tracking_metrics (
      data_ref, platform_id, platform_account_id, tracking_link_id, influencer_id, campanha_id,
      landing_page_id, landing_page_instance_id,
      cliques, registros, ftd, deposits_count, redepositos, redeposits_count,
      depositos_total, revenue, original_amount, original_currency, converted_amount, converted_currency,
      exchange_rate, exchange_rate_timestamp, exchange_rate_source,
      cpa_commission, cpl_commission, revshare_commission, commission_total, qftd_count, qlead_count,
      origem_importacao, is_demo
    )
    SELECT
      (_row.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date,
      te.platform_id,
      te.platform_account_id,
      te.tracking_link_id,
      te.influencer_id,
      te.campanha_id,
      (array_agg(te.landing_page_id ORDER BY te.event_timestamp DESC) FILTER (WHERE te.landing_page_id IS NOT NULL))[1],
      (array_agg(te.landing_page_instance_id ORDER BY te.event_timestamp DESC) FILTER (WHERE te.landing_page_instance_id IS NOT NULL))[1],
      COUNT(*) FILTER (WHERE te.canonical_event_name = 'click' AND (te.click_id IS NULL OR te.click_id NOT LIKE '{%'))::int,
      COUNT(*) FILTER (WHERE te.canonical_event_name = 'registration')::int,
      COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd')::int,
      COUNT(*) FILTER (WHERE te.canonical_event_name = 'deposit')::int,
      COUNT(*) FILTER (WHERE te.canonical_event_name = 'redeposit')::int,
      COUNT(*) FILTER (WHERE te.canonical_event_name = 'redeposit')::int,
      COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('deposit','redeposit','ftd') THEN COALESCE(te.converted_amount_brl, te.original_amount, te.amount, 0) ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount, te.amount, 0) ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.commission_amount, te.original_amount, te.converted_amount_brl, te.amount, 0) ELSE 0 END), 0),
      COALESCE((array_agg(te.original_currency ORDER BY te.event_timestamp DESC) FILTER (WHERE te.original_currency IS NOT NULL AND te.canonical_event_name IN ('revenue','withdrawable_revenue')))[1], 'BRL'),
      COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount, te.amount, 0) ELSE 0 END), 0),
      'BRL',
      (array_agg(te.exchange_rate ORDER BY te.event_timestamp DESC) FILTER (WHERE te.exchange_rate IS NOT NULL))[1],
      (array_agg(te.exchange_rate_timestamp ORDER BY te.event_timestamp DESC) FILTER (WHERE te.exchange_rate_timestamp IS NOT NULL))[1],
      'auto_postback',
      (COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd') * COALESCE(MAX(pa.cpa_value), 0))::numeric,
      0,
      COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount, te.amount, 0) ELSE 0 END), 0),
      (COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd') * COALESCE(MAX(pa.cpa_value), 0))::numeric
        + COALESCE(SUM(CASE WHEN te.canonical_event_name IN ('revenue','withdrawable_revenue') THEN COALESCE(te.converted_amount_brl, te.commission_amount, te.original_amount, te.amount, 0) ELSE 0 END), 0),
      COUNT(*) FILTER (WHERE te.canonical_event_name = 'ftd')::int,
      COUNT(*) FILTER (WHERE te.canonical_event_name = 'registration')::int,
      'auto_consolidation',
      false
    FROM public.tracking_events te
    LEFT JOIN public.platform_accounts pa ON pa.id = te.platform_account_id
    WHERE public.tracking_event_is_valid_for_metrics(te.is_demo, te.is_duplicate, te.status, te.canonical_event_name, te.transaction_id, te.click_id)
      AND (te.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date = ((_row.event_timestamp AT TIME ZONE 'America/Sao_Paulo')::date)
      AND te.platform_id IS NOT DISTINCT FROM _row.platform_id
      AND te.platform_account_id IS NOT DISTINCT FROM _row.platform_account_id
      AND te.tracking_link_id IS NOT DISTINCT FROM _row.tracking_link_id
      AND te.influencer_id IS NOT DISTINCT FROM _row.influencer_id
      AND te.campanha_id IS NOT DISTINCT FROM _row.campanha_id
    GROUP BY te.platform_id, te.platform_account_id, te.tracking_link_id, te.influencer_id, te.campanha_id
    HAVING COUNT(*) FILTER (WHERE te.canonical_event_name IN ('click','registration','ftd','deposit','redeposit','revenue','withdrawable_revenue')) > 0;
  END LOOP;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;