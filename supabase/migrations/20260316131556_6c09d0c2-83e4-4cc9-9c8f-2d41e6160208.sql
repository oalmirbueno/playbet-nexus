DROP TRIGGER IF EXISTS trg_reconsolidate_metrics ON public.tracking_events;
CREATE TRIGGER trg_reconsolidate_metrics
  AFTER INSERT OR UPDATE ON public.tracking_events
  FOR EACH ROW
  EXECUTE FUNCTION reconsolidate_tracking_metrics();