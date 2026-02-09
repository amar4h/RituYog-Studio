-- Seed Data for Asanas Table
-- Run this SQL in phpMyAdmin for RFS and Production databases
-- This provides a comprehensive library of yoga poses, pranayama, kriyas, and relaxation techniques
-- Version: 2.0.0 (Updated for new data model with breathing_cue and child_asanas)

-- Clear existing data (optional - comment out if you want to preserve existing)
-- DELETE FROM asanas;

-- =====================================================
-- WARM-UP EXERCISES
-- =====================================================
INSERT INTO asanas (id, name, sanskrit_name, type, difficulty, primary_body_areas, secondary_body_areas, benefits, contraindications, breathing_cue, is_active, created_at, updated_at) VALUES
('asana-neck-rotations', 'Neck Rotations', 'Greeva Sanchalana', 'exercise', 'beginner', '["neck"]', '["shoulders"]', '["Releases neck tension", "Improves cervical flexibility", "Reduces headaches", "Prepares neck for practice"]', '["Cervical spondylosis", "Severe neck injury"]', NULL, 1, NOW(), NOW()),
('asana-shoulder-rotations', 'Shoulder Rotations', 'Skandha Chakra', 'exercise', 'beginner', '["shoulders"]', '["neck", "spine"]', '["Releases shoulder tension", "Improves shoulder mobility", "Warms joints", "Reduces upper back stiffness"]', '["Shoulder injury", "Frozen shoulder"]', NULL, 1, NOW(), NOW()),
('asana-wrist-rotations', 'Wrist Rotations', 'Manibandha Chakra', 'exercise', 'beginner', '["shoulders"]', '[]', '["Warms wrist joints", "Prevents carpal tunnel", "Improves circulation", "Prepares wrists for weight bearing"]', '["Wrist injury", "Carpal tunnel syndrome"]', NULL, 1, NOW(), NOW()),
('asana-ankle-rotations', 'Ankle Rotations', 'Goolf Chakra', 'exercise', 'beginner', '["ankles"]', '["calves"]', '["Warms ankle joints", "Improves circulation", "Prevents sprains", "Enhances ankle flexibility"]', '[]', NULL, 1, NOW(), NOW()),
('asana-knee-rotations', 'Knee Rotations', 'Janu Chakra', 'exercise', 'beginner', '["knees"]', '["hips"]', '["Warms knee joints", "Improves circulation", "Lubricates knee cartilage", "Reduces knee stiffness"]', '["Knee injury", "Severe arthritis"]', NULL, 1, NOW(), NOW()),
('asana-hip-rotations', 'Hip Rotations', 'Kati Chakrasana', 'exercise', 'beginner', '["hips", "spine"]', '["core"]', '["Warms hip joints", "Loosens lower back", "Improves spinal flexibility", "Massages abdominal organs"]', '["Spinal disorders", "Hip replacement"]', NULL, 1, NOW(), NOW()),
('asana-pawanmuktasana', 'Wind Releasing Pose', 'Pawanmuktasana', 'exercise', 'beginner', '["core", "hips"]', '["spine"]', '["Releases trapped gas", "Massages intestines", "Relieves constipation", "Strengthens lower back"]', '["Pregnancy", "Recent abdominal surgery"]', 'exhale', 1, NOW(), NOW()),
('asana-cat-cow', 'Cat-Cow Pose', 'Marjaryasana-Bitilasana', 'exercise', 'beginner', '["spine"]', '["core", "neck"]', '["Warms and mobilizes spine", "Improves spinal flexibility", "Relieves back tension", "Coordinates breath with movement"]', '["Neck injury (keep head neutral)"]', NULL, 1, NOW(), NOW()),

-- =====================================================
-- STANDING POSES (ASANA)
-- =====================================================
('asana-tadasana', 'Mountain Pose', 'Tadasana', 'asana', 'beginner', '["spine", "core"]', '["ankles"]', '["Improves posture", "Strengthens thighs", "Increases body awareness", "Improves balance", "Grounds energy"]', '[]', NULL, 1, NOW(), NOW()),
('asana-vrikshasana', 'Tree Pose', 'Vrikshasana', 'asana', 'beginner', '["core", "hips"]', '["ankles", "spine"]', '["Improves balance", "Strengthens legs", "Opens hips", "Builds focus and concentration"]', '["Low blood pressure", "Insomnia", "Ankle injury"]', NULL, 1, NOW(), NOW()),
('asana-warrior1', 'Warrior I', 'Virabhadrasana I', 'asana', 'beginner', '["hips", "core"]', '["shoulders", "spine"]', '["Strengthens legs and core", "Opens chest and shoulders", "Improves balance", "Builds stamina and focus"]', '["High blood pressure", "Heart problems"]', 'inhale', 1, NOW(), NOW()),
('asana-warrior2', 'Warrior II', 'Virabhadrasana II', 'asana', 'beginner', '["hips", "shoulders"]', '["core", "knees"]', '["Builds stamina", "Strengthens legs", "Opens hips and chest", "Improves concentration"]', '["Diarrhea", "High blood pressure"]', NULL, 1, NOW(), NOW()),
('asana-warrior3', 'Warrior III', 'Virabhadrasana III', 'asana', 'intermediate', '["core", "hamstrings"]', '["shoulders", "spine"]', '["Improves balance", "Strengthens legs and core", "Tones abdomen", "Improves posture"]', '["High blood pressure"]', NULL, 1, NOW(), NOW()),
('asana-trikonasana', 'Triangle Pose', 'Trikonasana', 'asana', 'beginner', '["hips", "hamstrings"]', '["spine", "shoulders"]', '["Stretches sides of body", "Strengthens legs", "Improves digestion", "Relieves stress"]', '["Low blood pressure", "Headache", "Diarrhea"]', NULL, 1, NOW(), NOW()),
('asana-parsvakonasana', 'Extended Side Angle', 'Utthita Parsvakonasana', 'asana', 'beginner', '["hips", "spine"]', '["shoulders", "hamstrings"]', '["Strengthens legs", "Stretches groins", "Opens chest", "Improves stamina"]', '["High blood pressure", "Insomnia"]', NULL, 1, NOW(), NOW()),
('asana-ardha-chandrasana', 'Half Moon Pose', 'Ardha Chandrasana', 'asana', 'intermediate', '["core", "hips"]', '["ankles", "hamstrings"]', '["Improves balance", "Strengthens legs", "Opens hips", "Relieves stress and fatigue"]', '["Headache", "Low blood pressure", "Diarrhea"]', NULL, 1, NOW(), NOW()),
('asana-utkatasana', 'Chair Pose', 'Utkatasana', 'asana', 'beginner', '["core", "hips"]', '["knees", "ankles"]', '["Strengthens thighs and calves", "Tones core", "Builds endurance", "Stimulates heart"]', '["Headache", "Insomnia", "Low blood pressure"]', 'inhale', 1, NOW(), NOW()),
('asana-garudasana', 'Eagle Pose', 'Garudasana', 'asana', 'intermediate', '["shoulders", "hips"]', '["core", "ankles"]', '["Improves balance", "Stretches shoulders and upper back", "Opens hips", "Strengthens legs"]', '["Knee injuries"]', NULL, 1, NOW(), NOW()),
('asana-uttanasana', 'Standing Forward Bend', 'Uttanasana', 'asana', 'beginner', '["hamstrings", "spine"]', '["calves", "hips"]', '["Stretches hamstrings", "Calms the mind", "Relieves stress", "Improves digestion"]', '["Back injury"]', 'exhale', 1, NOW(), NOW()),
('asana-prasarita', 'Wide-Legged Forward Bend', 'Prasarita Padottanasana', 'asana', 'beginner', '["hamstrings", "hips"]', '["spine", "calves"]', '["Stretches inner thighs", "Calms brain", "Relieves mild backache", "Strengthens legs"]', '["Lower back problems"]', 'exhale', 1, NOW(), NOW()),
('asana-parsvottanasana', 'Pyramid Pose', 'Parsvottanasana', 'asana', 'intermediate', '["hamstrings", "spine"]', '["hips", "shoulders"]', '["Stretches hamstrings intensely", "Improves balance", "Calms brain"]', '["High blood pressure", "Back injury"]', 'exhale', 1, NOW(), NOW()),

-- =====================================================
-- FORWARD BENDS & SEATED POSES (ASANA)
-- =====================================================
('asana-paschimottanasana', 'Seated Forward Bend', 'Paschimottanasana', 'asana', 'beginner', '["hamstrings", "spine"]', '["calves"]', '["Stretches entire back of body", "Calms mind", "Aids digestion", "Relieves stress"]', '["Back injury", "Diarrhea"]', 'exhale', 1, NOW(), NOW()),
('asana-janu-sirsasana', 'Head-to-Knee Forward Bend', 'Janu Sirsasana', 'asana', 'beginner', '["hamstrings", "spine"]', '["hips", "knees"]', '["Stretches hamstrings asymmetrically", "Calms brain", "Relieves anxiety", "Aids digestion"]', '["Knee injury", "Diarrhea"]', 'exhale', 1, NOW(), NOW()),
('asana-baddha-konasana', 'Bound Angle Pose', 'Baddha Konasana', 'asana', 'beginner', '["hips"]', '["knees", "spine"]', '["Opens hips deeply", "Stimulates heart and circulation", "Relieves fatigue", "Therapeutic for flat feet"]', '["Groin injury", "Knee injury"]', NULL, 1, NOW(), NOW()),
('asana-virasana', 'Hero Pose', 'Virasana', 'asana', 'beginner', '["knees", "ankles"]', '["hips", "spine"]', '["Stretches thighs and ankles", "Improves digestion", "Relieves tired legs", "Good for meditation"]', '["Knee injury", "Ankle injury"]', NULL, 1, NOW(), NOW()),
('asana-padmasana', 'Lotus Pose', 'Padmasana', 'asana', 'advanced', '["hips", "knees"]', '["spine", "ankles"]', '["Opens hips deeply", "Calms brain", "Traditional meditation posture", "Stimulates pelvis"]', '["Knee injury", "Ankle injury"]', NULL, 1, NOW(), NOW()),
('asana-sukhasana', 'Easy Pose', 'Sukhasana', 'asana', 'beginner', '["hips", "spine"]', '["knees"]', '["Calms brain", "Opens hips gently", "Reduces anxiety", "Strengthens back"]', '["Knee injury"]', NULL, 1, NOW(), NOW()),
('asana-dandasana', 'Staff Pose', 'Dandasana', 'asana', 'beginner', '["spine", "core"]', '["hamstrings"]', '["Strengthens back muscles", "Stretches shoulders", "Improves posture", "Prepares for forward bends"]', '["Wrist injury"]', NULL, 1, NOW(), NOW()),
('asana-gomukhasana', 'Cow Face Pose', 'Gomukhasana', 'asana', 'intermediate', '["shoulders", "hips"]', '["spine", "knees"]', '["Opens shoulders deeply", "Opens hips", "Stretches ankles", "Stretches arms and chest"]', '["Shoulder injury", "Knee injury"]', NULL, 1, NOW(), NOW()),

-- =====================================================
-- BACKBENDS (ASANA)
-- =====================================================
('asana-bhujangasana', 'Cobra Pose', 'Bhujangasana', 'asana', 'beginner', '["spine"]', '["shoulders", "core"]', '["Strengthens spine", "Opens chest", "Stimulates abdominal organs", "Relieves stress"]', '["Back injury", "Pregnancy", "Carpal tunnel"]', 'inhale', 1, NOW(), NOW()),
('asana-urdhva-mukha', 'Upward Facing Dog', 'Urdhva Mukha Svanasana', 'asana', 'beginner', '["spine", "shoulders"]', '["core"]', '["Strengthens spine", "Opens chest fully", "Improves posture", "Stimulates abdominal organs"]', '["Back injury", "Carpal tunnel", "Pregnancy"]', 'inhale', 1, NOW(), NOW()),
('asana-setu-bandha', 'Bridge Pose', 'Setu Bandhasana', 'asana', 'beginner', '["spine", "hips"]', '["core", "hamstrings"]', '["Strengthens back muscles", "Opens chest", "Calms brain", "Rejuvenates tired legs"]', '["Neck injury"]', 'inhale', 1, NOW(), NOW()),
('asana-urdhva-dhanurasana', 'Wheel Pose', 'Urdhva Dhanurasana', 'asana', 'advanced', '["spine", "shoulders"]', '["core", "hips"]', '["Strengthens arms and legs", "Opens chest fully", "Increases energy", "Therapeutic for asthma"]', '["Back injury", "Carpal tunnel", "Headache", "Heart problems"]', 'inhale', 1, NOW(), NOW()),
('asana-ustrasana', 'Camel Pose', 'Ustrasana', 'asana', 'intermediate', '["spine", "shoulders"]', '["hips", "core"]', '["Opens entire front body", "Stretches hip flexors", "Improves posture", "Stimulates thyroid"]', '["High blood pressure", "Low blood pressure", "Insomnia"]', 'inhale', 1, NOW(), NOW()),
('asana-dhanurasana', 'Bow Pose', 'Dhanurasana', 'asana', 'intermediate', '["spine"]', '["shoulders", "hips"]', '["Stretches entire front body", "Strengthens back", "Improves posture", "Stimulates organs"]', '["High blood pressure", "Low blood pressure", "Insomnia", "Pregnancy"]', 'inhale', 1, NOW(), NOW()),
('asana-salabhasana', 'Locust Pose', 'Salabhasana', 'asana', 'beginner', '["spine", "core"]', '["shoulders", "hamstrings"]', '["Strengthens back muscles", "Stretches shoulders", "Improves posture", "Stimulates abdominal organs"]', '["Headache", "Serious back injury"]', 'inhale', 1, NOW(), NOW()),
('asana-matsyasana', 'Fish Pose', 'Matsyasana', 'asana', 'intermediate', '["spine", "neck"]', '["shoulders", "respiratory"]', '["Opens chest and throat", "Stretches hip flexors", "Relieves tension in neck", "Stimulates thyroid"]', '["High blood pressure", "Low blood pressure", "Insomnia", "Serious neck injury"]', 'inhale', 1, NOW(), NOW()),

-- =====================================================
-- TWISTS (ASANA)
-- =====================================================
('asana-ardha-matsyendrasana', 'Half Lord of the Fishes', 'Ardha Matsyendrasana', 'asana', 'intermediate', '["spine", "hips"]', '["shoulders"]', '["Deep spinal twist", "Stimulates digestion", "Increases spinal flexibility", "Energizes spine"]', '["Spine injury", "Pregnancy"]', 'exhale', 1, NOW(), NOW()),
('asana-parivrtta-trikonasana', 'Revolved Triangle', 'Parivrtta Trikonasana', 'asana', 'intermediate', '["spine", "hamstrings"]', '["hips", "shoulders"]', '["Deep twist with balance", "Improves balance", "Strengthens legs", "Detoxifies organs"]', '["Low blood pressure", "Back injury", "Headache"]', 'exhale', 1, NOW(), NOW()),
('asana-parivrtta-parsvakonasana', 'Revolved Side Angle', 'Parivrtta Parsvakonasana', 'asana', 'intermediate', '["spine", "hips"]', '["shoulders", "core"]', '["Deep twist with strength", "Strengthens legs", "Improves balance", "Stimulates organs"]', '["Low blood pressure", "Headache", "Insomnia"]', 'exhale', 1, NOW(), NOW()),
('asana-supta-matsyendrasana', 'Supine Spinal Twist', 'Supta Matsyendrasana', 'asana', 'beginner', '["spine"]', '["hips", "shoulders"]', '["Releases lower back tension", "Stretches hips gently", "Calms nervous system", "Aids digestion"]', '["Serious back injury"]', 'exhale', 1, NOW(), NOW()),
('asana-bharadvajasana', 'Bharadvaja\'s Twist', 'Bharadvajasana', 'asana', 'beginner', '["spine"]', '["shoulders", "hips"]', '["Gentle therapeutic twist", "Improves digestion", "Relieves lower backache", "Calms nervous system"]', '["Diarrhea", "Headache", "High blood pressure"]', 'exhale', 1, NOW(), NOW()),

-- =====================================================
-- INVERSIONS & ARM BALANCES (ASANA)
-- =====================================================
('asana-adho-mukha', 'Downward Facing Dog', 'Adho Mukha Svanasana', 'asana', 'beginner', '["shoulders", "hamstrings"]', '["spine", "calves"]', '["Full body stretch", "Builds arm and leg strength", "Energizes the body", "Calms brain"]', '["Carpal tunnel", "Diarrhea", "Pregnancy (late term)"]', NULL, 1, NOW(), NOW()),
('asana-dolphin', 'Dolphin Pose', 'Ardha Pincha Mayurasana', 'asana', 'intermediate', '["shoulders", "core"]', '["hamstrings", "spine"]', '["Strengthens arms and shoulders", "Prepares for headstand", "Calms brain", "Stretches hamstrings"]', '["Neck injury", "Shoulder injury"]', NULL, 1, NOW(), NOW()),
('asana-sarvangasana', 'Shoulder Stand', 'Sarvangasana', 'asana', 'intermediate', '["shoulders", "spine"]', '["core", "neck"]', '["Calms brain", "Stimulates thyroid", "Stretches shoulders", "Improves digestion"]', '["Neck injury", "Diarrhea", "Headache", "High blood pressure", "Menstruation", "Pregnancy"]', NULL, 1, NOW(), NOW()),
('asana-halasana', 'Plow Pose', 'Halasana', 'asana', 'intermediate', '["spine", "shoulders"]', '["hamstrings", "neck"]', '["Calms brain deeply", "Stimulates abdominal organs", "Stretches shoulders and spine"]', '["Neck injury", "Diarrhea", "Pregnancy", "Menstruation"]', NULL, 1, NOW(), NOW()),
('asana-sirsasana', 'Headstand', 'Sirsasana', 'asana', 'advanced', '["shoulders", "core"]', '["spine", "neck"]', '["Calms brain", "Strengthens arms and core", "Improves digestion", "Stimulates pituitary gland"]', '["Back injury", "Headache", "Heart conditions", "High blood pressure", "Menstruation", "Neck injury", "Pregnancy"]', NULL, 1, NOW(), NOW()),
('asana-bakasana', 'Crow Pose', 'Bakasana', 'asana', 'intermediate', '["core", "shoulders"]', '["spine"]', '["Strengthens arms and wrists", "Tones abdomen", "Opens groins", "Improves balance and focus"]', '["Carpal tunnel", "Pregnancy"]', NULL, 1, NOW(), NOW()),
('asana-parsva-bakasana', 'Side Crow', 'Parsva Bakasana', 'asana', 'advanced', '["core", "shoulders"]', '["spine", "hips"]', '["Strengthens arms", "Tones obliques", "Improves balance", "Develops focus"]', '["Carpal tunnel", "Pregnancy"]', NULL, 1, NOW(), NOW()),
('asana-phalakasana', 'Plank Pose', 'Phalakasana', 'asana', 'beginner', '["core", "shoulders"]', '["spine"]', '["Strengthens arms and core", "Tones abdomen", "Builds endurance", "Prepares for arm balances"]', '["Carpal tunnel"]', NULL, 1, NOW(), NOW()),
('asana-vasisthasana', 'Side Plank', 'Vasisthasana', 'asana', 'intermediate', '["core", "shoulders"]', '["spine"]', '["Strengthens arms and wrists", "Improves balance", "Tones obliques", "Stretches wrists"]', '["Wrist injury", "Shoulder injury"]', NULL, 1, NOW(), NOW()),
('asana-chaturanga', 'Four-Limbed Staff Pose', 'Chaturanga Dandasana', 'asana', 'intermediate', '["core", "shoulders"]', '["spine"]', '["Strengthens arms and wrists", "Tones abdomen", "Prepares for arm balances", "Builds upper body strength"]', '["Carpal tunnel", "Pregnancy"]', 'exhale', 1, NOW(), NOW()),

-- =====================================================
-- HIP OPENERS (ASANA)
-- =====================================================
('asana-eka-pada-rajakapotasana', 'Pigeon Pose', 'Eka Pada Rajakapotasana', 'asana', 'intermediate', '["hips"]', '["hamstrings", "spine"]', '["Deep hip opener", "Stretches hip flexors", "Opens groins", "Prepares for backbends"]', '["Knee injury", "Sacroiliac injury"]', NULL, 1, NOW(), NOW()),
('asana-mandukasana', 'Frog Pose', 'Mandukasana', 'asana', 'intermediate', '["hips"]', '["knees", "hamstrings"]', '["Opens inner thighs deeply", "Stretches groins", "Releases hip tension", "Therapeutic for hips"]', '["Knee injury", "Groin injury"]', NULL, 1, NOW(), NOW()),
('asana-utthan-pristhasana', 'Lizard Pose', 'Utthan Pristhasana', 'asana', 'intermediate', '["hips", "hamstrings"]', '["spine", "knees"]', '["Opens hip flexors", "Stretches hamstrings", "Prepares for splits", "Releases hip tension"]', '["Knee injury"]', NULL, 1, NOW(), NOW()),
('asana-ananda-balasana', 'Happy Baby', 'Ananda Balasana', 'asana', 'beginner', '["hips"]', '["spine", "hamstrings"]', '["Opens hips gently", "Releases lower back", "Calms brain", "Relieves stress"]', '["Pregnancy", "Knee injury"]', NULL, 1, NOW(), NOW()),
('asana-malasana', 'Garland Pose', 'Malasana', 'asana', 'beginner', '["hips", "ankles"]', '["spine", "knees"]', '["Opens hips", "Stretches ankles", "Tones belly", "Improves digestion"]', '["Knee injury"]', NULL, 1, NOW(), NOW()),

-- =====================================================
-- CORE STRENGTHENING (ASANA)
-- =====================================================
('asana-navasana', 'Boat Pose', 'Navasana', 'asana', 'intermediate', '["core"]', '["hips", "spine"]', '["Strengthens abdomen", "Strengthens hip flexors", "Improves balance", "Stimulates kidneys"]', '["Low blood pressure", "Headache", "Insomnia", "Pregnancy"]', NULL, 1, NOW(), NOW()),
('asana-supta-padangusthasana', 'Supine Hand-to-Toe', 'Supta Padangusthasana', 'asana', 'beginner', '["hamstrings"]', '["hips", "calves"]', '["Stretches hamstrings safely", "Relieves backache", "Strengthens knees", "Calms nervous system"]', '["Diarrhea", "Headache"]', NULL, 1, NOW(), NOW()),
('asana-viparita-karani', 'Legs Up the Wall', 'Viparita Karani', 'asana', 'beginner', '["hamstrings", "nervous_system"]', '["spine"]', '["Relieves tired legs", "Calms brain", "Relieves mild backache", "Reduces anxiety"]', '["Glaucoma", "Serious eye problems"]', NULL, 1, NOW(), NOW()),

-- =====================================================
-- SURYA NAMASKARA COMPONENT POSES
-- =====================================================
('asana-urdhva-hastasana', 'Upward Salute', 'Urdhva Hastasana', 'asana', 'beginner', '["spine", "shoulders"]', '["core"]', '["Stretches sides of body", "Opens chest", "Improves posture", "Energizes body"]', '[]', 'inhale', 1, NOW(), NOW()),
('asana-ardha-uttanasana', 'Half Standing Forward Bend', 'Ardha Uttanasana', 'asana', 'beginner', '["hamstrings", "spine"]', '["core"]', '["Stretches spine", "Strengthens back", "Prepares for forward bend", "Lengthens torso"]', '["Back injury"]', 'inhale', 1, NOW(), NOW()),
('asana-ashwa-sanchalanasana', 'Low Lunge', 'Ashwa Sanchalanasana', 'asana', 'beginner', '["hips"]', '["hamstrings", "core"]', '["Opens hip flexors", "Stretches groins", "Strengthens legs", "Prepares for deeper lunges"]', '["Knee injury"]', 'inhale', 1, NOW(), NOW()),
('asana-ashtanga-namaskara', 'Eight-Limbed Salute', 'Ashtanga Namaskara', 'asana', 'beginner', '["spine", "core"]', '["shoulders"]', '["Strengthens arms", "Opens chest", "Traditional sun salutation component", "Builds control"]', '["Back injury", "Pregnancy"]', 'exhale', 1, NOW(), NOW()),

-- =====================================================
-- PRANAYAMA (BREATHING EXERCISES)
-- =====================================================
('asana-anulom-vilom', 'Alternate Nostril Breathing', 'Anulom Vilom', 'pranayama', 'beginner', '["respiratory", "nervous_system"]', '[]', '["Balances nervous system", "Reduces stress and anxiety", "Improves focus", "Purifies energy channels (nadis)"]', '["Cold or nasal congestion"]', NULL, 1, NOW(), NOW()),
('asana-kapalbhati', 'Skull Shining Breath', 'Kapalbhati', 'pranayama', 'intermediate', '["core", "respiratory"]', '["nervous_system"]', '["Cleanses respiratory system", "Energizes body and mind", "Strengthens abdominals", "Clears sinuses"]', '["High blood pressure", "Heart disease", "Pregnancy", "Menstruation", "Recent abdominal surgery"]', NULL, 1, NOW(), NOW()),
('asana-bhramari', 'Humming Bee Breath', 'Bhramari', 'pranayama', 'beginner', '["respiratory", "nervous_system"]', '["neck"]', '["Calms the mind instantly", "Reduces anxiety", "Improves sleep quality", "Relieves anger and frustration"]', '["Ear infection"]', NULL, 1, NOW(), NOW()),
('asana-ujjayi', 'Ocean Breath', 'Ujjayi Pranayama', 'pranayama', 'beginner', '["respiratory", "nervous_system"]', '[]', '["Builds internal heat", "Calms nervous system", "Improves focus", "Regulates blood pressure"]', '[]', NULL, 1, NOW(), NOW()),
('asana-bhastrika', 'Bellows Breath', 'Bhastrika', 'pranayama', 'intermediate', '["respiratory", "core"]', '["nervous_system"]', '["Increases energy rapidly", "Clears airways", "Stimulates metabolism", "Improves digestion"]', '["High blood pressure", "Heart disease", "Pregnancy", "Vertigo", "Epilepsy"]', NULL, 1, NOW(), NOW()),
('asana-sheetali', 'Cooling Breath', 'Sheetali', 'pranayama', 'beginner', '["respiratory", "nervous_system"]', '[]', '["Cools body temperature", "Reduces pitta (heat)", "Calms mind", "Reduces thirst"]', '["Low blood pressure", "Asthma", "Cold weather", "Respiratory infection"]', NULL, 1, NOW(), NOW()),
('asana-sheetkari', 'Hissing Breath', 'Sheetkari', 'pranayama', 'beginner', '["respiratory", "nervous_system"]', '[]', '["Cools body", "Reduces thirst", "Calms mind", "Alternative for those who cannot curl tongue"]', '["Low blood pressure", "Asthma", "Cold weather", "Sensitive teeth"]', NULL, 1, NOW(), NOW()),
('asana-dirga', 'Three-Part Breath', 'Dirga Pranayama', 'pranayama', 'beginner', '["respiratory"]', '["core", "nervous_system"]', '["Increases oxygen intake", "Calms mind and body", "Improves lung capacity", "Reduces stress"]', '[]', NULL, 1, NOW(), NOW()),
('asana-kumbhaka', 'Breath Retention', 'Kumbhaka', 'pranayama', 'intermediate', '["respiratory", "nervous_system"]', '[]', '["Increases lung capacity", "Calms mind deeply", "Builds prana (life force)", "Improves concentration"]', '["Heart conditions", "High blood pressure", "Pregnancy"]', 'hold', 1, NOW(), NOW()),
('asana-simhasana', 'Lion\'s Breath', 'Simhasana Pranayama', 'pranayama', 'beginner', '["respiratory", "neck"]', '["nervous_system"]', '["Relieves tension in face and jaw", "Stretches tongue and throat", "Releases stress vocally"]', '[]', NULL, 1, NOW(), NOW()),

-- =====================================================
-- KRIYAS (CLEANSING TECHNIQUES)
-- =====================================================
('asana-jal-neti', 'Nasal Cleansing', 'Jal Neti', 'kriya', 'beginner', '["respiratory"]', '[]', '["Clears nasal passages", "Reduces allergies", "Improves breathing", "Prevents sinusitis"]', '["Ear infection", "Nosebleed", "Severe cold"]', NULL, 1, NOW(), NOW()),
('asana-sutra-neti', 'Thread Nasal Cleansing', 'Sutra Neti', 'kriya', 'intermediate', '["respiratory"]', '["neck"]', '["Deep nasal cleansing", "Stimulates nerve endings", "Improves breathing", "Clears deep congestion"]', '["Nosebleed", "Nasal polyps", "Deviated septum"]', NULL, 1, NOW(), NOW()),
('asana-kunjal', 'Stomach Cleansing', 'Kunjal Kriya', 'kriya', 'intermediate', '["core", "respiratory"]', '[]', '["Cleanses stomach", "Removes excess mucus", "Improves digestion", "Therapeutic for acidity"]', '["Heart disease", "High blood pressure", "Hernia", "Ulcers"]', NULL, 1, NOW(), NOW()),
('asana-nauli', 'Abdominal Churning', 'Nauli', 'kriya', 'advanced', '["core"]', '["respiratory"]', '["Massages abdominal organs", "Improves digestion", "Strengthens abdominals", "Stimulates intestines"]', '["Pregnancy", "Hernia", "High blood pressure", "Heart disease", "Ulcers"]', NULL, 1, NOW(), NOW()),
('asana-uddiyana', 'Abdominal Lock', 'Uddiyana Bandha', 'kriya', 'intermediate', '["core"]', '["respiratory", "spine"]', '["Massages abdominal organs", "Improves digestion", "Tones abdominals", "Stimulates solar plexus"]', '["Pregnancy", "Menstruation", "High blood pressure", "Heart disease", "Ulcers"]', 'exhale', 1, NOW(), NOW()),
('asana-trataka', 'Candle Gazing', 'Trataka', 'kriya', 'beginner', '["nervous_system"]', '[]', '["Improves concentration", "Cleanses and strengthens eyes", "Calms mind", "Develops willpower"]', '["Eye problems", "Glaucoma", "Cataracts"]', NULL, 1, NOW(), NOW()),
('asana-kapalabhati-kriya', 'Skull Cleansing Kriya', 'Kapalabhati Kriya', 'kriya', 'intermediate', '["respiratory", "core"]', '["nervous_system"]', '["Cleanses respiratory system", "Energizes brain", "Strengthens core", "Clears sinuses"]', '["High blood pressure", "Heart disease", "Pregnancy", "Epilepsy"]', NULL, 1, NOW(), NOW()),

-- =====================================================
-- RELAXATION POSES
-- =====================================================
('asana-shavasana', 'Corpse Pose', 'Shavasana', 'relaxation', 'beginner', '["nervous_system"]', '["spine"]', '["Deep complete relaxation", "Reduces stress", "Integrates practice", "Lowers blood pressure"]', '[]', NULL, 1, NOW(), NOW()),
('asana-balasana', 'Child\'s Pose', 'Balasana', 'relaxation', 'beginner', '["spine", "hips"]', '["shoulders"]', '["Resting pose", "Releases back tension", "Calms mind", "Gently stretches hips"]', '["Pregnancy", "Knee injury", "Diarrhea"]', NULL, 1, NOW(), NOW()),
('asana-makarasana', 'Crocodile Pose', 'Makarasana', 'relaxation', 'beginner', '["spine", "nervous_system"]', '["shoulders"]', '["Relaxes spine completely", "Reduces stress", "Therapeutic for asthma", "Rests lower back"]', '[]', NULL, 1, NOW(), NOW()),
('asana-supta-baddha-konasana', 'Reclining Bound Angle', 'Supta Baddha Konasana', 'relaxation', 'beginner', '["hips", "nervous_system"]', '["spine"]', '["Opens hips passively", "Deep relaxation", "Relieves menstrual discomfort", "Calms nervous system"]', '["Groin injury", "Knee injury"]', NULL, 1, NOW(), NOW()),
('asana-supported-bridge', 'Supported Bridge', 'Setu Bandha Sarvangasana', 'relaxation', 'beginner', '["spine", "nervous_system"]', '["hips"]', '["Gentle restorative backbend", "Calms brain", "Relieves mild depression", "Opens chest"]', '["Neck injury"]', NULL, 1, NOW(), NOW()),
('asana-yoga-nidra', 'Yoga Nidra Position', 'Yoga Nidra Sthiti', 'relaxation', 'beginner', '["nervous_system"]', '["spine"]', '["Deep conscious relaxation", "Reduces anxiety deeply", "Improves sleep quality", "Releases subconscious tensions"]', '[]', NULL, 1, NOW(), NOW());

-- =====================================================
-- SURYA NAMASKAR SEQUENCES (with child_asanas)
-- =====================================================

INSERT INTO asanas (id, name, sanskrit_name, type, difficulty, primary_body_areas, secondary_body_areas, benefits, contraindications, breathing_cue, is_active, child_asanas, created_at, updated_at) VALUES
('asana-surya-namaskara-a', 'Sun Salutation A', 'Surya Namaskar A', 'surya_namaskar', 'beginner', '["spine", "shoulders", "core"]', '["hamstrings", "hips"]', '["Full body warm-up", "Increases flexibility", "Builds strength", "Improves circulation", "Synchronizes breath and movement"]', '["Back injury", "High blood pressure"]', NULL, 1,
JSON_ARRAY(
    JSON_OBJECT('asanaId', 'asana-tadasana', 'order', 1),
    JSON_OBJECT('asanaId', 'asana-urdhva-hastasana', 'order', 2),
    JSON_OBJECT('asanaId', 'asana-uttanasana', 'order', 3),
    JSON_OBJECT('asanaId', 'asana-ardha-uttanasana', 'order', 4),
    JSON_OBJECT('asanaId', 'asana-phalakasana', 'order', 5),
    JSON_OBJECT('asanaId', 'asana-chaturanga', 'order', 6),
    JSON_OBJECT('asanaId', 'asana-urdhva-mukha', 'order', 7),
    JSON_OBJECT('asanaId', 'asana-adho-mukha', 'order', 8),
    JSON_OBJECT('asanaId', 'asana-ardha-uttanasana', 'order', 9),
    JSON_OBJECT('asanaId', 'asana-uttanasana', 'order', 10),
    JSON_OBJECT('asanaId', 'asana-urdhva-hastasana', 'order', 11),
    JSON_OBJECT('asanaId', 'asana-tadasana', 'order', 12)
), NOW(), NOW()),

('asana-surya-namaskara-b', 'Sun Salutation B', 'Surya Namaskar B', 'surya_namaskar', 'intermediate', '["spine", "core", "hips"]', '["shoulders", "hamstrings"]', '["Builds heat", "Strengthens legs", "Improves stamina", "Full body workout", "Adds warrior poses"]', '["Back injury", "High blood pressure", "Heart conditions"]', NULL, 1,
JSON_ARRAY(
    JSON_OBJECT('asanaId', 'asana-tadasana', 'order', 1),
    JSON_OBJECT('asanaId', 'asana-utkatasana', 'order', 2),
    JSON_OBJECT('asanaId', 'asana-uttanasana', 'order', 3),
    JSON_OBJECT('asanaId', 'asana-ardha-uttanasana', 'order', 4),
    JSON_OBJECT('asanaId', 'asana-chaturanga', 'order', 5),
    JSON_OBJECT('asanaId', 'asana-urdhva-mukha', 'order', 6),
    JSON_OBJECT('asanaId', 'asana-adho-mukha', 'order', 7),
    JSON_OBJECT('asanaId', 'asana-warrior1', 'order', 8),
    JSON_OBJECT('asanaId', 'asana-chaturanga', 'order', 9),
    JSON_OBJECT('asanaId', 'asana-urdhva-mukha', 'order', 10),
    JSON_OBJECT('asanaId', 'asana-adho-mukha', 'order', 11),
    JSON_OBJECT('asanaId', 'asana-warrior1', 'order', 12),
    JSON_OBJECT('asanaId', 'asana-chaturanga', 'order', 13),
    JSON_OBJECT('asanaId', 'asana-urdhva-mukha', 'order', 14),
    JSON_OBJECT('asanaId', 'asana-adho-mukha', 'order', 15),
    JSON_OBJECT('asanaId', 'asana-ardha-uttanasana', 'order', 16),
    JSON_OBJECT('asanaId', 'asana-uttanasana', 'order', 17),
    JSON_OBJECT('asanaId', 'asana-utkatasana', 'order', 18),
    JSON_OBJECT('asanaId', 'asana-tadasana', 'order', 19)
), NOW(), NOW()),

('asana-chandra-namaskara', 'Moon Salutation', 'Chandra Namaskar', 'surya_namaskar', 'beginner', '["hips", "spine"]', '["shoulders", "hamstrings"]', '["Cooling sequence", "Opens hips deeply", "Calms nervous system", "Evening practice", "Balances lunar energy"]', '["Knee injury"]', NULL, 1,
JSON_ARRAY(
    JSON_OBJECT('asanaId', 'asana-tadasana', 'order', 1),
    JSON_OBJECT('asanaId', 'asana-urdhva-hastasana', 'order', 2),
    JSON_OBJECT('asanaId', 'asana-trikonasana', 'order', 3),
    JSON_OBJECT('asanaId', 'asana-parsvakonasana', 'order', 4),
    JSON_OBJECT('asanaId', 'asana-malasana', 'order', 5),
    JSON_OBJECT('asanaId', 'asana-ashwa-sanchalanasana', 'order', 6),
    JSON_OBJECT('asanaId', 'asana-utthan-pristhasana', 'order', 7),
    JSON_OBJECT('asanaId', 'asana-malasana', 'order', 8),
    JSON_OBJECT('asanaId', 'asana-parsvakonasana', 'order', 9),
    JSON_OBJECT('asanaId', 'asana-trikonasana', 'order', 10),
    JSON_OBJECT('asanaId', 'asana-urdhva-hastasana', 'order', 11),
    JSON_OBJECT('asanaId', 'asana-tadasana', 'order', 12)
), NOW(), NOW()),

-- =====================================================
-- VINYASA SEQUENCES
-- =====================================================
('asana-vinyasa-basic', 'Basic Vinyasa Flow', 'Vinyasa', 'vinyasa', 'beginner', '["core", "shoulders"]', '["spine"]', '["Transitions between poses", "Builds heat", "Links breath to movement", "Foundation for flow practice"]', '["Wrist injury", "Shoulder injury"]', NULL, 1,
JSON_ARRAY(
    JSON_OBJECT('asanaId', 'asana-phalakasana', 'order', 1),
    JSON_OBJECT('asanaId', 'asana-chaturanga', 'order', 2),
    JSON_OBJECT('asanaId', 'asana-urdhva-mukha', 'order', 3),
    JSON_OBJECT('asanaId', 'asana-adho-mukha', 'order', 4)
), NOW(), NOW()),

('asana-warrior-flow', 'Warrior Flow', 'Virabhadra Vinyasa', 'vinyasa', 'intermediate', '["hips", "core"]', '["shoulders", "spine"]', '["Strengthens legs", "Builds focus", "Improves balance", "Warrior pose transitions"]', '["Knee injury", "High blood pressure"]', NULL, 1,
JSON_ARRAY(
    JSON_OBJECT('asanaId', 'asana-warrior1', 'order', 1),
    JSON_OBJECT('asanaId', 'asana-warrior2', 'order', 2),
    JSON_OBJECT('asanaId', 'asana-parsvakonasana', 'order', 3),
    JSON_OBJECT('asanaId', 'asana-trikonasana', 'order', 4),
    JSON_OBJECT('asanaId', 'asana-ardha-chandrasana', 'order', 5)
), NOW(), NOW());

-- =====================================================
-- Summary of inserted data:
-- Warm-up Exercises: 8
-- Standing Poses: 13
-- Forward Bends & Seated: 9
-- Backbends: 8
-- Twists: 5
-- Inversions & Arm Balances: 10
-- Hip Openers: 5
-- Core Strengthening: 3
-- Surya Namaskara Components: 4
-- Pranayama: 10
-- Kriyas: 7
-- Relaxation: 6
-- Surya Namaskar Sequences: 3 (with child_asanas)
-- Vinyasa Sequences: 2 (with child_asanas)
-- TOTAL: ~93 entries
-- =====================================================
