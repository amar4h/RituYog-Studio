-- ============================================================
-- Fix Session Execution attendee counts and member_ids
-- Bug: PHP array_column used wrong key ('member_id' instead of 'memberId')
-- Result: All executions saved with attendee_count=0 and member_ids=[]
-- This script re-populates from attendance_records
-- Safe: Idempotent, only updates where data is wrong
-- Run in phpMyAdmin on both RFS and Production
-- ============================================================

-- Step 1: Update member_ids from attendance_records
UPDATE session_executions se
SET member_ids = (
    SELECT COALESCE(
        JSON_ARRAYAGG(ar.member_id),
        JSON_ARRAY()
    )
    FROM attendance_records ar
    WHERE ar.slot_id = se.slot_id
      AND ar.date = se.date
      AND ar.status = 'present'
),
attendee_count = (
    SELECT COUNT(*)
    FROM attendance_records ar
    WHERE ar.slot_id = se.slot_id
      AND ar.date = se.date
      AND ar.status = 'present'
),
updated_at = NOW()
WHERE se.attendee_count = 0
   OR se.member_ids = '[]'
   OR se.member_ids IS NULL;

-- Step 2: Verification - show all executions with their counts
SELECT
    se.date,
    se.slot_id,
    se.session_plan_name,
    se.attendee_count,
    JSON_LENGTH(se.member_ids) AS member_ids_count,
    (SELECT COUNT(*) FROM attendance_records ar
     WHERE ar.slot_id = se.slot_id AND ar.date = se.date AND ar.status = 'present'
    ) AS actual_attendance
FROM session_executions se
ORDER BY se.date DESC, se.slot_id;
