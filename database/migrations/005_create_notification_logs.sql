-- Migration: Create notification_logs table
-- Version: 1.0.4
-- Date: 2026-01-23
-- Description: Creates notification_logs table for WhatsApp message tracking

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

-- Verify the table was created
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_logs';
