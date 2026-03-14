
-- 1. Expand platform_accounts with new fields
ALTER TABLE platform_accounts
  ADD COLUMN IF NOT EXISTS manager_telegram text,
  ADD COLUMN IF NOT EXISTS dashboard_url text,
  ADD COLUMN IF NOT EXISTS revshare_percent numeric,
  ADD COLUMN IF NOT EXISTS cpa_value numeric,
  ADD COLUMN IF NOT EXISTS hybrid_details text;

-- 2. Create tracking_links
CREATE TABLE IF NOT EXISTS tracking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_account_id uuid REFERENCES platform_accounts(id),
  landing_page_instance_id uuid REFERENCES landing_page_instances(id),
  landing_page_id uuid REFERENCES landing_pages(id),
  influencer_id uuid REFERENCES influencers(id),
  campanha_id uuid REFERENCES campanhas(id),
  conteudo_id uuid REFERENCES conteudo(id),
  utm_id uuid REFERENCES utms(id),
  tracking_code text NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  click_id_param_name text DEFAULT 'sub1',
  base_url text,
  final_url text,
  short_url text,
  status text DEFAULT 'active',
  notes text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage tracking_links" ON tracking_links FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read tracking_links" ON tracking_links FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_tracking_links_updated_at BEFORE UPDATE ON tracking_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Create platform_event_mappings
CREATE TABLE IF NOT EXISTS platform_event_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid REFERENCES platforms(id) NOT NULL,
  platform_account_id uuid REFERENCES platform_accounts(id),
  raw_event_name text NOT NULL,
  canonical_event_name text NOT NULL,
  sub1_field text DEFAULT 'click_id',
  sub2_field text DEFAULT 'influencer_id',
  sub3_field text DEFAULT 'campanha_id',
  sub4_field text DEFAULT 'conteudo_id',
  sub5_field text DEFAULT 'lp_instance_id',
  sub6_field text DEFAULT 'tracking_code',
  sub7_field text DEFAULT 'utm_source',
  sub8_field text DEFAULT 'utm_medium',
  sub9_field text DEFAULT 'utm_campaign',
  sub10_field text DEFAULT 'reserved',
  amount_field text,
  currency_field text,
  transaction_id_field text,
  user_id_field text,
  country_field text,
  status_field text,
  is_active boolean DEFAULT true,
  notes text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_event_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage platform_event_mappings" ON platform_event_mappings FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read platform_event_mappings" ON platform_event_mappings FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_platform_event_mappings_updated_at BEFORE UPDATE ON platform_event_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Create tracking_events
CREATE TABLE IF NOT EXISTS tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid REFERENCES platforms(id),
  platform_account_id uuid REFERENCES platform_accounts(id),
  tracking_link_id uuid REFERENCES tracking_links(id),
  landing_page_instance_id uuid REFERENCES landing_page_instances(id),
  landing_page_id uuid REFERENCES landing_pages(id),
  influencer_id uuid REFERENCES influencers(id),
  campanha_id uuid REFERENCES campanhas(id),
  conteudo_id uuid REFERENCES conteudo(id),
  utm_id uuid REFERENCES utms(id),
  click_id text,
  platform_user_id text,
  raw_event_name text NOT NULL,
  canonical_event_name text NOT NULL,
  event_timestamp timestamptz NOT NULL DEFAULT now(),
  transaction_id text,
  amount numeric,
  currency text DEFAULT 'BRL',
  commission_amount numeric,
  status text,
  country text,
  source_type text NOT NULL DEFAULT 'postback',
  raw_payload jsonb,
  is_duplicate boolean DEFAULT false,
  processed_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage tracking_events" ON tracking_events FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read tracking_events" ON tracking_events FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_tracking_events_updated_at BEFORE UPDATE ON tracking_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Dedup index: unique on (platform_account_id, transaction_id, raw_event_name, event_timestamp) where not duplicate
CREATE UNIQUE INDEX IF NOT EXISTS tracking_events_dedup_idx
  ON tracking_events (platform_account_id, transaction_id, raw_event_name, event_timestamp)
  WHERE transaction_id IS NOT NULL AND NOT is_duplicate;

-- 5. Expand tracking_snapshots
ALTER TABLE tracking_snapshots
  ADD COLUMN IF NOT EXISTS platform_id uuid REFERENCES platforms(id),
  ADD COLUMN IF NOT EXISTS snapshot_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS notes text;

-- 6. Expand tracking_metrics with computed/extra columns
ALTER TABLE tracking_metrics
  ADD COLUMN IF NOT EXISTS landing_page_id uuid REFERENCES landing_pages(id),
  ADD COLUMN IF NOT EXISTS landing_page_instance_id uuid REFERENCES landing_page_instances(id),
  ADD COLUMN IF NOT EXISTS deposits_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS redeposits_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS redeposit_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS roi numeric,
  ADD COLUMN IF NOT EXISTS epc numeric,
  ADD COLUMN IF NOT EXISTS avg_ticket numeric,
  ADD COLUMN IF NOT EXISTS registration_cr numeric,
  ADD COLUMN IF NOT EXISTS ftd_cr numeric,
  ADD COLUMN IF NOT EXISTS rev_per_registration numeric,
  ADD COLUMN IF NOT EXISTS rev_per_ftd numeric;

-- Allow postback endpoint to insert tracking_events without auth
CREATE POLICY "Anon can insert tracking_events" ON tracking_events FOR INSERT TO anon WITH CHECK (true);
