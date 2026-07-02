CREATE OR REPLACE FUNCTION public.playbet_url_has_param(_url text, _param text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF _url IS NULL OR _param IS NULL OR _param = '' THEN
    RETURN false;
  END IF;
  RETURN position('?' || _param || '=' in _url) > 0 OR position('&' || _param || '=' in _url) > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.playbet_append_url_param(_url text, _param text, _value text, _overwrite boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  _sep text;
BEGIN
  IF _url IS NULL OR _url = '' OR _param IS NULL OR _param = '' OR _value IS NULL OR _value = '' THEN
    RETURN _url;
  END IF;

  IF NOT _overwrite AND public.playbet_url_has_param(_url, _param) THEN
    RETURN _url;
  END IF;

  _sep := CASE WHEN position('?' in _url) > 0 THEN '&' ELSE '?' END;
  RETURN _url || _sep || _param || '=' || replace(replace(replace(_value, '%', '%25'), ' ', '%20'), '#', '%23');
END;
$$;

CREATE OR REPLACE FUNCTION public.playbet_tracked_affiliate_url(
  _base_url text,
  _click_param text,
  _tracking_code text,
  _influencer_id uuid,
  _campanha_id uuid
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  _out text := NULLIF(_base_url, '');
  _param text := COALESCE(NULLIF(_click_param, ''), 'sub1');
BEGIN
  IF _out IS NULL THEN
    RETURN NULL;
  END IF;

  _out := public.playbet_append_url_param(_out, _param, _tracking_code, false);
  _out := public.playbet_append_url_param(_out, 'sub2', _influencer_id::text, false);
  _out := public.playbet_append_url_param(_out, 'sub3', _campanha_id::text, false);
  RETURN _out;
END;
$$;

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
AS $$
DECLARE
  _base text;
  _clean_route text;
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

  _clean_route := trim(COALESCE(_route, ''));

  IF COALESCE(_lp_mode, 'catalog') = 'catalog' THEN
    IF _clean_route = '' OR _clean_route = '/' THEN
      _out := _base;
    ELSIF _clean_route ~* '^https?://' THEN
      _out := regexp_replace(_clean_route, '/+$', '');
    ELSIF left(_clean_route, 1) = '?' THEN
      _out := _base || _clean_route;
    ELSE
      _out := _base || CASE WHEN left(_clean_route, 1) = '/' THEN _clean_route ELSE '/' || _clean_route END;
    END IF;
    _out := public.playbet_append_url_param(_out, 'ref', _instance_slug, false);
  ELSE
    _out := _base || '/i/' || replace(_instance_slug, ' ', '%20');
  END IF;

  _out := public.playbet_append_url_param(_out, 'sub2', _influencer_id::text, false);
  _out := public.playbet_append_url_param(_out, 'sub3', _campanha_id::text, false);
  RETURN _out;
END;
$$;

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

  _dest := COALESCE(NULLIF(NEW.base_url, ''), NULLIF(NEW.short_url, ''));
  _affiliate_link := public.playbet_tracked_affiliate_url(
    _dest,
    NEW.click_id_param_name,
    NEW.tracking_code,
    NEW.influencer_id,
    NEW.campanha_id
  );

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

    SELECT lpi.landing_page_id,
           COALESCE(NULLIF(lpi.lp_mode, ''), _mode),
           lp.domain,
           lp.route
      INTO _lp_id, _effective_mode, _lp_domain, _lp_route
    FROM public.landing_page_instances lpi
    LEFT JOIN public.landing_pages lp ON lp.id = lpi.landing_page_id
    WHERE lpi.id = NEW.landing_page_instance_id;

    _share_url := public.playbet_public_lp_url(
      _lp_domain,
      _lp_route,
      (SELECT slug FROM public.landing_page_instances WHERE id = NEW.landing_page_instance_id),
      _effective_mode,
      NEW.influencer_id,
      NEW.campanha_id
    );

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
    SET lp_mode = CASE
          WHEN COALESCE((hype_copy->>'auto')::boolean, true) THEN _mode
          ELSE lp_mode
        END,
        game_slugs = CASE
          WHEN COALESCE((hype_copy->>'auto')::boolean, true) OR COALESCE(array_length(game_slugs, 1), 0) = 0 THEN _all_slugs
          ELSE game_slugs
        END,
        game_ids = CASE
          WHEN COALESCE((hype_copy->>'auto')::boolean, true) OR COALESCE(array_length(game_ids, 1), 0) = 0 THEN _game_ids
          ELSE game_ids
        END,
        layout_config = CASE
          WHEN COALESCE((hype_copy->>'auto')::boolean, true) THEN _layout
          ELSE layout_config
        END,
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
        source_tracking_link_id = COALESCE(source_tracking_link_id, NEW.id),
        auto_generated = true,
        affiliate_link = COALESCE(NULLIF(_affiliate_link, ''), affiliate_link),
        updated_at = now()
    WHERE id = NEW.landing_page_instance_id;

    UPDATE public.tracking_links
       SET lp_auto_generated = true,
           final_url = COALESCE(_share_url, final_url)
     WHERE id = NEW.id
       AND (final_url IS DISTINCT FROM COALESCE(_share_url, final_url)
            OR lp_auto_generated IS DISTINCT FROM true);
  ELSE
    UPDATE public.tracking_links
       SET final_url = COALESCE(_affiliate_link, final_url),
           lp_auto_generated = false
     WHERE id = NEW.id
       AND (final_url IS DISTINCT FROM COALESCE(_affiliate_link, final_url)
            OR lp_auto_generated IS DISTINCT FROM false);
  END IF;

  IF _lp_id IS NOT NULL AND _affiliate_link IS NOT NULL AND NEW.game_name IS NOT NULL THEN
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
        _affiliate_link,
        COALESCE(NEW.hype_priority, 10),
        true,
        jsonb_build_object(
          'auto', true, 'game_slug', NEW.game_slug,
          'link_category', NEW.link_category, 'hype_reason', NEW.hype_reason,
          'game_icon_url', NEW.game_icon_url,
          'image_url', NEW.game_icon_url,
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
          destination_url = _affiliate_link,
          game_thumb_url = COALESCE(NEW.game_icon_url, game_thumb_url),
          platform_id = COALESCE(_platform_id, platform_id),
          sort_order = COALESCE(NEW.hype_priority, sort_order),
          badge = CASE WHEN COALESCE(NEW.hype_priority, 0) >= 80 THEN 'HYPE' WHEN _is_bonus THEN 'BÔNUS' ELSE badge END,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'auto', true, 'game_slug', NEW.game_slug, 'hype_reason', NEW.hype_reason,
            'game_icon_url', NEW.game_icon_url,
            'image_url', NEW.game_icon_url,
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

DROP TRIGGER IF EXISTS trg_tracking_links_autopipeline ON public.tracking_links;
CREATE TRIGGER trg_tracking_links_autopipeline
  AFTER INSERT OR UPDATE OF game_slug, game_name, game_icon_url, link_category, hype_reason, hype_priority, base_url, short_url, landing_page_instance_id, landing_page_id, campanha_id, influencer_id, platform_account_id, click_id_param_name
  ON public.tracking_links
  FOR EACH ROW EXECUTE FUNCTION public.trigger_link_autopipeline();

CREATE OR REPLACE FUNCTION public.sync_landing_page_instance_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tl record;
  _lp record;
  _share text;
  _affiliate text;
BEGIN
  SELECT id, domain, route INTO _lp
  FROM public.landing_pages
  WHERE id = NEW.landing_page_id;

  FOR _tl IN
    SELECT id, base_url, short_url, click_id_param_name, tracking_code, influencer_id, campanha_id
    FROM public.tracking_links
    WHERE landing_page_instance_id = NEW.id
      AND COALESCE(is_demo, false) = false
  LOOP
    _affiliate := public.playbet_tracked_affiliate_url(
      COALESCE(NULLIF(_tl.base_url, ''), NULLIF(_tl.short_url, '')),
      _tl.click_id_param_name,
      _tl.tracking_code,
      _tl.influencer_id,
      _tl.campanha_id
    );

    _share := public.playbet_public_lp_url(
      _lp.domain,
      _lp.route,
      NEW.slug,
      NEW.lp_mode,
      _tl.influencer_id,
      _tl.campanha_id
    );

    UPDATE public.tracking_links
       SET final_url = COALESCE(_share, final_url),
           landing_page_id = NEW.landing_page_id,
           use_lp = true,
           lp_auto_generated = true
     WHERE id = _tl.id;

    UPDATE public.lp_opportunities
       SET destination_url = COALESCE(_affiliate, destination_url),
           landing_page_id = NEW.landing_page_id,
           updated_at = now()
     WHERE tracking_link_id = _tl.id
       AND COALESCE((metadata->>'auto')::boolean, false) = true;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_landing_page_instance_tracking ON public.landing_page_instances;
CREATE TRIGGER trg_sync_landing_page_instance_tracking
AFTER UPDATE OF slug, lp_mode, landing_page_id, affiliate_link ON public.landing_page_instances
FOR EACH ROW
WHEN (OLD.slug IS DISTINCT FROM NEW.slug
   OR OLD.lp_mode IS DISTINCT FROM NEW.lp_mode
   OR OLD.landing_page_id IS DISTINCT FROM NEW.landing_page_id
   OR OLD.affiliate_link IS DISTINCT FROM NEW.affiliate_link)
EXECUTE FUNCTION public.sync_landing_page_instance_tracking();

WITH computed AS (
  SELECT tl.id,
         public.playbet_public_lp_url(lp.domain, lp.route, lpi.slug, lpi.lp_mode, tl.influencer_id, tl.campanha_id) AS share_url,
         public.playbet_tracked_affiliate_url(COALESCE(NULLIF(tl.base_url, ''), NULLIF(tl.short_url, '')), tl.click_id_param_name, tl.tracking_code, tl.influencer_id, tl.campanha_id) AS affiliate_url
  FROM public.tracking_links tl
  LEFT JOIN public.landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
  LEFT JOIN public.landing_pages lp ON lp.id = COALESCE(tl.landing_page_id, lpi.landing_page_id)
  WHERE COALESCE(tl.is_demo, false) = false
)
UPDATE public.tracking_links tl
   SET final_url = CASE WHEN tl.landing_page_instance_id IS NOT NULL THEN computed.share_url ELSE computed.affiliate_url END,
       lp_auto_generated = (tl.landing_page_instance_id IS NOT NULL),
       use_lp = (tl.landing_page_instance_id IS NOT NULL)
FROM computed
WHERE computed.id = tl.id
  AND (tl.final_url IS DISTINCT FROM CASE WHEN tl.landing_page_instance_id IS NOT NULL THEN computed.share_url ELSE computed.affiliate_url END
       OR tl.lp_auto_generated IS DISTINCT FROM (tl.landing_page_instance_id IS NOT NULL)
       OR tl.use_lp IS DISTINCT FROM (tl.landing_page_instance_id IS NOT NULL));

WITH computed AS (
  SELECT tl.id,
         tl.landing_page_id,
         public.playbet_tracked_affiliate_url(COALESCE(NULLIF(tl.base_url, ''), NULLIF(tl.short_url, '')), tl.click_id_param_name, tl.tracking_code, tl.influencer_id, tl.campanha_id) AS affiliate_url,
         tl.game_icon_url
  FROM public.tracking_links tl
  WHERE COALESCE(tl.is_demo, false) = false
)
UPDATE public.lp_opportunities opp
   SET destination_url = COALESCE(computed.affiliate_url, opp.destination_url),
       landing_page_id = COALESCE(opp.landing_page_id, computed.landing_page_id),
       game_thumb_url = COALESCE(opp.game_thumb_url, computed.game_icon_url),
       metadata = COALESCE(opp.metadata, '{}'::jsonb) || jsonb_build_object(
         'game_icon_url', COALESCE(computed.game_icon_url, opp.metadata->>'game_icon_url'),
         'image_url', COALESCE(computed.game_icon_url, opp.metadata->>'image_url'),
         'source', COALESCE(opp.metadata->>'source', 'link_autopipeline'),
         'synced_at', now()
       ),
       updated_at = now()
FROM computed
WHERE computed.id = opp.tracking_link_id
  AND COALESCE((opp.metadata->>'auto')::boolean, false) = true;

-- Força o autopreenchimento/deduplicação já existente nas oportunidades depois do backfill.
UPDATE public.lp_opportunities
SET updated_at = now()
WHERE is_active = true
  AND tracking_link_id IS NOT NULL;