-- ============================================
-- Production Migration Script (Simple Version)
-- Run each section in phpMyAdmin separately
-- ============================================

-- STEP 1: Create attendance_locks table
CREATE TABLE IF NOT EXISTS attendance_locks (
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

-- STEP 2: Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
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

-- STEP 3: Add columns to studio_settings (run these one at a time, ignore errors if column exists)
-- ALTER TABLE studio_settings ADD COLUMN whatsapp_templates JSON NULL;
-- ALTER TABLE studio_settings ADD COLUMN invoice_start_number INT NULL;
-- ALTER TABLE studio_settings ADD COLUMN receipt_start_number INT NULL;

-- STEP 4: Verify tables were created
SELECT 'attendance_locks' AS table_name, COUNT(*) AS row_count FROM attendance_locks
UNION ALL
SELECT 'notification_logs', COUNT(*) FROM notification_logs;
