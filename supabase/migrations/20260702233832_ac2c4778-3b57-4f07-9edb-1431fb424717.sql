DROP TRIGGER IF EXISTS zzz_playbet_sync_link_share_url ON public.tracking_links;
CREATE TRIGGER zzz_playbet_sync_link_share_url
AFTER INSERT OR UPDATE OF base_url, short_url, final_url, click_id_param_name, tracking_code, influencer_id, campanha_id, landing_page_id, landing_page_instance_id
ON public.tracking_links
FOR EACH ROW EXECUTE FUNCTION public.playbet_sync_link_share_url();