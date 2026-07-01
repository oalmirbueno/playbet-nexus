
-- 1) FISCAL FIELDS ON PROFILES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS trade_name text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_district text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS withdrawal_terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS withdrawal_terms_version text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_document_type_chk'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_document_type_chk
      CHECK (document_type IS NULL OR document_type IN ('pf','cnpj'));
  END IF;
END $$;

-- 2) SAQUES ADDITIONS
ALTER TABLE public.saques
  ADD COLUMN IF NOT EXISTS nota_fiscal_url text,
  ADD COLUMN IF NOT EXISTS nota_fiscal_number text,
  ADD COLUMN IF NOT EXISTS nota_fiscal_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS cycle_id uuid,
  ADD COLUMN IF NOT EXISTS requester_user_id uuid;

-- 3) WITHDRAWAL_CYCLES
CREATE TABLE IF NOT EXISTS public.withdrawal_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('influencer','manager')),
  target_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  landed_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'landed' CHECK (status IN ('landed','available','consumed','cancelled')),
  source text,
  reference text,
  notes text,
  consumed_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS withdrawal_cycles_target_idx
  ON public.withdrawal_cycles(target_type, target_id, status);
CREATE INDEX IF NOT EXISTS withdrawal_cycles_available_idx
  ON public.withdrawal_cycles(available_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawal_cycles TO authenticated;
GRANT ALL ON public.withdrawal_cycles TO service_role;

ALTER TABLE public.withdrawal_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_cycles" ON public.withdrawal_cycles;
CREATE POLICY "admin_all_cycles" ON public.withdrawal_cycles
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "read_own_cycles_influencer" ON public.withdrawal_cycles;
CREATE POLICY "read_own_cycles_influencer" ON public.withdrawal_cycles
  FOR SELECT TO authenticated
  USING (target_type = 'influencer' AND target_id = public.current_influencer_id());

DROP POLICY IF EXISTS "read_own_cycles_manager" ON public.withdrawal_cycles;
CREATE POLICY "read_own_cycles_manager" ON public.withdrawal_cycles
  FOR SELECT TO authenticated
  USING (target_type = 'manager' AND target_id = public.current_manager_id());

DROP TRIGGER IF EXISTS trg_cycles_updated ON public.withdrawal_cycles;
CREATE TRIGGER trg_cycles_updated
  BEFORE UPDATE ON public.withdrawal_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  action_url text,
  meta jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON public.notifications(user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_reads_own_notifs" ON public.notifications;
CREATE POLICY "user_reads_own_notifs" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_updates_own_notifs" ON public.notifications;
CREATE POLICY "user_updates_own_notifs" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5) HELPER: notify_target
CREATE OR REPLACE FUNCTION public.notify_target(
  _target_type text, _target_id uuid, _type text,
  _title text, _body text, _action_url text, _meta jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
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
END;
$$;

REVOKE ALL ON FUNCTION public.notify_target(text, uuid, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_target(text, uuid, text, text, text, text, jsonb) TO service_role;

-- 6) TRIGGERS ON CYCLES
CREATE OR REPLACE FUNCTION public.on_cycle_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.available_at IS NULL THEN
    NEW.available_at := NEW.landed_at + INTERVAL '3 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cycle_before_insert ON public.withdrawal_cycles;
CREATE TRIGGER trg_cycle_before_insert
  BEFORE INSERT ON public.withdrawal_cycles
  FOR EACH ROW EXECUTE FUNCTION public.on_cycle_before_insert();

CREATE OR REPLACE FUNCTION public.on_cycle_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
BEGIN
  _url := CASE WHEN NEW.target_type = 'influencer' THEN '/portal/saques' ELSE '/gerente/saques' END;
  PERFORM public.notify_target(
    NEW.target_type, NEW.target_id, 'withdrawal_incoming',
    'Pagamento a caminho',
    format('R$ %s caíram na Playbet. Fica liberado para saque em %s.',
      trim(to_char(NEW.amount, 'FM999G999G990D00')),
      to_char(NEW.available_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM')
    ),
    _url,
    jsonb_build_object('cycle_id', NEW.id, 'amount', NEW.amount, 'available_at', NEW.available_at)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cycle_after_insert ON public.withdrawal_cycles;
CREATE TRIGGER trg_cycle_after_insert
  AFTER INSERT ON public.withdrawal_cycles
  FOR EACH ROW EXECUTE FUNCTION public.on_cycle_after_insert();

-- 7) RELEASE FUNCTION + CRON
CREATE OR REPLACE FUNCTION public.release_available_withdrawal_cycles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec record;
  _count integer := 0;
  _url text;
BEGIN
  FOR _rec IN
    SELECT * FROM public.withdrawal_cycles
    WHERE status = 'landed' AND available_at <= now()
  LOOP
    UPDATE public.withdrawal_cycles
      SET status = 'available', updated_at = now()
      WHERE id = _rec.id;
    _url := CASE WHEN _rec.target_type = 'influencer' THEN '/portal/saques' ELSE '/gerente/saques' END;
    PERFORM public.notify_target(
      _rec.target_type, _rec.target_id, 'withdrawal_available',
      'Saque liberado 🎉',
      format('R$ %s já estão disponíveis para saque.', trim(to_char(_rec.amount, 'FM999G999G990D00'))),
      _url,
      jsonb_build_object('cycle_id', _rec.id, 'amount', _rec.amount)
    );
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.release_available_withdrawal_cycles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_available_withdrawal_cycles() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('release-withdrawal-cycles-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'release-withdrawal-cycles-hourly',
  '15 * * * *',
  $$SELECT public.release_available_withdrawal_cycles();$$
);
