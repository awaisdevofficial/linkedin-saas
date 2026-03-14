-- Postpilot Admin Panel: profiles approval/access, invoices, admin_logs
-- Run this migration first.

-- Add approval/access control fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'banned', 'expired'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_by TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill status for existing rows that may have NULL
UPDATE profiles SET status = 'approved' WHERE status IS NULL;

-- Admin invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  invoice_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin activity log (may already exist from monitor.service; ensure columns)
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  target_user_id UUID,
  target_email TEXT,
  details JSONB,
  performed_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns to admin_logs if table existed with different schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_logs' AND column_name = 'target_email') THEN
    ALTER TABLE admin_logs ADD COLUMN target_email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_logs' AND column_name = 'performed_by') THEN
    ALTER TABLE admin_logs ADD COLUMN performed_by TEXT DEFAULT 'admin';
  END IF;
END $$;
