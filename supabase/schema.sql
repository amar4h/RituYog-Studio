-- ============================================
-- YOGA STUDIO MANAGEMENT - SUPABASE SCHEMA
-- ============================================
-- Run this SQL in your Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  whatsapp_number VARCHAR(20),
  date_of_birth DATE,
  age INTEGER,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  emergency_contact JSONB,
  profile_photo TEXT,
  medical_conditions JSONB DEFAULT '[]'::jsonb,
  health_notes TEXT,
  consent_records JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'trial', 'expired', 'pending')),
  source VARCHAR(20) CHECK (source IN ('walk-in', 'referral', 'online', 'lead-conversion')),
  referred_by VARCHAR(255),
  converted_from_lead_id UUID,
  assigned_slot_id UUID,
  classes_attended INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  whatsapp_number VARCHAR(20),
  date_of_birth DATE,
  age INTEGER,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'trial-scheduled', 'trial-completed', 'follow-up', 'interested', 'negotiating', 'converted', 'not-interested', 'lost')),
  source VARCHAR(20) NOT NULL CHECK (source IN ('website', 'referral', 'walk-in', 'social-media', 'advertisement', 'whatsapp', 'phone-inquiry', 'online', 'other')),
  source_details TEXT,
  preferred_slot_id UUID,
  preferred_session_type VARCHAR(10) CHECK (preferred_session_type IN ('online', 'offline', 'hybrid')),
  interested_plan_ids JSONB DEFAULT '[]'::jsonb,
  has_yoga_experience BOOLEAN,
  medical_conditions JSONB DEFAULT '[]'::jsonb,
  health_notes TEXT,
  consent_records JSONB DEFAULT '[]'::jsonb,
  trial_date DATE,
  trial_slot_id UUID,
  trial_status VARCHAR(20) CHECK (trial_status IN ('pending', 'scheduled', 'attended', 'no-show', 'cancelled')),
  trial_feedback TEXT,
  converted_to_member_id UUID,
  conversion_date TIMESTAMPTZ,
  last_contact_date DATE,
  next_follow_up_date DATE,
  follow_up_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SESSION SLOTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS session_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10,
  exception_capacity INTEGER NOT NULL DEFAULT 1,
  session_type VARCHAR(10) NOT NULL DEFAULT 'offline' CHECK (session_type IN ('online', 'offline', 'hybrid')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SLOT SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS slot_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES session_slots(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  is_exception BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEMBERSHIP PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('trial', 'monthly', 'quarterly', 'semi-annual', 'yearly', 'drop-in', 'class-pack')),
  price DECIMAL(10, 2) NOT NULL,
  duration_months INTEGER NOT NULL,
  classes_included INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  allowed_session_types JSONB DEFAULT '["offline"]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEMBERSHIP SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  original_amount DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  discount_reason TEXT,
  payable_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending', 'suspended')),
  is_extension BOOLEAN DEFAULT FALSE,
  previous_subscription_id UUID,
  extension_days INTEGER,
  invoice_id UUID,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  invoice_type VARCHAR(20) NOT NULL CHECK (invoice_type IN ('membership', 'product-sale')),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2),
  discount DECIMAL(10, 2),
  discount_reason TEXT,
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partially-paid', 'overdue', 'cancelled')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subscription_id UUID,
  payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'upi', 'bank-transfer', 'cheque', 'other')),
  payment_reference VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank-transfer', 'card', 'cheque', 'other')),
  payment_date DATE NOT NULL,
  transaction_reference VARCHAR(255),
  bank_details TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  receipt_number VARCHAR(50),
  notes TEXT,
  recorded_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRIAL BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS trial_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES session_slots(id),
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'attended', 'no-show', 'cancelled')),
  is_exception BOOLEAN DEFAULT FALSE,
  confirmation_sent BOOLEAN DEFAULT FALSE,
  reminder_sent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STUDIO SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS studio_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_name VARCHAR(255) NOT NULL DEFAULT 'Yoga Studio',
  logo_url TEXT,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  whatsapp_business_number VARCHAR(20),
  currency VARCHAR(10) DEFAULT 'INR',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  working_hours JSONB,
  terms_and_conditions TEXT DEFAULT '',
  health_disclaimer TEXT DEFAULT '',
  renewal_reminder_days INTEGER DEFAULT 7,
  class_reminder_hours INTEGER DEFAULT 24,
  tax_rate DECIMAL(5, 2),
  invoice_prefix VARCHAR(10) DEFAULT 'INV',
  receipt_prefix VARCHAR(10) DEFAULT 'RCP',
  trial_class_enabled BOOLEAN DEFAULT TRUE,
  max_trials_per_person INTEGER DEFAULT 1,
  admin_password VARCHAR(255) DEFAULT 'admin123',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR BETTER PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_assigned_slot ON members(assigned_slot_id);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_dates ON subscriptions(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_invoices_member ON invoices(member_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);

CREATE INDEX IF NOT EXISTS idx_slot_subscriptions_member ON slot_subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_slot_subscriptions_slot ON slot_subscriptions(slot_id);

CREATE INDEX IF NOT EXISTS idx_trial_bookings_lead ON trial_bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_trial_bookings_date ON trial_bookings(date);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_session_slots_updated_at BEFORE UPDATE ON session_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_slot_subscriptions_updated_at BEFORE UPDATE ON slot_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON membership_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trial_bookings_updated_at BEFORE UPDATE ON trial_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_studio_settings_updated_at BEFORE UPDATE ON studio_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Default Session Slots
INSERT INTO session_slots (start_time, end_time, display_name, capacity, exception_capacity, session_type, is_active)
VALUES
  ('06:00', '07:00', 'Early Morning 6:00 AM', 10, 1, 'offline', true),
  ('07:30', '08:30', 'Morning 7:30 AM', 10, 1, 'offline', true),
  ('09:00', '10:00', 'Mid Morning 9:00 AM', 10, 1, 'offline', true),
  ('17:00', '18:00', 'Evening 5:00 PM', 10, 1, 'offline', true)
ON CONFLICT DO NOTHING;

-- Default Membership Plans
INSERT INTO membership_plans (name, type, price, duration_months, description, is_active, allowed_session_types, features)
VALUES
  ('Monthly', 'monthly', 2100, 1, 'Unlimited yoga sessions for 1 month. Access to your assigned slot Monday to Friday.', true, '["offline"]', '["Unlimited sessions (Mon-Fri)", "One assigned slot", "Access to all class types"]'),
  ('Quarterly', 'quarterly', 5500, 3, 'Unlimited yoga sessions for 3 months. Access to your assigned slot Monday to Friday. Save Rs 800!', true, '["offline"]', '["Unlimited sessions (Mon-Fri)", "One assigned slot", "Access to all class types", "Save Rs 800 vs monthly"]'),
  ('Semi-Annual', 'semi-annual', 10000, 6, 'Unlimited yoga sessions for 6 months. Access to your assigned slot Monday to Friday. Save Rs 2,600!', true, '["offline"]', '["Unlimited sessions (Mon-Fri)", "One assigned slot", "Access to all class types", "Save Rs 2,600 vs monthly"]')
ON CONFLICT DO NOTHING;

-- Default Studio Settings
INSERT INTO studio_settings (studio_name, currency, timezone, invoice_prefix, receipt_prefix, trial_class_enabled, max_trials_per_person)
VALUES ('Yoga Studio', 'INR', 'Asia/Kolkata', 'INV', 'RCP', true, 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables (you can customize policies based on your auth needs)

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_settings ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (you should restrict this in production)
-- These policies allow anyone with the anon key to read/write
CREATE POLICY "Allow all operations on members" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on session_slots" ON session_slots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on slot_subscriptions" ON slot_subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on membership_plans" ON membership_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on subscriptions" ON subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on trial_bookings" ON trial_bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on studio_settings" ON studio_settings FOR ALL USING (true) WITH CHECK (true);
