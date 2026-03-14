CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_events_dedup_tx 
ON public.tracking_events (platform_account_id, transaction_id, raw_event_name) 
WHERE transaction_id IS NOT NULL AND platform_account_id IS NOT NULL;