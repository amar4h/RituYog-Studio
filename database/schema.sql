-- ============================================
-- Yoga Studio Management - MySQL Schema
-- Version: 1.0.0
-- Compatible with MySQL 8.x
-- ============================================

-- Drop tables if they exist (for clean reinstallation)
-- Order matters due to foreign key constraints
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS trial_bookings;
DROP TABLE IF EXISTS slot_subscriptions;
DROP TABLE IF EXISTS membership_subscriptions;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS membership_plans;
DROP TABLE IF EXISTS session_slots;
DROP TABLE IF EXISTS studio_settings;
DROP TABLE IF EXISTS api_sessions;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- SESSION SLOTS
-- ============================================
CREATE TABLE session_slots (
    id VARCHAR(36) PRIMARY KEY,
    start_time VARCHAR(5) NOT NULL,  -- HH:mm format
    end_time VARCHAR(5) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL DEFAULT 10,
    exception_capacity INT NOT NULL DEFAULT 1,
    session_type ENUM('online', 'offline', 'hybrid') NOT NULL DEFAULT 'offline',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MEMBERSHIP PLANS
-- ============================================
CREATE TABLE membership_plans (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('trial', 'monthly', 'quarterly', 'semi-annual', 'yearly', 'drop-in', 'class-pack') NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_months INT NOT NULL,
    classes_included INT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_session_types JSON NOT NULL,  -- Array of session types
    features JSON NULL,  -- Array of feature strings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_is_active (is_active),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MEMBERS
-- ============================================
CREATE TABLE members (
    id VARCHAR(36) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp_number VARCHAR(20) NULL,
    date_of_birth DATE NULL,
    age INT NULL,
    gender ENUM('male', 'female', 'other') NULL,
    address TEXT NULL,

    -- Emergency contact (stored as JSON)
    emergency_contact JSON NULL,

    profile_photo TEXT NULL,

    -- Medical & Consent (stored as JSON arrays)
    medical_conditions JSON NOT NULL DEFAULT '[]',
    health_notes TEXT NULL,
    consent_records JSON NOT NULL DEFAULT '[]',

    -- Status & Source
    status ENUM('active', 'inactive', 'trial', 'expired', 'pending') NOT NULL DEFAULT 'pending',
    source ENUM('walk-in', 'referral', 'online', 'lead-conversion') NULL,
    referred_by VARCHAR(255) NULL,
    converted_from_lead_id VARCHAR(36) NULL,

    -- Slot Assignment
    assigned_slot_id VARCHAR(36) NULL,

    -- Attendance tracking
    classes_attended INT NOT NULL DEFAULT 0,

    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_assigned_slot (assigned_slot_id),
    INDEX idx_created_at (created_at),

    FOREIGN KEY (assigned_slot_id) REFERENCES session_slots(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- LEADS
-- ============================================
CREATE TABLE leads (
    id VARCHAR(36) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp_number VARCHAR(20) NULL,
    date_of_birth DATE NULL,
    age INT NULL,
    gender ENUM('male', 'female', 'other') NULL,
    address TEXT NULL,

    -- Emergency contact
    emergency_contact VARCHAR(255) NULL,
    emergency_phone VARCHAR(20) NULL,

    -- Lead tracking
    status ENUM('new', 'contacted', 'trial-scheduled', 'trial-completed', 'follow-up',
                'interested', 'negotiating', 'converted', 'not-interested', 'lost') NOT NULL DEFAULT 'new',
    source ENUM('website', 'referral', 'walk-in', 'social-media', 'advertisement',
                'whatsapp', 'phone-inquiry', 'online', 'other') NOT NULL,
    source_details TEXT NULL,

    -- Preferences
    preferred_slot_id VARCHAR(36) NULL,
    preferred_session_type ENUM('online', 'offline', 'hybrid') NULL,
    interested_plan_ids JSON NULL,
    has_yoga_experience BOOLEAN NULL,

    -- Medical/Consent
    medical_conditions JSON NOT NULL DEFAULT '[]',
    health_notes TEXT NULL,
    consent_records JSON NOT NULL DEFAULT '[]',

    -- Trial booking
    trial_date DATE NULL,
    trial_slot_id VARCHAR(36) NULL,
    trial_status ENUM('pending', 'scheduled', 'attended', 'no-show', 'cancelled') NULL,
    trial_feedback TEXT NULL,

    -- Conversion
    converted_to_member_id VARCHAR(36) NULL,
    conversion_date DATETIME NULL,

    -- Follow-up
    last_contact_date DATE NULL,
    next_follow_up_date DATE NULL,
    follow_up_notes TEXT NULL,

    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_source (source),
    INDEX idx_next_follow_up (next_follow_up_date),
    INDEX idx_created_at (created_at),

    FOREIGN KEY (preferred_slot_id) REFERENCES session_slots(id) ON DELETE SET NULL,
    FOREIGN KEY (trial_slot_id) REFERENCES session_slots(id) ON DELETE SET NULL,
    FOREIGN KEY (converted_to_member_id) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MEMBERSHIP SUBSCRIPTIONS
-- ============================================
CREATE TABLE membership_subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    member_id VARCHAR(36) NOT NULL,
    plan_id VARCHAR(36) NOT NULL,
    slot_id VARCHAR(36) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Pricing
    original_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_reason VARCHAR(255) NULL,
    payable_amount DECIMAL(10, 2) NOT NULL,

    -- Status
    status ENUM('active', 'expired', 'cancelled', 'pending', 'suspended', 'scheduled') NOT NULL DEFAULT 'active',

    -- Extension tracking
    is_extension BOOLEAN NOT NULL DEFAULT FALSE,
    previous_subscription_id VARCHAR(36) NULL,
    extension_days INT NULL,

    -- Payment link
    invoice_id VARCHAR(36) NULL,
    payment_status ENUM('pending', 'partial', 'paid') NOT NULL DEFAULT 'pending',

    -- Extra days
    extra_days INT NULL DEFAULT 0,
    extra_days_reason VARCHAR(255) NULL,

    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_member (member_id),
    INDEX idx_slot (slot_id),
    INDEX idx_status (status),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    INDEX idx_dates_status (start_date, end_date, status),

    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES membership_plans(id) ON DELETE RESTRICT,
    FOREIGN KEY (slot_id) REFERENCES session_slots(id) ON DELETE RESTRICT,
    FOREIGN KEY (previous_subscription_id) REFERENCES membership_subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SLOT SUBSCRIPTIONS (for slot capacity tracking)
-- ============================================
CREATE TABLE slot_subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    member_id VARCHAR(36) NOT NULL,
    slot_id VARCHAR(36) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_exception BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_member (member_id),
    INDEX idx_slot (slot_id),
    INDEX idx_is_active (is_active),
    INDEX idx_slot_active (slot_id, is_active),

    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES session_slots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TRIAL BOOKINGS
-- ============================================
CREATE TABLE trial_bookings (
    id VARCHAR(36) PRIMARY KEY,
    lead_id VARCHAR(36) NOT NULL,
    slot_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    status ENUM('pending', 'confirmed', 'attended', 'no-show', 'cancelled') NOT NULL DEFAULT 'pending',
    is_exception BOOLEAN NOT NULL DEFAULT FALSE,
    confirmation_sent BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_lead (lead_id),
    INDEX idx_slot_date (slot_id, date),
    INDEX idx_date (date),
    INDEX idx_status (status),

    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES session_slots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE invoices (
    id VARCHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(20) NOT NULL,
    invoice_type ENUM('membership', 'product-sale') NOT NULL DEFAULT 'membership',
    member_id VARCHAR(36) NOT NULL,

    -- Amounts
    amount DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NULL DEFAULT 0,
    discount DECIMAL(10, 2) NULL DEFAULT 0,
    discount_reason VARCHAR(255) NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,

    -- Dates
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE NULL,

    -- Status
    status ENUM('draft', 'sent', 'paid', 'partially-paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'draft',

    -- Items (stored as JSON array)
    items JSON NOT NULL,

    -- Links
    subscription_id VARCHAR(36) NULL,

    -- Payment info (legacy)
    payment_method ENUM('cash', 'card', 'upi', 'bank-transfer', 'cheque', 'other') NULL,
    payment_reference VARCHAR(255) NULL,

    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_invoice_number (invoice_number),
    INDEX idx_member (member_id),
    INDEX idx_status (status),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_due_date (due_date),
    INDEX idx_subscription (subscription_id),

    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES membership_subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL,
    member_id VARCHAR(36) NOT NULL,

    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'upi', 'bank-transfer', 'card', 'cheque', 'other') NOT NULL,
    payment_date DATE NOT NULL,

    -- Transaction details
    transaction_reference VARCHAR(255) NULL,
    bank_details TEXT NULL,

    status ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled') NOT NULL DEFAULT 'completed',

    -- Receipt
    receipt_number VARCHAR(20) NULL,

    notes TEXT NULL,
    recorded_by VARCHAR(255) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_invoice (invoice_id),
    INDEX idx_member (member_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_status (status),
    INDEX idx_receipt_number (receipt_number),

    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ATTENDANCE RECORDS
-- ============================================
CREATE TABLE attendance_records (
    id VARCHAR(36) PRIMARY KEY,
    member_id VARCHAR(36) NOT NULL,
    slot_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    status ENUM('present', 'absent') NOT NULL,
    subscription_id VARCHAR(36) NULL,
    marked_at DATETIME NOT NULL,
    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Unique constraint: one record per member/slot/date
    UNIQUE INDEX idx_member_slot_date (member_id, slot_id, date),
    INDEX idx_slot_date (slot_id, date),
    INDEX idx_member (member_id),
    INDEX idx_date (date),
    INDEX idx_status (status),

    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES session_slots(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES membership_subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ATTENDANCE LOCKS (for per-day per-slot lock/unlock)
-- ============================================
CREATE TABLE attendance_locks (
    date DATE NOT NULL,
    slot_id VARCHAR(36) NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT TRUE,
    locked_by VARCHAR(255) NULL,
    locked_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (date, slot_id),
    FOREIGN KEY (slot_id) REFERENCES session_slots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- NOTIFICATION LOGS (WhatsApp message tracking)
-- ============================================
CREATE TABLE notification_logs (
    id VARCHAR(36) PRIMARY KEY,
    type ENUM('renewal-reminder', 'class-reminder', 'payment-confirmation', 'lead-followup') NOT NULL,
    recipient_type ENUM('member', 'lead') NOT NULL,
    recipient_id VARCHAR(36) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'sent', 'cancelled') NOT NULL DEFAULT 'pending',
    sent_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_recipient (recipient_type, recipient_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STUDIO SETTINGS
-- ============================================
CREATE TABLE studio_settings (
    id INT PRIMARY KEY DEFAULT 1,  -- Single row table
    studio_name VARCHAR(255) NOT NULL DEFAULT 'My Yoga Studio',
    logo_url TEXT NULL,
    logo_data LONGTEXT NULL,  -- Base64 encoded logo
    address TEXT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    website VARCHAR(255) NULL,
    whatsapp_business_number VARCHAR(20) NULL,

    -- Currency & Timezone
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',

    -- Working hours (JSON)
    working_hours JSON NOT NULL,

    -- Legal
    terms_and_conditions LONGTEXT NULL,
    health_disclaimer LONGTEXT NULL,

    -- Reminders
    renewal_reminder_days INT NOT NULL DEFAULT 7,
    class_reminder_hours INT NOT NULL DEFAULT 24,

    -- Billing
    tax_rate DECIMAL(5, 2) NULL DEFAULT 0,
    invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'INV',
    receipt_prefix VARCHAR(10) NOT NULL DEFAULT 'RCP',
    invoice_start_number INT NULL,
    receipt_start_number INT NULL,

    -- Trial settings
    trial_class_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_trials_per_person INT NOT NULL DEFAULT 1,

    -- Holidays (JSON array)
    holidays JSON NOT NULL DEFAULT '[]',

    -- Auth
    admin_password VARCHAR(255) NULL DEFAULT 'admin123',

    -- Invoice Template (JSON)
    invoice_template JSON NULL,

    -- WhatsApp Message Templates (JSON)
    whatsapp_templates JSON NULL,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- API SESSIONS (for authentication)
-- ============================================
CREATE TABLE api_sessions (
    id VARCHAR(36) PRIMARY KEY,
    session_token VARCHAR(255) NOT NULL,
    is_authenticated BOOLEAN NOT NULL DEFAULT FALSE,
    login_time DATETIME NULL,
    expires_at DATETIME NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_token (session_token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Default session slots
INSERT INTO session_slots (id, start_time, end_time, display_name, capacity, exception_capacity, session_type, is_active) VALUES
('slot-0730', '07:30', '08:30', 'Morning 7:30 AM', 10, 1, 'offline', TRUE),
('slot-0845', '08:45', '09:45', 'Morning 8:45 AM', 10, 1, 'offline', TRUE),
('slot-1000', '10:00', '11:00', 'Late Morning 10:00 AM', 10, 1, 'offline', TRUE),
('slot-1930', '19:30', '20:30', 'Evening 7:30 PM', 10, 1, 'offline', TRUE);

-- Default membership plans
INSERT INTO membership_plans (id, name, type, price, duration_months, description, is_active, allowed_session_types, features) VALUES
(UUID(), 'Monthly', 'monthly', 2100.00, 1, 'Unlimited yoga sessions for 1 month. Access to your assigned slot Monday to Friday.', TRUE, '["offline"]', '["Unlimited sessions (Mon-Fri)", "One assigned slot", "Access to all class types"]'),
(UUID(), 'Quarterly', 'quarterly', 5500.00, 3, 'Unlimited yoga sessions for 3 months. Access to your assigned slot Monday to Friday. Save ₹800!', TRUE, '["offline"]', '["Unlimited sessions (Mon-Fri)", "One assigned slot", "Access to all class types", "Save ₹800 vs monthly"]'),
(UUID(), 'Semi-Annual', 'semi-annual', 10000.00, 6, 'Unlimited yoga sessions for 6 months. Access to your assigned slot Monday to Friday. Save ₹2,600!', TRUE, '["offline"]', '["Unlimited sessions (Mon-Fri)", "One assigned slot", "Access to all class types", "Save ₹2,600 vs monthly"]');

-- Default studio settings
INSERT INTO studio_settings (id, studio_name, currency, timezone, working_hours, terms_and_conditions, health_disclaimer, invoice_template, holidays) VALUES
(1, 'My Yoga Studio', 'INR', 'Asia/Kolkata',
'{"monday":[{"start":"06:00","end":"21:00"}],"tuesday":[{"start":"06:00","end":"21:00"}],"wednesday":[{"start":"06:00","end":"21:00"}],"thursday":[{"start":"06:00","end":"21:00"}],"friday":[{"start":"06:00","end":"21:00"}],"saturday":[],"sunday":[]}',
'# Terms and Conditions\n\n1. **Membership**: All memberships are non-transferable and non-refundable.\n2. **Cancellation**: Members may cancel their membership with 7 days notice.\n3. **Conduct**: Members are expected to maintain respectful behavior towards instructors and other members.\n4. **Property**: The studio is not responsible for any personal belongings left on premises.\n5. **Sessions**: Sessions run Monday to Friday. Weekend and public holiday sessions are not included.\n6. **Attendance**: Please arrive 10 minutes before your scheduled session.\n7. **Health**: Members must inform instructors of any injuries or health conditions before class.',
'# Health & Medical Disclaimer\n\nBy participating in yoga classes at this studio, you acknowledge and agree to the following:\n\n1. **Physical Activity**: Yoga involves physical activity that may be strenuous. You participate at your own risk.\n2. **Medical Clearance**: You confirm that you are physically fit and have no medical conditions that would prevent your participation.\n3. **Injuries**: You must inform the instructor of any injuries, surgeries, or medical conditions before each class.\n4. **Pregnancy**: If pregnant, you must inform the instructor and have medical clearance to participate.\n5. **Liability**: The studio and its instructors are not liable for any injuries sustained during classes.\n6. **Emergency Contact**: You have provided accurate emergency contact information.\n\nIf you have any concerns about your ability to safely participate, please consult your physician before attending classes.',
'{"showLogo":true,"showStudioAddress":true,"showStudioPhone":true,"showStudioEmail":true,"headerText":"INVOICE","footerText":"Thank you for your business!","termsText":"Payment is due within 7 days of invoice date.","accentColor":"#4F46E5","currencySymbol":"₹","showPaymentQR":false,"paymentQRLabel":"Scan to Pay"}',
'[{"date":"2025-01-26","name":"Republic Day","isRecurringYearly":true},{"date":"2025-08-15","name":"Independence Day","isRecurringYearly":true},{"date":"2025-10-02","name":"Gandhi Jayanti","isRecurringYearly":true},{"date":"2025-12-25","name":"Christmas","isRecurringYearly":true}]'
);
