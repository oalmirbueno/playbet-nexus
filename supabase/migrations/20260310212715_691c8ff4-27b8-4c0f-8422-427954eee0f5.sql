CREATE OR REPLACE FUNCTION public.validate_api_key(_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _hash text;
BEGIN
  _hash := encode(extensions.digest(_key::bytea, 'sha256'), 'hex');
  
  UPDATE public.api_keys 
  SET last_used_at = now() 
  WHERE key_hash = _hash AND is_active = true;
  
  RETURN FOUND;
END;
$function$;