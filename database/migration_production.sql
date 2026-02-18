-- ============================================
-- Production Migration Script
-- Safe to run multiple times (uses IF NOT EXISTS)
-- Run this in production phpMyAdmin
-- ============================================

-- 1. Create attendance_locks table (for per-slot attendance locking)
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

-- 2. Create notification_logs table (for WhatsApp message tracking)
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

-- 3. Add whatsapp_templates column to studio_settings (if not exists)
-- MySQL doesn't support IF NOT EXISTS for columns, so we use a procedure
DELIMITER //
CREATE PROCEDURE AddWhatsAppTemplatesColumn()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'studio_settings'
        AND COLUMN_NAME = 'whatsapp_templates'
    ) THEN
        ALTER TABLE studio_settings ADD COLUMN whatsapp_templates JSON NULL;
    END IF;
END //
DELIMITER ;

CALL AddWhatsAppTemplatesColumn();
DROP PROCEDURE AddWhatsAppTemplatesColumn;

-- 4. Add invoice_start_number and receipt_start_number columns (if not exists)
DELIMITER //
CREATE PROCEDURE AddInvoiceStartNumberColumns()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'studio_settings'
        AND COLUMN_NAME = 'invoice_start_number'
    ) THEN
        ALTER TABLE studio_settings ADD COLUMN invoice_start_number INT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'studio_settings'
        AND COLUMN_NAME = 'receipt_start_number'
    ) THEN
        ALTER TABLE studio_settings ADD COLUMN receipt_start_number INT NULL;
    END IF;
END //
DELIMITER ;

CALL AddInvoiceStartNumberColumns();
DROP PROCEDURE AddInvoiceStartNumberColumns;

-- 5. Add invoice_type column to invoices table
DELIMITER //
CREATE PROCEDURE AddInvoiceTypeColumn()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'invoices'
        AND COLUMN_NAME = 'invoice_type'
    ) THEN
        ALTER TABLE invoices ADD COLUMN invoice_type ENUM('membership', 'product-sale') NOT NULL DEFAULT 'membership' AFTER invoice_number;
    END IF;
END //
DELIMITER ;

CALL AddInvoiceTypeColumn();
DROP PROCEDURE AddInvoiceTypeColumn;

-- 6. Create products table (if not exists)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    category ENUM('yoga-equipment', 'clothing', 'supplements', 'accessories', 'books', 'other') NOT NULL,
    description TEXT NULL,
    cost_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    current_stock INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    unit VARCHAR(20) NOT NULL DEFAULT 'piece',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT NULL,
    barcode VARCHAR(100) NULL,
    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_sku (sku),
    INDEX idx_category (category),
    INDEX idx_is_active (is_active),
    INDEX idx_low_stock (current_stock, low_stock_threshold)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Create expenses table (if not exists)
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(36) PRIMARY KEY,
    expense_number VARCHAR(20) NOT NULL,
    category ENUM('procurement', 'rent', 'utilities', 'salaries', 'maintenance',
                  'marketing', 'insurance', 'professional-fees', 'equipment',
                  'supplies', 'travel', 'other') NOT NULL,
    description VARCHAR(500) NOT NULL,

    -- Vendor details
    vendor_name VARCHAR(255) NOT NULL,
    vendor_contact VARCHAR(100) NULL,
    vendor_gstin VARCHAR(20) NULL,

    -- Amounts
    amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NULL DEFAULT 0,
    shipping_cost DECIMAL(10, 2) NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,

    -- Items (for procurement, stored as JSON array)
    items JSON NOT NULL DEFAULT ('[]'),

    -- Dates
    expense_date DATE NOT NULL,
    due_date DATE NULL,
    paid_date DATE NULL,

    -- Payment info
    payment_status ENUM('pending', 'paid', 'partial') NOT NULL DEFAULT 'pending',
    payment_method ENUM('cash', 'upi', 'bank-transfer', 'card', 'cheque', 'other') NULL,
    payment_reference VARCHAR(255) NULL,

    -- Document
    receipt_url TEXT NULL,
    receipt_data LONGTEXT NULL,
    invoice_number VARCHAR(100) NULL,

    -- Flags
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurring_frequency ENUM('monthly', 'quarterly', 'yearly') NULL,

    notes TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_expense_number (expense_number),
    INDEX idx_category (category),
    INDEX idx_vendor (vendor_name),
    INDEX idx_expense_date (expense_date),
    INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Create inventory_transactions table (if not exists)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    type ENUM('purchase', 'sale', 'consumed', 'adjustment', 'returned', 'damaged', 'initial') NOT NULL,
    quantity INT NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_value DECIMAL(10, 2) NOT NULL,

    -- Links
    expense_id VARCHAR(36) NULL,
    vendor_name VARCHAR(255) NULL,
    invoice_id VARCHAR(36) NULL,

    -- Stock levels at time of transaction
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,

    transaction_date DATE NOT NULL,
    notes TEXT NULL,
    recorded_by VARCHAR(255) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_product (product_id),
    INDEX idx_type (type),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_expense (expense_id),
    INDEX idx_invoice (invoice_id),

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Add expense-related columns to studio_settings
DELIMITER //
CREATE PROCEDURE AddExpenseSettingsColumns()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'studio_settings'
        AND COLUMN_NAME = 'expense_prefix'
    ) THEN
        ALTER TABLE studio_settings ADD COLUMN expense_prefix VARCHAR(10) NOT NULL DEFAULT 'EXP';
    END IF;

    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'studio_settings'
        AND COLUMN_NAME = 'expense_start_number'
    ) THEN
        ALTER TABLE studio_settings ADD COLUMN expense_start_number INT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'studio_settings'
        AND COLUMN_NAME = 'low_stock_alert_enabled'
    ) THEN
        ALTER TABLE studio_settings ADD COLUMN low_stock_alert_enabled BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'studio_settings'
        AND COLUMN_NAME = 'dashboard_show_profit'
    ) THEN
        ALTER TABLE studio_settings ADD COLUMN dashboard_show_profit BOOLEAN NULL;
    END IF;
END //
DELIMITER ;

CALL AddExpenseSettingsColumns();
DROP PROCEDURE AddExpenseSettingsColumns;

-- ============================================
-- Verification: Check tables and columns exist
-- ============================================
SELECT 'attendance_locks' AS table_name, COUNT(*) AS exists_check FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'attendance_locks'
UNION ALL
SELECT 'notification_logs', COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'notification_logs'
UNION ALL
SELECT 'products', COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'products'
UNION ALL
SELECT 'expenses', COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'expenses'
UNION ALL
SELECT 'inventory_transactions', COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'inventory_transactions';

SELECT 'Migration completed successfully!' AS status;
