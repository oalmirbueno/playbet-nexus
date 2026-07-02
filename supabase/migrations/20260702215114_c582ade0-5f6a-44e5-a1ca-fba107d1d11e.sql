CREATE OR REPLACE FUNCTION public.trigger_link_autopipeline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _platform_id uuid;
  _platform_name text;
  _rule record;
  _has_rules boolean := false;
  _mode text;
  _all_slugs text[];
  _game_ids uuid[];
  _hype_copy jsonb;
  _layout jsonb;
  _lp_id uuid;
  _dest text;
  _opp_category text;
  _existing_opp uuid;
  _cat text;
  _title text;
  _subtitle text;
  _cta text;
  _community_label text;
  _bonus_title text;
  _bonus_note text;
  _is_bonus boolean;
BEGIN
  IF NEW.is_demo THEN RETURN NEW; END IF;

  IF NEW.platform_account_id IS NOT NULL THEN
    SELECT pa.platform_id, p.name INTO _platform_id, _platform_name
    FROM public.platform_accounts pa
    LEFT JOIN public.platforms p ON p.id = pa.platform_id
    WHERE pa.id = NEW.platform_account_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF _platform_id IS NOT NULL THEN
      FOR _rule IN
        SELECT format, style FROM public.platform_material_rules
        WHERE platform_id = _platform_id AND enabled = true AND auto_on_new_link = true
      LOOP
        _has_rules := true;
        INSERT INTO public.link_materials
          (tracking_link_id, influencer_id, platform_id, game_slug, game_name,
           format, style, status, meta)
        VALUES
          (NEW.id, NEW.influencer_id, _platform_id, NEW.game_slug, NEW.game_name,
           _rule.format, _rule.style, 'queued',
           jsonb_build_object('icon_url', NEW.game_icon_url,'hype_reason', NEW.hype_reason,
             'link_category', NEW.link_category,'auto', true))
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    IF NOT _has_rules THEN
      INSERT INTO public.link_materials
        (tracking_link_id, influencer_id, platform_id, game_slug, game_name,
         format, style, status, meta)
      SELECT NEW.id, NEW.influencer_id, _platform_id, NEW.game_slug, NEW.game_name,
             f.format, 'hype_neon', 'queued',
             jsonb_build_object('icon_url', NEW.game_icon_url,'hype_reason', NEW.hype_reason,
               'link_category', NEW.link_category,'auto', true)
      FROM (VALUES ('feed'), ('story')) AS f(format)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF NEW.landing_page_instance_id IS NOT NULL THEN
    _all_slugs := CASE
      WHEN NEW.game_slug IS NOT NULL AND NEW.game_slug <> '' THEN ARRAY[NEW.game_slug]
      ELSE '{}'::text[]
    END;

    _cat := lower(COALESCE(NEW.link_category, ''));
    _is_bonus := _cat IN ('bonus','bônus','promo','oferta','offer','cupom','codigo','código');
    _mode := CASE
      WHEN _cat IN ('odds','sports','sportsbook','esportes') THEN 'odds'
      WHEN array_length(_all_slugs, 1) = 1 THEN 'single_game'
      WHEN array_length(_all_slugs, 1) > 1 THEN 'multi_game'
      ELSE 'catalog'
    END;

    IF _platform_id IS NOT NULL AND array_length(_all_slugs, 1) > 0 THEN
      SELECT COALESCE(array_agg(id), '{}'::uuid[]) INTO _game_ids
      FROM public.platform_hyped_games
      WHERE platform_id = _platform_id AND game_slug = ANY(_all_slugs);
    ELSE
      _game_ids := '{}'::uuid[];
    END IF;

    IF _mode = 'odds' THEN
      _title := COALESCE(NULLIF(NEW.game_name, ''), 'Odds oficiais');
      _subtitle := COALESCE(NULLIF(NEW.hype_reason, ''), 'Melhores oportunidades de hoje.');
      _cta := 'Acessar oportunidades';
    ELSIF _mode = 'single_game' THEN
      _title := COALESCE(NULLIF(NEW.game_name, ''), 'Oferta oficial');
      _subtitle := COALESCE(NULLIF(NEW.hype_reason, ''), 'Bônus ativo para jogar agora.');
      _cta := CASE WHEN _is_bonus THEN 'Resgatar bônus' ELSE 'Acessar oportunidades' END;
    ELSIF _mode = 'multi_game' THEN
      _title := 'Jogos em alta';
      _subtitle := COALESCE(NULLIF(NEW.hype_reason, ''), 'Ofertas oficiais selecionadas.');
      _cta := 'Acessar oportunidades';
    ELSE
      _title := 'Oferta oficial';
      _subtitle := COALESCE(NULLIF(NEW.hype_reason, ''), 'Bônus oficial e acesso rápido.');
      _cta := CASE WHEN _is_bonus THEN 'Resgatar bônus' ELSE 'Acessar oportunidades' END;
    END IF;

    _community_label := CASE
      WHEN NEW.game_name IS NOT NULL AND NEW.game_name <> '' THEN 'Comunidade ' || NEW.game_name
      WHEN _mode = 'odds' THEN 'Sala de sinais'
      ELSE 'Comunidade PlayBet'
    END;

    _bonus_title := CASE
      WHEN _is_bonus AND NEW.game_name IS NOT NULL THEN 'Bônus ' || NEW.game_name
      WHEN _is_bonus THEN 'Bônus exclusivo'
      ELSE 'Oferta oficial'
    END;
    _bonus_note := CASE
      WHEN _is_bonus THEN 'Use no cadastro.'
      ELSE 'Disponível por tempo limitado.'
    END;

    _hype_copy := jsonb_build_object(
      'title', _title,
      'subtitle', _subtitle,
      'cta_label', _cta,
      'game_slug', NEW.game_slug,
      'game_name', NEW.game_name,
      'game_icon_url', NEW.game_icon_url,
      'bonus_offer', jsonb_build_object(
        'enabled', true,
        'title', _bonus_title,
        'code', NULL,
        'note', _bonus_note,
        'cta_label', _cta
      ),
      'community_cta', jsonb_build_object(
        'enabled', true,
        'label', _community_label,
        'url', NULL,
        'note', NULL
      ),
      'category', _cat,
      'auto', true
    );

    _layout := jsonb_build_object(
      'mode', _mode,
      'sections', jsonb_build_array(
        jsonb_build_object('id','hero','label','Hero','enabled',true),
        jsonb_build_object('id','features','label','Ofertas','enabled',true),
        jsonb_build_object('id','games','label','Jogos','enabled', _mode <> 'odds'),
        jsonb_build_object('id','odds','label','Odds','enabled', _mode = 'odds'),
        jsonb_build_object('id','community','label','Comunidade','enabled',true),
        jsonb_build_object('id','cta','label','CTA','enabled',true),
        jsonb_build_object('id','footer','label','Rodapé','enabled',true)
      ),
      'updated_at', now()
    );

    UPDATE public.landing_page_instances
    SET lp_mode = _mode,
        game_slugs = _all_slugs,
        game_ids = _game_ids,
        layout_config = _layout,
        hype_copy = CASE
          WHEN COALESCE((hype_copy->>'auto')::boolean, true)
            THEN _hype_copy
          ELSE COALESCE(hype_copy, '{}'::jsonb) || jsonb_build_object(
            'game_slug', COALESCE(hype_copy->'game_slug', _hype_copy->'game_slug'),
            'game_name', COALESCE(hype_copy->'game_name', _hype_copy->'game_name'),
            'game_icon_url', COALESCE(hype_copy->'game_icon_url', _hype_copy->'game_icon_url'),
            'bonus_offer', COALESCE(hype_copy->'bonus_offer', _hype_copy->'bonus_offer'),
            'community_cta', COALESCE(hype_copy->'community_cta', _hype_copy->'community_cta'),
            'category', _cat
          )
        END,
        source_tracking_link_id = NEW.id,
        auto_generated = true,
        affiliate_link = COALESCE(NULLIF(NEW.base_url, ''), affiliate_link),
        updated_at = now()
    WHERE id = NEW.landing_page_instance_id;

    UPDATE public.tracking_links SET lp_auto_generated = true WHERE id = NEW.id;

    SELECT landing_page_id INTO _lp_id
    FROM public.landing_page_instances WHERE id = NEW.landing_page_instance_id;
  END IF;

  _dest := COALESCE(NULLIF(NEW.base_url, ''), NULLIF(NEW.short_url, ''));

  IF _lp_id IS NOT NULL AND _dest IS NOT NULL AND NEW.game_name IS NOT NULL THEN
    _opp_category := CASE
      WHEN _cat IN ('odds','sports','sportsbook','esportes') THEN 'sports'
      WHEN _cat IN ('casino','slots','crash','live') THEN 'casino'
      ELSE 'offer'
    END;

    SELECT id INTO _existing_opp
    FROM public.lp_opportunities
    WHERE tracking_link_id = NEW.id
      AND COALESCE((metadata->>'auto')::boolean, false) = true
    LIMIT 1;

    IF _existing_opp IS NULL THEN
      INSERT INTO public.lp_opportunities (
        landing_page_id, tracking_link_id, platform_id, campanha_id,
        title, subtitle, category, badge, cta_label, destination_url,
        sort_order, is_active, metadata, game_thumb_url
      ) VALUES (
        _lp_id, NEW.id, _platform_id, NEW.campanha_id,
        COALESCE(NEW.game_name, 'Oferta oficial'),
        COALESCE(NEW.hype_reason, _subtitle),
        _opp_category,
        CASE WHEN COALESCE(NEW.hype_priority, 0) >= 80 THEN 'HYPE' WHEN _is_bonus THEN 'BÔNUS' ELSE NULL END,
        _cta,
        _dest,
        COALESCE(NEW.hype_priority, 10),
        true,
        jsonb_build_object(
          'auto', true, 'game_slug', NEW.game_slug,
          'link_category', NEW.link_category, 'hype_reason', NEW.hype_reason,
          'game_icon_url', NEW.game_icon_url,
          'source', 'link_autopipeline'
        ),
        NEW.game_icon_url
      );
    ELSE
      UPDATE public.lp_opportunities
      SET title = COALESCE(NEW.game_name, title),
          subtitle = COALESCE(NEW.hype_reason, subtitle),
          category = _opp_category,
          cta_label = _cta,
          destination_url = _dest,
          game_thumb_url = COALESCE(NEW.game_icon_url, game_thumb_url),
          platform_id = COALESCE(_platform_id, platform_id),
          sort_order = COALESCE(NEW.hype_priority, sort_order),
          badge = CASE WHEN COALESCE(NEW.hype_priority, 0) >= 80 THEN 'HYPE' WHEN _is_bonus THEN 'BÔNUS' ELSE badge END,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'auto', true, 'game_slug', NEW.game_slug, 'hype_reason', NEW.hype_reason,
            'game_icon_url', NEW.game_icon_url,
            'source', 'link_autopipeline', 'updated_at', now()
          ),
          updated_at = now()
      WHERE id = _existing_opp;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, body, meta)
    SELECT p.id, 'link_pipeline_ready', 'Materiais e LP prontos',
           format('Link %s já tem materiais e landing page vinculados.', NEW.tracking_code),
           jsonb_build_object('tracking_link_id', NEW.id)
    FROM public.profiles p
    WHERE p.influencer_id = NEW.influencer_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$function$;

UPDATE public.tracking_links
SET game_icon_url = game_icon_url
WHERE is_demo = false
  AND landing_page_instance_id IS NOT NULL;