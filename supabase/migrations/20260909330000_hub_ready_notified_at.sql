-- send-hub-ready support: stamp when the "your hub is ready" notification
-- (email + SMS) was sent, so the admin warns on repeat taps instead of
-- double-sending. Pass force:true to resend.
ALTER TABLE personal_profiles
  ADD COLUMN IF NOT EXISTS hub_ready_notified_at timestamptz;

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS hub_ready_notified_at timestamptz;
