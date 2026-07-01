CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_cycles_asaas_ref_uniq
ON public.withdrawal_cycles (reference)
WHERE source = 'asaas_webhook' AND reference IS NOT NULL;