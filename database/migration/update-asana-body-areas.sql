-- ============================================================
-- Update Asana Body Areas - Add new focus areas to existing data
-- Safe: All UPDATEs are idempotent (no duplicates)
-- Match by name (IDs may differ across environments)
-- Run in phpMyAdmin on both RFS and Production
-- ============================================================

-- ============================================================
-- PRIMARY BODY AREA ADDITIONS (2 changes)
-- ============================================================

-- Vaksha Shakti Vikasaka Kriya: chest is its core purpose
UPDATE asanas SET primary_body_areas = JSON_ARRAY_APPEND(primary_body_areas, '$', 'chest')
WHERE name = 'Vaksha Shakti Vikasaka Kriya' AND NOT JSON_CONTAINS(primary_body_areas, '"chest"');

-- Utkatasana (Chair Pose): primarily strengthens quadriceps
UPDATE asanas SET primary_body_areas = JSON_ARRAY_APPEND(primary_body_areas, '$', 'quadriceps')
WHERE name = 'Utkatasana' AND NOT JSON_CONTAINS(primary_body_areas, '"quadriceps"');


-- ============================================================
-- CHEST (secondary) — 18 asanas
-- ============================================================

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Shoulder Rotation with Strap' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Dynamic Sphinx' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Vinamra Veerbhadrasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Ardha Chakrasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Parivritta Janu Sirshasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Gomukhasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Reverse Prayer Arms' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Bhujangasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Sphinx Pose' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Dhanurasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Ustrasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Chakrasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Anahatasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Setu Bandhasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Matsyasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Purvottanasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Urdhva Mukha Svanasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'chest')
WHERE name = 'Hasta Uttanasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"chest"');


-- ============================================================
-- GROIN (secondary) — 15 asanas
-- ============================================================

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Butterfly' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Frog Pose Rotations' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Trikonasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Parsvakonasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Prasarita Padottanasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Extended Side Angle' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Upavistha Konasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Baddha Konasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Malasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Bhadrasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Supta Baddha Konasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Anjaneyasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Utthan Pristhasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Mandukasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'groin')
WHERE name = 'Skandasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"groin"');


-- ============================================================
-- QUADRICEPS (secondary) — 10 asanas
-- ============================================================

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'quadriceps')
WHERE name = 'Low Lunge Dynamic' AND NOT JSON_CONTAINS(secondary_body_areas, '"quadriceps"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'quadriceps')
WHERE name = 'Squat with Hand Raise' AND NOT JSON_CONTAINS(secondary_body_areas, '"quadriceps"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'quadriceps')
WHERE name = 'Virabhadrasana I' AND NOT JSON_CONTAINS(secondary_body_areas, '"quadriceps"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'quadriceps')
WHERE name = 'Virabhadrasana II' AND NOT JSON_CONTAINS(secondary_body_areas, '"quadriceps"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'quadriceps')
WHERE name = 'Vajrasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"quadriceps"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'quadriceps')
WHERE name = 'Dhanurasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"quadriceps"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'quadriceps')
WHERE name = 'Ustrasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"quadriceps"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'quadriceps')
WHERE name = 'Supta Virasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"quadriceps"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'quadriceps')
WHERE name = 'Ashta Chandrasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"quadriceps"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'quadriceps')
WHERE name = 'Anjaneyasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"quadriceps"');


-- ============================================================
-- LOWER_BACK (secondary) — 10 asanas
-- ============================================================

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'lower_back')
WHERE name = 'Dynamic Setu Bandhasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"lower_back"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'lower_back')
WHERE name = 'Dynamic Sphinx' AND NOT JSON_CONTAINS(secondary_body_areas, '"lower_back"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'lower_back')
WHERE name = 'Kati Shakti Vikasaka Kriya' AND NOT JSON_CONTAINS(secondary_body_areas, '"lower_back"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'lower_back')
WHERE name = 'Bhujangasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"lower_back"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'lower_back')
WHERE name = 'Sphinx Pose' AND NOT JSON_CONTAINS(secondary_body_areas, '"lower_back"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'lower_back')
WHERE name = 'Shalabhasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"lower_back"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'lower_back')
WHERE name = 'Pavanamuktasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"lower_back"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'lower_back')
WHERE name = 'Supta Matsyendrasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"lower_back"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'lower_back')
WHERE name = 'Jathara Parivartanasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"lower_back"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'lower_back')
WHERE name = 'Apanasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"lower_back"');


-- ============================================================
-- WRISTS (secondary) — 10 asanas
-- ============================================================

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'wrists')
WHERE name = 'Wrist and Shoulder Rotation' AND NOT JSON_CONTAINS(secondary_body_areas, '"wrists"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'wrists')
WHERE name = 'On Cat Pose Knee Rotations' AND NOT JSON_CONTAINS(secondary_body_areas, '"wrists"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'wrists')
WHERE name = 'Reverse Prayer Arms' AND NOT JSON_CONTAINS(secondary_body_areas, '"wrists"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'wrists')
WHERE name = 'Tolangulasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"wrists"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'wrists')
WHERE name = 'Kakasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"wrists"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'wrists')
WHERE name = 'One Arm High Plank' AND NOT JSON_CONTAINS(secondary_body_areas, '"wrists"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'wrists')
WHERE name = 'Phalakasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"wrists"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'wrists')
WHERE name = 'Vasisthasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"wrists"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'wrists')
WHERE name = 'Chaturanga Dandasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"wrists"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'wrists')
WHERE name = 'Adho Mukha Svanasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"wrists"');


-- ============================================================
-- ARMS (secondary) — 7 asanas
-- ============================================================

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'arms')
WHERE name = 'Tolangulasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"arms"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'arms')
WHERE name = 'Kakasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"arms"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'arms')
WHERE name = 'One Arm High Plank' AND NOT JSON_CONTAINS(secondary_body_areas, '"arms"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'arms')
WHERE name = 'Phalakasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"arms"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'arms')
WHERE name = 'Vasisthasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"arms"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'arms')
WHERE name = 'Chaturanga Dandasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"arms"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'arms')
WHERE name = 'Chakrasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"arms"');


-- ============================================================
-- GLUTES (secondary) — 5 asanas
-- ============================================================

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'glutes')
WHERE name = 'Dynamic Setu Bandhasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"glutes"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'glutes')
WHERE name = 'Lying Pigeon Prep' AND NOT JSON_CONTAINS(secondary_body_areas, '"glutes"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'glutes')
WHERE name = 'Shalabhasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"glutes"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'glutes')
WHERE name = 'Setu Bandhasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"glutes"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'glutes')
WHERE name = 'Eka Pada Rajakapotasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"glutes"');


-- ============================================================
-- UPPER_BACK (secondary) — 4 asanas
-- ============================================================

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'upper_back')
WHERE name = 'Thread the Needle' AND NOT JSON_CONTAINS(secondary_body_areas, '"upper_back"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'upper_back')
WHERE name = 'Garudasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"upper_back"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'upper_back')
WHERE name = 'Eagle Arms' AND NOT JSON_CONTAINS(secondary_body_areas, '"upper_back"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'upper_back')
WHERE name = 'Uttana Shishosana' AND NOT JSON_CONTAINS(secondary_body_areas, '"upper_back"');


-- ============================================================
-- FEET (secondary) — 3 asanas
-- ============================================================

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'feet')
WHERE name = 'Tadasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"feet"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'feet')
WHERE name = 'Vrikshasana' AND NOT JSON_CONTAINS(secondary_body_areas, '"feet"');

UPDATE asanas SET secondary_body_areas = JSON_ARRAY_APPEND(secondary_body_areas, '$', 'feet')
WHERE name = 'Samsthiti' AND NOT JSON_CONTAINS(secondary_body_areas, '"feet"');


-- ============================================================
-- VERIFICATION: Check counts after running
-- ============================================================
SELECT 'chest' AS area, COUNT(*) AS asanas FROM asanas WHERE JSON_CONTAINS(primary_body_areas, '"chest"') OR JSON_CONTAINS(secondary_body_areas, '"chest"')
UNION ALL
SELECT 'groin', COUNT(*) FROM asanas WHERE JSON_CONTAINS(primary_body_areas, '"groin"') OR JSON_CONTAINS(secondary_body_areas, '"groin"')
UNION ALL
SELECT 'quadriceps', COUNT(*) FROM asanas WHERE JSON_CONTAINS(primary_body_areas, '"quadriceps"') OR JSON_CONTAINS(secondary_body_areas, '"quadriceps"')
UNION ALL
SELECT 'lower_back', COUNT(*) FROM asanas WHERE JSON_CONTAINS(primary_body_areas, '"lower_back"') OR JSON_CONTAINS(secondary_body_areas, '"lower_back"')
UNION ALL
SELECT 'wrists', COUNT(*) FROM asanas WHERE JSON_CONTAINS(primary_body_areas, '"wrists"') OR JSON_CONTAINS(secondary_body_areas, '"wrists"')
UNION ALL
SELECT 'arms', COUNT(*) FROM asanas WHERE JSON_CONTAINS(primary_body_areas, '"arms"') OR JSON_CONTAINS(secondary_body_areas, '"arms"')
UNION ALL
SELECT 'glutes', COUNT(*) FROM asanas WHERE JSON_CONTAINS(primary_body_areas, '"glutes"') OR JSON_CONTAINS(secondary_body_areas, '"glutes"')
UNION ALL
SELECT 'upper_back', COUNT(*) FROM asanas WHERE JSON_CONTAINS(primary_body_areas, '"upper_back"') OR JSON_CONTAINS(secondary_body_areas, '"upper_back"')
UNION ALL
SELECT 'feet', COUNT(*) FROM asanas WHERE JSON_CONTAINS(primary_body_areas, '"feet"') OR JSON_CONTAINS(secondary_body_areas, '"feet"');
