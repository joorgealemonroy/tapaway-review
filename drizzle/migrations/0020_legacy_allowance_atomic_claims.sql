CREATE TABLE public.legacy_allowance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_key text NOT NULL REFERENCES public.legacy_allowance_entitlements(relationship_key) ON DELETE CASCADE,
  period_start date NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  source_kind text NOT NULL,
  source_id uuid NOT NULL,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.legacy_allowance_claims TO service_role;
GRANT SELECT ON public.legacy_allowance_claims TO authenticated;
ALTER TABLE public.legacy_allowance_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read legacy claims" ON public.legacy_allowance_claims FOR SELECT TO authenticated USING (public.is_admin());
CREATE INDEX legacy_allowance_claims_key_period ON public.legacy_allowance_claims (relationship_key, period_start);

-- Atomic: locks the relationship row, so two pages under the same subscription serialize.
CREATE OR REPLACE FUNCTION public.reserve_legacy_allowance(_key text, _quantity int, _source_kind text, _source_id uuid, _idempotency_key text)
RETURNS TABLE(ok boolean, claim_id uuid, allowance int, used int, reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _period date := date_trunc('month', now())::date; _allow int; _used int; _existing uuid; _id uuid;
BEGIN
  PERFORM 1 FROM public.legacy_allowance_entitlements WHERE relationship_key = _key FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT false, NULL::uuid, 0, 0, 'not_entitled'; RETURN; END IF;
  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO _existing FROM public.legacy_allowance_claims WHERE idempotency_key = _idempotency_key;
    IF _existing IS NOT NULL THEN RETURN QUERY SELECT false, _existing, 0, 0, 'duplicate'; RETURN; END IF;
  END IF;
  SELECT COALESCE(MAX(CASE WHEN plan_type IN ('venue','venue_pack','venue_yearly','bundle','yearly_200','multi') THEN 15 ELSE 4 END), 0)
    INTO _allow FROM (
      SELECT plan_type FROM public.personal_profiles WHERE legacy_allowance AND legacy_allowance_key = _key
      UNION ALL SELECT plan_type FROM public.restaurants WHERE legacy_allowance AND legacy_allowance_key = _key) r;
  IF _allow = 0 THEN RETURN QUERY SELECT false, NULL::uuid, 0, 0, 'not_entitled'; RETURN; END IF;
  SELECT COALESCE(SUM(quantity), 0) INTO _used FROM public.legacy_allowance_claims WHERE relationship_key = _key AND period_start = _period;
  IF _quantity < 1 OR _used + _quantity > _allow THEN RETURN QUERY SELECT false, NULL::uuid, _allow, _used, 'over_allowance'; RETURN; END IF;
  INSERT INTO public.legacy_allowance_claims (relationship_key, period_start, quantity, source_kind, source_id, idempotency_key)
    VALUES (_key, _period, _quantity, _source_kind, _source_id, _idempotency_key) RETURNING id INTO _id;
  RETURN QUERY SELECT true, _id, _allow, _used + _quantity, 'ok';
END $$;
REVOKE ALL ON FUNCTION public.reserve_legacy_allowance(text,int,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_legacy_allowance(text,int,text,uuid,text) TO service_role;