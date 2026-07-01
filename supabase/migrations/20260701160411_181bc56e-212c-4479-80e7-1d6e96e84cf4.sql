-- Backfill domain_patterns from existing domains where empty
UPDATE public.platforms
SET domain_patterns = domains
WHERE (domain_patterns IS NULL OR array_length(domain_patterns, 1) IS NULL)
  AND domains IS NOT NULL AND array_length(domains, 1) IS NOT NULL;

-- Seed common affiliate hostnames for the known platforms so paste-detection works out of the box
UPDATE public.platforms
SET domain_patterns = ARRAY(SELECT DISTINCT UNNEST(COALESCE(domain_patterns, '{}'::text[]) || ARRAY[
  'go.aff.estrelabetpartners.com',
  'estrelabetpartners.com',
  'go.estrelabet.com',
  'estrelabet.bet.br'
]))
WHERE name = 'Estrela Bet';

UPDATE public.platforms
SET domain_patterns = ARRAY(SELECT DISTINCT UNNEST(COALESCE(domain_patterns, '{}'::text[]) || ARRAY[
  'vupi.com.br',
  'go.vupi.com.br',
  'partners.vupi.com.br'
]))
WHERE name = 'VUPI';

UPDATE public.platforms
SET domain_patterns = ARRAY(SELECT DISTINCT UNNEST(COALESCE(domain_patterns, '{}'::text[]) || ARRAY[
  '1win.pro',
  '1wgtln.life',
  'go.1win-partners.com',
  '1win-partners.com'
]))
WHERE name = '1win';