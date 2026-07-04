WITH vupi_platform AS (
  SELECT p.id AS platform_id, pa.id AS account_id, p.name, p.slug
  FROM public.platforms p
  JOIN public.platform_accounts pa ON pa.platform_id = p.id
  WHERE lower(coalesce(p.slug, '') || ' ' || coalesce(p.name, '')) LIKE '%vupi%'
    AND coalesce(pa.is_active, true) = true
  ORDER BY pa.created_at DESC
  LIMIT 1
), src AS (
  SELECT tl.id, tl.landing_page_instance_id, tl.platform_account_id, vp.account_id AS vupi_account_id, vp.name AS vupi_name, vp.slug AS vupi_slug
  FROM public.tracking_links tl
  CROSS JOIN vupi_platform vp
  LEFT JOIN public.platform_accounts current_pa ON current_pa.id = tl.platform_account_id
  LEFT JOIN public.platforms current_p ON current_p.id = current_pa.platform_id
  WHERE coalesce(tl.is_demo, false) = false
    AND vp.account_id IS NOT NULL
    AND lower(coalesce(tl.base_url, '') || ' ' || coalesce(tl.short_url, '') || ' ' || coalesce(tl.final_url, '')) ~ '(vupi\.bet\.br|vupipartners|vupi\.com\.br|go\.vupi)'
    AND coalesce(current_p.slug, '') <> vp.slug
)
UPDATE public.tracking_links tl
SET platform_account_id = src.vupi_account_id,
    updated_at = now()
FROM src
WHERE tl.id = src.id;

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
    layout_config = CASE
      WHEN src.mode = 'platform_direct' THEN jsonb_build_object('mode', src.mode, 'sections', jsonb_build_array(
        jsonb_build_object('id','hero','label','Hero','enabled',true),
        jsonb_build_object('id','games','label','Jogos','enabled',false),
        jsonb_build_object('id','odds','label','Em destaque','enabled',false),
        jsonb_build_object('id','features','label','Benefícios','enabled',false),
        jsonb_build_object('id','community','label','Comunidade','enabled',false),
        jsonb_build_object('id','cta','label','CTA final','enabled',true),
        jsonb_build_object('id','footer','label','Rodapé','enabled',true)
      ), 'updated_at', now())
      WHEN src.mode = 'odds' THEN jsonb_build_object('mode', src.mode, 'sections', jsonb_build_array(
        jsonb_build_object('id','hero','label','Hero','enabled',true),
        jsonb_build_object('id','features','label','Ofertas','enabled',false),
        jsonb_build_object('id','games','label','Jogos','enabled',false),
        jsonb_build_object('id','odds','label','Em destaque','enabled',true),
        jsonb_build_object('id','community','label','Comunidade','enabled',true),
        jsonb_build_object('id','cta','label','CTA','enabled',true),
        jsonb_build_object('id','footer','label','Rodapé','enabled',true)
      ), 'updated_at', now())
      ELSE jsonb_build_object('mode', src.mode, 'sections', jsonb_build_array(
        jsonb_build_object('id','hero','label','Hero','enabled',true),
        jsonb_build_object('id','features','label','Ofertas','enabled',true),
        jsonb_build_object('id','games','label','Jogos','enabled',false),
        jsonb_build_object('id','odds','label','Em destaque','enabled',false),
        jsonb_build_object('id','community','label','Comunidade','enabled',true),
        jsonb_build_object('id','cta','label','CTA','enabled',true),
        jsonb_build_object('id','footer','label','Rodapé','enabled',true)
      ), 'updated_at', now())
    END,
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