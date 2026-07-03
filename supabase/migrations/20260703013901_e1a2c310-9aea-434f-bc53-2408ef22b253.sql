-- 1) Fix EstrelaBet ↔ VUPI domain collision.
UPDATE public.platforms
SET domains = array_remove(coalesce(domains,'{}'::text[]), 'estrelabet.bet.br')
WHERE name ILIKE 'vupi';

UPDATE public.platforms
SET domains = (
  SELECT array_agg(DISTINCT d)
  FROM unnest(coalesce(domains,'{}'::text[]) || ARRAY['vupi.bet.br','vupi.com.br','go.aff.vupipartners.com','vupipartners.com']) AS d
)
WHERE name ILIKE 'vupi';

UPDATE public.platforms
SET domains = (
  SELECT array_agg(DISTINCT d)
  FROM unnest(coalesce(domains,'{}'::text[]) || ARRAY['estrelabet.bet.br','go.aff.estrelabetpartners.com','estrelabetpartners.com','lkrh.pro']) AS d
)
WHERE name ILIKE 'estrela%';

-- 2) Resolver: longest matching domain wins.
CREATE OR REPLACE FUNCTION public.resolve_platform_account_from_url(_url text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  host text;
  best_platform uuid;
  acc uuid;
BEGIN
  IF _url IS NULL OR _url = '' THEN RETURN NULL; END IF;
  BEGIN
    host := lower(regexp_replace(split_part(split_part(_url, '://', 2), '/', 1), '^www\.', ''));
  EXCEPTION WHEN OTHERS THEN RETURN NULL;
  END;
  IF host = '' OR host IS NULL THEN RETURN NULL; END IF;

  SELECT p.id INTO best_platform
  FROM public.platforms p,
       LATERAL unnest(coalesce(p.domains,'{}'::text[])) AS d
  WHERE d IS NOT NULL AND d <> ''
    AND (host = lower(d) OR host LIKE '%.' || lower(d))
  ORDER BY length(d) DESC
  LIMIT 1;

  IF best_platform IS NULL THEN RETURN NULL; END IF;

  SELECT pa.id INTO acc
  FROM public.platform_accounts pa
  WHERE pa.platform_id = best_platform
    AND coalesce(pa.is_active, true) = true
    AND coalesce(pa.is_demo, false) = false
  ORDER BY pa.created_at ASC NULLS LAST
  LIMIT 1;

  RETURN acc;
END;
$$;

-- 3) Trigger.
CREATE OR REPLACE FUNCTION public.enforce_tracking_link_platform_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_acc uuid;
  chosen_platform uuid;
  resolved_platform uuid;
BEGIN
  IF NEW.base_url IS NULL OR NEW.base_url = '' THEN RETURN NEW; END IF;
  resolved_acc := public.resolve_platform_account_from_url(NEW.base_url);
  IF resolved_acc IS NULL THEN RETURN NEW; END IF;
  SELECT platform_id INTO resolved_platform FROM public.platform_accounts WHERE id = resolved_acc;
  IF NEW.platform_account_id IS NOT NULL THEN
    SELECT platform_id INTO chosen_platform FROM public.platform_accounts WHERE id = NEW.platform_account_id;
    IF chosen_platform IS NOT NULL AND chosen_platform = resolved_platform THEN
      RETURN NEW;
    END IF;
  END IF;
  NEW.platform_account_id := resolved_acc;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_tracking_link_platform_match ON public.tracking_links;
CREATE TRIGGER trg_enforce_tracking_link_platform_match
BEFORE INSERT OR UPDATE OF base_url, platform_account_id ON public.tracking_links
FOR EACH ROW EXECUTE FUNCTION public.enforce_tracking_link_platform_match();

-- 4) Backfill existing links.
WITH resolved AS (
  SELECT tl.id AS link_id,
         public.resolve_platform_account_from_url(tl.base_url) AS new_acc,
         pa_curr.platform_id AS curr_platform,
         pa_new.platform_id  AS new_platform
  FROM public.tracking_links tl
  LEFT JOIN public.platform_accounts pa_curr ON pa_curr.id = tl.platform_account_id
  LEFT JOIN LATERAL (
    SELECT id, platform_id FROM public.platform_accounts
    WHERE id = public.resolve_platform_account_from_url(tl.base_url)
  ) pa_new ON true
  WHERE tl.base_url IS NOT NULL AND tl.base_url <> ''
)
UPDATE public.tracking_links tl
SET platform_account_id = r.new_acc
FROM resolved r
WHERE r.link_id = tl.id
  AND r.new_acc IS NOT NULL
  AND r.curr_platform IS DISTINCT FROM r.new_platform;

-- 5) Backfill tracking_events for retagged links.
UPDATE public.tracking_events te
SET platform_id = pa.platform_id,
    platform_account_id = tl.platform_account_id
FROM public.tracking_links tl
JOIN public.platform_accounts pa ON pa.id = tl.platform_account_id
WHERE te.tracking_link_id = tl.id
  AND (te.platform_id IS DISTINCT FROM pa.platform_id
       OR te.platform_account_id IS DISTINCT FROM tl.platform_account_id);
