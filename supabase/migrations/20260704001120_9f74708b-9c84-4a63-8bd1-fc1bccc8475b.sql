CREATE OR REPLACE FUNCTION public.trigger_link_autopipeline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _platform_id uuid;
  _platform_name text;
  _platform_slug text;
  _rule record;
  _mode text;
  _effective_mode text;
  _all_slugs text[];
  _game_ids uuid[];
  _hype_copy jsonb;
  _layout jsonb;
  _lp_id uuid;
  _lp_domain text;
  _lp_route text;
  _dest text;
  _affiliate_link text;
  _share_url text;
  _opp_category text;
  _existing_opp uuid;
  _cat text;
  _title text;
  _subtitle text;
  _cta text;
  _community_label text;
  _bonus_title text;
  _is_bonus boolean;
  _default_style text;
  _lpi_id uuid;
  _base_slug text;
  _slug text;
  _n int;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_demo, false) THEN RETURN NEW; END IF;

  IF NEW.platform_account_id IS NOT NULL THEN
    SELECT pa.platform_id, p.name, p.slug INTO _platform_id, _platform_name, _platform_slug
    FROM public.platform_accounts pa
    LEFT JOIN public.platforms p ON p.id = pa.platform_id
    WHERE pa.id = NEW.platform_account_id;
  END IF;

  _dest := COALESCE(NULLIF(NEW.base_url, ''), NULLIF(NEW.short_url, ''));
  _affiliate_link := public.playbet_tracked_affiliate_url(_dest, NEW.click_id_param_name, NEW.tracking_code, NEW.influencer_id, NEW.campanha_id);

  _all_slugs := CASE WHEN NULLIF(NEW.game_slug, '') IS NOT NULL THEN ARRAY[NEW.game_slug] ELSE '{}'::text[] END;
  _cat := lower(COALESCE(NEW.link_category, ''));
  _is_bonus := _cat IN ('bonus','bônus','promo','oferta','offer','cupom','codigo','código');
  _mode := CASE
    WHEN _cat IN ('odds','sportsbook','esportes') AND COALESCE(array_length(_all_slugs, 1), 0) = 0 THEN 'odds'
    WHEN _cat = 'sports' AND COALESCE(array_length(_all_slugs, 1), 0) = 0 THEN 'odds'
    WHEN array_length(_all_slugs, 1) = 1 THEN 'single_game'
    WHEN array_length(_all_slugs, 1) > 1 THEN 'multi_game'
    ELSE 'platform_direct'
  END;

  IF _mode = 'platform_direct' THEN
    _title := COALESCE(_platform_name, 'Oferta oficial');
    _subtitle := CASE WHEN _platform_name IS NOT NULL THEN 'Acesse ' || _platform_name || ' agora com bônus oficial PlayBet.' ELSE 'Acesse a plataforma oficial com segurança.' END;
    _cta := CASE WHEN _platform_name IS NOT NULL THEN 'Acessar ' || _platform_name ELSE 'Acessar plataforma' END;
  ELSIF _mode = 'odds' THEN
    _title := COALESCE(NULLIF(NEW.game_name, ''), 'Em destaque');
    _subtitle := COALESCE(NULLIF(NEW.hype_reason, ''), 'Opções disponíveis para acessar agora.');
    _cta := 'Acessar oportunidades';
  ELSIF _mode = 'single_game' THEN
    _title := COALESCE(NULLIF(NEW.game_name, ''), 'Oferta oficial');
    _subtitle := COALESCE(NULLIF(NEW.hype_reason, ''), 'Acesso rápido à oferta oficial.');
    _cta := CASE WHEN _is_bonus THEN 'Resgatar bônus' ELSE 'Acessar oportunidades' END;
  ELSIF _mode = 'multi_game' THEN
    _title := 'Jogos em alta';
    _subtitle := COALESCE(NULLIF(NEW.hype_reason, ''), 'Ofertas oficiais selecionadas.');
    _cta := 'Acessar oportunidades';
  ELSE
    _title := 'Oportunidades PlayBet';
    _subtitle := COALESCE(NULLIF(NEW.hype_reason, ''), 'Acesso rápido às melhores oportunidades.');
    _cta := CASE WHEN _is_bonus THEN 'Resgatar bônus' ELSE 'Acessar oportunidades' END;
  END IF;

  _community_label := CASE WHEN NULLIF(NEW.game_name, '') IS NOT NULL THEN 'Comunidade ' || NEW.game_name ELSE NULL END;
  _bonus_title := CASE WHEN _is_bonus AND NEW.game_name IS NOT NULL THEN 'Bônus ' || NEW.game_name WHEN _is_bonus THEN 'Bônus exclusivo' WHEN NEW.game_name IS NOT NULL THEN 'Oferta ' || NEW.game_name ELSE NULL END;

  _hype_copy := jsonb_build_object(
    'title', _title,
    'subtitle', _subtitle,
    'cta_label', _cta,
    'game_slug', CASE WHEN _mode = 'platform_direct' THEN NULL ELSE NEW.game_slug END,
    'game_name', CASE WHEN _mode = 'platform_direct' THEN NULL ELSE NEW.game_name END,
    'game_icon_url', CASE WHEN _mode = 'platform_direct' THEN NULL ELSE NEW.game_icon_url END,
    'bonus_offer', jsonb_build_object('enabled', _mode <> 'platform_direct', 'title', CASE WHEN _mode = 'platform_direct' THEN NULL ELSE _bonus_title END, 'code', NULL, 'note', CASE WHEN _mode = 'platform_direct' THEN NULL ELSE 'Use no cadastro.' END, 'cta_label', _cta),
    'community_cta', jsonb_build_object('enabled', _mode <> 'platform_direct', 'label', CASE WHEN _mode = 'platform_direct' THEN NULL ELSE _community_label END, 'url', NULL, 'note', NULL),
    'category', _cat,
    'platform_slug', _platform_slug,
    'platform_name', _platform_name,
    'auto', true
  );

  _layout := CASE WHEN _mode = 'platform_direct' THEN
    jsonb_build_object('mode', _mode, 'sections', jsonb_build_array(
      jsonb_build_object('id','hero','label','Hero','enabled',true),
      jsonb_build_object('id','games','label','Jogos','enabled',false),
      jsonb_build_object('id','odds','label','Em destaque','enabled',false),
      jsonb_build_object('id','features','label','Benefícios','enabled',false),
      jsonb_build_object('id','community','label','Comunidade','enabled',false),
      jsonb_build_object('id','cta','label','CTA final','enabled',true),
      jsonb_build_object('id','footer','label','Rodapé','enabled',true)
    ), 'updated_at', now())
  ELSE
    jsonb_build_object('mode', _mode, 'sections', jsonb_build_array(
      jsonb_build_object('id','hero','label','Hero','enabled',true),
      jsonb_build_object('id','features','label','Ofertas','enabled',_mode NOT IN ('odds','platform_direct','catalog')),
      jsonb_build_object('id','games','label','Jogos','enabled', _mode IN ('single_game','multi_game')),
      jsonb_build_object('id','odds','label','Em destaque','enabled', _mode = 'odds'),
      jsonb_build_object('id','community','label','Comunidade','enabled', _mode NOT IN ('platform_direct','catalog')),
      jsonb_build_object('id','cta','label','CTA','enabled',true),
      jsonb_build_object('id','footer','label','Rodapé','enabled',true)
    ), 'updated_at', now())
  END;

  _lpi_id := NEW.landing_page_instance_id;

  IF _lpi_id IS NULL AND NEW.landing_page_id IS NOT NULL AND NEW.influencer_id IS NOT NULL THEN
    SELECT public.lp_opp_slugify(COALESCE(NULLIF(slug, ''), NULLIF(name, ''), 'lp'))
      INTO _base_slug
      FROM public.influencers
     WHERE id = NEW.influencer_id;
    _base_slug := COALESCE(NULLIF(_base_slug, ''), 'lp');
    _slug := _base_slug;
    _n := 2;
    WHILE EXISTS (SELECT 1 FROM public.landing_page_instances WHERE landing_page_id = NEW.landing_page_id AND slug = _slug) LOOP
      _slug := _base_slug || '-' || _n::text;
      _n := _n + 1;
    END LOOP;

    INSERT INTO public.landing_page_instances (
      landing_page_id, influencer_id, slug, affiliate_link, is_active,
      lp_mode, game_slugs, game_ids, layout_config, hype_copy,
      source_tracking_link_id, auto_generated
    ) VALUES (
      NEW.landing_page_id, NEW.influencer_id, _slug, COALESCE(_affiliate_link, _dest, 'about:blank'), true,
      _mode, CASE WHEN _mode = 'platform_direct' THEN '{}'::text[] ELSE _all_slugs END, '{}'::uuid[], _layout, _hype_copy,
      NEW.id, true
    ) RETURNING id INTO _lpi_id;

    UPDATE public.tracking_links
       SET landing_page_instance_id = _lpi_id,
           use_lp = true,
           lp_auto_generated = true,
           updated_at = now()
     WHERE id = NEW.id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    _default_style := CASE WHEN _mode = 'platform_direct' THEN 'minimal' ELSE 'hype' END;

    IF _platform_id IS NOT NULL THEN
      FOR _rule IN SELECT format, style FROM public.platform_material_rules WHERE platform_id = _platform_id AND enabled = true AND auto_on_new_link = true LOOP
        INSERT INTO public.link_materials (tracking_link_id, influencer_id, platform_id, game_slug, game_name, format, style, status, meta)
        VALUES (
          NEW.id, NEW.influencer_id, _platform_id,
          CASE WHEN _mode = 'platform_direct' THEN NULL ELSE NEW.game_slug END,
          CASE WHEN _mode = 'platform_direct' THEN NULL ELSE NEW.game_name END,
          _rule.format,
          CASE WHEN _mode = 'platform_direct' THEN 'minimal' WHEN _rule.style IN ('hype','minimal','editorial') THEN _rule.style ELSE _default_style END,
          'queued',
          jsonb_build_object('icon_url', CASE WHEN _mode = 'platform_direct' THEN NULL ELSE NEW.game_icon_url END, 'hype_reason', NEW.hype_reason, 'link_category', NEW.link_category, 'auto', true, 'kit_only', _mode = 'platform_direct')
        );
      END LOOP;
    END IF;

    INSERT INTO public.link_materials (tracking_link_id, influencer_id, platform_id, game_slug, game_name, format, style, status, meta)
    SELECT NEW.id, NEW.influencer_id, _platform_id,
           CASE WHEN _mode = 'platform_direct' THEN NULL ELSE NEW.game_slug END,
           CASE WHEN _mode = 'platform_direct' THEN NULL ELSE NEW.game_name END,
           f.format, _default_style, 'queued',
           jsonb_build_object('icon_url', CASE WHEN _mode = 'platform_direct' THEN NULL ELSE NEW.game_icon_url END, 'hype_reason', NEW.hype_reason, 'link_category', NEW.link_category, 'auto', true, 'kit_only', _mode = 'platform_direct')
    FROM (VALUES ('feed'), ('story'), ('landscape'), ('square_wa')) AS f(format)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.link_materials lm WHERE lm.tracking_link_id = NEW.id AND lm.format = f.format
    );
  END IF;

  IF _lpi_id IS NOT NULL THEN
    SELECT lpi.landing_page_id,
           CASE WHEN COALESCE((lpi.hype_copy->>'auto')::boolean, true) THEN _mode ELSE COALESCE(NULLIF(lpi.lp_mode, ''), _mode) END,
           lp.domain,
           lp.route
      INTO _lp_id, _effective_mode, _lp_domain, _lp_route
    FROM public.landing_page_instances lpi
    LEFT JOIN public.landing_pages lp ON lp.id = lpi.landing_page_id
    WHERE lpi.id = _lpi_id;

    _effective_mode := CASE WHEN _mode = 'platform_direct' THEN 'platform_direct' ELSE COALESCE(_effective_mode, _mode) END;

    _share_url := public.playbet_append_url_param(
      public.playbet_public_lp_url(_lp_domain, _lp_route, (SELECT slug FROM public.landing_page_instances WHERE id = _lpi_id), _effective_mode, NEW.influencer_id, NEW.campanha_id),
      'sub1', NEW.tracking_code, false
    );

    IF _platform_id IS NOT NULL AND array_length(_all_slugs, 1) > 0 THEN
      SELECT COALESCE(array_agg(id), '{}'::uuid[]) INTO _game_ids FROM public.platform_hyped_games WHERE platform_id = _platform_id AND game_slug = ANY(_all_slugs);
    ELSE
      _game_ids := '{}'::uuid[];
    END IF;

    UPDATE public.landing_page_instances
    SET lp_mode = CASE WHEN COALESCE((hype_copy->>'auto')::boolean, true) OR _mode = 'platform_direct' THEN _mode ELSE lp_mode END,
        game_slugs = CASE WHEN COALESCE((hype_copy->>'auto')::boolean, true) OR _mode = 'platform_direct' THEN CASE WHEN _mode = 'platform_direct' THEN '{}'::text[] ELSE _all_slugs END WHEN COALESCE(array_length(game_slugs, 1), 0) = 0 AND _mode <> 'platform_direct' THEN _all_slugs ELSE game_slugs END,
        game_ids = CASE WHEN COALESCE((hype_copy->>'auto')::boolean, true) OR _mode = 'platform_direct' THEN CASE WHEN _mode = 'platform_direct' THEN '{}'::uuid[] ELSE _game_ids END WHEN COALESCE(array_length(game_ids, 1), 0) = 0 AND _mode <> 'platform_direct' THEN _game_ids ELSE game_ids END,
        layout_config = CASE WHEN COALESCE((hype_copy->>'auto')::boolean, true) OR _mode = 'platform_direct' THEN _layout ELSE layout_config END,
        hype_copy = CASE
          WHEN COALESCE((hype_copy->>'auto')::boolean, true) THEN _hype_copy
          WHEN _mode = 'platform_direct' THEN COALESCE(hype_copy, '{}'::jsonb) || (_hype_copy - 'auto') || jsonb_build_object('auto', COALESCE((hype_copy->>'auto')::boolean, false))
          ELSE COALESCE(hype_copy, '{}'::jsonb) || jsonb_build_object(
            'game_slug', COALESCE(hype_copy->'game_slug', _hype_copy->'game_slug'),
            'game_name', COALESCE(hype_copy->'game_name', _hype_copy->'game_name'),
            'game_icon_url', COALESCE(hype_copy->'game_icon_url', _hype_copy->'game_icon_url'),
            'bonus_offer', COALESCE(hype_copy->'bonus_offer', _hype_copy->'bonus_offer'),
            'community_cta', COALESCE(hype_copy->'community_cta', _hype_copy->'community_cta'),
            'category', _cat,
            'platform_slug', _platform_slug,
            'platform_name', _platform_name
          )
        END,
        source_tracking_link_id = NEW.id,
        auto_generated = true,
        affiliate_link = COALESCE(NULLIF(_affiliate_link, ''), affiliate_link),
        updated_at = now()
    WHERE id = _lpi_id;

    UPDATE public.tracking_links
       SET landing_page_instance_id = _lpi_id,
           landing_page_id = COALESCE(NEW.landing_page_id, _lp_id),
           use_lp = true,
           lp_auto_generated = true,
           final_url = COALESCE(_share_url, final_url),
           updated_at = now()
     WHERE id = NEW.id
       AND (landing_page_instance_id IS DISTINCT FROM _lpi_id
            OR landing_page_id IS DISTINCT FROM COALESCE(NEW.landing_page_id, _lp_id)
            OR use_lp IS DISTINCT FROM true
            OR lp_auto_generated IS DISTINCT FROM true
            OR final_url IS DISTINCT FROM COALESCE(_share_url, final_url));
  ELSE
    UPDATE public.tracking_links
       SET final_url = COALESCE(_affiliate_link, final_url),
           lp_auto_generated = false,
           updated_at = now()
     WHERE id = NEW.id
       AND (final_url IS DISTINCT FROM COALESCE(_affiliate_link, final_url) OR lp_auto_generated IS DISTINCT FROM false);
  END IF;

  IF _lp_id IS NOT NULL AND _affiliate_link IS NOT NULL AND NEW.game_name IS NOT NULL AND _mode <> 'platform_direct' THEN
    _opp_category := CASE WHEN COALESCE(NULLIF(NEW.game_slug, ''), '') <> '' THEN 'casino' WHEN _cat IN ('casino','slots','crash','live') THEN 'casino' ELSE 'offer' END;
    SELECT id INTO _existing_opp FROM public.lp_opportunities WHERE tracking_link_id = NEW.id AND COALESCE((metadata->>'auto')::boolean, false) = true LIMIT 1;
    IF _existing_opp IS NULL THEN
      INSERT INTO public.lp_opportunities (landing_page_id, tracking_link_id, platform_id, campanha_id, title, subtitle, category, badge, cta_label, destination_url, sort_order, is_active, metadata, game_thumb_url)
      VALUES (_lp_id, NEW.id, _platform_id, NEW.campanha_id, COALESCE(NEW.game_name, 'Oferta oficial'), COALESCE(NEW.hype_reason, _subtitle), _opp_category, CASE WHEN COALESCE(NEW.hype_priority, 0) >= 80 THEN 'HYPE' WHEN _is_bonus THEN 'BÔNUS' ELSE NULL END, _cta, _affiliate_link, COALESCE(NEW.hype_priority, 10), true, jsonb_build_object('auto', true, 'game_slug', NEW.game_slug, 'link_category', NEW.link_category, 'hype_reason', NEW.hype_reason, 'game_icon_url', NEW.game_icon_url, 'image_url', NEW.game_icon_url, 'platform_slug', _platform_slug, 'platform_name', _platform_name, 'media', jsonb_build_object('auto_filled', true, 'image_url', NEW.game_icon_url, 'image_alt', COALESCE(NEW.game_name, 'Jogo'), 'media_type', 'image', 'source_label', 'Catálogo oficial', 'source_url', NULL), 'source', 'link_autopipeline'), NEW.game_icon_url);
    ELSE
      UPDATE public.lp_opportunities SET title = COALESCE(NEW.game_name, title), subtitle = COALESCE(NEW.hype_reason, subtitle), category = _opp_category, cta_label = _cta, destination_url = _affiliate_link, game_thumb_url = COALESCE(NEW.game_icon_url, game_thumb_url), platform_id = COALESCE(_platform_id, platform_id), sort_order = COALESCE(NEW.hype_priority, sort_order), badge = CASE WHEN COALESCE(NEW.hype_priority, 0) >= 80 THEN 'HYPE' WHEN _is_bonus THEN 'BÔNUS' ELSE NULL END, metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('auto', true, 'game_slug', NEW.game_slug, 'hype_reason', NEW.hype_reason, 'game_icon_url', NEW.game_icon_url, 'image_url', NEW.game_icon_url, 'platform_slug', _platform_slug, 'platform_name', _platform_name, 'source', 'link_autopipeline', 'updated_at', now()), updated_at = now() WHERE id = _existing_opp;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, body, meta)
    SELECT p.id, 'link_pipeline_ready', 'Materiais e LP prontos', format('Link %s já tem materiais e landing page vinculados.', NEW.tracking_code), jsonb_build_object('tracking_link_id', NEW.id)
    FROM public.profiles p WHERE p.influencer_id = NEW.influencer_id LIMIT 1;
  END IF;

  RETURN NEW;
END;
$function$;

-- Reparar estilos inválidos/sem jogo em materiais existentes.
UPDATE public.link_materials lm
SET style = CASE WHEN lm.style IN ('hype','minimal','editorial') AND (tl.game_slug IS NOT NULL OR tl.game_name IS NOT NULL) THEN lm.style ELSE 'minimal' END,
    game_slug = CASE WHEN NULLIF(tl.game_slug, '') IS NULL AND NULLIF(tl.game_name, '') IS NULL THEN NULL ELSE lm.game_slug END,
    game_name = CASE WHEN NULLIF(tl.game_slug, '') IS NULL AND NULLIF(tl.game_name, '') IS NULL THEN NULL ELSE lm.game_name END,
    meta = COALESCE(lm.meta, '{}'::jsonb) || jsonb_build_object('auto', true, 'kit_only', (NULLIF(tl.game_slug, '') IS NULL AND NULLIF(tl.game_name, '') IS NULL), 'icon_url', CASE WHEN NULLIF(tl.game_slug, '') IS NULL AND NULLIF(tl.game_name, '') IS NULL THEN NULL ELSE tl.game_icon_url END),
    updated_at = now()
FROM public.tracking_links tl
WHERE tl.id = lm.tracking_link_id
  AND COALESCE(tl.is_demo, false) = false
  AND (lm.style NOT IN ('hype','minimal','editorial') OR (NULLIF(tl.game_slug, '') IS NULL AND NULLIF(tl.game_name, '') IS NULL));

-- Gerar materiais faltantes para links reais sem jogo.
WITH src AS (
  SELECT tl.id, tl.influencer_id, pa.platform_id, tl.hype_reason, tl.link_category
  FROM public.tracking_links tl
  LEFT JOIN public.platform_accounts pa ON pa.id = tl.platform_account_id
  WHERE COALESCE(tl.is_demo, false) = false
    AND NULLIF(tl.game_slug, '') IS NULL
    AND NULLIF(tl.game_name, '') IS NULL
)
INSERT INTO public.link_materials (tracking_link_id, influencer_id, platform_id, game_slug, game_name, format, style, status, meta)
SELECT src.id, src.influencer_id, src.platform_id, NULL, NULL, f.format, 'minimal', 'queued',
       jsonb_build_object('icon_url', NULL, 'hype_reason', src.hype_reason, 'link_category', src.link_category, 'auto', true, 'kit_only', true)
FROM src
CROSS JOIN (VALUES ('feed'), ('story'), ('landscape'), ('square_wa')) AS f(format)
WHERE NOT EXISTS (
  SELECT 1 FROM public.link_materials lm WHERE lm.tracking_link_id = src.id AND lm.format = f.format
);

-- Limpar LPs vinculadas a links sem jogo e garantir que o botão público aponta para o afiliado correto.
WITH src AS (
  SELECT tl.id AS tracking_link_id, tl.landing_page_instance_id, tl.landing_page_id, tl.influencer_id, tl.campanha_id, tl.tracking_code,
         tl.base_url, tl.short_url, tl.click_id_param_name,
         pa.platform_id, p.slug AS platform_slug, p.name AS platform_name,
         lp.domain, lp.route,
         public.playbet_tracked_affiliate_url(COALESCE(NULLIF(tl.base_url,''), NULLIF(tl.short_url,'')), tl.click_id_param_name, tl.tracking_code, tl.influencer_id, tl.campanha_id) AS affiliate_url
  FROM public.tracking_links tl
  LEFT JOIN public.platform_accounts pa ON pa.id = tl.platform_account_id
  LEFT JOIN public.platforms p ON p.id = pa.platform_id
  LEFT JOIN public.landing_pages lp ON lp.id = tl.landing_page_id
  WHERE COALESCE(tl.is_demo, false) = false
    AND tl.landing_page_instance_id IS NOT NULL
    AND NULLIF(tl.game_slug, '') IS NULL
    AND NULLIF(tl.game_name, '') IS NULL
)
UPDATE public.landing_page_instances lpi
SET lp_mode = 'platform_direct',
    game_slugs = '{}'::text[],
    game_ids = '{}'::uuid[],
    layout_config = jsonb_build_object('mode','platform_direct','sections',jsonb_build_array(
      jsonb_build_object('id','hero','label','Hero','enabled',true),
      jsonb_build_object('id','games','label','Jogos','enabled',false),
      jsonb_build_object('id','odds','label','Em destaque','enabled',false),
      jsonb_build_object('id','features','label','Benefícios','enabled',false),
      jsonb_build_object('id','community','label','Comunidade','enabled',false),
      jsonb_build_object('id','cta','label','CTA final','enabled',true),
      jsonb_build_object('id','footer','label','Rodapé','enabled',true)
    ), 'updated_at', now()),
    hype_copy = COALESCE(lpi.hype_copy, '{}'::jsonb) || jsonb_build_object(
      'title', COALESCE(NULLIF(lpi.hype_copy->>'title',''), src.platform_name, 'Oferta oficial'),
      'subtitle', COALESCE(NULLIF(lpi.hype_copy->>'subtitle',''), CASE WHEN src.platform_name IS NOT NULL THEN 'Acesse ' || src.platform_name || ' agora com bônus oficial PlayBet.' ELSE 'Acesse a plataforma oficial com segurança.' END),
      'cta_label', COALESCE(NULLIF(lpi.hype_copy->>'cta_label',''), CASE WHEN src.platform_name IS NOT NULL THEN 'Acessar ' || src.platform_name ELSE 'Acessar plataforma' END),
      'game_slug', NULL,
      'game_name', NULL,
      'game_icon_url', NULL,
      'bonus_offer', jsonb_build_object('enabled', false, 'title', NULL, 'code', NULL, 'note', NULL, 'cta_label', CASE WHEN src.platform_name IS NOT NULL THEN 'Acessar ' || src.platform_name ELSE 'Acessar plataforma' END),
      'community_cta', jsonb_build_object('enabled', false, 'label', NULL, 'url', NULL, 'note', NULL),
      'platform_slug', src.platform_slug,
      'platform_name', src.platform_name,
      'auto', COALESCE((lpi.hype_copy->>'auto')::boolean, true)
    ),
    source_tracking_link_id = src.tracking_link_id,
    affiliate_link = COALESCE(src.affiliate_url, lpi.affiliate_link),
    auto_generated = true,
    updated_at = now()
FROM src
WHERE lpi.id = src.landing_page_instance_id;

WITH src AS (
  SELECT tl.id, tl.landing_page_instance_id, tl.landing_page_id, tl.influencer_id, tl.campanha_id, tl.tracking_code,
         lp.domain, lp.route, lpi.slug
  FROM public.tracking_links tl
  JOIN public.landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
  LEFT JOIN public.landing_pages lp ON lp.id = COALESCE(tl.landing_page_id, lpi.landing_page_id)
  WHERE COALESCE(tl.is_demo, false) = false
    AND NULLIF(tl.game_slug, '') IS NULL
    AND NULLIF(tl.game_name, '') IS NULL
)
UPDATE public.tracking_links tl
SET final_url = public.playbet_append_url_param(public.playbet_public_lp_url(src.domain, src.route, src.slug, 'platform_direct', src.influencer_id, src.campanha_id), 'sub1', src.tracking_code, false),
    landing_page_id = COALESCE(src.landing_page_id, tl.landing_page_id),
    use_lp = true,
    lp_auto_generated = true,
    updated_at = now()
FROM src
WHERE tl.id = src.id;
