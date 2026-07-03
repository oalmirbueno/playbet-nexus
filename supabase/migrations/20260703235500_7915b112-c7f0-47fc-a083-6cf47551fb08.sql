-- Add re-entrancy guards to trigger functions that update tracking_links / landing_page_instances,
-- otherwise a save without game recurses through:
--   normalize_tracking_link_lp_instance → landing_page_instances → tracking_links (autopipeline)
--   → playbet_sync_link_share_url (final_url in UPDATE OF list) → tracking_links → ...
CREATE OR REPLACE FUNCTION public.playbet_sync_link_share_url()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _lpi record;
  _lp record;
  _share text;
  _affiliate text;
  _param text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_demo, false) THEN RETURN NEW; END IF;

  _param := COALESCE(NULLIF(NEW.click_id_param_name, ''), 'sub1');

  IF NEW.landing_page_instance_id IS NOT NULL THEN
    SELECT * INTO _lpi FROM public.landing_page_instances WHERE id = NEW.landing_page_instance_id;
    SELECT * INTO _lp FROM public.landing_pages WHERE id = COALESCE(NEW.landing_page_id, _lpi.landing_page_id);

    _share := public.playbet_append_url_param(
      public.playbet_public_lp_url(_lp.domain, _lp.route, _lpi.slug, _lpi.lp_mode, NEW.influencer_id, NEW.campanha_id),
      'sub1', NEW.tracking_code, false
    );
    _affiliate := public.playbet_tracked_affiliate_url(
      COALESCE(NULLIF(NEW.base_url, ''), NULLIF(_lpi.affiliate_link, ''), NULLIF(NEW.short_url, '')),
      _param, NEW.tracking_code, NEW.influencer_id, NEW.campanha_id
    );

    UPDATE public.tracking_links
       SET final_url = COALESCE(_share, final_url),
           landing_page_id = COALESCE(NEW.landing_page_id, _lpi.landing_page_id),
           use_lp = true,
           lp_auto_generated = true
     WHERE id = NEW.id
       AND (final_url IS DISTINCT FROM COALESCE(_share, final_url)
            OR landing_page_id IS DISTINCT FROM COALESCE(NEW.landing_page_id, _lpi.landing_page_id)
            OR use_lp IS DISTINCT FROM true
            OR lp_auto_generated IS DISTINCT FROM true);

    UPDATE public.lp_opportunities
       SET destination_url = COALESCE(_affiliate, destination_url),
           landing_page_id = COALESCE(NEW.landing_page_id, _lpi.landing_page_id, landing_page_id),
           updated_at = now()
     WHERE tracking_link_id = NEW.id
       AND COALESCE((metadata->>'auto')::boolean, false) = true;
  ELSE
    _affiliate := public.playbet_tracked_affiliate_url(
      COALESCE(NULLIF(NEW.base_url, ''), NULLIF(NEW.short_url, '')),
      _param, NEW.tracking_code, NEW.influencer_id, NEW.campanha_id
    );
    UPDATE public.tracking_links
       SET final_url = COALESCE(_affiliate, final_url), lp_auto_generated = false
     WHERE id = NEW.id
       AND (final_url IS DISTINCT FROM COALESCE(_affiliate, final_url)
            OR lp_auto_generated IS DISTINCT FROM false);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_public_lp_share_url_sub1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _lpi record;
  _lp record;
  _share text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_demo, false) OR NEW.landing_page_instance_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO _lpi FROM public.landing_page_instances WHERE id = NEW.landing_page_instance_id;
  IF _lpi.id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO _lp FROM public.landing_pages WHERE id = COALESCE(NEW.landing_page_id, _lpi.landing_page_id);

  _share := public.playbet_append_url_param(
    public.playbet_public_lp_url(_lp.domain, _lp.route, _lpi.slug, _lpi.lp_mode, NEW.influencer_id, NEW.campanha_id),
    'sub1', NEW.tracking_code, false
  );

  IF _share IS NOT NULL THEN
    UPDATE public.tracking_links
       SET final_url = _share,
           landing_page_id = COALESCE(NEW.landing_page_id, _lpi.landing_page_id),
           use_lp = true,
           lp_auto_generated = true,
           updated_at = now()
     WHERE id = NEW.id
       AND (final_url IS DISTINCT FROM _share
            OR landing_page_id IS DISTINCT FROM COALESCE(NEW.landing_page_id, _lpi.landing_page_id)
            OR use_lp IS DISTINCT FROM true
            OR lp_auto_generated IS DISTINCT FROM true);
  END IF;

  RETURN NEW;
END;
$function$;

-- normalize_tracking_link_lp_instance and trigger_link_autopipeline also write to
-- both tables during the same save; guard them the same way so we never re-enter.
CREATE OR REPLACE FUNCTION public.normalize_tracking_link_lp_instance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _platform_slug text;
  _platform_name text;
  _mode text;
  _game_slugs text[];
  _layout jsonb;
  _hype_patch jsonb;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_demo, false) OR NEW.landing_page_instance_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.platform_account_id IS NOT NULL THEN
    SELECT p.slug, p.name INTO _platform_slug, _platform_name
    FROM public.platform_accounts pa
    LEFT JOIN public.platforms p ON p.id = pa.platform_id
    WHERE pa.id = NEW.platform_account_id;
  END IF;

  IF NULLIF(NEW.game_slug, '') IS NULL THEN
    _mode := 'platform_direct';
    _game_slugs := '{}'::text[];
    _layout := jsonb_build_object(
      'mode', _mode,
      'sections', jsonb_build_array(
        jsonb_build_object('id','hero','label','Hero','enabled',true),
        jsonb_build_object('id','games','label','Jogos','enabled',false),
        jsonb_build_object('id','odds','label','Em destaque','enabled',false),
        jsonb_build_object('id','features','label','Benefícios','enabled',false),
        jsonb_build_object('id','community','label','Comunidade','enabled',false),
        jsonb_build_object('id','cta','label','CTA final','enabled',true),
        jsonb_build_object('id','footer','label','Rodapé','enabled',true)
      ),
      'updated_at', now()
    );
    _hype_patch := jsonb_build_object(
      'title', COALESCE(_platform_name, 'Oferta oficial'),
      'subtitle', CASE WHEN _platform_name IS NOT NULL THEN 'Acesse ' || _platform_name || ' agora com bônus oficial PlayBet.' ELSE 'Acesse a plataforma oficial com segurança.' END,
      'cta_label', CASE WHEN _platform_name IS NOT NULL THEN 'Acessar ' || _platform_name ELSE 'Acessar plataforma' END,
      'game_slug', NULL, 'game_name', NULL, 'game_icon_url', NULL,
      'bonus_offer', jsonb_build_object('enabled', false, 'title', NULL, 'code', NULL, 'note', NULL, 'cta_label', CASE WHEN _platform_name IS NOT NULL THEN 'Acessar ' || _platform_name ELSE 'Acessar plataforma' END),
      'community_cta', jsonb_build_object('enabled', false, 'label', NULL, 'url', NULL, 'note', NULL),
      'category', COALESCE(NEW.link_category, ''),
      'platform_slug', _platform_slug,
      'platform_name', _platform_name
    );
  ELSE
    _mode := 'single_game';
    _game_slugs := ARRAY[NEW.game_slug];
    _layout := jsonb_build_object(
      'mode', _mode,
      'sections', jsonb_build_array(
        jsonb_build_object('id','hero','label','Hero','enabled',true),
        jsonb_build_object('id','games','label','Jogos','enabled',false),
        jsonb_build_object('id','odds','label','Em destaque','enabled',false),
        jsonb_build_object('id','features','label','Ofertas','enabled',false),
        jsonb_build_object('id','community','label','Comunidade','enabled',false),
        jsonb_build_object('id','cta','label','CTA final','enabled',true),
        jsonb_build_object('id','footer','label','Rodapé','enabled',true)
      ),
      'updated_at', now()
    );
    _hype_patch := jsonb_build_object(
      'game_slug', NEW.game_slug, 'game_name', NEW.game_name, 'game_icon_url', NEW.game_icon_url,
      'category', COALESCE(NEW.link_category, ''),
      'platform_slug', _platform_slug, 'platform_name', _platform_name
    );
  END IF;

  UPDATE public.landing_page_instances
     SET lp_mode = _mode,
         game_slugs = _game_slugs,
         game_ids = CASE WHEN _mode = 'platform_direct' THEN '{}'::uuid[] ELSE game_ids END,
         layout_config = _layout,
         hype_copy = COALESCE(hype_copy, '{}'::jsonb) || _hype_patch || jsonb_build_object('auto', COALESCE((hype_copy->>'auto')::boolean, true)),
         source_tracking_link_id = NEW.id,
         auto_generated = true,
         updated_at = now()
   WHERE id = NEW.landing_page_instance_id
     AND (
       source_tracking_link_id IS DISTINCT FROM NEW.id
       OR lp_mode IS DISTINCT FROM _mode
       OR game_slugs IS DISTINCT FROM _game_slugs
       OR COALESCE(hype_copy->>'platform_slug', '') IS DISTINCT FROM COALESCE(_platform_slug, '')
       OR (_mode = 'platform_direct' AND COALESCE(jsonb_array_length(COALESCE(layout_config->'sections', '[]'::jsonb)), 0) > 0)
     );

  RETURN NEW;
END;
$function$;