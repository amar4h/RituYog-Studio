-- Migration: Add google_review_url column to studio_settings
-- Run this in phpMyAdmin for both RFS and Production databases

ALTER TABLE studio_settings ADD COLUMN google_review_url VARCHAR(500) NULL AFTER website;
