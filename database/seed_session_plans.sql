-- Seed Data for Session Plans Table
-- Run this SQL in phpMyAdmin for RFS and Production databases
-- NOTE: Run this AFTER seed_asanas.sql
-- Version: 2.0.0 (Updated to use fixed asana IDs)

-- Clear existing data (optional - comment out if you want to preserve existing)
-- DELETE FROM session_plans;

-- =====================================================
-- BEGINNER MORNING FLOW
-- A gentle morning sequence for beginners focusing on
-- awakening the body and building a solid foundation.
-- Duration: ~45-50 minutes
-- =====================================================
INSERT INTO session_plans (id, name, description, level, version, sections, created_by, usage_count, is_active, created_at, updated_at) VALUES
('plan-beginner-morning', 'Beginner Morning Flow',
'Gentle morning sequence suitable for beginners. Focus on awakening the body and building foundation. Perfect for early morning batches (7:30 AM). Emphasizes proper alignment and breath awareness.',
'beginner', 1,
JSON_ARRAY(
    JSON_OBJECT(
        'sectionType', 'WARM_UP',
        'order', 1,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-neck-rotations', 'order', 1, 'durationMinutes', 2, 'intensity', 'low', 'notes', '5 rotations each direction'),
            JSON_OBJECT('asanaId', 'asana-shoulder-rotations', 'order', 2, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Forward and backward'),
            JSON_OBJECT('asanaId', 'asana-cat-cow', 'order', 3, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Sync with breath, 8-10 rounds'),
            JSON_OBJECT('asanaId', 'asana-tadasana', 'order', 4, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Focus on grounding')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SURYA_NAMASKARA',
        'order', 2,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-surya-namaskara-a', 'order', 1, 'reps', 3, 'intensity', 'medium', 'notes', 'Slow pace, focus on breath')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'ASANA_SEQUENCE',
        'order', 3,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-warrior1', 'order', 1, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Both sides'),
            JSON_OBJECT('asanaId', 'asana-warrior2', 'order', 2, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Both sides'),
            JSON_OBJECT('asanaId', 'asana-trikonasana', 'order', 3, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Both sides'),
            JSON_OBJECT('asanaId', 'asana-bhujangasana', 'order', 4, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Low cobra, elbows bent'),
            JSON_OBJECT('asanaId', 'asana-setu-bandha', 'order', 5, 'durationMinutes', 3, 'intensity', 'medium', 'notes', 'Hold 5 breaths x2'),
            JSON_OBJECT('asanaId', 'asana-paschimottanasana', 'order', 6, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Use strap if needed'),
            JSON_OBJECT('asanaId', 'asana-supta-matsyendrasana', 'order', 7, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Both sides, 5 breaths each')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'PRANAYAMA',
        'order', 4,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-anulom-vilom', 'order', 1, 'durationMinutes', 5, 'intensity', 'low', 'notes', '10 rounds, 4:4 ratio')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SHAVASANA',
        'order', 5,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-shavasana', 'order', 1, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Body scan relaxation')
        )
    )
),
'System', 0, 1, NOW(), NOW());

-- =====================================================
-- INTERMEDIATE POWER FLOW
-- Dynamic sequence for building strength and stamina.
-- Duration: ~55-60 minutes
-- =====================================================
INSERT INTO session_plans (id, name, description, level, version, sections, created_by, usage_count, is_active, created_at, updated_at) VALUES
('plan-intermediate-power', 'Intermediate Power Flow',
'Dynamic sequence for intermediate practitioners. Builds strength and stamina. Suitable for members with 3+ months experience. Includes challenging standing poses and core work.',
'intermediate', 1,
JSON_ARRAY(
    JSON_OBJECT(
        'sectionType', 'WARM_UP',
        'order', 1,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-cat-cow', 'order', 1, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Quick pace, 10 rounds'),
            JSON_OBJECT('asanaId', 'asana-adho-mukha', 'order', 2, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Pedal feet, warm up legs'),
            JSON_OBJECT('asanaId', 'asana-phalakasana', 'order', 3, 'durationMinutes', 1, 'intensity', 'medium', 'notes', 'Hold 30 seconds')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SURYA_NAMASKARA',
        'order', 2,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-surya-namaskara-a', 'order', 1, 'reps', 3, 'intensity', 'medium', 'notes', 'Building heat'),
            JSON_OBJECT('asanaId', 'asana-surya-namaskara-b', 'order', 2, 'reps', 3, 'intensity', 'high', 'notes', 'Full expression')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'ASANA_SEQUENCE',
        'order', 3,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-warrior1', 'order', 1, 'durationMinutes', 2, 'intensity', 'high', 'notes', 'Deep lunge'),
            JSON_OBJECT('asanaId', 'asana-warrior2', 'order', 2, 'durationMinutes', 2, 'intensity', 'high', 'notes', 'Strong arms'),
            JSON_OBJECT('asanaId', 'asana-warrior3', 'order', 3, 'durationMinutes', 2, 'intensity', 'high', 'notes', 'Both sides'),
            JSON_OBJECT('asanaId', 'asana-utkatasana', 'order', 4, 'durationMinutes', 1, 'intensity', 'high', 'notes', 'Hold 5 breaths x2'),
            JSON_OBJECT('asanaId', 'asana-navasana', 'order', 5, 'durationMinutes', 2, 'intensity', 'high', 'notes', '3 rounds, 5 breaths each'),
            JSON_OBJECT('asanaId', 'asana-ardha-matsyendrasana', 'order', 6, 'durationMinutes', 3, 'intensity', 'medium', 'notes', 'Both sides'),
            JSON_OBJECT('asanaId', 'asana-ustrasana', 'order', 7, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Options for hands on blocks'),
            JSON_OBJECT('asanaId', 'asana-setu-bandha', 'order', 8, 'durationMinutes', 3, 'intensity', 'medium', 'notes', 'Counter pose')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'PRANAYAMA',
        'order', 4,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-kapalbhati', 'order', 1, 'durationMinutes', 3, 'reps', 3, 'intensity', 'high', 'notes', '30 strokes per round'),
            JSON_OBJECT('asanaId', 'asana-anulom-vilom', 'order', 2, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Cooling down, 4:8 ratio')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SHAVASANA',
        'order', 5,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-shavasana', 'order', 1, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Progressive relaxation')
        )
    )
),
'System', 0, 1, NOW(), NOW());

-- =====================================================
-- EVENING RELAXATION
-- Calming sequence for stress relief and better sleep.
-- Duration: ~50 minutes
-- =====================================================
INSERT INTO session_plans (id, name, description, level, version, sections, created_by, usage_count, is_active, created_at, updated_at) VALUES
('plan-evening-relaxation', 'Evening Relaxation',
'Calming sequence for stress relief and better sleep. Gentle stretches and deep breathing. Perfect for evening batches (7:30 PM) after work. No Surya Namaskara to keep energy grounding.',
'beginner', 1,
JSON_ARRAY(
    JSON_OBJECT(
        'sectionType', 'WARM_UP',
        'order', 1,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-neck-rotations', 'order', 1, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Very slow, release day tension'),
            JSON_OBJECT('asanaId', 'asana-cat-cow', 'order', 2, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Slow breath, release spine'),
            JSON_OBJECT('asanaId', 'asana-balasana', 'order', 3, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Extended arms or by sides')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SURYA_NAMASKARA',
        'order', 2,
        'items', JSON_ARRAY()
    ),
    JSON_OBJECT(
        'sectionType', 'ASANA_SEQUENCE',
        'order', 3,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-uttanasana', 'order', 1, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Let head hang, ragdoll'),
            JSON_OBJECT('asanaId', 'asana-paschimottanasana', 'order', 2, 'durationMinutes', 4, 'intensity', 'low', 'notes', 'Forehead toward shins'),
            JSON_OBJECT('asanaId', 'asana-baddha-konasana', 'order', 3, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Forward fold option'),
            JSON_OBJECT('asanaId', 'asana-supta-matsyendrasana', 'order', 4, 'durationMinutes', 4, 'intensity', 'low', 'notes', 'Both sides, 8 breaths each'),
            JSON_OBJECT('asanaId', 'asana-ananda-balasana', 'order', 5, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Rock side to side'),
            JSON_OBJECT('asanaId', 'asana-viparita-karani', 'order', 6, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Against wall if available')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'PRANAYAMA',
        'order', 4,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-bhramari', 'order', 1, 'durationMinutes', 5, 'intensity', 'low', 'notes', '7 rounds, long exhale'),
            JSON_OBJECT('asanaId', 'asana-anulom-vilom', 'order', 2, 'durationMinutes', 5, 'intensity', 'low', 'notes', '4:8 ratio, calming')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SHAVASANA',
        'order', 5,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-shavasana', 'order', 1, 'durationMinutes', 10, 'intensity', 'low', 'notes', 'Extended relaxation, guided if time')
        )
    )
),
'System', 0, 1, NOW(), NOW());

-- =====================================================
-- HIP OPENER SPECIAL
-- Focused sequence for opening tight hips.
-- Duration: ~50 minutes
-- =====================================================
INSERT INTO session_plans (id, name, description, level, version, sections, created_by, usage_count, is_active, created_at, updated_at) VALUES
('plan-hip-opener', 'Hip Opener Special',
'Focused sequence for opening tight hips. Great for office workers and those who sit for long hours. Intermediate level - requires some hip flexibility foundation. Therapeutic for lower back.',
'intermediate', 1,
JSON_ARRAY(
    JSON_OBJECT(
        'sectionType', 'WARM_UP',
        'order', 1,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-cat-cow', 'order', 1, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Circle hips in cat pose'),
            JSON_OBJECT('asanaId', 'asana-hip-rotations', 'order', 2, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Large circles, both directions'),
            JSON_OBJECT('asanaId', 'asana-adho-mukha', 'order', 3, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Pedal feet, bend knees')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SURYA_NAMASKARA',
        'order', 2,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-surya-namaskara-a', 'order', 1, 'reps', 2, 'intensity', 'medium', 'notes', 'Gentle warm-up')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'ASANA_SEQUENCE',
        'order', 3,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-warrior2', 'order', 1, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Open hips wide'),
            JSON_OBJECT('asanaId', 'asana-parsvakonasana', 'order', 2, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Both sides'),
            JSON_OBJECT('asanaId', 'asana-malasana', 'order', 3, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Deep squat, heels down'),
            JSON_OBJECT('asanaId', 'asana-ashwa-sanchalanasana', 'order', 4, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Low lunge, drop hips'),
            JSON_OBJECT('asanaId', 'asana-utthan-pristhasana', 'order', 5, 'durationMinutes', 3, 'intensity', 'medium', 'notes', 'Lizard, forearms down option'),
            JSON_OBJECT('asanaId', 'asana-eka-pada-rajakapotasana', 'order', 6, 'durationMinutes', 4, 'intensity', 'medium', 'notes', 'Both sides, use props'),
            JSON_OBJECT('asanaId', 'asana-baddha-konasana', 'order', 7, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Seated butterfly'),
            JSON_OBJECT('asanaId', 'asana-ananda-balasana', 'order', 8, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Release lower back')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'PRANAYAMA',
        'order', 4,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-dirga', 'order', 1, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Full yogic breath')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SHAVASANA',
        'order', 5,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-supta-baddha-konasana', 'order', 1, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Support knees with blocks'),
            JSON_OBJECT('asanaId', 'asana-shavasana', 'order', 2, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Let hips release fully')
        )
    )
),
'System', 0, 1, NOW(), NOW());

-- =====================================================
-- BACK STRENGTHENING
-- Therapeutic sequence for back health.
-- Duration: ~45 minutes
-- =====================================================
INSERT INTO session_plans (id, name, description, level, version, sections, created_by, usage_count, is_active, created_at, updated_at) VALUES
('plan-back-strengthening', 'Back Strengthening',
'Therapeutic sequence for strengthening the back and improving posture. Helpful for those with mild back issues (consult doctor first). No Surya Namaskara to protect spine. Focuses on back extensors.',
'beginner', 1,
JSON_ARRAY(
    JSON_OBJECT(
        'sectionType', 'WARM_UP',
        'order', 1,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-cat-cow', 'order', 1, 'durationMinutes', 4, 'intensity', 'low', 'notes', 'Very gentle, small movements'),
            JSON_OBJECT('asanaId', 'asana-neck-rotations', 'order', 2, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Careful with neck'),
            JSON_OBJECT('asanaId', 'asana-shoulder-rotations', 'order', 3, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Open chest area')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SURYA_NAMASKARA',
        'order', 2,
        'items', JSON_ARRAY()
    ),
    JSON_OBJECT(
        'sectionType', 'ASANA_SEQUENCE',
        'order', 3,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-tadasana', 'order', 1, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Focus on posture awareness'),
            JSON_OBJECT('asanaId', 'asana-salabhasana', 'order', 2, 'durationMinutes', 3, 'intensity', 'medium', 'notes', 'Variations: arms, legs, both'),
            JSON_OBJECT('asanaId', 'asana-bhujangasana', 'order', 3, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Baby cobra only'),
            JSON_OBJECT('asanaId', 'asana-balasana', 'order', 4, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Counter pose'),
            JSON_OBJECT('asanaId', 'asana-setu-bandha', 'order', 5, 'durationMinutes', 3, 'intensity', 'medium', 'notes', 'Strengthen glutes'),
            JSON_OBJECT('asanaId', 'asana-supta-matsyendrasana', 'order', 6, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Gentle twist, knees together'),
            JSON_OBJECT('asanaId', 'asana-pawanmuktasana', 'order', 7, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'One leg at a time')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'PRANAYAMA',
        'order', 4,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-dirga', 'order', 1, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Expand ribcage fully')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SHAVASANA',
        'order', 5,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-makarasana', 'order', 1, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Face down relaxation'),
            JSON_OBJECT('asanaId', 'asana-shavasana', 'order', 2, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Bolster under knees optional')
        )
    )
),
'System', 0, 1, NOW(), NOW());

-- =====================================================
-- CORE POWER
-- Focused core strengthening sequence.
-- Duration: ~50 minutes
-- =====================================================
INSERT INTO session_plans (id, name, description, level, version, sections, created_by, usage_count, is_active, created_at, updated_at) VALUES
('plan-core-power', 'Core Power',
'Intensive sequence focusing on core strength and stability. Builds a strong foundation for all yoga practices. Not recommended for those with lower back issues. Challenging but rewarding.',
'intermediate', 1,
JSON_ARRAY(
    JSON_OBJECT(
        'sectionType', 'WARM_UP',
        'order', 1,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-cat-cow', 'order', 1, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Activate core in cat pose'),
            JSON_OBJECT('asanaId', 'asana-phalakasana', 'order', 2, 'durationMinutes', 1, 'intensity', 'medium', 'notes', 'Hold 30 seconds'),
            JSON_OBJECT('asanaId', 'asana-adho-mukha', 'order', 3, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Engage core throughout')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SURYA_NAMASKARA',
        'order', 2,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-surya-namaskara-a', 'order', 1, 'reps', 3, 'intensity', 'medium', 'notes', 'Focus on plank-chaturanga'),
            JSON_OBJECT('asanaId', 'asana-surya-namaskara-b', 'order', 2, 'reps', 2, 'intensity', 'high', 'notes', 'Strong core in chair pose')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'ASANA_SEQUENCE',
        'order', 3,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-phalakasana', 'order', 1, 'durationMinutes', 2, 'intensity', 'high', 'notes', 'Hold 1 minute, rest, repeat'),
            JSON_OBJECT('asanaId', 'asana-vasisthasana', 'order', 2, 'durationMinutes', 2, 'intensity', 'high', 'notes', 'Both sides'),
            JSON_OBJECT('asanaId', 'asana-navasana', 'order', 3, 'durationMinutes', 3, 'intensity', 'high', 'notes', '5 rounds, 5 breaths each'),
            JSON_OBJECT('asanaId', 'asana-chaturanga', 'order', 4, 'durationMinutes', 2, 'intensity', 'high', 'notes', 'Hold at bottom, 3x'),
            JSON_OBJECT('asanaId', 'asana-dolphin', 'order', 5, 'durationMinutes', 2, 'intensity', 'high', 'notes', 'Forearms strong'),
            JSON_OBJECT('asanaId', 'asana-utkatasana', 'order', 6, 'durationMinutes', 2, 'intensity', 'high', 'notes', 'Twist variation option'),
            JSON_OBJECT('asanaId', 'asana-supta-matsyendrasana', 'order', 7, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Release core tension')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'PRANAYAMA',
        'order', 4,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-kapalbhati', 'order', 1, 'durationMinutes', 4, 'reps', 3, 'intensity', 'high', 'notes', '50 strokes per round'),
            JSON_OBJECT('asanaId', 'asana-bhramari', 'order', 2, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Calm nervous system')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SHAVASANA',
        'order', 5,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-shavasana', 'order', 1, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Feel core muscles relax')
        )
    )
),
'System', 0, 1, NOW(), NOW());

-- =====================================================
-- GENTLE STRETCH
-- Very gentle sequence for recovery or tender days.
-- Duration: ~45 minutes
-- =====================================================
INSERT INTO session_plans (id, name, description, level, version, sections, created_by, usage_count, is_active, created_at, updated_at) VALUES
('plan-gentle-stretch', 'Gentle Stretch',
'Very gentle sequence for recovery days or when energy is low. Great for monsoon season or when members need extra care. Focuses on passive stretching and breath work. Suitable for all levels.',
'beginner', 1,
JSON_ARRAY(
    JSON_OBJECT(
        'sectionType', 'WARM_UP',
        'order', 1,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-neck-rotations', 'order', 1, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Very slow'),
            JSON_OBJECT('asanaId', 'asana-shoulder-rotations', 'order', 2, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Gentle circles'),
            JSON_OBJECT('asanaId', 'asana-wrist-rotations', 'order', 3, 'durationMinutes', 1, 'intensity', 'low', 'notes', 'Both directions'),
            JSON_OBJECT('asanaId', 'asana-ankle-rotations', 'order', 4, 'durationMinutes', 1, 'intensity', 'low', 'notes', 'Wake up feet')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SURYA_NAMASKARA',
        'order', 2,
        'items', JSON_ARRAY()
    ),
    JSON_OBJECT(
        'sectionType', 'ASANA_SEQUENCE',
        'order', 3,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-sukhasana', 'order', 1, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Side stretches'),
            JSON_OBJECT('asanaId', 'asana-cat-cow', 'order', 2, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Very slow'),
            JSON_OBJECT('asanaId', 'asana-balasana', 'order', 3, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Rest and breathe'),
            JSON_OBJECT('asanaId', 'asana-supta-padangusthasana', 'order', 4, 'durationMinutes', 4, 'intensity', 'low', 'notes', 'Use strap, both legs'),
            JSON_OBJECT('asanaId', 'asana-supta-baddha-konasana', 'order', 5, 'durationMinutes', 4, 'intensity', 'low', 'notes', 'Bolster support'),
            JSON_OBJECT('asanaId', 'asana-viparita-karani', 'order', 6, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Wall support')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'PRANAYAMA',
        'order', 4,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-dirga', 'order', 1, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Deep full breaths'),
            JSON_OBJECT('asanaId', 'asana-bhramari', 'order', 2, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Extended exhale')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SHAVASANA',
        'order', 5,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-yoga-nidra', 'order', 1, 'durationMinutes', 10, 'intensity', 'low', 'notes', 'Guided yoga nidra if time')
        )
    )
),
'System', 0, 1, NOW(), NOW());

-- =====================================================
-- ENERGY BOOST
-- Energizing sequence for morning or afternoon.
-- Duration: ~50 minutes
-- =====================================================
INSERT INTO session_plans (id, name, description, level, version, sections, created_by, usage_count, is_active, created_at, updated_at) VALUES
('plan-energy-boost', 'Energy Boost',
'Energizing sequence to wake up body and mind. Great for mornings or mid-afternoon slumps. Includes backbends for energy and inversions for circulation. Intermediate level due to backbend intensity.',
'intermediate', 1,
JSON_ARRAY(
    JSON_OBJECT(
        'sectionType', 'WARM_UP',
        'order', 1,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-cat-cow', 'order', 1, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Dynamic movement'),
            JSON_OBJECT('asanaId', 'asana-hip-rotations', 'order', 2, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Circles and figure 8s'),
            JSON_OBJECT('asanaId', 'asana-adho-mukha', 'order', 3, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Wake up whole body')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SURYA_NAMASKARA',
        'order', 2,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-surya-namaskara-a', 'order', 1, 'reps', 5, 'intensity', 'high', 'notes', 'Building heat and energy')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'ASANA_SEQUENCE',
        'order', 3,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-warrior1', 'order', 1, 'durationMinutes', 2, 'intensity', 'high', 'notes', 'Arms reaching high'),
            JSON_OBJECT('asanaId', 'asana-warrior3', 'order', 2, 'durationMinutes', 2, 'intensity', 'high', 'notes', 'Balance and focus'),
            JSON_OBJECT('asanaId', 'asana-ustrasana', 'order', 3, 'durationMinutes', 2, 'intensity', 'high', 'notes', 'Open heart, energize'),
            JSON_OBJECT('asanaId', 'asana-dhanurasana', 'order', 4, 'durationMinutes', 2, 'intensity', 'high', 'notes', 'Full bow, rock gently'),
            JSON_OBJECT('asanaId', 'asana-balasana', 'order', 5, 'durationMinutes', 1, 'intensity', 'low', 'notes', 'Brief rest'),
            JSON_OBJECT('asanaId', 'asana-sarvangasana', 'order', 6, 'durationMinutes', 3, 'intensity', 'medium', 'notes', 'Shoulder stand with support'),
            JSON_OBJECT('asanaId', 'asana-matsyasana', 'order', 7, 'durationMinutes', 2, 'intensity', 'medium', 'notes', 'Counter pose, open throat')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'PRANAYAMA',
        'order', 4,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-bhastrika', 'order', 1, 'durationMinutes', 3, 'reps', 3, 'intensity', 'high', 'notes', '20 breaths per round'),
            JSON_OBJECT('asanaId', 'asana-ujjayi', 'order', 2, 'durationMinutes', 3, 'intensity', 'medium', 'notes', 'Build internal heat')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SHAVASANA',
        'order', 5,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-shavasana', 'order', 1, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Integrate the energy')
        )
    )
),
'System', 0, 1, NOW(), NOW());

-- =====================================================
-- BALANCE & FOCUS
-- Sequence emphasizing balance poses and concentration.
-- Duration: ~50 minutes
-- =====================================================
INSERT INTO session_plans (id, name, description, level, version, sections, created_by, usage_count, is_active, created_at, updated_at) VALUES
('plan-balance-focus', 'Balance & Focus',
'Sequence emphasizing balance poses and mental concentration. Develops proprioception and single-pointed focus. Intermediate level - requires some balance foundation. Great for improving overall practice.',
'intermediate', 1,
JSON_ARRAY(
    JSON_OBJECT(
        'sectionType', 'WARM_UP',
        'order', 1,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-tadasana', 'order', 1, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Root down, find center'),
            JSON_OBJECT('asanaId', 'asana-ankle-rotations', 'order', 2, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Prepare feet for balance'),
            JSON_OBJECT('asanaId', 'asana-cat-cow', 'order', 3, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Core engagement')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SURYA_NAMASKARA',
        'order', 2,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-surya-namaskara-a', 'order', 1, 'reps', 3, 'intensity', 'medium', 'notes', 'Steady breath, steady gaze')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'ASANA_SEQUENCE',
        'order', 3,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-vrikshasana', 'order', 1, 'durationMinutes', 3, 'intensity', 'medium', 'notes', 'Both sides, 30 sec each'),
            JSON_OBJECT('asanaId', 'asana-warrior3', 'order', 2, 'durationMinutes', 3, 'intensity', 'high', 'notes', 'Arms in T, airplane'),
            JSON_OBJECT('asanaId', 'asana-ardha-chandrasana', 'order', 3, 'durationMinutes', 3, 'intensity', 'high', 'notes', 'Block for hand option'),
            JSON_OBJECT('asanaId', 'asana-garudasana', 'order', 4, 'durationMinutes', 3, 'intensity', 'high', 'notes', 'Both sides'),
            JSON_OBJECT('asanaId', 'asana-vasisthasana', 'order', 5, 'durationMinutes', 2, 'intensity', 'high', 'notes', 'Arm balance'),
            JSON_OBJECT('asanaId', 'asana-bakasana', 'order', 6, 'durationMinutes', 3, 'intensity', 'high', 'notes', 'Attempts encouraged'),
            JSON_OBJECT('asanaId', 'asana-sukhasana', 'order', 7, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Ground energy')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'PRANAYAMA',
        'order', 4,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-trataka', 'order', 1, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Candle gazing for focus'),
            JSON_OBJECT('asanaId', 'asana-anulom-vilom', 'order', 2, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Balance left and right')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SHAVASANA',
        'order', 5,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-shavasana', 'order', 1, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Maintain inner stillness')
        )
    )
),
'System', 0, 1, NOW(), NOW());

-- =====================================================
-- MOON SALUTATION FLOW
-- Cooling evening sequence with moon salutations.
-- Duration: ~50 minutes
-- =====================================================
INSERT INTO session_plans (id, name, description, level, version, sections, created_by, usage_count, is_active, created_at, updated_at) VALUES
('plan-moon-flow', 'Moon Salutation Flow',
'Cooling evening sequence featuring Chandra Namaskar (Moon Salutation). Balances lunar energy. Perfect for evening batches or days when heat needs to be reduced. Opens hips and calms mind.',
'beginner', 1,
JSON_ARRAY(
    JSON_OBJECT(
        'sectionType', 'WARM_UP',
        'order', 1,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-sukhasana', 'order', 1, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Center with breath'),
            JSON_OBJECT('asanaId', 'asana-cat-cow', 'order', 2, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Gentle spinal waves'),
            JSON_OBJECT('asanaId', 'asana-hip-rotations', 'order', 3, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Prepare for hip work')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SURYA_NAMASKARA',
        'order', 2,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-chandra-namaskara', 'order', 1, 'reps', 4, 'intensity', 'medium', 'notes', '2 each side, slow pace')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'ASANA_SEQUENCE',
        'order', 3,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-prasarita', 'order', 1, 'durationMinutes', 3, 'intensity', 'medium', 'notes', 'Wide leg forward fold'),
            JSON_OBJECT('asanaId', 'asana-trikonasana', 'order', 2, 'durationMinutes', 3, 'intensity', 'medium', 'notes', 'Both sides'),
            JSON_OBJECT('asanaId', 'asana-malasana', 'order', 3, 'durationMinutes', 2, 'intensity', 'low', 'notes', 'Deep squat'),
            JSON_OBJECT('asanaId', 'asana-baddha-konasana', 'order', 4, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Forward fold'),
            JSON_OBJECT('asanaId', 'asana-janu-sirsasana', 'order', 5, 'durationMinutes', 4, 'intensity', 'low', 'notes', 'Both sides'),
            JSON_OBJECT('asanaId', 'asana-supta-matsyendrasana', 'order', 6, 'durationMinutes', 4, 'intensity', 'low', 'notes', 'Long hold each side')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'PRANAYAMA',
        'order', 4,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-sheetali', 'order', 1, 'durationMinutes', 3, 'intensity', 'low', 'notes', 'Cooling breath'),
            JSON_OBJECT('asanaId', 'asana-bhramari', 'order', 2, 'durationMinutes', 5, 'intensity', 'low', 'notes', 'Calm the mind')
        )
    ),
    JSON_OBJECT(
        'sectionType', 'SHAVASANA',
        'order', 5,
        'items', JSON_ARRAY(
            JSON_OBJECT('asanaId', 'asana-shavasana', 'order', 1, 'durationMinutes', 7, 'intensity', 'low', 'notes', 'Moon visualization')
        )
    )
),
'System', 0, 1, NOW(), NOW());

-- =====================================================
-- Summary:
-- 1. Beginner Morning Flow - General beginner AM sequence
-- 2. Intermediate Power Flow - Strength-building for regular practitioners
-- 3. Evening Relaxation - Stress relief PM sequence
-- 4. Hip Opener Special - Targeted hip work for office workers
-- 5. Back Strengthening - Therapeutic back sequence
-- 6. Core Power - Intensive core work
-- 7. Gentle Stretch - Recovery/tender day sequence
-- 8. Energy Boost - Energizing backbend sequence
-- 9. Balance & Focus - Balance poses and concentration
-- 10. Moon Salutation Flow - Cooling evening moon sequence
-- TOTAL: 10 session plans
-- =====================================================
