-- Migration: Add lead registration completion fields
-- Version: 1.2.1
-- Date: 2026-02-03
-- Description: Adds completion token fields to leads table for quick-add registration flow

-- Add new columns to leads table
ALTER TABLE leads
  ADD COLUMN completion_token VARCHAR(64) NULL COMMENT 'Secure token for public registration completion link',
  ADD COLUMN completion_token_expiry DATETIME NULL COMMENT 'When the completion token expires',
  ADD COLUMN is_profile_complete BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether lead has completed full registration';

-- Index for fast token lookup (public API endpoint)
CREATE INDEX idx_leads_completion_token ON leads(completion_token);

-- Update existing leads to mark them as complete (they were created through full forms)
UPDATE leads SET is_profile_complete = TRUE WHERE is_profile_complete IS NULL OR is_profile_complete = FALSE;

-- Note: Quick-add leads will have:
-- - completion_token: 64-char hex token
-- - completion_token_expiry: 7 days from creation
-- - is_profile_complete: FALSE (until they complete registration)
-- - email: empty string (filled on completion)
-- - consent_records: empty array (filled on completion)
