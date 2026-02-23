-- ============================================
-- MIGRATION: Member Portal - Auth Tables
-- Date: 2026-02-20
-- Run in: phpMyAdmin (RFS first, then production)
-- ============================================

-- Add password_hash column to members table
ALTER TABLE members ADD COLUMN password_hash VARCHAR(255) NULL AFTER notes;

-- Create member sessions table (separate from admin api_sessions)
CREATE TABLE IF NOT EXISTS member_sessions (
    id VARCHAR(36) PRIMARY KEY,
    member_id VARCHAR(36) NOT NULL,
    session_token VARCHAR(128) NOT NULL UNIQUE,
    login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    INDEX idx_member (member_id),
    INDEX idx_token (session_token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
