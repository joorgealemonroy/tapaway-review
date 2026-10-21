-- Match the durable limiter to the reviewed per-account and global budgets.
-- Existing counters and daily windows are retained; no quota is reset here.
CREATE OR REPLACE FUNCTION public.storefront_take_quota(_key text, _limit integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE used integer;
BEGIN
  IF _key IS NULL OR _limit IS NULL OR _limit < 1 OR _limit > 20000
      OR _key !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid quota' USING ERRCODE='22023';
  END IF;
  DELETE FROM public.storefront_quotas WHERE day < current_date - 2;
  INSERT INTO public.storefront_quotas AS q (quota_key,day,uses)
    VALUES(_key,current_date,1)
    ON CONFLICT (quota_key,day) DO UPDATE SET uses=q.uses+1
      WHERE q.uses < _limit
    RETURNING uses INTO used;
  RETURN COALESCE(used,-1);
END;
$$;
REVOKE ALL ON public.storefront_quotas FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.storefront_quotas TO service_role;
REVOKE ALL ON FUNCTION public.storefront_take_quota(text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.storefront_take_quota(text,integer) TO service_role;
