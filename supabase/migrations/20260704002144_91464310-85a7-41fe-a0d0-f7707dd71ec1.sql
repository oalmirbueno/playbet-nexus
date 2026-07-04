CREATE OR REPLACE FUNCTION public.playbet_public_lp_url(
  _domain text,
  _route text,
  _instance_slug text,
  _lp_mode text,
  _influencer_id uuid,
  _campanha_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  _base text;
  _out text;
BEGIN
  IF _instance_slug IS NULL OR _instance_slug = '' THEN
    RETURN NULL;
  END IF;

  _base := trim(COALESCE(NULLIF(_domain, ''), 'oportunidades.playbet.app.br'));
  _base := regexp_replace(_base, '/+$', '');
  IF _base !~* '^https?://' THEN
    _base := 'https://' || _base;
  END IF;

  -- Cada LP gerada precisa abrir a interface da própria instância.
  -- O domínio pode ser o mesmo, mas a rota tem que ser /i/{slug}, não a LP padrão com ?ref=.
  _out := _base || '/i/' || replace(_instance_slug, '/', '');

  _out := public.playbet_append_url_param(_out, 'sub2', _influencer_id::text, false);
  _out := public.playbet_append_url_param(_out, 'sub3', _campanha_id::text, false);
  RETURN _out;
END;
$function$;