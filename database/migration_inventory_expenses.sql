-- ============================================
-- MIGRATION: Inventory & Expense Management
-- Version: 1.2.0
-- Date: 2026-02-01
-- ============================================

-- ============================================
-- PRODUCTS
-- Product catalog for items sold or used by studio
-- ============================================
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

-- ============================================
-- EXPENSES
-- All studio expenses including procurement
-- ============================================
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
    items JSON NOT NULL DEFAULT '[]',

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

-- ============================================
-- INVENTORY TRANSACTIONS
-- Stock movements: purchases, sales, consumption, adjustments
-- ============================================
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

-- ============================================
-- UPDATE STUDIO SETTINGS
-- Add expense-related settings
-- ============================================
ALTER TABLE studio_settings
ADD COLUMN IF NOT EXISTS expense_prefix VARCHAR(10) NOT NULL DEFAULT 'EXP',
ADD COLUMN IF NOT EXISTS expense_start_number INT NULL,
ADD COLUMN IF NOT EXISTS low_stock_alert_enabled BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS dashboard_show_profit BOOLEAN NULL;
