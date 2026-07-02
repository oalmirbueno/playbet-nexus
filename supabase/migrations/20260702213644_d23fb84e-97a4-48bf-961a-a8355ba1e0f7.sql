
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
BEGIN
  IF NEW.is_demo THEN RETURN NEW; END IF;

  IF NEW.platform_account_id IS NOT NULL THEN
    SELECT pa.platform_id, p.name INTO _platform_id, _platform_name
    FROM public.platform_accounts pa
    LEFT JOIN public.platforms p ON p.id = pa.platform_id
    WHERE pa.id = NEW.platform_account_id;
  END IF;

  -- ─── Auto-materials ───────────────────────────────────────────
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

  -- ─── Auto-LP (landing_page_instances) ─────────────────────────
  IF NEW.landing_page_instance_id IS NOT NULL THEN
    _all_slugs := CASE
      WHEN NEW.game_slug IS NOT NULL AND NEW.game_slug <> '' THEN ARRAY[NEW.game_slug]
      ELSE '{}'::text[]
    END;

    _cat := lower(COALESCE(NEW.link_category, ''));
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

    -- Adaptive copy
    IF _mode = 'odds' THEN
      _title := COALESCE(
        NULLIF(NEW.game_name, ''),
        'Odds em alta' || CASE WHEN _platform_name IS NOT NULL THEN ' na ' || _platform_name ELSE '' END
      );
      _subtitle := COALESCE(NEW.hype_reason, 'Odds selecionadas pela curadoria PlayBet — foco em mercados simples e valor real.');
      _cta := 'Apostar agora';
    ELSIF _mode = 'single_game' THEN
      _title := COALESCE(NEW.game_name, 'Jogo em destaque');
      _subtitle := COALESCE(
        NEW.hype_reason,
        'Bônus e cashback ativos hoje em ' || COALESCE(NEW.game_name, 'jogos selecionados') ||
        CASE WHEN _platform_name IS NOT NULL THEN ' na ' || _platform_name ELSE '' END || '.'
      );
      _cta := CASE WHEN _cat IN ('crash','slots','casino','live') THEN 'Jogar ' || COALESCE(NEW.game_name, 'agora') ELSE 'Jogar agora' END;
    ELSIF _mode = 'multi_game' THEN
      _title := COALESCE(NEW.game_name, 'Jogos em alta');
      _subtitle := COALESCE(NEW.hype_reason, 'Seleção quente da semana — jogos com maior conversão dos influencers PlayBet.');
      _cta := 'Jogar agora';
    ELSE
      _title := COALESCE(NEW.game_name, 'Bônus exclusivo');
      _subtitle := COALESCE(NEW.hype_reason, 'Cadastro rápido, saques via PIX e catálogo completo.');
      _cta := 'Cadastrar agora';
    END IF;

    _community_label := CASE
      WHEN NEW.game_name IS NOT NULL AND NEW.game_name <> ''
        THEN 'Entrar na comunidade de ' || NEW.game_name
      WHEN _mode = 'odds' THEN 'Entrar na sala de sinais'
      ELSE 'Entrar na comunidade PlayBet'
    END;

    _hype_copy := jsonb_build_object(
      'title', _title,
      'subtitle', _subtitle,
      'cta_label', _cta,
      'community_cta', jsonb_build_object(
        'enabled', true,
        'label', _community_label,
        'url', NULL,
        'note', CASE WHEN NEW.game_name IS NOT NULL
          THEN 'Grupo VIP com dicas e horários quentes de ' || NEW.game_name
          ELSE 'Grupo VIP com dicas diárias' END
      ),
      'category', _cat,
      'auto', true
    );

    _layout := jsonb_build_object(
      'mode', _mode,
      'sections', jsonb_build_array(
        jsonb_build_object('id','hero','label','Hero','enabled',true),
        jsonb_build_object('id','games','label','Jogos','enabled', _mode <> 'odds'),
        jsonb_build_object('id','odds','label','Odds/Partidas','enabled', _mode = 'odds'),
        jsonb_build_object('id','community','label','Comunidade','enabled',true),
        jsonb_build_object('id','features','label','Benefícios','enabled',true),
        jsonb_build_object('id','cta','label','CTA final','enabled',true),
        jsonb_build_object('id','footer','label','Rodapé','enabled',true)
      ),
      'updated_at', now()
    );

    UPDATE public.landing_page_instances
    SET lp_mode = _mode, game_slugs = _all_slugs, game_ids = _game_ids,
        layout_config = _layout,
        hype_copy = CASE
          WHEN COALESCE((hype_copy->>'auto')::boolean, true)
            THEN _hype_copy
          ELSE COALESCE(hype_copy, '{}'::jsonb) || jsonb_build_object(
            'community_cta', COALESCE(hype_copy->'community_cta', _hype_copy->'community_cta'),
            'category', _cat
          )
        END,
        source_tracking_link_id = NEW.id, auto_generated = true,
        affiliate_link = COALESCE(NULLIF(NEW.base_url, ''), affiliate_link),
        updated_at = now()
    WHERE id = NEW.landing_page_instance_id;

    UPDATE public.tracking_links SET lp_auto_generated = true WHERE id = NEW.id;

    SELECT landing_page_id INTO _lp_id
    FROM public.landing_page_instances WHERE id = NEW.landing_page_instance_id;
  END IF;

  -- ─── Auto-lp_opportunities ────────────────────────────────────
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
        COALESCE(NEW.game_name, 'Nova oportunidade'),
        NEW.hype_reason,
        _opp_category,
        CASE WHEN COALESCE(NEW.hype_priority, 0) >= 80 THEN 'HYPE' ELSE NULL END,
        CASE WHEN _opp_category = 'sports' THEN 'Apostar agora' ELSE 'Jogar agora' END,
        _dest,
        COALESCE(NEW.hype_priority, 10),
        true,
        jsonb_build_object(
          'auto', true, 'game_slug', NEW.game_slug,
          'link_category', NEW.link_category, 'hype_reason', NEW.hype_reason,
          'source', 'link_autopipeline'
        ),
        NEW.game_icon_url
      );
    ELSE
      UPDATE public.lp_opportunities
      SET title = COALESCE(NEW.game_name, title),
          subtitle = COALESCE(NEW.hype_reason, subtitle),
          category = _opp_category,
          destination_url = _dest,
          game_thumb_url = COALESCE(NEW.game_icon_url, game_thumb_url),
          platform_id = COALESCE(_platform_id, platform_id),
          sort_order = COALESCE(NEW.hype_priority, sort_order),
          badge = CASE WHEN COALESCE(NEW.hype_priority, 0) >= 80 THEN 'HYPE' ELSE badge END,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'auto', true, 'game_slug', NEW.game_slug, 'hype_reason', NEW.hype_reason,
            'source', 'link_autopipeline', 'updated_at', now()
          ),
          updated_at = now()
      WHERE id = _existing_opp;
    END IF;
  END IF;

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

-- Backfill: reaplica adaptive copy nas LPs auto-geradas existentes
DO $$
DECLARE
  _tl record;
BEGIN
  FOR _tl IN
    SELECT tl.id
    FROM public.tracking_links tl
    JOIN public.landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
    WHERE tl.is_demo = false
      AND tl.landing_page_instance_id IS NOT NULL
      AND COALESCE((lpi.hype_copy->>'auto')::boolean, true) = true
  LOOP
    UPDATE public.tracking_links SET updated_at = now() WHERE id = _tl.id;
  END LOOP;
END $$;
