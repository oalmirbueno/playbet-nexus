
-- 1) Evolve UTMs table with new columns
ALTER TABLE public.utms
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS campanha_id uuid REFERENCES public.campanhas(id),
  ADD COLUMN IF NOT EXISTS conteudo_id uuid REFERENCES public.conteudo(id),
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS link_base text,
  ADD COLUMN IF NOT EXISTS link_final text,
  ADD COLUMN IF NOT EXISTS link_curto text,
  ADD COLUMN IF NOT EXISTS codigo_referencia text;

-- 2) Platform Accounts table
CREATE TABLE public.platform_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid REFERENCES public.platforms(id) ON DELETE CASCADE NOT NULL,
  nome_conta text NOT NULL,
  account_external_id text,
  moeda text DEFAULT 'BRL',
  modelo_comissao text,
  manager_name text,
  manager_email text,
  manager_whatsapp text,
  login_url text,
  notes text,
  is_active boolean DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.platform_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform_accounts" ON public.platform_accounts FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read platform_accounts" ON public.platform_accounts FOR SELECT TO authenticated USING (true);

-- 3) Tracking Metrics table
CREATE TABLE public.tracking_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid REFERENCES public.platforms(id),
  platform_account_id uuid REFERENCES public.platform_accounts(id),
  influencer_id uuid REFERENCES public.influencers(id),
  campanha_id uuid REFERENCES public.campanhas(id),
  conteudo_id uuid REFERENCES public.conteudo(id),
  utm_id uuid REFERENCES public.utms(id),
  data_ref date NOT NULL,
  cliques integer DEFAULT 0,
  registros integer DEFAULT 0,
  ftd integer DEFAULT 0,
  redepositos integer DEFAULT 0,
  depositos_total numeric DEFAULT 0,
  revenue numeric DEFAULT 0,
  revenue_liquido numeric DEFAULT 0,
  saque_disponivel numeric DEFAULT 0,
  custo_trafego numeric DEFAULT 0,
  custo_influencer numeric DEFAULT 0,
  observacoes text,
  origem_importacao text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tracking_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tracking_metrics" ON public.tracking_metrics FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read tracking_metrics" ON public.tracking_metrics FOR SELECT TO authenticated USING (true);

-- 4) Tracking Snapshots table
CREATE TABLE public.tracking_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_account_id uuid REFERENCES public.platform_accounts(id),
  data_snapshot date NOT NULL,
  hora_snapshot time,
  cliques integer DEFAULT 0,
  registros integer DEFAULT 0,
  ftd integer DEFAULT 0,
  redepositos integer DEFAULT 0,
  depositos_total numeric DEFAULT 0,
  revenue numeric DEFAULT 0,
  saque_disponivel numeric DEFAULT 0,
  raw_payload jsonb,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tracking_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tracking_snapshots" ON public.tracking_snapshots FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read tracking_snapshots" ON public.tracking_snapshots FOR SELECT TO authenticated USING (true);

-- Update triggers for updated_at
CREATE TRIGGER update_platform_accounts_updated_at BEFORE UPDATE ON public.platform_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tracking_metrics_updated_at BEFORE UPDATE ON public.tracking_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_metrics;
