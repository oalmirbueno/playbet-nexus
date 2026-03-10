
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Default',
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_keys" ON public.api_keys
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can read own api_keys" ON public.api_keys
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

-- Function to generate API key (returns plain key, stores hash)
CREATE OR REPLACE FUNCTION public.generate_api_key(_name text DEFAULT 'Default')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _raw_key text;
  _key_hash text;
  _key_prefix text;
  _id uuid;
BEGIN
  -- Generate a random key: pb_live_ + 40 hex chars
  _raw_key := 'pb_live_' || encode(gen_random_bytes(20), 'hex');
  _key_prefix := substring(_raw_key from 1 for 15);
  _key_hash := encode(digest(_raw_key::bytea, 'sha256'), 'hex');
  
  INSERT INTO public.api_keys (name, key_hash, key_prefix, created_by)
  VALUES (_name, _key_hash, _key_prefix, auth.uid())
  RETURNING id INTO _id;
  
  RETURN json_build_object('id', _id, 'key', _raw_key, 'prefix', _key_prefix);
END;
$$;

-- Function to validate API key (used by edge function)
CREATE OR REPLACE FUNCTION public.validate_api_key(_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _hash text;
BEGIN
  _hash := encode(digest(_key::bytea, 'sha256'), 'hex');
  
  UPDATE public.api_keys 
  SET last_used_at = now() 
  WHERE key_hash = _hash AND is_active = true;
  
  RETURN FOUND;
END;
$$;
