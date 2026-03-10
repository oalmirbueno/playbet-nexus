
CREATE TABLE public.api_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_url text NOT NULL DEFAULT '',
  auth_type text NOT NULL DEFAULT 'api_key',
  header_name text NOT NULL DEFAULT 'X-API-Key',
  api_key_encrypted text DEFAULT '',
  description text DEFAULT '',
  notes text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_integrations" ON public.api_integrations
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated can read api_integrations" ON public.api_integrations
  FOR SELECT TO authenticated
  USING (true);

CREATE TABLE public.api_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.api_integrations(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'GET',
  path text NOT NULL,
  description text DEFAULT '',
  request_example text DEFAULT '',
  response_example text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_endpoints" ON public.api_endpoints
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated can read api_endpoints" ON public.api_endpoints
  FOR SELECT TO authenticated
  USING (true);
