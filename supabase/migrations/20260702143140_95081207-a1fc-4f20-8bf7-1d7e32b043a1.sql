
-- 1) Squads: goal distribution fields
ALTER TABLE public.squads
  ADD COLUMN IF NOT EXISTS manager_goal_brl numeric,
  ADD COLUMN IF NOT EXISTS goal_distribution_mode text NOT NULL DEFAULT 'equal',
  ADD COLUMN IF NOT EXISTS goal_last_distributed_at timestamptz;

-- 2) Influencer individual monthly goal
ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS monthly_goal_brl numeric;

-- 3) Squad activity log
CREATE TABLE IF NOT EXISTS public.squad_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  actor_user_id uuid,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.squad_activity TO authenticated;
GRANT ALL ON public.squad_activity TO service_role;

ALTER TABLE public.squad_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage squad_activity"
  ON public.squad_activity FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read squad_activity"
  ON public.squad_activity FOR SELECT TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_squad_activity_squad ON public.squad_activity(squad_id, created_at DESC);

-- 4) Goal distribution RPC
CREATE OR REPLACE FUNCTION public.distribute_squad_goal(
  _squad_id uuid,
  _mode text DEFAULT 'equal',
  _overrides jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _squad record;
  _total numeric;
  _active_count int;
  _updated int := 0;
  _rec record;
  _share numeric;
  _weight_sum numeric := 0;
  _revenue numeric;
  _since date := (now() AT TIME ZONE 'America/Sao_Paulo')::date - 30;
BEGIN
  IF NOT (public.is_admin(auth.uid())
          OR EXISTS (SELECT 1 FROM public.managers m
                     JOIN public.profiles p ON p.manager_id = m.id
                     WHERE p.id = auth.uid() AND m.squad_id = _squad_id)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _squad FROM public.squads WHERE id = _squad_id;
  IF _squad IS NULL THEN RAISE EXCEPTION 'squad_not_found'; END IF;

  _total := COALESCE(_squad.monthly_goal, 0);

  SELECT COUNT(*) INTO _active_count
  FROM public.influencers WHERE squad_id = _squad_id AND is_active = true;

  IF _active_count = 0 THEN
    UPDATE public.squads
      SET goal_distribution_mode = _mode, goal_last_distributed_at = now(), updated_at = now()
      WHERE id = _squad_id;
    RETURN jsonb_build_object('ok', true, 'updated', 0, 'reason', 'no_influencers');
  END IF;

  IF _mode = 'manual' THEN
    FOR _rec IN SELECT id FROM public.influencers WHERE squad_id = _squad_id AND is_active = true LOOP
      IF _overrides ? _rec.id::text THEN
        UPDATE public.influencers
          SET monthly_goal_brl = NULLIF((_overrides->>_rec.id::text)::numeric, 0),
              updated_at = now()
          WHERE id = _rec.id;
        _updated := _updated + 1;
      END IF;
    END LOOP;

  ELSIF _mode = 'weighted' THEN
    -- weight by revenue in last 30 days from tracking_metrics
    SELECT COALESCE(SUM(tm.revenue), 0) INTO _weight_sum
    FROM public.tracking_metrics tm
    JOIN public.influencers i ON i.id = tm.influencer_id
    WHERE i.squad_id = _squad_id AND i.is_active = true
      AND tm.data_ref >= _since AND tm.is_demo = false;

    FOR _rec IN SELECT id FROM public.influencers WHERE squad_id = _squad_id AND is_active = true LOOP
      SELECT COALESCE(SUM(revenue), 0) INTO _revenue
      FROM public.tracking_metrics
      WHERE influencer_id = _rec.id AND data_ref >= _since AND is_demo = false;

      IF _weight_sum > 0 THEN
        _share := ROUND(_total * (_revenue / _weight_sum), 2);
      ELSE
        _share := ROUND(_total / _active_count, 2);
      END IF;

      UPDATE public.influencers
        SET monthly_goal_brl = NULLIF(_share, 0), updated_at = now()
        WHERE id = _rec.id;
      _updated := _updated + 1;
    END LOOP;

  ELSE -- equal
    _share := ROUND(_total / _active_count, 2);
    UPDATE public.influencers
      SET monthly_goal_brl = NULLIF(_share, 0), updated_at = now()
      WHERE squad_id = _squad_id AND is_active = true;
    _updated := _active_count;
  END IF;

  UPDATE public.squads
    SET goal_distribution_mode = _mode,
        goal_last_distributed_at = now(),
        updated_at = now()
    WHERE id = _squad_id;

  INSERT INTO public.squad_activity (squad_id, actor_user_id, action, payload)
  VALUES (_squad_id, auth.uid(), 'goal_distributed',
          jsonb_build_object('mode', _mode, 'total', _total, 'updated', _updated));

  RETURN jsonb_build_object('ok', true, 'updated', _updated, 'mode', _mode, 'total', _total);
END;
$$;

GRANT EXECUTE ON FUNCTION public.distribute_squad_goal(uuid, text, jsonb) TO authenticated;
