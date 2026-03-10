CREATE OR REPLACE FUNCTION public.generate_api_key(_name text DEFAULT 'Default'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _raw_key text;
  _key_hash text;
  _key_prefix text;
  _id uuid;
BEGIN
  _raw_key := 'pb_live_' || encode(extensions.gen_random_bytes(20), 'hex');
  _key_prefix := substring(_raw_key from 1 for 15);
  _key_hash := encode(extensions.digest(_raw_key::bytea, 'sha256'), 'hex');
  
  INSERT INTO public.api_keys (name, key_hash, key_prefix, created_by)
  VALUES (_name, _key_hash, _key_prefix, auth.uid())
  RETURNING id INTO _id;
  
  RETURN json_build_object('id', _id, 'key', _raw_key, 'prefix', _key_prefix);
END;
$function$;