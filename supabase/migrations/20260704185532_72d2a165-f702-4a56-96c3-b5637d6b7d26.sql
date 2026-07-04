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
SET search_path TO 'public'
AS $function$
DECLARE
  _base text;
  _host text;
  _out text;
  _lpi_id uuid;
BEGIN
  IF _instance_slug IS NULL OR _instance_slug = '' THEN
    RETURN NULL;
  END IF;

  _base := trim(COALESCE(NULLIF(_domain, ''), 'painelcentral.playbet.app.br'));
  _base := regexp_replace(_base, '/+$', '');
  IF _base !~* '^https?://' THEN
    _base := 'https://' || _base;
  END IF;

  _host := lower(regexp_replace(_base, '^https?://', ''));
  _host := split_part(_host, '/', 1);
  IF _host = 'oportunidades.playbet.app.br' THEN
    _base := 'https://painelcentral.playbet.app.br';
  END IF;

  SELECT lpi.id
    INTO _lpi_id
  FROM public.landing_page_instances lpi
  WHERE lpi.slug = _instance_slug
    AND lpi.influencer_id = _influencer_id
    AND COALESCE(lpi.is_active, true) = true
  ORDER BY COALESCE(lpi.updated_at, lpi.created_at) DESC NULLS LAST
  LIMIT 1;

  _out := _base || '/i/' || replace(_instance_slug, '/', '');

  _out := public.playbet_append_url_param(_out, 'sub2', _influencer_id::text, false);
  _out := public.playbet_append_url_param(_out, 'sub3', _campanha_id::text, false);
  _out := public.playbet_append_url_param(_out, 'lpi', _lpi_id::text, false);
  RETURN _out;
END;
$function$;