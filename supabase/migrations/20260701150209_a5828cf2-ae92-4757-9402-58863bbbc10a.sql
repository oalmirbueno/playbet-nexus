ALTER TABLE public.commercial_pipeline_cards
  ADD COLUMN IF NOT EXISTS role_type text CHECK (role_type IN ('influencer','gerente')),
  ADD COLUMN IF NOT EXISTS generated_email text,
  ADD COLUMN IF NOT EXISTS generated_password text,
  ADD COLUMN IF NOT EXISTS generated_user_id uuid,
  ADD COLUMN IF NOT EXISTS credentials_generated_at timestamptz;