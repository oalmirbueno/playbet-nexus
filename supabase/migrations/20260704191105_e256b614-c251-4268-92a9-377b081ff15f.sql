CREATE OR REPLACE FUNCTION public.resolve_platform_account_from_url(_url text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  host text;
  decoded_url text;
  best_platform uuid;
  acc uuid;
BEGIN
  IF _url IS NULL OR btrim(_url) = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    host := lower(
      regexp_replace(
        regexp_replace(
          split_part(
            split_part(
              CASE WHEN _url ~* '^[a-z][a-z0-9+.-]*://' THEN _url ELSE 'https://' || _url END,
              '://', 2
            ), '/', 1
          ),
          '^www\.', ''
        ),
        ':\d+$', ''
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  IF host IS NULL OR host = '' THEN
    RETURN NULL;
  END IF;

  decoded_url := lower(_url);
  decoded_url := replace(decoded_url, '%3a', ':');
  decoded_url := replace(decoded_url, '%2f', '/');
  decoded_url := replace(decoded_url, '%3f', '?');
  decoded_url := replace(decoded_url, '%3d', '=');
  decoded_url := replace(decoded_url, '%26', '&');
  decoded_url := regexp_replace(decoded_url, '^https?://www\.', 'https://');

  -- Prefer the real destination embedded in the affiliate URL query.
  -- Example: go.aff.estrelabetpartners.com?...vupi.bet.br must resolve VUPI,
  -- not Estrela, because the LP/content/copy belongs to the nested destination.
  SELECT p.id INTO best_platform
  FROM public.platforms p
  CROSS JOIN LATERAL unnest(
    coalesce(p.domains, '{}'::text[]) || coalesce(p.domain_patterns, '{}'::text[])
  ) AS d
  WHERE d IS NOT NULL
    AND btrim(d) <> ''
    AND decoded_url LIKE '%' || lower(regexp_replace(btrim(d), '^https?://(www\.)?', '')) || '%'
    AND NOT (
      host = lower(regexp_replace(btrim(d), '^https?://(www\.)?', ''))
      OR host LIKE '%.' || lower(regexp_replace(btrim(d), '^https?://(www\.)?', ''))
    )
  ORDER BY length(btrim(d)) DESC, p.created_at ASC NULLS LAST
  LIMIT 1;

  IF best_platform IS NULL THEN
    SELECT p.id INTO best_platform
    FROM public.platforms p
    CROSS JOIN LATERAL unnest(
      coalesce(p.domains, '{}'::text[]) || coalesce(p.domain_patterns, '{}'::text[])
    ) AS d
    WHERE d IS NOT NULL
      AND btrim(d) <> ''
      AND (host = lower(regexp_replace(btrim(d), '^https?://(www\.)?', '')) OR host LIKE '%.' || lower(regexp_replace(btrim(d), '^https?://(www\.)?', '')))
    ORDER BY length(btrim(d)) DESC, p.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  IF best_platform IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT pa.id INTO acc
  FROM public.platform_accounts pa
  WHERE pa.platform_id = best_platform
    AND coalesce(pa.is_active, true) = true
    AND coalesce(pa.is_demo, false) = false
  ORDER BY pa.created_at ASC NULLS LAST
  LIMIT 1;

  RETURN acc;
END;
$function$;

WITH vupi_platform AS (
  SELECT p.id AS platform_id, pa.id AS account_id
  FROM public.platforms p
  JOIN public.platform_accounts pa ON pa.platform_id = p.id
  WHERE lower(coalesce(p.slug, '') || ' ' || coalesce(p.name, '')) LIKE '%vupi%'
    AND coalesce(pa.is_active, true) = true
    AND coalesce(pa.is_demo, false) = false
  ORDER BY pa.created_at ASC NULLS LAST
  LIMIT 1
)
UPDATE public.tracking_links tl
SET platform_account_id = vp.account_id,
    updated_at = now()
FROM vupi_platform vp
WHERE coalesce(tl.is_demo, false) = false
  AND vp.account_id IS NOT NULL
  AND lower(coalesce(tl.base_url, '') || ' ' || coalesce(tl.short_url, '') || ' ' || coalesce(tl.final_url, '')) ~ '(vupi\.bet\.br|vupipartners|vupi\.com\.br|go\.vupi)'
  AND tl.platform_account_id IS DISTINCT FROM vp.account_id;

WITH vupi_platform AS (
  SELECT p.name, p.slug
  FROM public.platforms p
  WHERE lower(coalesce(p.slug, '') || ' ' || coalesce(p.name, '')) LIKE '%vupi%'
  LIMIT 1
), src AS (
  SELECT tl.id AS tracking_link_id,
         tl.landing_page_instance_id,
         vp.name AS platform_name,
         vp.slug AS platform_slug,
         CASE
           WHEN lower(coalesce(tl.link_category, '')) IN ('odds', 'sportsbook', 'esportes', 'sports', 'odds_share') THEN 'odds'
           WHEN nullif(tl.game_slug, '') IS NOT NULL THEN 'single_game'
           ELSE 'platform_direct'
         END AS mode,
         tl.game_slug,
         tl.game_name,
         tl.game_icon_url,
         tl.link_category,
         tl.hype_reason
  FROM public.tracking_links tl
  CROSS JOIN vupi_platform vp
  WHERE coalesce(tl.is_demo, false) = false
    AND tl.landing_page_instance_id IS NOT NULL
    AND lower(coalesce(tl.base_url, '') || ' ' || coalesce(tl.short_url, '') || ' ' || coalesce(tl.final_url, '')) ~ '(vupi\.bet\.br|vupipartners|vupi\.com\.br|go\.vupi)'
)
UPDATE public.landing_page_instances lpi
SET lp_mode = src.mode,
    game_slugs = CASE WHEN src.mode IN ('single_game', 'multi_game') AND nullif(src.game_slug, '') IS NOT NULL THEN ARRAY[src.game_slug] ELSE '{}'::text[] END,
    hype_copy = jsonb_build_object(
      'title', CASE WHEN src.mode = 'platform_direct' THEN src.platform_name WHEN src.mode = 'odds' THEN coalesce(nullif(src.game_name, ''), 'Em destaque') ELSE coalesce(nullif(src.game_name, ''), 'Oferta oficial') END,
      'subtitle', coalesce(nullif(src.hype_reason, ''), CASE WHEN src.mode = 'platform_direct' THEN 'Acesse ' || src.platform_name || ' agora com bônus oficial PlayBet.' WHEN src.mode = 'odds' THEN 'Opções disponíveis para acessar agora.' ELSE 'Acesso rápido à oferta oficial.' END),
      'cta_label', CASE WHEN src.mode = 'platform_direct' THEN 'Acessar ' || src.platform_name WHEN src.mode = 'odds' THEN 'Acessar oportunidades' ELSE 'Jogar agora' END,
      'game_slug', CASE WHEN src.mode IN ('platform_direct', 'odds') THEN NULL ELSE src.game_slug END,
      'game_name', CASE WHEN src.mode IN ('platform_direct', 'odds') THEN NULL ELSE src.game_name END,
      'game_icon_url', CASE WHEN src.mode IN ('platform_direct', 'odds') THEN NULL ELSE src.game_icon_url END,
      'bonus_offer', jsonb_build_object('enabled', src.mode NOT IN ('platform_direct', 'odds'), 'title', CASE WHEN src.mode NOT IN ('platform_direct', 'odds') THEN coalesce('Oferta ' || nullif(src.game_name, ''), 'Oferta oficial') ELSE NULL END, 'code', NULL, 'note', CASE WHEN src.mode NOT IN ('platform_direct', 'odds') THEN 'Use no cadastro.' ELSE NULL END, 'cta_label', CASE WHEN src.mode = 'platform_direct' THEN 'Acessar ' || src.platform_name WHEN src.mode = 'odds' THEN 'Acessar oportunidades' ELSE 'Jogar agora' END),
      'community_cta', jsonb_build_object('enabled', src.mode <> 'platform_direct', 'label', CASE WHEN src.mode NOT IN ('platform_direct', 'odds') AND src.game_name IS NOT NULL THEN 'Comunidade ' || src.game_name ELSE NULL END, 'url', NULL, 'note', NULL),
      'category', coalesce(src.link_category, ''),
      'platform_slug', src.platform_slug,
      'platform_name', src.platform_name,
      'auto', true
    ),
    source_tracking_link_id = src.tracking_link_id,
    auto_generated = true,
    updated_at = now()
FROM src
WHERE lpi.id = src.landing_page_instance_id;