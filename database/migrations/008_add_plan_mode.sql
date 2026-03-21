-- Migration 008: Add mode column to membership_plans
-- Adds offline/online/hybrid mode tag to each plan

ALTER TABLE membership_plans
ADD COLUMN mode ENUM('offline', 'online', 'hybrid') NOT NULL DEFAULT 'offline'
AFTER allowed_session_types;
