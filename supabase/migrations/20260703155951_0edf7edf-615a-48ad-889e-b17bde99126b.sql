
ALTER TABLE public.platform_accounts
  ADD COLUMN IF NOT EXISTS cpa_baseline_deposit numeric DEFAULT 0;

UPDATE public.platform_accounts
   SET cpa_value = 150, revshare_percent = 20, cpa_baseline_deposit = 50, updated_at = now()
 WHERE platform_id = '741be74e-847d-49e7-9b8d-17330f99b122';

UPDATE public.platform_accounts
   SET cpa_value = 110, revshare_percent = 20, cpa_baseline_deposit = 50, updated_at = now()
 WHERE platform_id = 'ad3d0d9d-c816-4a45-a069-8198d4a04425';

-- Recalcula CPA e RevShare das métricas existentes com base no cadastro atualizado
UPDATE public.tracking_metrics tm
   SET revshare_commission = CASE
         WHEN pa.revshare_percent IS NOT NULL AND pa.revshare_percent > 0
           THEN ROUND(GREATEST(COALESCE(tm.revenue,0),0) * (pa.revshare_percent/100.0)::numeric, 2)
         ELSE COALESCE(tm.revshare_commission,0)
       END,
       cpa_commission = CASE
         WHEN pa.cpa_value IS NOT NULL AND pa.cpa_value > 0 AND COALESCE(tm.ftd,0) > 0
              AND (COALESCE(pa.cpa_baseline_deposit,0) = 0
                   OR (COALESCE(tm.depositos_total,0) / NULLIF(tm.ftd,0)) >= pa.cpa_baseline_deposit)
           THEN ROUND(tm.ftd * pa.cpa_value, 2)
         ELSE 0
       END,
       commission_total = CASE
         WHEN pa.revshare_percent IS NOT NULL AND pa.revshare_percent > 0
           THEN ROUND(GREATEST(COALESCE(tm.revenue,0),0) * (pa.revshare_percent/100.0)::numeric, 2)
         ELSE COALESCE(tm.revshare_commission,0)
       END + CASE
         WHEN pa.cpa_value IS NOT NULL AND pa.cpa_value > 0 AND COALESCE(tm.ftd,0) > 0
              AND (COALESCE(pa.cpa_baseline_deposit,0) = 0
                   OR (COALESCE(tm.depositos_total,0) / NULLIF(tm.ftd,0)) >= pa.cpa_baseline_deposit)
           THEN ROUND(tm.ftd * pa.cpa_value, 2)
         ELSE 0
       END,
       updated_at = now()
  FROM public.platform_accounts pa
 WHERE tm.platform_account_id = pa.id
   AND tm.data_ref >= current_date - 60
   AND COALESCE(tm.is_demo,false) = false;
