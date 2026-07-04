-- Renderer só entende hype/minimal/editorial. O gatilho estava gravando
-- 'platform_lockup' para links sem jogo, o que quebrava o preview e
-- a UI ficava sem material visível. Trocar por 'minimal' e reparar rows antigas.
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
  _has_rules boolean := false;
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
BEGIN
  IF NEW.is_demo THEN RETURN NEW; END IF;

  IF NEW.platform_account_id IS NOT NULL THEN
    SELECT pa.platform_id, p.name, p.slug INTO _platform_id, _platform_name, _platform_slug
    FROM public.platform_accounts pa
    LEFT JOIN public.platforms p ON p.id = pa.platform_id
    WHERE pa.id = NEW.platform_account_id;
  END IF;

  _dest := COALESCE(NULLIF(NEW.base_url, ''), NULLIF(NEW.short_url, ''));
  _affiliate_link := public.playbet_tracked_affiliate_url(_dest, NEW.click_id_param_name, NEW.tracking_code, NEW.influencer_id, NEW.campanha_id);

  IF TG_OP = 'INSERT' THEN
    IF _platform_id IS NOT NULL THEN
      FOR _rule IN SELECT format, style FROM public.platform_material_rules WHERE platform_id = _platform_id AND enabled = true AND auto_on_new_link = true LOOP
        _has_rules := true;
        INSERT INTO public.link_materials (tracking_link_id, influencer_id, platform_id, game_slug, game_name, format, style, status, meta)
        VALUES (NEW.id, NEW.influencer_id, _platform_id, NEW.game_slug, NEW.game_name, _rule.format, _rule.style, 'queued', jsonb_build_object('icon_url', NEW.game_icon_url, 'hype_reason', NEW.hype_reason, 'link_category', NEW.link_category, 'auto', true))
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    IF NOT _has_rules THEN
      -- Renderer só aceita hype/minimal/editorial. Sem jogo → minimal (lockup limpo).
      _default_style := CASE WHEN NULLIF(NEW.game_slug, '') IS NULL AND NULLIF(NEW.game_name, '') IS NULL THEN 'minimal' ELSE 'hype' END;
      INSERT INTO public.link_materials (tracking_link_id, influencer_id, platform_id, game_slug, game_name, format, style, status, meta)
      SELECT NEW.id, NEW.influencer_id, _platform_id, NEW.game_slug, NEW.game_name, f.format, _default_style,
             'queued',
             jsonb_build_object('icon_url', NEW.game_icon_url, 'hype_reason', NEW.hype_reason, 'link_category', NEW.link_category, 'auto', true, 'kit_only', (NULLIF(NEW.game_slug, '') IS NULL AND NULLIF(NEW.game_name, '') IS NULL))
      FROM (VALUES ('feed'), ('story')) AS f(format)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF NEW.landing_page_instance_id IS NOT NULL THEN
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

    SELECT lpi.landing_page_id, CASE WHEN COALESCE((lpi.hype_copy->>'auto')::boolean, true) THEN _mode ELSE COALESCE(NULLIF(lpi.lp_mode, ''), _mode) END, lp.domain, lp.route
      INTO _lp_id, _effective_mode, _lp_domain, _lp_route
    FROM public.landing_page_instances lpi
    LEFT JOIN public.landing_pages lp ON lp.id = lpi.landing_page_id
    WHERE lpi.id = NEW.landing_page_instance_id;

    _share_url := public.playbet_append_url_param(public.playbet_public_lp_url(_lp_domain, _lp_route, (SELECT slug FROM public.landing_page_instances WHERE id = NEW.landing_page_instance_id), _effective_mode, NEW.influencer_id, NEW.campanha_id), COALESCE(NULLIF(NEW.click_id_param_name, ''), 'sub1'), NEW.tracking_code, false);

    IF _platform_id IS NOT NULL AND array_length(_all_slugs, 1) > 0 THEN
      SELECT COALESCE(array_agg(id), '{}'::uuid[]) INTO _game_ids FROM public.platform_hyped_games WHERE platform_id = _platform_id AND game_slug = ANY(_all_slugs);
    ELSE
      _game_ids := '{}'::uuid[];
    END IF;

    IF _mode = 'platform_direct' THEN
      _title := COALESCE(_platform_name, 'Oferta oficial');
      _subtitle := 'Acesse a plataforma oficial com segurança.';
      _cta := 'Acessar plataforma';
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

    _community_label := CASE WHEN NULLIF(NEW.game_name, '') IS NOT NULL THEN 'Comunidade ' || NEW.game_name ELSE 'Comunidade PlayBet' END;
    _bonus_title := CASE WHEN _is_bonus AND NEW.game_name IS NOT NULL THEN 'Bônus ' || NEW.game_name WHEN _is_bonus THEN 'Bônus exclusivo' WHEN NEW.game_name IS NOT NULL THEN 'Oferta ' || NEW.game_name ELSE 'Oferta oficial' END;

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

    _layout := jsonb_build_object('mode', _mode, 'sections', jsonb_build_array(jsonb_build_object('id','hero','label','Hero','enabled',true), jsonb_build_object('id','features','label','Ofertas','enabled',_mode NOT IN ('odds','platform_direct','catalog')), jsonb_build_object('id','games','label','Jogos','enabled', _mode IN ('single_game','multi_game')), jsonb_build_object('id','odds','label','Em destaque','enabled', _mode = 'odds'), jsonb_build_object('id','community','label','Comunidade','enabled', _mode NOT IN ('platform_direct','catalog')), jsonb_build_object('id','cta','label','CTA','enabled',true), jsonb_build_object('id','footer','label','Rodapé','enabled',true)), 'updated_at', now());

    UPDATE public.landing_page_instances
    SET lp_mode = CASE WHEN COALESCE((hype_copy->>'auto')::boolean, true) THEN _mode ELSE lp_mode END,
        game_slugs = CASE WHEN COALESCE((hype_copy->>'auto')::boolean, true) THEN CASE WHEN _mode = 'platform_direct' THEN '{}'::text[] ELSE _all_slugs END WHEN COALESCE(array_length(game_slugs, 1), 0) = 0 AND _mode <> 'platform_direct' THEN _all_slugs ELSE game_slugs END,
        game_ids = CASE WHEN COALESCE((hype_copy->>'auto')::boolean, true) THEN CASE WHEN _mode = 'platform_direct' THEN '{}'::uuid[] ELSE _game_ids END WHEN COALESCE(array_length(game_ids, 1), 0) = 0 AND _mode <> 'platform_direct' THEN _game_ids ELSE game_ids END,
        layout_config = CASE WHEN COALESCE((hype_copy->>'auto')::boolean, true) THEN _layout ELSE layout_config END,
        hype_copy = CASE
          WHEN COALESCE((hype_copy->>'auto')::boolean, true) THEN _hype_copy
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
    WHERE id = NEW.landing_page_instance_id;

    UPDATE public.tracking_links SET lp_auto_generated = true, final_url = COALESCE(_share_url, final_url) WHERE id = NEW.id AND (final_url IS DISTINCT FROM COALESCE(_share_url, final_url) OR lp_auto_generated IS DISTINCT FROM true);
  ELSE
    UPDATE public.tracking_links SET final_url = COALESCE(_affiliate_link, final_url), lp_auto_generated = false WHERE id = NEW.id AND (final_url IS DISTINCT FROM COALESCE(_affiliate_link, final_url) OR lp_auto_generated IS DISTINCT FROM false);
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

-- Repara materiais existentes com estilo inválido
UPDATE public.link_materials SET style = 'minimal' WHERE style = 'platform_lockup';