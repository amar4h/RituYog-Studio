-- ============================================
-- Seed Data: Session Plans
-- Run AFTER seed_asanas.sql and seed_vinyasas.sql
-- Contains: ~32 session plans with sections JSON
-- ============================================

-- =============================================
-- FULL BODY PLANS
-- =============================================

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-full-body-1', 'Full Body (1)', 'Full body practice with Ashtanga B variation including Uttan Prishta and Malasana', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "ex-squat-hand-raise", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-ardha-uttanasana", "order": 3, "intensity": "medium", "notes": "Palm under toes, knee and hip movement", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-b", "order": 1, "intensity": "medium", "notes": "With Uttan Prishta and Malasana", "reps": 4, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-parsvakonasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-standing-half-split", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-ardha-hanumanasana", "order": 3, "intensity": "medium", "notes": "Backward + forward", "reps": null, "durationMinutes": null},
    {"asanaId": "a-piston-squat", "order": 4, "intensity": "high", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-parivrtta-janu", "order": 5, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-chakrasana", "order": 6, "intensity": "high", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-pavanamuktasana", "order": 7, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-full-body-2', 'Full Body (2)', 'Full body with humble warrior and shoulder stand sequence', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "ex-cat-knee-rot", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-anjaneyasana", "order": 3, "intensity": "medium", "notes": "Ek Pada Adhumukha to Parivrita dynamic", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-b", "order": 1, "intensity": "medium", "notes": "With Uttan Prishta and Skandasana", "reps": 4, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-vinamra-veer", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-prasarita-pado", "order": 2, "intensity": "medium", "notes": "With wheel towards back of legs", "reps": null, "durationMinutes": null},
    {"asanaId": "a-forearm-plank", "order": 3, "intensity": "high", "notes": "Elbow plank with knee on elbow", "reps": null, "durationMinutes": null},
    {"asanaId": "a-janu-sirshasana", "order": 4, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-parivrtta-upavistha", "order": 5, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-sarvangasana", "order": 6, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-matsyasana", "order": 7, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-full-body-3', 'Full Body (3)', 'Full body with backbends and lateral stretches', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "ex-shoulder-rot-strap", "order": 2, "intensity": "medium", "notes": "Forward/backward and left/right", "reps": null, "durationMinutes": null},
    {"asanaId": "ex-elephant-walk", "order": 3, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-b", "order": 1, "intensity": "medium", "notes": "With Ashta Chandrasana", "reps": 4, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-prasarita-pado", "order": 1, "intensity": "medium", "notes": "With block", "reps": null, "durationMinutes": null},
    {"asanaId": "a-parivrtta-trikon", "order": 2, "intensity": "medium", "notes": "Use wheel", "reps": null, "durationMinutes": null},
    {"asanaId": "a-natarajasana", "order": 3, "intensity": "high", "notes": "With strap", "reps": null, "durationMinutes": null},
    {"asanaId": "a-one-arm-high-plank", "order": 4, "intensity": "high", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-ustrasana", "order": 5, "intensity": "high", "notes": "Lateral stretch with Ustrasana legs (wheel)", "reps": null, "durationMinutes": null},
    {"asanaId": "a-chakrasana", "order": 6, "intensity": "high", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-pavanamuktasana", "order": 7, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-full-body-2026', 'Full Body (2026)', 'Full body with Ashtanga B Veerbhadra variation and balance poses', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "ex-squat-hand-raise", "order": 2, "intensity": "medium", "notes": "Sit ups with hand raised", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-b", "order": 1, "intensity": "medium", "notes": "Variation: Veerbhadra 2 + Skandasana", "reps": 4, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-ek-pada-angustha", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-urdhva-pras-eka-pad", "order": 2, "intensity": "medium", "notes": "With wheel", "reps": null, "durationMinutes": null},
    {"asanaId": "a-kakasana", "order": 3, "intensity": "high", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-mandukasana", "order": 4, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-halasana", "order": 5, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-matsyasana", "order": 6, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-pavanamuktasana", "order": 7, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-full-body-surya', 'Full Body - Surya Namaskar Focus', 'Surya Namaskar heavy practice with Sivananda and Ashtanga A', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-cat-cow", "order": 1, "intensity": "medium", "notes": null, "reps": 20, "durationMinutes": null},
    {"asanaId": "ex-dyn-paschimo", "order": 2, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null},
    {"asanaId": "ex-dyn-setu", "order": 3, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-sivananda", "order": 1, "intensity": "medium", "notes": "Modern 24 Steps", "reps": 4, "durationMinutes": null},
    {"asanaId": "sn-ashtanga-a", "order": 2, "intensity": "medium", "notes": null, "reps": 3, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": []},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-full-body-360', 'Full Body - 360', 'Advanced full body 360 vinyasa sequence', 'advanced', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-cat-cow", "order": 1, "intensity": "medium", "notes": null, "reps": 20, "durationMinutes": null},
    {"asanaId": "ex-dyn-paschimo", "order": 2, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null},
    {"asanaId": "ex-dyn-setu", "order": 3, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": []},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-vinyasa-360", "order": 1, "intensity": "high", "notes": "3 rounds, repeat both sides", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-full-body-vinyasa-hold', 'Full Body - Vinyasa Hold', 'Full body with three hold-based vinyasa sequences', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-cat-cow", "order": 1, "intensity": "medium", "notes": null, "reps": 20, "durationMinutes": null},
    {"asanaId": "ex-dyn-paschimo", "order": 2, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null},
    {"asanaId": "ex-dyn-setu", "order": 3, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 6, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-full-body-hold-1", "order": 1, "intensity": "medium", "notes": "3 rounds", "reps": null, "durationMinutes": null},
    {"asanaId": "v-full-body-hold-2", "order": 2, "intensity": "medium", "notes": "3 rounds", "reps": null, "durationMinutes": null},
    {"asanaId": "v-full-body-hold-3", "order": 3, "intensity": "medium", "notes": "3 rounds", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

-- =============================================
-- STRENGTH & BALANCE
-- =============================================

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-strength-balance-1', 'Strength & Balance (1)', 'Focus on single-leg balance and arm balances', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "ex-low-lunge-dyn", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "ex-triyak-tadasana", "order": 3, "intensity": "medium", "notes": "Sitting variation", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-b", "order": 1, "intensity": "medium", "notes": null, "reps": 4, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-ek-pada-angustha", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-urdhva-pras-eka-pad", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-kakasana", "order": 3, "intensity": "high", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-mandukasana", "order": 4, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-malasana", "order": 5, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-halasana", "order": 6, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-pavanamuktasana", "order": 7, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

-- =============================================
-- SHOULDER & UPPER BACK
-- =============================================

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-shoulder-upper-back', 'Shoulder & Upper Back', 'Focused shoulder and upper back opening with scapular strength flows', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-uttana-shishosana", "order": 2, "intensity": "medium", "notes": "Puppy Pose warm-up", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 4, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-gomukhasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-dolphin-pose", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-sphinx-pose", "order": 3, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-uttana-shishosana", "order": 4, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-eagle-arms", "order": 5, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-reverse-prayer", "order": 6, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "ex-thread-needle", "order": 7, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

-- =============================================
-- CHEST OPENING
-- =============================================

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-chest-opening', 'Chest Opening & Heart Space', 'Heart-opening practice with chest openers and supported backbends', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "kr-vaksha-shakti", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "v-heart-opening-warmup", "order": 3, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 4, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-standing-chest", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "v-restorative-heart", "order": 2, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-uttana-shishosana", "order": 3, "intensity": "low", "notes": "Heart-melting pose", "reps": null, "durationMinutes": null},
    {"asanaId": "a-sphinx-pose", "order": 4, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-purvottanasana", "order": 5, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-matsyasana", "order": 6, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-sarvangasana", "order": 7, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-supta-baddha-kon", "order": 8, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

-- =============================================
-- CORE STABILITY
-- =============================================

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-core-stability', 'Core Stability', 'Core-focused practice with controlled flows and supine work', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "v-core-warmup", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 4, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-controlled-core", "order": 1, "intensity": "high", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "v-supine-core", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-dandasana", "order": 3, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-navasana", "order": 4, "intensity": "high", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-dolphin-pose", "order": 5, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-tolangulasana", "order": 6, "intensity": "high", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-setu-bandhasana", "order": 7, "intensity": "medium", "notes": "Active bridge", "reps": null, "durationMinutes": null},
    {"asanaId": "a-pavanamuktasana", "order": 8, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

-- =============================================
-- BREATH-LED SLOW VINYASA
-- =============================================

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-breath-led-1', 'Breath-Led Slow Vinyasa (1)', 'Slow breath-guided flows for nervous system regulation', 'beginner', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "kr-griva-shakti", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": []},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-grounding-breath", "order": 1, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "v-wave-like-breath", "order": 2, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "v-low-energy-restorative", "order": 3, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "v-long-exhale-reset", "order": 4, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "v-minimal-pose-breath", "order": 5, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-breath-led-2', 'Breath-Led Slow Vinyasa (2)', 'Pause-based and evening wind-down flows', 'beginner', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "kr-griva-shakti", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": []},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-long-exhale", "order": 1, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "v-pause-based", "order": 2, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "v-nervous-system-reset", "order": 3, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "v-seated-breath-led", "order": 4, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "v-evening-wind-down", "order": 5, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

-- =============================================
-- HIP PLANS
-- =============================================

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-hip-flexibility-1', 'Hip Flexibility (1)', 'Hip opening with twisting spinal detox vinyasa', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-butterfly", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "ex-low-lunge-dyn", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-b", "order": 1, "intensity": "medium", "notes": "With Uttan Prishta and Malasana", "reps": 4, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-twisting-spinal-detox", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-anjaneyasana", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-utthan-pristhasana", "order": 3, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-upavistha-konasana", "order": 4, "intensity": "medium", "notes": "Side variation", "reps": null, "durationMinutes": null},
    {"asanaId": "a-parivrtta-janu", "order": 5, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-hip-flexibility-2', 'Hip Flexibility (2)', 'Hip opening variation 2 with twisting flow', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-butterfly", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "ex-low-lunge-dyn", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-b", "order": 1, "intensity": "medium", "notes": "With Uttan Prishta and Malasana", "reps": 4, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-twisting-spinal-detox", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-anjaneyasana", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-utthan-pristhasana", "order": 3, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-upavistha-konasana", "order": 4, "intensity": "medium", "notes": "Side variation", "reps": null, "durationMinutes": null},
    {"asanaId": "a-parivrtta-janu", "order": 5, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-hip-mobility', 'Hip Mobility', 'Hip mobility with warrior flow vinyasa', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-butterfly", "order": 1, "intensity": "medium", "notes": null, "reps": 20, "durationMinutes": null},
    {"asanaId": "ex-low-lunge-dyn", "order": 2, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null},
    {"asanaId": "ex-lying-pigeon-prep", "order": 3, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 6, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-hip-mobility-warrior", "order": 1, "intensity": "medium", "notes": "3 rounds", "reps": null, "durationMinutes": null},
    {"asanaId": "a-anjaneyasana", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-utthan-pristhasana", "order": 3, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-upavistha-konasana", "order": 4, "intensity": "medium", "notes": "Side variation", "reps": null, "durationMinutes": null},
    {"asanaId": "a-setu-bandhasana", "order": 5, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-hip-opening', 'Hip Opening', 'Deep hip opening with pigeon and puppy pose', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-butterfly", "order": 1, "intensity": "medium", "notes": null, "reps": 20, "durationMinutes": null},
    {"asanaId": "ex-butterfly", "order": 2, "intensity": "medium", "notes": "Variation with hand raise up and forward", "reps": 5, "durationMinutes": null},
    {"asanaId": "a-malasana", "order": 3, "intensity": "medium", "notes": "Alternate hand raise", "reps": 5, "durationMinutes": null},
    {"asanaId": "ex-frog-pose-rot", "order": 4, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-b", "order": 1, "intensity": "medium", "notes": null, "reps": 4, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-anjaneyasana", "order": 1, "intensity": "medium", "notes": null, "reps": 2, "durationMinutes": null},
    {"asanaId": "a-utthan-pristhasana", "order": 2, "intensity": "medium", "notes": null, "reps": 2, "durationMinutes": null},
    {"asanaId": "a-eka-pada-rajakapo", "order": 3, "intensity": "medium", "notes": null, "reps": 2, "durationMinutes": null},
    {"asanaId": "a-uttana-shishosana", "order": 4, "intensity": "low", "notes": null, "reps": 2, "durationMinutes": null},
    {"asanaId": "a-matsyasana", "order": 5, "intensity": "medium", "notes": "Wheel under spine", "reps": null, "durationMinutes": null},
    {"asanaId": "a-pavanamuktasana", "order": 6, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-kapalabhati", "order": 1, "intensity": "medium", "notes": "30-40 pumps", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-hips-lower-body', 'Hips & Lower Body', 'Lower body focus with prone backbends', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-butterfly", "order": 1, "intensity": "medium", "notes": null, "reps": 20, "durationMinutes": null},
    {"asanaId": "a-anjaneyasana", "order": 2, "intensity": "medium", "notes": "Stretch", "reps": 5, "durationMinutes": null},
    {"asanaId": "ex-frog-pose-rot", "order": 3, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 6, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-triyak-bhujangasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-shalabhasana", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-dhanurasana", "order": 3, "intensity": "high", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-matsyasana", "order": 4, "intensity": "medium", "notes": "Wheel under spine", "reps": null, "durationMinutes": null},
    {"asanaId": "a-pavanamuktasana", "order": 5, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-kapalabhati", "order": 1, "intensity": "medium", "notes": "30-40 pumps", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

-- =============================================
-- SPINE & BACK
-- =============================================

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-spinal-strength-1', 'Spinal Strength (1)', 'Spinal strength with twisting detox flow and supported poses', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-cat-cow", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null},
    {"asanaId": "ex-wrist-shoulder-rot", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 4, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-twisting-spinal-detox", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-balasana", "order": 2, "intensity": "low", "notes": "Side stretch variation", "reps": null, "durationMinutes": null},
    {"asanaId": "ex-thread-needle", "order": 3, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-janu-sirshasana", "order": 4, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-matsyasana", "order": 5, "intensity": "medium", "notes": "Supported", "reps": null, "durationMinutes": null},
    {"asanaId": "a-supta-matsyendrasana", "order": 6, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-spinal-strength-2', 'Spinal Strength (2)', 'Spinal strength with forward bends and shoulder stand', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-cat-cow", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null},
    {"asanaId": "ex-wrist-shoulder-rot", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 4, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-twisting-spinal-detox", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-uttana-shishosana", "order": 2, "intensity": "low", "notes": "Heart-melting pose", "reps": null, "durationMinutes": null},
    {"asanaId": "a-paschimottanasana", "order": 3, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-setu-bandhasana", "order": 4, "intensity": "medium", "notes": "Supported", "reps": null, "durationMinutes": null},
    {"asanaId": "a-sarvangasana", "order": 5, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-pavanamuktasana", "order": 6, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-spine-back-1', 'Spine & Back (1)', 'Spine strengthening with locust-warrior vinyasa', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null},
    {"asanaId": "ex-low-lunge-dyn", "order": 2, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null},
    {"asanaId": "a-bhujangasana", "order": 3, "intensity": "medium", "notes": "Cobra to Mountain dynamic", "reps": 5, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 6, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-spine-strengthening", "order": 1, "intensity": "medium", "notes": "6 rounds", "reps": null, "durationMinutes": null},
    {"asanaId": "a-setu-bandhasana", "order": 2, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-sarvangasana", "order": 3, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-matsyasana", "order": 4, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-jathara-parivartan", "order": 5, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-spine-back-2', 'Spine & Back (2)', 'Spine and back with warrior flow and hip openers', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "a-supta-matsyendrasana", "order": 1, "intensity": "medium", "notes": "Seated twists", "reps": 5, "durationMinutes": null},
    {"asanaId": "ex-cat-cow", "order": 2, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null},
    {"asanaId": "ex-wrist-shoulder-rot", "order": 3, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 6, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-warrior-1-2", "order": 1, "intensity": "medium", "notes": "3 rounds", "reps": null, "durationMinutes": null},
    {"asanaId": "a-malasana", "order": 2, "intensity": "medium", "notes": "Keep spine long, knees wide", "reps": null, "durationMinutes": null},
    {"asanaId": "a-baddha-konasana", "order": 3, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-eka-pada-rajakapo", "order": 4, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-setu-bandhasana", "order": 5, "intensity": "medium", "notes": "Wheel under sacrum", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-bhramari", "order": 1, "intensity": "medium", "notes": null, "reps": 7, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

-- =============================================
-- BACKBEND / CHEST / SHOULDER
-- =============================================

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-backbend-progression', 'Backbend Progression', 'Progressive backbend practice from sphinx to full wheel', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-cat-cow", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null},
    {"asanaId": "ex-dyn-setu", "order": 2, "intensity": "medium", "notes": "1 leg variation", "reps": 5, "durationMinutes": null},
    {"asanaId": "ex-dyn-sphinx", "order": 3, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 6, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-sphinx-pose", "order": 1, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-dhanurasana", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-ustrasana", "order": 3, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-chakrasana", "order": 4, "intensity": "high", "notes": "Wheel under mid-back", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-bhramari", "order": 1, "intensity": "medium", "notes": null, "reps": 7, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-shoulder-core', 'Shoulder & Core Stability', 'Combined shoulder and core work with plank flows', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null},
    {"asanaId": "ex-thread-needle", "order": 2, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 6, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-plank-chaturanga", "order": 1, "intensity": "high", "notes": "3 rounds", "reps": null, "durationMinutes": null},
    {"asanaId": "a-purvottanasana", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-navasana", "order": 3, "intensity": "high", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-utkatasana", "order": 4, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-chakrasana", "order": 5, "intensity": "high", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-bhramari", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-shoulder-chest-opening', 'Shoulder & Chest Opening', 'Shoulder and chest opening with plank-dolphin flow', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null},
    {"asanaId": "a-uttana-shishosana", "order": 2, "intensity": "medium", "notes": "Puppy stretch 30 sec", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 6, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-plank-dolphin", "order": 1, "intensity": "medium", "notes": "3 rounds", "reps": null, "durationMinutes": null},
    {"asanaId": "a-ustrasana", "order": 2, "intensity": "medium", "notes": "Thighs grounded, chest lifted", "reps": null, "durationMinutes": null},
    {"asanaId": "a-gomukhasana", "order": 3, "intensity": "medium", "notes": "Shoulder stretch, sit tall", "reps": null, "durationMinutes": null},
    {"asanaId": "a-purvottanasana", "order": 4, "intensity": "medium", "notes": "Lift chest, engage core", "reps": null, "durationMinutes": null},
    {"asanaId": "a-matsyasana", "order": 5, "intensity": "medium", "notes": "Wheel under spine", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-shoulders-chest', 'Shoulders & Chest', 'Shoulder stability and chest opening with Nadi Shodhana', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": "Arm circles", "reps": 10, "durationMinutes": null},
    {"asanaId": "kr-griva-shakti", "order": 2, "intensity": "medium", "notes": "Neck rotations 2 min", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 6, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-shoulder-stability", "order": 1, "intensity": "medium", "notes": "3 rounds", "reps": null, "durationMinutes": null},
    {"asanaId": "a-ustrasana", "order": 2, "intensity": "medium", "notes": "Lift chest, thighs grounded", "reps": null, "durationMinutes": null},
    {"asanaId": "a-gomukhasana", "order": 3, "intensity": "medium", "notes": "Shoulder stretch, sit tall", "reps": null, "durationMinutes": null},
    {"asanaId": "a-purvottanasana", "order": 4, "intensity": "medium", "notes": "Engage core, lift chest", "reps": null, "durationMinutes": null},
    {"asanaId": "a-matsyasana", "order": 5, "intensity": "medium", "notes": "Wheel under spine", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-nadi-shodhana", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

-- =============================================
-- FLEXIBILITY & RELAXATION / LATERAL
-- =============================================

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-flexibility-relaxation', 'Flexibility & Relaxation', 'Gentle flexibility practice with Sheetali pranayama for cooling', 'beginner', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-wrist-shoulder-rot", "order": 1, "intensity": "medium", "notes": null, "reps": 10, "durationMinutes": null},
    {"asanaId": "kr-griva-shakti", "order": 2, "intensity": "medium", "notes": "Neck rolls", "reps": 5, "durationMinutes": null},
    {"asanaId": "ex-triyak-tadasana", "order": 3, "intensity": "medium", "notes": "Seated side bends", "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 6, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "v-flexibility", "order": 1, "intensity": "low", "notes": "3 rounds", "reps": null, "durationMinutes": null},
    {"asanaId": "a-paschimottanasana", "order": 2, "intensity": "low", "notes": "Lengthen spine, hinge from hips", "reps": null, "durationMinutes": null},
    {"asanaId": "a-supta-baddha-kon", "order": 3, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-viparita-karani", "order": 4, "intensity": "low", "notes": "Legs vertical, sacrum neutral", "reps": null, "durationMinutes": null},
    {"asanaId": "a-matsyasana", "order": 5, "intensity": "low", "notes": "Supported, spine on wheel", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-sheetali", "order": 1, "intensity": "medium", "notes": null, "reps": 7, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-lateral-bending', 'Lateral Bending', 'Side body opening and lateral flexibility', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-low-lunge-dyn", "order": 1, "intensity": "medium", "notes": "Knee bend with one leg stretch laterally", "reps": 10, "durationMinutes": null},
    {"asanaId": "ex-triyak-tadasana", "order": 2, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null},
    {"asanaId": "ex-triyak-tadasana", "order": 3, "intensity": "medium", "notes": "Seated side bends", "reps": 10, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": [
    {"asanaId": "sn-ashtanga-a", "order": 1, "intensity": "medium", "notes": null, "reps": 6, "durationMinutes": null}
  ]},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-parsvakonasana", "order": 1, "intensity": "medium", "notes": "With wheel front rolling", "reps": null, "durationMinutes": null},
    {"asanaId": "a-ardha-chandrasana", "order": 2, "intensity": "medium", "notes": "With wheel or block", "reps": null, "durationMinutes": null},
    {"asanaId": "a-parighasana", "order": 3, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-ardha-mandala", "order": 4, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-parivrtta-janu", "order": 5, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-halasana", "order": 6, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-bhramari", "order": 1, "intensity": "medium", "notes": null, "reps": 7, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

-- =============================================
-- YOGA PROTOCOL
-- =============================================

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-yoga-protocol', 'Yoga Protocol', 'Traditional yoga protocol with Sthula Vyayama and comprehensive asana set', 'beginner', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "kr-griva-shakti", "order": 1, "intensity": "medium", "notes": "I, II, III, IV", "reps": null, "durationMinutes": null},
    {"asanaId": "ex-wrist-shoulder-rot", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "kr-kati-shakti", "order": 3, "intensity": "medium", "notes": "I, II, III, IV, V", "reps": null, "durationMinutes": null},
    {"asanaId": "kr-pindali-vikasak", "order": 4, "intensity": "medium", "notes": "Knee movement Jangha Shakti Vikasaka", "reps": null, "durationMinutes": null},
    {"asanaId": "ex-sarvanga-pushti", "order": 5, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "ex-hrid-gati", "order": 6, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": []},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-tadasana", "order": 1, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-vrikshasana", "order": 2, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-ardha-chakrasana", "order": 3, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-padahastasana", "order": 4, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-kati-chakrasana", "order": 5, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-trikonasana", "order": 6, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-dandasana", "order": 7, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-vajrasana", "order": 8, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-bhadrasana", "order": 9, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-mandukasana", "order": 10, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-ustrasana", "order": 11, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-shashankasana", "order": 12, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-uttana-mandukasana", "order": 13, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-paschimottanasana", "order": 14, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-purvottanasana", "order": 15, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-vakrasana", "order": 16, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-gomukhasana", "order": 17, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-bhujangasana", "order": 18, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-shalabhasana", "order": 19, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-makarasana", "order": 20, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-pavanamuktasana", "order": 21, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-uttanapadasana", "order": 22, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-halasana", "order": 23, "intensity": "medium", "notes": "Ardha Halasana variation", "reps": null, "durationMinutes": null},
    {"asanaId": "a-setu-bandhasana", "order": 24, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-viparita-karani", "order": 25, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-matsyasana", "order": 26, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-sectional-breathing", "order": 1, "intensity": "medium", "notes": "Abdominal, thoracic and clavicular", "reps": null, "durationMinutes": null},
    {"asanaId": "pr-yogic-deep-breathing", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": "With sectional breathing", "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

-- =============================================
-- MEDITATION PLANS
-- =============================================

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-meditation-wed-1', 'Meditation Wednesday (1)', 'Gentle asana flow followed by So Hum meditation', 'beginner', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-cat-cow", "order": 1, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null},
    {"asanaId": "a-tadasana", "order": 2, "intensity": "medium", "notes": "Seated Tadasana and Triyak Tadasana", "reps": 5, "durationMinutes": null},
    {"asanaId": "a-urdhva-mukha-svan", "order": 3, "intensity": "medium", "notes": "Child Pose to Upward Dog dynamic", "reps": 5, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": []},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-hasta-uttanasana", "order": 1, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-tadasana", "order": 2, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-ardha-chakrasana", "order": 3, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-ustrasana", "order": 4, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-ardha-matsyendrasana", "order": 5, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-anjaneyasana", "order": 6, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-bhujangasana", "order": 7, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-setu-bandhasana", "order": 8, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-supta-baddha-kon", "order": 9, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-matsyasana", "order": 10, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": "So Hum Practice", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-meditation-wed-2', 'Meditation Wednesday (2)', 'Shorter asana set with Box Breathing and Yoga Nidra', 'beginner', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "ex-cat-cow", "order": 1, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null},
    {"asanaId": "a-tadasana", "order": 2, "intensity": "medium", "notes": "Seated Tadasana and Triyak Tadasana", "reps": 5, "durationMinutes": null},
    {"asanaId": "a-urdhva-mukha-svan", "order": 3, "intensity": "medium", "notes": "Child Pose to Upward Dog dynamic", "reps": 5, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": []},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-tadasana", "order": 1, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-ardha-chakrasana", "order": 2, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-anjaneyasana", "order": 3, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-pincha-mayurasana", "order": 4, "intensity": "high", "notes": "With wheel support", "reps": null, "durationMinutes": null},
    {"asanaId": "a-setu-bandhasana", "order": 5, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-supta-baddha-kon", "order": 6, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-matsyasana", "order": 7, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-bhastrika", "order": 1, "intensity": "medium", "notes": "Box Breathing or Pranva Jap and Bhastrika", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-yoga-nidra", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 10}
  ]}
]', 0, TRUE);

INSERT IGNORE INTO session_plans (id, name, description, level, version, sections, usage_count, is_active) VALUES
('sp-meditation-wed-3', 'Meditation Wednesday (3)', 'Balance-focused with Pranava Jap meditation', 'intermediate', 1, '[
  {"sectionType": "WARM_UP", "order": 1, "items": [
    {"asanaId": "kr-griva-shakti", "order": 1, "intensity": "medium", "notes": "Kriya 1-3", "reps": 5, "durationMinutes": null},
    {"asanaId": "ex-wrist-shoulder-rot", "order": 2, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null},
    {"asanaId": "ex-cat-cow", "order": 3, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null},
    {"asanaId": "kr-pindali-vikasak", "order": 4, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null},
    {"asanaId": "ex-sarvanga-pushti", "order": 5, "intensity": "medium", "notes": null, "reps": 5, "durationMinutes": null},
    {"asanaId": "a-adho-mukha-svan", "order": 6, "intensity": "medium", "notes": "Downward Dog to Upward Dog dynamic", "reps": 5, "durationMinutes": null}
  ]},
  {"sectionType": "SURYA_NAMASKARA", "order": 2, "items": []},
  {"sectionType": "ASANA_SEQUENCE", "order": 3, "items": [
    {"asanaId": "a-tadasana", "order": 1, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-vrikshasana", "order": 2, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-garudasana", "order": 3, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-ek-pada-angustha", "order": 4, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-natarajasana", "order": 5, "intensity": "high", "notes": null, "reps": null, "durationMinutes": null},
    {"asanaId": "a-jathara-parivartan", "order": 6, "intensity": "low", "notes": null, "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "PRANAYAMA", "order": 4, "items": [
    {"asanaId": "pr-anulom-vilom", "order": 1, "intensity": "medium", "notes": "Pranava Jap Meditation", "reps": null, "durationMinutes": null}
  ]},
  {"sectionType": "SHAVASANA", "order": 5, "items": [
    {"asanaId": "rl-shavasana", "order": 1, "intensity": "medium", "notes": null, "reps": null, "durationMinutes": 5}
  ]}
]', 0, TRUE);

-- =============================================
-- STEP 2: REMAP — Update FKs in allocations & executions
-- Now that new session plans exist (from INSERTs above), we can
-- match old plans to new plans by name and update FK references.
-- =============================================

-- Remap session_plan_allocations to new plan IDs
UPDATE session_plan_allocations spa
  JOIN session_plans old_sp ON spa.session_plan_id = old_sp.id AND old_sp.id NOT LIKE 'sp-%'
  JOIN session_plans new_sp ON new_sp.id LIKE 'sp-%' AND new_sp.name = old_sp.name
  SET spa.session_plan_id = new_sp.id;

-- Remap session_executions to new plan IDs
UPDATE session_executions se
  JOIN session_plans old_sp ON se.session_plan_id = old_sp.id AND old_sp.id NOT LIKE 'sp-%'
  JOIN session_plans new_sp ON new_sp.id LIKE 'sp-%' AND new_sp.name = old_sp.name
  SET se.session_plan_id = new_sp.id;

-- NOTE: No session plans, allocations, or executions are deleted.
-- The REMAP above updated all FK references to new sp- IDs where names matched.
