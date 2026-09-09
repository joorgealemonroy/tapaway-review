ALTER TABLE personal_profiles ADD COLUMN IF NOT EXISTS hub_ready_notified_at timestamptz;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hub_ready_notified_at timestamptz;