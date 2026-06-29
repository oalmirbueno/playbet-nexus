
-- Split shared LP instances so each (influencer × LP × affiliate_link) has its OWN instance.
-- For every tracking_link whose base_url differs from its current instance.affiliate_link,
-- create a new instance with a unique slug and rewire the tracking_link to it.

DO $$
DECLARE
  r RECORD;
  new_slug text;
  base_slug text;
  n int;
  new_id uuid;
  domain_clean text;
BEGIN
  FOR r IN
    SELECT tl.id AS tl_id,
           tl.base_url,
           tl.landing_page_id,
           tl.influencer_id,
           tl.campanha_id,
           inf.slug AS inf_slug,
           inf.name AS inf_name,
           lp.domain AS lp_domain
    FROM tracking_links tl
    JOIN landing_page_instances lpi ON lpi.id = tl.landing_page_instance_id
    JOIN influencers inf ON inf.id = tl.influencer_id
    JOIN landing_pages lp ON lp.id = tl.landing_page_id
    WHERE tl.use_lp = true
      AND COALESCE(TRIM(lpi.affiliate_link), '') <> COALESCE(TRIM(tl.base_url), '')
  LOOP
    base_slug := lower(regexp_replace(COALESCE(NULLIF(r.inf_slug,''), r.inf_name, 'ref'), '[^a-z0-9-]+', '-', 'g'));
    new_slug := base_slug;
    n := 2;
    WHILE EXISTS (SELECT 1 FROM landing_page_instances WHERE landing_page_id = r.landing_page_id AND slug = new_slug) LOOP
      new_slug := base_slug || '-' || n;
      n := n + 1;
    END LOOP;

    INSERT INTO landing_page_instances (landing_page_id, influencer_id, slug, affiliate_link, is_active)
    VALUES (r.landing_page_id, r.influencer_id, new_slug, TRIM(r.base_url), true)
    RETURNING id INTO new_id;

    domain_clean := regexp_replace(r.lp_domain, '/+$', '');

    UPDATE tracking_links
    SET landing_page_instance_id = new_id,
        final_url = domain_clean || '/?ref=' || new_slug
          || '&sub2=' || r.influencer_id::text
          || CASE WHEN r.campanha_id IS NOT NULL THEN '&sub3=' || r.campanha_id::text ELSE '' END
    WHERE id = r.tl_id;
  END LOOP;
END $$;
