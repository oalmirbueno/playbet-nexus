-- Rewrite auto-pipeline to actually create materials + configure LP instance
CREATE OR REPLACE FUNCTION public.trigger_link_autopipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _platform_id uuid;
  _rule record;
  _has_rules boolean := false;
  _mode text;
  _all_slugs text[];
  _game_ids uuid[];
  _hype_copy jsonb;
  _layout jsonb;
BEGIN
  IF NEW.is_demo THEN RETURN NEW; END IF;

  -- Resolve platform_id from platform_account
  IF NEW.platform_account_id IS NOT NULL THEN
    SELECT platform_id INTO _platform_id
    FROM public.platform_accounts WHERE id = NEW.platform_account_id;
  END IF;

  -- ─── Auto-materials ───────────────────────────────────────────
  -- Insert one row per active platform rule; fallback to feed+story hype_neon.
  IF _platform_id IS NOT NULL THEN
    FOR _rule IN
      SELECT format, style
      FROM public.platform_material_rules
      WHERE platform_id = _platform_id
        AND enabled = true
        AND auto_on_new_link = true
    LOOP
      _has_rules := true;
      INSERT INTO public.link_materials
        (tracking_link_id, influencer_id, platform_id, game_slug, game_name,
         format, style, status, meta)
      VALUES
        (NEW.id, NEW.influencer_id, _platform_id, NEW.game_slug, NEW.game_name,
         _rule.format, _rule.style, 'queued',
         jsonb_build_object(
           'icon_url', NEW.game_icon_url,
           'hype_reason', NEW.hype_reason,
           'link_category', NEW.link_category,
           'auto', true))
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  IF NOT _has_rules THEN
    INSERT INTO public.link_materials
      (tracking_link_id, influencer_id, platform_id, game_slug, game_name,
       format, style, status, meta)
    SELECT NEW.id, NEW.influencer_id, _platform_id, NEW.game_slug, NEW.game_name,
           f.format, 'hype_neon', 'queued',
           jsonb_build_object(
             'icon_url', NEW.game_icon_url,
             'hype_reason', NEW.hype_reason,
             'link_category', NEW.link_category,
             'auto', true)
    FROM (VALUES ('feed'), ('story')) AS f(format)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── Auto-LP ──────────────────────────────────────────────────
  -- If the link points at an LP instance, configure it with game + hype copy.
  IF NEW.landing_page_instance_id IS NOT NULL THEN
    _all_slugs := CASE
      WHEN NEW.game_slug IS NOT NULL AND NEW.game_slug <> '' THEN ARRAY[NEW.game_slug]
      ELSE '{}'::text[]
    END;

    _mode := CASE
      WHEN lower(COALESCE(NEW.link_category, '')) IN ('odds','sports','sportsbook','esportes') THEN 'odds'
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

    _hype_copy := jsonb_build_object(
      'title', NEW.game_name,
      'subtitle', NEW.hype_reason,
      'cta_label', CASE WHEN _mode = 'odds' THEN 'Apostar agora' ELSE 'Jogar agora' END
    );

    _layout := jsonb_build_object(
      'mode', _mode,
      'sections', jsonb_build_array(
        jsonb_build_object('id','hero','label','Hero','enabled',true),
        jsonb_build_object('id','games','label','Jogos','enabled', _mode <> 'odds'),
        jsonb_build_object('id','odds','label','Odds/Partidas','enabled', _mode = 'odds'),
        jsonb_build_object('id','features','label','Benefícios','enabled',true),
        jsonb_build_object('id','cta','label','CTA final','enabled',true),
        jsonb_build_object('id','footer','label','Rodapé','enabled',true)
      ),
      'updated_at', now()
    );

    UPDATE public.landing_page_instances
    SET lp_mode = _mode,
        game_slugs = _all_slugs,
        game_ids = _game_ids,
        layout_config = _layout,
        hype_copy = _hype_copy,
        source_tracking_link_id = NEW.id,
        auto_generated = true,
        affiliate_link = COALESCE(NULLIF(NEW.base_url, ''), affiliate_link),
        updated_at = now()
    WHERE id = NEW.landing_page_instance_id;

    UPDATE public.tracking_links SET lp_auto_generated = true WHERE id = NEW.id;
  END IF;

  -- ─── Notification (kept for compat) ───────────────────────────
  INSERT INTO public.notifications (user_id, type, title, body, meta)
  SELECT p.id, 'link_pipeline_ready', 'Materiais e LP prontos',
         format('Link %s já tem materiais e landing page vinculados.', NEW.tracking_code),
         jsonb_build_object('tracking_link_id', NEW.id)
  FROM public.profiles p
  WHERE p.influencer_id = NEW.influencer_id
  LIMIT 1;

  RETURN NEW;
END;
$function$;