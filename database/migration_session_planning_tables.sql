-- ============================================
-- Session Planning Tables - Migration
-- Creates: asanas, session_plans, session_plan_allocations, session_executions
-- Run AFTER schema.sql
-- ============================================

-- ============================================
-- ASANAS (Master Data)
-- Stores individual poses, exercises, kriyas, pranayama, relaxation,
-- vinyasa flows, and surya namaskars.
-- Vinyasa/surya_namaskar types use child_asanas JSON to reference child poses.
-- ============================================
CREATE TABLE IF NOT EXISTS asanas (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    sanskrit_name VARCHAR(200) NULL,
    type ENUM('asana', 'pranayama', 'kriya', 'exercise', 'relaxation', 'vinyasa', 'surya_namaskar') NOT NULL,
    primary_body_areas JSON NOT NULL,        -- e.g. ["spine", "shoulders"]
    secondary_body_areas JSON NOT NULL,      -- e.g. ["core", "hips"]
    benefits JSON NOT NULL,                  -- e.g. ["Improves posture", "Strengthens legs"]
    difficulty ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
    contraindications JSON NULL,             -- e.g. ["Knee injury", "Pregnancy"]
    breathing_cue ENUM('inhale', 'exhale', 'hold') NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    child_asanas JSON NULL,                  -- For vinyasa/surya_namaskar: [{"asanaId":"...", "order":1}, ...]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_type (type),
    INDEX idx_difficulty (difficulty),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SESSION PLANS (Reusable Templates)
-- Sections stored as JSON array matching the 5-section structure.
-- ============================================
CREATE TABLE IF NOT EXISTS session_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    level ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'intermediate',
    version INT NOT NULL DEFAULT 1,
    sections JSON NOT NULL,                  -- Array of {sectionType, order, items[{asanaId, order, intensity, notes, reps, durationMinutes}]}
    created_by VARCHAR(255) NULL,
    last_used_at DATETIME NULL,
    usage_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_level (level),
    INDEX idx_is_active (is_active),
    INDEX idx_last_used (last_used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SESSION PLAN ALLOCATIONS (Pre-scheduling)
-- Links a plan to a slot+date before the class happens.
-- ============================================
CREATE TABLE IF NOT EXISTS session_plan_allocations (
    id VARCHAR(36) PRIMARY KEY,
    session_plan_id VARCHAR(50) NOT NULL,
    slot_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    allocated_by VARCHAR(255) NULL,
    status ENUM('scheduled', 'executed', 'cancelled') NOT NULL DEFAULT 'scheduled',
    execution_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_slot_date (slot_id, date),
    INDEX idx_plan (session_plan_id),
    INDEX idx_date (date),
    INDEX idx_status (status),

    FOREIGN KEY (session_plan_id) REFERENCES session_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES session_slots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SESSION EXECUTIONS (Immutable History)
-- Snapshot approach: stores full plan data at execution time.
-- ============================================
CREATE TABLE IF NOT EXISTS session_executions (
    id VARCHAR(36) PRIMARY KEY,
    session_plan_id VARCHAR(50) NOT NULL,
    session_plan_name VARCHAR(200) NOT NULL,
    session_plan_level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
    sections_snapshot JSON NOT NULL,          -- Full snapshot of sections at execution time
    slot_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    instructor VARCHAR(255) NULL,
    notes TEXT NULL,
    member_ids JSON NOT NULL DEFAULT '[]',    -- Auto-populated from attendance
    attendee_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_slot_date (slot_id, date),
    INDEX idx_plan (session_plan_id),
    INDEX idx_date (date),

    FOREIGN KEY (session_plan_id) REFERENCES session_plans(id) ON DELETE RESTRICT,
    FOREIGN KEY (slot_id) REFERENCES session_slots(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
