-- Applied to production project theeya-deluxe on 2026-10-10.
-- Narrow hardening only; no rows or table definitions are changed.
ALTER FUNCTION public.calculate_listing_assessment_total(public.listing_assessments)
  SET search_path = public;

ALTER FUNCTION public.recalculate_listing_assessment()
  SET search_path = public;
