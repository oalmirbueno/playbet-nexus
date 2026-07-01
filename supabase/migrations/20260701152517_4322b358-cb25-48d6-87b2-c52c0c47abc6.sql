
ALTER TABLE public.withdrawal_cycles
  ADD COLUMN IF NOT EXISTS notified_landed_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_available_at timestamptz;

DROP FUNCTION IF EXISTS public.notify_target(text, uuid, text, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.notify_target(
  _target_type text, _target_id uuid, _type text,
  _title text, _body text, _action_url text, _meta jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid;
BEGIN
  IF _target_type = 'influencer' THEN
    SELECT id INTO _uid FROM public.profiles WHERE influencer_id = _target_id LIMIT 1;
  ELSIF _target_type = 'manager' THEN
    SELECT id INTO _uid FROM public.profiles WHERE manager_id = _target_id LIMIT 1;
  END IF;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, action_url, meta)
    VALUES (_uid, _type, _title, _body, _action_url, _meta);
  END IF;
  RETURN _uid;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_target(text, uuid, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_target(text, uuid, text, text, text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.on_cycle_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _url text; _uid uuid;
BEGIN
  _url := CASE WHEN NEW.target_type = 'influencer' THEN '/portal/saques' ELSE '/gerente/saques' END;
  _uid := public.notify_target(
    NEW.target_type, NEW.target_id, 'withdrawal_incoming',
    'Pagamento a caminho',
    format('R$ %s caíram na Playbet. Fica liberado para saque em %s.',
      trim(to_char(NEW.amount, 'FM999G999G990D00')),
      to_char(NEW.available_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM')),
    _url,
    jsonb_build_object('cycle_id', NEW.id, 'amount', NEW.amount, 'available_at', NEW.available_at)
  );
  IF _uid IS NOT NULL THEN
    UPDATE public.withdrawal_cycles SET notified_landed_at = now() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_available_withdrawal_cycles()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _rec record; _count integer := 0; _url text; _uid uuid;
BEGIN
  FOR _rec IN
    SELECT * FROM public.withdrawal_cycles
    WHERE status = 'landed' AND available_at <= now()
  LOOP
    UPDATE public.withdrawal_cycles SET status = 'available', updated_at = now() WHERE id = _rec.id;
    _url := CASE WHEN _rec.target_type = 'influencer' THEN '/portal/saques' ELSE '/gerente/saques' END;
    _uid := public.notify_target(
      _rec.target_type, _rec.target_id, 'withdrawal_available',
      'Saque liberado 🎉',
      format('R$ %s já estão disponíveis para saque.', trim(to_char(_rec.amount, 'FM999G999G990D00'))),
      _url,
      jsonb_build_object('cycle_id', _rec.id, 'amount', _rec.amount)
    );
    IF _uid IS NOT NULL THEN
      UPDATE public.withdrawal_cycles SET notified_available_at = now() WHERE id = _rec.id;
    END IF;
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;
REVOKE ALL ON FUNCTION public.release_available_withdrawal_cycles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_available_withdrawal_cycles() TO service_role;

CREATE OR REPLACE FUNCTION public.flush_pending_cycle_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _rec record; _url text; _target_type text; _target_id uuid;
BEGIN
  IF (TG_OP = 'INSERT' OR OLD.influencer_id IS DISTINCT FROM NEW.influencer_id)
     AND NEW.influencer_id IS NOT NULL THEN
    _target_type := 'influencer'; _target_id := NEW.influencer_id;
  ELSIF (TG_OP = 'INSERT' OR OLD.manager_id IS DISTINCT FROM NEW.manager_id)
     AND NEW.manager_id IS NOT NULL THEN
    _target_type := 'manager'; _target_id := NEW.manager_id;
  ELSE
    RETURN NEW;
  END IF;

  _url := CASE WHEN _target_type = 'influencer' THEN '/portal/saques' ELSE '/gerente/saques' END;

  FOR _rec IN
    SELECT * FROM public.withdrawal_cycles
    WHERE target_type = _target_type AND target_id = _target_id AND notified_landed_at IS NULL
    ORDER BY landed_at ASC
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, action_url, meta)
    VALUES (NEW.id, 'withdrawal_incoming', 'Pagamento a caminho',
      format('R$ %s caíram na Playbet. Fica liberado para saque em %s.',
        trim(to_char(_rec.amount, 'FM999G999G990D00')),
        to_char(_rec.available_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM')),
      _url,
      jsonb_build_object('cycle_id', _rec.id, 'amount', _rec.amount, 'available_at', _rec.available_at, 'backfilled', true));
    UPDATE public.withdrawal_cycles SET notified_landed_at = now() WHERE id = _rec.id;
  END LOOP;

  FOR _rec IN
    SELECT * FROM public.withdrawal_cycles
    WHERE target_type = _target_type AND target_id = _target_id
      AND status = 'available' AND notified_available_at IS NULL
    ORDER BY available_at ASC
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, action_url, meta)
    VALUES (NEW.id, 'withdrawal_available', 'Saque liberado 🎉',
      format('R$ %s já estão disponíveis para saque.', trim(to_char(_rec.amount, 'FM999G999G990D00'))),
      _url,
      jsonb_build_object('cycle_id', _rec.id, 'amount', _rec.amount, 'backfilled', true));
    UPDATE public.withdrawal_cycles SET notified_available_at = now() WHERE id = _rec.id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_flush_cycles ON public.profiles;
CREATE TRIGGER trg_profile_flush_cycles
  AFTER INSERT OR UPDATE OF influencer_id, manager_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.flush_pending_cycle_notifications();
