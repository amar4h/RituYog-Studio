-- Migration: Add WhatsApp Templates column
-- Version: 1.0.4
-- Date: 2026-01-23
-- Description: Adds whatsapp_templates JSON column to studio_settings table

-- Add whatsapp_templates column to studio_settings
ALTER TABLE studio_settings
ADD COLUMN whatsapp_templates JSON NULL AFTER invoice_template;

-- Verify the column was added
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'studio_settings'
AND COLUMN_NAME = 'whatsapp_templates';
