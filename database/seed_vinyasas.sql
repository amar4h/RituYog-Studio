-- ============================================
-- Seed Data: Surya Namaskars & Vinyasa Flows
-- Run AFTER seed_asanas.sql (references child asana IDs)
-- Contains: 3 surya namaskars + 28 vinyasa flows
-- ============================================

-- =============================================
-- SURYA NAMASKARS
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('sn-ashtanga-a', 'Surya Namaskar - Ashtanga A', NULL, 'surya_namaskar', '["spine","shoulders"]', '["hamstrings","core"]', '["Full body warm-up","Builds heat","Synchronizes breath with movement"]', 'intermediate', '["Wrist injury","Severe back pain"]', NULL, TRUE, '[{"asanaId":"a-samsthiti","order":1},{"asanaId":"a-urdhva-hastasana","order":2},{"asanaId":"a-uttanasana","order":3},{"asanaId":"a-ardha-uttanasana","order":4},{"asanaId":"a-chaturanga","order":5},{"asanaId":"a-urdhva-mukha-svan","order":6},{"asanaId":"a-adho-mukha-svan","order":7},{"asanaId":"a-ardha-uttanasana","order":8},{"asanaId":"a-uttanasana","order":9},{"asanaId":"a-urdhva-hastasana","order":10},{"asanaId":"a-samsthiti","order":11}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('sn-ashtanga-b', 'Surya Namaskar - Ashtanga B', NULL, 'surya_namaskar', '["spine","hips"]', '["shoulders","knees"]', '["Full body conditioning","Builds strength and flexibility","Engages legs deeply"]', 'intermediate', '["Knee injury","Wrist injury"]', NULL, TRUE, '[{"asanaId":"a-samsthiti","order":1},{"asanaId":"a-utkatasana","order":2},{"asanaId":"a-uttanasana","order":3},{"asanaId":"a-ardha-uttanasana","order":4},{"asanaId":"a-chaturanga","order":5},{"asanaId":"a-urdhva-mukha-svan","order":6},{"asanaId":"a-adho-mukha-svan","order":7},{"asanaId":"a-virabhadrasana-1","order":8},{"asanaId":"a-chaturanga","order":9},{"asanaId":"a-urdhva-mukha-svan","order":10},{"asanaId":"a-adho-mukha-svan","order":11},{"asanaId":"a-virabhadrasana-1","order":12},{"asanaId":"a-chaturanga","order":13},{"asanaId":"a-urdhva-mukha-svan","order":14},{"asanaId":"a-adho-mukha-svan","order":15},{"asanaId":"a-ardha-uttanasana","order":16},{"asanaId":"a-uttanasana","order":17},{"asanaId":"a-utkatasana","order":18},{"asanaId":"a-samsthiti","order":19}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('sn-sivananda', 'Surya Namaskar - Sivananda', 'Sivananda Surya Namaskar', 'surya_namaskar', '["spine"]', '["shoulders","hamstrings"]', '["Traditional 12-step sequence","Gentle full body warm-up","Balances chakras"]', 'beginner', '["Severe back pain"]', NULL, TRUE, '[{"asanaId":"a-samsthiti","order":1},{"asanaId":"a-hasta-uttanasana","order":2},{"asanaId":"a-padahastasana","order":3},{"asanaId":"a-anjaneyasana","order":4},{"asanaId":"a-phalakasana","order":5},{"asanaId":"a-chaturanga","order":6},{"asanaId":"a-bhujangasana","order":7},{"asanaId":"a-parvatasana","order":8},{"asanaId":"a-anjaneyasana","order":9},{"asanaId":"a-padahastasana","order":10},{"asanaId":"a-hasta-uttanasana","order":11},{"asanaId":"a-samsthiti","order":12}]');

-- =============================================
-- CORE STABILITY VINYASAS
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-controlled-core', 'Controlled Core Flow', NULL, 'vinyasa', '["core"]', '["shoulders","spine"]', '["Builds core endurance","Full body integration","Strengthens upper body"]', 'intermediate', NULL, NULL, TRUE, '[{"asanaId":"a-utkatasana","order":1},{"asanaId":"a-parivrtta-utkatasana","order":2},{"asanaId":"a-uttanasana","order":3},{"asanaId":"a-phalakasana","order":4},{"asanaId":"a-vasisthasana","order":5},{"asanaId":"a-chaturanga","order":6},{"asanaId":"a-urdhva-mukha-svan","order":7},{"asanaId":"a-adho-mukha-svan","order":8}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-supine-core', 'Supine Core Practice', NULL, 'vinyasa', '["core"]', '["hips"]', '["Core strength without wrist load","Supine stability work","Safe for lower back"]', 'intermediate', NULL, NULL, TRUE, '[{"asanaId":"a-samsthiti","order":1},{"asanaId":"a-stambha-asana","order":2},{"asanaId":"a-navasana","order":3},{"asanaId":"a-apanasana","order":4}]');

-- =============================================
-- SHOULDER / CHEST VINYASAS
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-standing-chest', 'Standing Chest Opener', NULL, 'vinyasa', '["shoulders"]', '["spine","hips"]', '["Opens chest progressively","Stretches shoulders","Builds standing strength"]', 'intermediate', NULL, NULL, TRUE, '[{"asanaId":"a-samsthiti","order":1},{"asanaId":"a-reverse-prayer","order":2},{"asanaId":"a-virabhadrasana-1","order":3},{"asanaId":"a-prasarita-pado","order":4}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-restorative-heart', 'Restorative Heart Flow', NULL, 'vinyasa', '["spine"]', '["shoulders","hips"]', '["Gentle heart opening","Deeply restorative","Balances energy"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-ardha-chakrasana","order":1},{"asanaId":"a-supta-virasana","order":2},{"asanaId":"a-matsyasana","order":3},{"asanaId":"a-pavanamuktasana","order":4},{"asanaId":"rl-shavasana","order":5}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-plank-dolphin', 'Plank-Dolphin Flow', NULL, 'vinyasa', '["shoulders"]', '["core"]', '["Builds shoulder strength","Core endurance","Prepares for inversions"]', 'intermediate', NULL, NULL, TRUE, '[{"asanaId":"a-phalakasana","order":1},{"asanaId":"a-vasisthasana","order":2},{"asanaId":"a-dolphin-pose","order":3},{"asanaId":"a-urdhva-mukha-svan","order":4},{"asanaId":"a-balasana","order":5}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-shoulder-stability', 'Shoulder Stability Flow', NULL, 'vinyasa', '["shoulders"]', '["core"]', '["Builds shoulder stability","Strengthens rotator cuff","Improves upper body endurance"]', 'intermediate', NULL, NULL, TRUE, '[{"asanaId":"a-phalakasana","order":1},{"asanaId":"a-vasisthasana","order":2},{"asanaId":"a-urdhva-mukha-svan","order":3},{"asanaId":"a-dolphin-pose","order":4},{"asanaId":"a-balasana","order":5}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-plank-chaturanga', 'Plank-Chaturanga Flow', NULL, 'vinyasa', '["core"]', '["shoulders"]', '["Builds push strength","Core stability under load","Upper body conditioning"]', 'intermediate', NULL, NULL, TRUE, '[{"asanaId":"a-phalakasana","order":1},{"asanaId":"a-vasisthasana","order":2},{"asanaId":"a-chaturanga","order":3},{"asanaId":"a-urdhva-mukha-svan","order":4},{"asanaId":"a-adho-mukha-svan","order":5},{"asanaId":"a-tadasana","order":6}]');

-- =============================================
-- BREATH-LED VINYASAS (Plan 1)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-grounding-breath', 'Grounding Breath Flow', NULL, 'vinyasa', '["nervous_system"]', '["spine","hamstrings"]', '["Calms the mind","Grounds energy","Builds breath awareness"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-samsthiti","order":1},{"asanaId":"a-urdhva-hastasana","order":2},{"asanaId":"a-uttanasana","order":3},{"asanaId":"a-ardha-uttanasana","order":4},{"asanaId":"a-adho-mukha-svan","order":5},{"asanaId":"a-balasana","order":6}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-wave-like-breath', 'Wave-Like Breath Flow', NULL, 'vinyasa', '["spine"]', '["nervous_system"]', '["Gentle spinal wave","Soothes nervous system","Rhythmic movement"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-balasana","order":1},{"asanaId":"a-bhujangasana","order":2},{"asanaId":"a-adho-mukha-svan","order":3},{"asanaId":"a-balasana","order":4}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-low-energy-restorative', 'Low Energy Restorative Vinyasa', NULL, 'vinyasa', '["nervous_system"]', '["spine"]', '["Deeply restorative","Minimal effort","Activates parasympathetic system"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-apanasana","order":1},{"asanaId":"a-supta-matsyendrasana","order":2},{"asanaId":"rl-shavasana","order":3}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-long-exhale-reset', 'Long Exhale Reset Flow', NULL, 'vinyasa', '["nervous_system"]', '["hamstrings"]', '["Activates relaxation response","Releases tension","Calms the mind"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-samsthiti","order":1},{"asanaId":"a-uttanasana","order":2},{"asanaId":"a-balasana","order":3},{"asanaId":"rl-shavasana","order":4}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-minimal-pose-breath', 'Minimal Pose Breath Cycle', NULL, 'vinyasa', '["nervous_system"]', '["spine"]', '["Nervous system settling","Minimal movement","Deep breath awareness"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-balasana","order":1},{"asanaId":"a-adho-mukha-svan","order":2},{"asanaId":"a-balasana","order":3}]');

-- =============================================
-- BREATH-LED VINYASAS (Plan 2)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-long-exhale', 'Long Exhale Flow', NULL, 'vinyasa', '["nervous_system"]', '["hamstrings"]', '["Lengthens exhalation","Calms nervous system","Gentle forward fold"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-samsthiti","order":1},{"asanaId":"a-uttanasana","order":2},{"asanaId":"a-ardha-uttanasana","order":3},{"asanaId":"a-balasana","order":4}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-pause-based', 'Pause-Based Vinyasa', NULL, 'vinyasa', '["nervous_system"]', '["hips"]', '["Teaches breath pausing","Mindful transitions","Deepens awareness"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-anjaneyasana","order":1},{"asanaId":"a-adho-mukha-svan","order":2},{"asanaId":"a-balasana","order":3}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-nervous-system-reset', 'Nervous System Reset', NULL, 'vinyasa', '["nervous_system"]', '["spine"]', '["Activates parasympathetic system","Full release","Reduces anxiety"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-supta-matsyendrasana","order":1},{"asanaId":"a-apanasana","order":2},{"asanaId":"rl-shavasana","order":3}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-seated-breath-led', 'Seated Breath-Led Flow', NULL, 'vinyasa', '["spine"]', '["nervous_system"]', '["Seated mindful movement","Gentle side bends and twists","Breath-guided transitions"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-sukhasana","order":1},{"asanaId":"a-paschimottanasana","order":2},{"asanaId":"a-sukhasana","order":3}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-evening-wind-down', 'Evening Wind-Down Flow', NULL, 'vinyasa', '["nervous_system"]', '["hips","spine"]', '["Prepares for sleep","Parasympathetic activation","Deep relaxation"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-supta-baddha-kon","order":1},{"asanaId":"a-supta-matsyendrasana","order":2},{"asanaId":"a-apanasana","order":3},{"asanaId":"rl-shavasana","order":4}]');

-- =============================================
-- HIP / SPINAL VINYASAS
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-twisting-spinal-detox', 'Twisting Flow for Spinal Detox', NULL, 'vinyasa', '["spine"]', '["hips","core"]', '["Detoxifies through twisting","Mobilizes spine","Stimulates digestion"]', 'intermediate', NULL, NULL, TRUE, '[{"asanaId":"a-parivrtta-utkatasana","order":1},{"asanaId":"a-uttanasana","order":2},{"asanaId":"a-ardha-matsyendrasana","order":3}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-hip-mobility-warrior', 'Hip Mobility Warrior Flow', NULL, 'vinyasa', '["hips"]', '["spine","shoulders"]', '["Opens hips dynamically","Builds leg strength","Improves balance"]', 'intermediate', NULL, NULL, TRUE, '[{"asanaId":"a-virabhadrasana-2","order":1},{"asanaId":"a-reverse-warrior","order":2},{"asanaId":"a-extended-side-angle","order":3},{"asanaId":"a-trikonasana","order":4},{"asanaId":"a-adho-mukha-svan","order":5}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-spine-strengthening', 'Spine Strengthening Flow', NULL, 'vinyasa', '["spine"]', '["shoulders","hips"]', '["Strengthens back extensors","Builds spinal endurance","Opens chest"]', 'intermediate', NULL, NULL, TRUE, '[{"asanaId":"a-shalabhasana","order":1},{"asanaId":"a-phalakasana","order":2},{"asanaId":"a-parvatasana","order":3},{"asanaId":"a-virabhadrasana-1","order":4},{"asanaId":"a-parvatasana","order":5}]');

-- =============================================
-- FULL BODY VINYASAS
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-full-body-hold-1', 'Full Body Hold Flow 1', NULL, 'vinyasa', '["hamstrings"]', '["hips","shoulders"]', '["Builds endurance through holds","Develops patience","Full body stretch"]', 'intermediate', NULL, NULL, TRUE, '[{"asanaId":"a-parsvottanasana","order":1},{"asanaId":"a-ardha-uttanasana","order":2},{"asanaId":"a-anjaneyasana","order":3},{"asanaId":"a-adho-mukha-svan","order":4}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-full-body-hold-2', 'Full Body Hold Flow 2', NULL, 'vinyasa', '["hips"]', '["shoulders"]', '["Hip opening through holds","Builds lower body strength","Develops stability"]', 'intermediate', NULL, NULL, TRUE, '[{"asanaId":"a-parsvakonasana","order":1},{"asanaId":"a-vinamra-veer","order":2},{"asanaId":"a-malasana","order":3},{"asanaId":"a-adho-mukha-svan","order":4}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-full-body-hold-3', 'Full Body Hold Flow 3', NULL, 'vinyasa', '["hips"]', '["core","shoulders"]', '["Combined holds with dynamic movement","Full body conditioning","Builds heat"]', 'intermediate', NULL, NULL, TRUE, '[{"asanaId":"a-prasarita-pado","order":1},{"asanaId":"a-anjaneyasana","order":2},{"asanaId":"a-chaturanga","order":3},{"asanaId":"a-urdhva-mukha-svan","order":4},{"asanaId":"a-adho-mukha-svan","order":5}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-vinyasa-360', 'Vinyasa 360', NULL, 'vinyasa', '["core"]', '["shoulders","hips"]', '["Full body challenge","Builds power and control","Comprehensive conditioning"]', 'advanced', NULL, NULL, TRUE, '[{"asanaId":"a-utkatasana","order":1},{"asanaId":"a-uttanasana","order":2},{"asanaId":"a-ardha-uttanasana","order":3},{"asanaId":"a-phalakasana","order":4},{"asanaId":"a-chaturanga","order":5},{"asanaId":"a-urdhva-mukha-svan","order":6},{"asanaId":"a-adho-mukha-svan","order":7},{"asanaId":"a-utthan-pristhasana","order":8},{"asanaId":"a-parsvakonasana","order":9},{"asanaId":"a-vasisthasana","order":10},{"asanaId":"a-phalakasana","order":11},{"asanaId":"a-chaturanga","order":12},{"asanaId":"a-urdhva-mukha-svan","order":13},{"asanaId":"a-adho-mukha-svan","order":14},{"asanaId":"a-ardha-uttanasana","order":15},{"asanaId":"a-uttanasana","order":16},{"asanaId":"a-utkatasana","order":17}]');

-- =============================================
-- FLEXIBILITY / RELAXATION VINYASAS
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-flexibility', 'Flexibility Flow', NULL, 'vinyasa', '["hamstrings"]', '["hips","spine"]', '["Gentle stretching sequence","Promotes flexibility","Calming"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-paschimottanasana","order":1},{"asanaId":"a-baddha-konasana","order":2},{"asanaId":"a-supta-matsyendrasana","order":3}]');

-- =============================================
-- WARM-UP VINYASAS
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-core-warmup', 'Core Warm-Up Flow', NULL, 'vinyasa', '["core"]', '["shoulders"]', '["Warms up core","Activates plank muscles","Prepares for practice"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-phalakasana","order":1},{"asanaId":"a-apanasana","order":2},{"asanaId":"a-forearm-plank","order":3},{"asanaId":"a-balasana","order":4}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-heart-opening-warmup', 'Heart Opening Warm-Up', NULL, 'vinyasa', '["shoulders"]', '["spine"]', '["Opens chest gently","Prepares shoulders","Energizes upper body"]', 'beginner', NULL, NULL, TRUE, '[{"asanaId":"a-samsthiti","order":1},{"asanaId":"a-urdhva-hastasana","order":2},{"asanaId":"a-anahatasana","order":3},{"asanaId":"a-sphinx-pose","order":4}]');

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active, child_asanas) VALUES
('v-warrior-1-2', 'Warrior I-II Flow', NULL, 'vinyasa', '["hips"]', '["shoulders","knees"]', '["Builds warrior transitions","Strengthens legs","Opens hips"]', 'intermediate', NULL, NULL, TRUE, '[{"asanaId":"a-virabhadrasana-1","order":1},{"asanaId":"a-virabhadrasana-2","order":2}]');

-- =============================================
-- STEP 2: REMAP — Replace old surya namaskar IDs in JSON columns
-- Uses hardcoded old IDs (known from production data).
-- Safe to re-run: no-op if old IDs don't exist.
-- =============================================

-- Remap old surya namaskar IDs in session_plans
UPDATE session_plans SET sections = REPLACE(sections, 'asana-surya-namaskara-a', 'sn-ashtanga-a') WHERE sections LIKE '%asana-surya-namaskara-a%';
UPDATE session_plans SET sections = REPLACE(sections, 'asana-surya-namaskara-b', 'sn-ashtanga-b') WHERE sections LIKE '%asana-surya-namaskara-b%';
UPDATE session_plans SET sections = REPLACE(sections, 'c703d746-641a-4f93-aefe-608478427762', 'sn-sivananda') WHERE sections LIKE '%c703d746-641a-4f93-aefe-608478427762%';

-- Remap old surya namaskar IDs in session_executions
UPDATE session_executions SET sections_snapshot = REPLACE(sections_snapshot, 'asana-surya-namaskara-a', 'sn-ashtanga-a') WHERE sections_snapshot LIKE '%asana-surya-namaskara-a%';
UPDATE session_executions SET sections_snapshot = REPLACE(sections_snapshot, 'asana-surya-namaskara-b', 'sn-ashtanga-b') WHERE sections_snapshot LIKE '%asana-surya-namaskara-b%';
UPDATE session_executions SET sections_snapshot = REPLACE(sections_snapshot, 'c703d746-641a-4f93-aefe-608478427762', 'sn-sivananda') WHERE sections_snapshot LIKE '%c703d746-641a-4f93-aefe-608478427762%';

-- Remap old vinyasa IDs in session_plans (if any non-slug vinyasas exist)
UPDATE session_plans sp
  JOIN asanas old_a ON old_a.type = 'vinyasa' AND old_a.id NOT LIKE 'v-%'
  JOIN asanas new_a ON new_a.type = 'vinyasa' AND new_a.id LIKE 'v-%' AND new_a.name = old_a.name
  SET sp.sections = REPLACE(sp.sections, old_a.id, new_a.id)
  WHERE sp.sections LIKE CONCAT('%', old_a.id, '%');

-- Remap old vinyasa IDs in session_executions (if any non-slug vinyasas exist)
UPDATE session_executions se
  JOIN asanas old_a ON old_a.type = 'vinyasa' AND old_a.id NOT LIKE 'v-%'
  JOIN asanas new_a ON new_a.type = 'vinyasa' AND new_a.id LIKE 'v-%' AND new_a.name = old_a.name
  SET se.sections_snapshot = REPLACE(se.sections_snapshot, old_a.id, new_a.id)
  WHERE se.sections_snapshot LIKE CONCAT('%', old_a.id, '%');

-- =============================================
-- STEP 3: SAFE CLEANUP — Delete old surya namaskars after remap
-- Safe because: asanas table has NO FK constraints (IDs only in JSON),
-- and REMAP above already updated all JSON references to new IDs.
-- Does NOT delete user-created records like Moon Salutation.
-- =============================================
DELETE FROM asanas WHERE id IN ('asana-surya-namaskara-a', 'asana-surya-namaskara-b', 'c703d746-641a-4f93-aefe-608478427762');
