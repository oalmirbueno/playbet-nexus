CREATE OR REPLACE FUNCTION public.normalize_tracking_link_lp_instance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _platform_slug text;
  _platform_name text;
  _mode text;
  _game_slugs text[];
  _layout jsonb;
  _hype_patch jsonb;
BEGIN
  IF COALESCE(NEW.is_demo, false) OR NEW.landing_page_instance_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.platform_account_id IS NOT NULL THEN
    SELECT p.slug, p.name
      INTO _platform_slug, _platform_name
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
      'game_slug', NULL,
      'game_name', NULL,
      'game_icon_url', NULL,
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
      'game_slug', NEW.game_slug,
      'game_name', NEW.game_name,
      'game_icon_url', NEW.game_icon_url,
      'category', COALESCE(NEW.link_category, ''),
      'platform_slug', _platform_slug,
      'platform_name', _platform_name
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
$$;

DROP TRIGGER IF EXISTS trg_normalize_tracking_link_lp_instance ON public.tracking_links;
CREATE TRIGGER trg_normalize_tracking_link_lp_instance
AFTER INSERT OR UPDATE OF landing_page_instance_id, game_slug, game_name, game_icon_url, link_category, platform_account_id
ON public.tracking_links
FOR EACH ROW
EXECUTE FUNCTION public.normalize_tracking_link_lp_instance();