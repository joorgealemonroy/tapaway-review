-- Narrow reconciliation after the 2026-10-21 read-only Stripe audit.
-- Before applying: re-retrieve both subscriptions from Stripe LIVE and confirm
-- these statuses; confirm the canceled customer has no replacement subscription.
-- Does not change Stripe billing, plans, approved gift flags, ownership or content.
UPDATE public.personal_profiles
 SET subscription_status='active'
 WHERE id='1878025d-6a5c-462f-ba3e-9331f7d30a6d'
 AND stripe_subscription_id='sub_1UAtXuDg8DaTuVNZUPKMuBVn'
 AND subscription_status='trialing'
 AND payment_state IS DISTINCT FROM 'complimentary';
UPDATE public.restaurants
 SET subscription_status='canceled'
 WHERE id='c668ed9e-398d-43d7-ab0f-58175c5b95ec'
 AND stripe_subscription_id='sub_1TLK42Dg8DaTuVNZsO9g1VIM'
 AND subscription_status='active'
 AND payment_state IS DISTINCT FROM 'complimentary';
