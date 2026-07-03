REVOKE EXECUTE ON FUNCTION public.normalize_tracking_link_lp_instance() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_tracking_link_lp_instance() TO service_role;