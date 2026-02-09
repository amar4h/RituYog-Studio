-- Migration: Session Planning Tables
-- Version: 1.3.0
-- Date: 2026-02-03
-- Description: Creates tables for yoga session planning feature (asanas, session plans, allocations, executions)

-- ============================================
-- ASANAS (Master Data - Poses, Pranayama, Kriyas)
-- ============================================
CREATE TABLE IF NOT EXISTS asanas (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sanskrit_name VARCHAR(100) NULL,
    type ENUM('asana', 'pranayama', 'kriya', 'exercise', 'relaxation', 'vinyasa', 'surya_namaskar') NOT NULL,
    difficulty ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
    primary_body_areas JSON NOT NULL DEFAULT '[]',     -- BodyArea[]
    secondary_body_areas JSON NOT NULL DEFAULT '[]',   -- BodyArea[]
    benefits JSON NOT NULL DEFAULT '[]',               -- string[]
    contraindications JSON NULL DEFAULT '[]',          -- string[]
    breathing_cue ENUM('inhale', 'exhale', 'hold') NULL,  -- Optional breathing instruction
    child_asanas JSON NULL,                            -- VinyasaItem[] for vinyasa/surya_namaskar types
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_type (type),
    INDEX idx_difficulty (difficulty),
    INDEX idx_is_active (is_active),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SESSION PLANS (Reusable Templates)
-- ============================================
CREATE TABLE IF NOT EXISTS session_plans (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    level ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
    version INT NOT NULL DEFAULT 1,
    sections JSON NOT NULL,                            -- SessionPlanSection[]
    created_by VARCHAR(100) NULL,
    last_used_at DATETIME NULL,
    usage_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_level (level),
    INDEX idx_is_active (is_active),
    INDEX idx_usage_count (usage_count),
    INDEX idx_last_used (last_used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SESSION PLAN ALLOCATIONS (Pre-scheduling)
-- ============================================
CREATE TABLE IF NOT EXISTS session_plan_allocations (
    id VARCHAR(36) PRIMARY KEY,
    session_plan_id VARCHAR(36) NOT NULL,
    slot_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    allocated_by VARCHAR(100) NULL,
    status ENUM('scheduled', 'executed', 'cancelled') NOT NULL DEFAULT 'scheduled',
    execution_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_slot_date (slot_id, date),
    INDEX idx_session_plan (session_plan_id),
    INDEX idx_date (date),
    INDEX idx_status (status),

    FOREIGN KEY (session_plan_id) REFERENCES session_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES session_slots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SESSION EXECUTIONS (Immutable History)
-- ============================================
CREATE TABLE IF NOT EXISTS session_executions (
    id VARCHAR(36) PRIMARY KEY,
    session_plan_id VARCHAR(36) NOT NULL,
    session_plan_name VARCHAR(200) NOT NULL,           -- Snapshot
    session_plan_level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
    sections_snapshot JSON NOT NULL,                   -- Full snapshot of sections at execution time
    slot_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    instructor VARCHAR(100) NULL,
    notes TEXT NULL,
    member_ids JSON NOT NULL DEFAULT '[]',             -- string[] - members who attended
    attendee_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_slot_date (slot_id, date),
    INDEX idx_session_plan (session_plan_id),
    INDEX idx_date (date),

    FOREIGN KEY (session_plan_id) REFERENCES session_plans(id) ON DELETE RESTRICT,
    FOREIGN KEY (slot_id) REFERENCES session_slots(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update allocation's execution_id FK after execution table exists
ALTER TABLE session_plan_allocations
    ADD CONSTRAINT fk_execution FOREIGN KEY (execution_id)
    REFERENCES session_executions(id) ON DELETE SET NULL;
