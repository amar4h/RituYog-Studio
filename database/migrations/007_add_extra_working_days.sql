-- Migration: Add extra_working_days column to studio_settings
-- Description: Stores weekend dates marked as working days (JSON array)
-- Run on: RFS first, then Production

ALTER TABLE studio_settings
ADD COLUMN extra_working_days JSON NULL DEFAULT '[]' AFTER holidays;
