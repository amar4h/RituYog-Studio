-- ============================================
-- Seed Data: Individual Asanas
-- Run AFTER migration_session_planning_tables.sql
-- Contains: exercises, kriyas, asanas, pranayama, relaxation
-- Does NOT include vinyasas or surya namaskars (see seed_vinyasas.sql)
-- ============================================

-- =============================================
-- EXERCISES / WARM-UP ITEMS (17 entries)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-wrist-shoulder-rot', 'Wrist and Shoulder Rotation', NULL, 'exercise', '["shoulders"]', '["neck"]', '["Loosens shoulder joints","Improves wrist mobility","Prepares upper body for practice"]', 'beginner', '["Acute shoulder injury"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-shoulder-rot-strap', 'Shoulder Rotation with Strap', NULL, 'exercise', '["shoulders"]', '["spine"]', '["Increases shoulder range of motion","Opens chest","Corrects rounded shoulders"]', 'beginner', '["Frozen shoulder","Rotator cuff tear"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-elephant-walk', 'Elephant Walk', NULL, 'exercise', '["hamstrings"]', '["calves","hips"]', '["Warms up legs","Stretches hamstrings dynamically","Improves coordination"]', 'beginner', '["Severe knee pain"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-cat-cow', 'Cat-Cow', 'Marjariasana-Bitilasana', 'exercise', '["spine"]', '["core","neck"]', '["Mobilizes spine","Relieves back tension","Coordinates breath with movement"]', 'beginner', '["Severe neck injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-dyn-paschimo', 'Dynamic Paschimottanasana', NULL, 'exercise', '["hamstrings"]', '["spine","calves"]', '["Warms up posterior chain","Stretches hamstrings dynamically","Prepares for forward bends"]', 'beginner', '["Herniated disc"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-dyn-setu', 'Dynamic Setu Bandhasana', NULL, 'exercise', '["spine"]', '["hips","core"]', '["Warms up glutes and spine","Opens hip flexors","Strengthens bridge mechanics"]', 'beginner', '["Neck injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-low-lunge-dyn', 'Low Lunge Dynamic', NULL, 'exercise', '["hips"]', '["hamstrings","knees"]', '["Opens hip flexors","Warms up legs","Improves balance"]', 'beginner', '["Knee injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-squat-hand-raise', 'Squat with Hand Raise', NULL, 'exercise', '["hips"]', '["knees","shoulders"]', '["Mobilizes hips and shoulders simultaneously","Builds lower body warmth","Improves squat depth"]', 'beginner', '["Knee injury","Shoulder impingement"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-cat-knee-rot', 'On Cat Pose Knee Rotations', NULL, 'exercise', '["hips"]', '["knees","core"]', '["Mobilizes hip joint","Warms up knees","Improves hip rotation"]', 'beginner', '["Wrist pain","Knee injury"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-triyak-tadasana', 'Triyak Tadasana', 'Triyak Tadasana', 'exercise', '["spine"]', '["shoulders","core"]', '["Lateral spinal flexion","Stretches intercostal muscles","Improves side body mobility"]', 'beginner', '["Spinal disc issues"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-butterfly', 'Butterfly', 'Baddha Konasana Prep', 'exercise', '["hips"]', '["knees"]', '["Opens inner thighs","Mobilizes hip joints","Stimulates pelvic circulation"]', 'beginner', '["Groin injury","Knee injury"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-dyn-sphinx', 'Dynamic Sphinx', NULL, 'exercise', '["spine"]', '["shoulders","core"]', '["Warms up lower back","Opens chest gently","Prepares for backbends"]', 'beginner', '["Severe lower back pain"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-thread-needle', 'Thread the Needle', NULL, 'exercise', '["shoulders"]', '["spine","neck"]', '["Releases shoulder tension","Gentle spinal twist","Opens upper back"]', 'beginner', '["Neck injury","Shoulder impingement"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-lying-pigeon-prep', 'Lying Pigeon Prep', NULL, 'exercise', '["hips"]', '["knees"]', '["Opens hip rotators","Prepares for pigeon pose","Releases glute tension"]', 'beginner', '["Knee injury"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-frog-pose-rot', 'Frog Pose Rotations', 'Mandukasana Prep', 'exercise', '["hips"]', '["knees"]', '["Deep hip opening","Improves hip rotation","Prepares for wide-legged poses"]', 'beginner', '["Groin injury","Knee pain"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-sarvanga-pushti', 'Sarvanga Pushti', NULL, 'exercise', '["core"]', '["shoulders","hips"]', '["Full body circulation","Strengthens all limbs","Builds stamina"]', 'beginner', '["Heart conditions"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('ex-hrid-gati', 'Hrid Gati (Engine Daud)', NULL, 'exercise', '["core"]', '["hips","calves"]', '["Cardiovascular warm-up","Increases heart rate","Builds stamina"]', 'beginner', '["Heart conditions","High blood pressure"]', NULL, TRUE);

-- =============================================
-- KRIYAS (4 entries)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('kr-griva-shakti', 'Griva Shakti Vikasaka Kriya', NULL, 'kriya', '["neck"]', '["shoulders"]', '["Strengthens neck muscles","Relieves neck stiffness","Improves cervical mobility"]', 'beginner', '["Cervical spondylosis","Severe neck injury"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('kr-vaksha-shakti', 'Vaksha Shakti Vikasaka Kriya', NULL, 'kriya', '["shoulders"]', '["spine"]', '["Expands chest","Strengthens chest muscles","Improves breathing capacity"]', 'beginner', '["Shoulder injury"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('kr-kati-shakti', 'Kati Shakti Vikasaka Kriya', NULL, 'kriya', '["spine"]', '["hips","core"]', '["Strengthens lower back","Improves waist flexibility","Tones abdominal muscles"]', 'beginner', '["Lower back injury","Herniated disc"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('kr-pindali-vikasak', 'Pindali Vikasak Kriya', NULL, 'kriya', '["calves"]', '["ankles"]', '["Strengthens calf muscles","Improves ankle stability","Enhances blood circulation in legs"]', 'beginner', '["Calf strain"]', NULL, TRUE);

-- =============================================
-- STANDING ASANAS (29 entries)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-tadasana', 'Tadasana', 'Tadasana', 'asana', '["spine"]', '["ankles","core"]', '["Improves posture","Strengthens legs","Grounds awareness"]', 'beginner', '["Severe dizziness"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-vrikshasana', 'Vrikshasana', 'Vrikshasana', 'asana', '["ankles"]', '["hips","core"]', '["Improves balance","Strengthens standing leg","Builds focus and concentration"]', 'beginner', '["Severe vertigo","Ankle injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-urdhva-hastasana', 'Urdhva Hastasana', 'Urdhva Hastasana', 'asana', '["shoulders"]', '["spine","core"]', '["Stretches full body","Opens shoulders","Energizes"]', 'beginner', '["Shoulder injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-uttanasana', 'Uttanasana', 'Uttanasana', 'asana', '["hamstrings"]', '["spine","calves"]', '["Deep hamstring stretch","Calms the mind","Relieves stress"]', 'beginner', '["Lower back injury","Hamstring tear"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-ardha-uttanasana', 'Ardha Uttanasana', 'Ardha Uttanasana', 'asana', '["hamstrings"]', '["spine"]', '["Lengthens spine","Stretches hamstrings","Strengthens back"]', 'beginner', '["Lower back injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-utkatasana', 'Utkatasana', 'Utkatasana', 'asana', '["knees"]', '["hips","core"]', '["Strengthens thighs","Builds leg endurance","Tones core"]', 'intermediate', '["Knee injury","Low blood pressure"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-parivrtta-utkatasana', 'Parivrtta Utkatasana', 'Parivrtta Utkatasana', 'asana', '["spine"]', '["core","knees"]', '["Detoxifies organs","Strengthens legs with twist","Improves balance"]', 'intermediate', '["Knee injury","Spinal disc issues"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-virabhadrasana-1', 'Virabhadrasana I', 'Virabhadrasana I', 'asana', '["hips"]', '["shoulders","knees"]', '["Strengthens legs","Opens hip flexors","Builds stamina"]', 'beginner', '["Knee injury","High blood pressure"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-virabhadrasana-2', 'Virabhadrasana II', 'Virabhadrasana II', 'asana', '["hips"]', '["shoulders","knees"]', '["Opens hips","Strengthens legs and arms","Builds focus"]', 'beginner', '["Knee injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-vinamra-veer', 'Vinamra Veerbhadrasana', 'Vinamra Veerbhadrasana', 'asana', '["shoulders"]', '["hips","hamstrings"]', '["Stretches shoulders deeply","Opens chest","Builds humility in practice"]', 'intermediate', '["Shoulder injury","Knee injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-trikonasana', 'Trikonasana', 'Trikonasana', 'asana', '["hips"]', '["hamstrings","spine"]', '["Stretches legs and torso","Strengthens core","Improves balance"]', 'beginner', '["Low blood pressure","Neck injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-parivrtta-trikon', 'Parivritta Trikonasana', 'Parivritta Trikonasana', 'asana', '["spine"]', '["hamstrings","hips"]', '["Deep spinal twist","Improves digestion","Strengthens legs"]', 'intermediate', '["Spinal disc issues","Low blood pressure"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-parsvakonasana', 'Parsvakonasana', 'Parsvakonasana', 'asana', '["hips"]', '["spine","shoulders"]', '["Stretches side body","Strengthens legs","Opens chest"]', 'intermediate', '["Knee injury","Shoulder injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-prasarita-pado', 'Prasarita Padottanasana', 'Prasarita Padottanasana', 'asana', '["hamstrings"]', '["hips","spine"]', '["Stretches inner thighs","Lengthens spine","Calms the mind"]', 'beginner', '["Lower back injury","Hamstring tear"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-parsvottanasana', 'Parsvottanasana', 'Parsvottanasana', 'asana', '["hamstrings"]', '["shoulders","spine"]', '["Intense side stretch","Stretches hamstrings deeply","Improves balance"]', 'intermediate', '["Hamstring injury","High blood pressure"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-padahastasana', 'Padahastasana', 'Padahastasana', 'asana', '["hamstrings"]', '["spine"]', '["Stretches entire posterior chain","Stimulates digestion","Calms nervous system"]', 'intermediate', '["Lower back injury","High blood pressure"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-ardha-chakrasana', 'Ardha Chakrasana', 'Ardha Chakrasana', 'asana', '["spine"]', '["shoulders"]', '["Gentle backbend","Opens chest","Stretches abdominal muscles"]', 'beginner', '["Severe back pain","Vertigo"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-kati-chakrasana', 'Kati Chakrasana', 'Kati Chakrasana', 'asana', '["spine"]', '["hips"]', '["Waist twisting","Improves spinal flexibility","Tones waist"]', 'beginner', '["Spinal injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-standing-half-split', 'Standing Half Split', NULL, 'asana', '["hamstrings"]', '["hips","calves"]', '["Deep hamstring stretch","Improves balance","Builds leg strength"]', 'intermediate', '["Hamstring injury","Low blood pressure"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-ardha-hanumanasana', 'Ardha Hanumanasana', 'Ardha Hanumanasana', 'asana', '["hamstrings"]', '["calves","hips"]', '["Deep hamstring stretch","Prepares for full splits","Releases tight legs"]', 'intermediate', '["Hamstring tear","Knee injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-natarajasana', 'Natarajasana', 'Natarajasana', 'asana', '["hips"]', '["shoulders","spine"]', '["Improves balance","Opens hip flexors and shoulders","Builds concentration"]', 'advanced', '["Ankle injury","Low blood pressure"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-garudasana', 'Garudasana', 'Garudasana', 'asana', '["shoulders"]', '["hips","ankles"]', '["Stretches shoulders and upper back","Improves balance","Strengthens legs"]', 'intermediate', '["Knee injury","Shoulder injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-ek-pada-angustha', 'Ek Pada Angusthasana', 'Ek Pada Angusthasana', 'asana', '["hamstrings"]', '["hips","core"]', '["Stretches hamstrings","Improves balance","Strengthens standing leg"]', 'intermediate', '["Hamstring injury","Ankle instability"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-urdhva-pras-eka-pad', 'Urdhva Prasarita Eka Padasana', 'Urdhva Prasarita Eka Padasana', 'asana', '["hamstrings"]', '["hips","core"]', '["Deep hamstring stretch","Builds balance","Strengthens standing leg"]', 'intermediate', '["Hamstring injury","Low blood pressure"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-ardha-chandrasana', 'Ardha Chandrasana', 'Ardha Chandrasana', 'asana', '["hips"]', '["core","ankles"]', '["Improves balance","Opens hips","Strengthens standing leg"]', 'intermediate', '["Ankle injury","Low blood pressure"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-parighasana', 'Parighasana', 'Parighasana', 'asana', '["spine"]', '["hips","shoulders"]', '["Stretches side body deeply","Opens intercostal muscles","Improves breathing"]', 'intermediate', '["Knee injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-ardha-mandala', 'Ardha Mandala Asana', 'Ardha Mandala Asana', 'asana', '["spine"]', '["hips"]', '["Lateral stretch","Strengthens obliques","Improves side flexibility"]', 'intermediate', '["Spinal injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-reverse-warrior', 'Reverse Warrior', NULL, 'asana', '["spine"]', '["hips","shoulders"]', '["Opens side body","Stretches intercostals","Strengthens legs"]', 'beginner', '["Knee injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-extended-side-angle', 'Extended Side Angle', NULL, 'asana', '["hips"]', '["spine","shoulders"]', '["Deep side stretch","Strengthens legs","Opens chest"]', 'intermediate', '["Knee injury"]', 'inhale', TRUE);

-- =============================================
-- SEATED ASANAS (19 entries)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-dandasana', 'Dandasana', 'Dandasana', 'asana', '["spine"]', '["core","hamstrings"]', '["Improves posture","Strengthens back","Foundation for seated poses"]', 'beginner', '["Severe lower back pain"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-vajrasana', 'Vajrasana', 'Vajrasana', 'asana', '["knees"]', '["ankles","spine"]', '["Aids digestion","Calms the mind","Stretches thighs and ankles"]', 'beginner', '["Severe knee pain","Ankle injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-sukhasana', 'Sukhasana', 'Sukhasana', 'asana', '["hips"]', '["spine"]', '["Comfortable meditation seat","Opens hips gently","Calms nervous system"]', 'beginner', '["Severe knee pain"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-paschimottanasana', 'Paschimottanasana', 'Paschimottanasana', 'asana', '["hamstrings"]', '["spine","calves"]', '["Stretches entire back body","Calms nervous system","Stimulates digestion"]', 'beginner', '["Herniated disc","Hamstring tear"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-janu-sirshasana', 'Janu Sirshasana', 'Janu Sirshasana', 'asana', '["hamstrings"]', '["spine","hips"]', '["Stretches hamstrings asymmetrically","Soothes nervous system","Improves digestion"]', 'beginner', '["Knee injury","Lower back injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-parivrtta-janu', 'Parivritta Janu Sirshasana', 'Parivritta Janu Sirshasana', 'asana', '["spine"]', '["hamstrings","shoulders"]', '["Side stretch with twist","Opens chest","Stretches intercostal muscles"]', 'intermediate', '["Spinal disc issues","Hamstring injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-upavistha-konasana', 'Upavistha Konasana', 'Upavistha Konasana', 'asana', '["hips"]', '["hamstrings"]', '["Opens inner thighs","Stretches adductors","Lengthens spine"]', 'intermediate', '["Groin injury","Hamstring tear"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-parivrtta-upavistha', 'Parivritta Upavistha Konasana', 'Parivritta Upavistha Konasana', 'asana', '["spine"]', '["hips","hamstrings"]', '["Rotates spine deeply","Opens hips","Stretches side body"]', 'intermediate', '["Spinal disc issues","Groin injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-baddha-konasana', 'Baddha Konasana', 'Baddha Konasana', 'asana', '["hips"]', '["knees"]', '["Opens inner thighs and hips","Stimulates pelvic organs","Relieves fatigue"]', 'beginner', '["Groin injury","Knee injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-malasana', 'Malasana', 'Malasana', 'asana', '["hips"]', '["ankles","knees"]', '["Opens hips deeply","Stretches groin","Strengthens ankles"]', 'beginner', '["Knee injury","Ankle injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-gomukhasana', 'Gomukhasana', 'Gomukhasana', 'asana', '["shoulders"]', '["hips"]', '["Deep shoulder stretch","Opens chest","Stretches hips and thighs"]', 'intermediate', '["Shoulder injury","Knee pain"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-bhadrasana', 'Bhadrasana', 'Bhadrasana', 'asana', '["hips"]', '["knees"]', '["Opens hips and groin","Improves pelvic circulation","Calms the mind"]', 'beginner', '["Knee injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-vakrasana', 'Vakrasana', 'Vakrasana', 'asana', '["spine"]', '["core"]', '["Simple spinal twist","Improves digestion","Releases spinal tension"]', 'beginner', '["Spinal disc issues"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-ardha-matsyendrasana', 'Ardha Matsyendrasana', 'Ardha Matsyendrasana', 'asana', '["spine"]', '["hips","core"]', '["Deep spinal twist","Detoxifies abdominal organs","Improves spinal mobility"]', 'intermediate', '["Spinal injury","Pregnancy"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-navasana', 'Navasana', 'Navasana', 'asana', '["core"]', '["hips","spine"]', '["Strengthens core intensely","Tones hip flexors","Improves balance"]', 'intermediate', '["Lower back injury","Pregnancy"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-tolangulasana', 'Tolangulasana', 'Tolangulasana', 'asana', '["core"]', '["shoulders"]', '["Intense core activation","Strengthens arms","Builds upper body strength"]', 'advanced', '["Wrist injury","Shoulder injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-shashankasana', 'Shashankasana', 'Shashankasana', 'asana', '["spine"]', '["shoulders","hips"]', '["Relaxes spine","Calms mind","Stretches back muscles"]', 'beginner', '["Knee injury","Vertigo"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-eagle-arms', 'Eagle Arms', NULL, 'asana', '["shoulders"]', '["spine"]', '["Stretches upper back","Opens space between shoulder blades","Relieves tension"]', 'beginner', '["Shoulder injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-reverse-prayer', 'Reverse Prayer Arms', NULL, 'asana', '["shoulders"]', '["spine"]', '["Opens chest and shoulders","Improves wrist flexibility","Corrects rounded shoulders"]', 'intermediate', '["Wrist injury","Shoulder injury"]', 'inhale', TRUE);

-- =============================================
-- ARM BALANCE / INVERSIONS (3 entries)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-kakasana', 'Kakasana', 'Kakasana', 'asana', '["core"]', '["shoulders"]', '["Builds arm balance","Strengthens wrists and core","Builds focus"]', 'advanced', '["Wrist injury","Pregnancy","Shoulder injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-piston-squat', 'Piston Squat', NULL, 'asana', '["knees"]', '["hips","core"]', '["Builds single-leg strength","Improves balance","Tests mobility"]', 'advanced', '["Knee injury","Ankle instability"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-one-arm-high-plank', 'One Arm High Plank', NULL, 'asana', '["core"]', '["shoulders"]', '["Builds anti-rotation core strength","Strengthens shoulders","Improves stability"]', 'advanced', '["Wrist injury","Shoulder injury"]', 'exhale', TRUE);

-- =============================================
-- PRONE ASANAS (6 entries)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-bhujangasana', 'Bhujangasana', 'Bhujangasana', 'asana', '["spine"]', '["shoulders","core"]', '["Strengthens spine","Opens chest","Relieves back pain"]', 'beginner', '["Pregnancy","Severe back injury","Carpal tunnel"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-triyak-bhujangasana', 'Triyak Bhujangasana', 'Triyak Bhujangasana', 'asana', '["spine"]', '["shoulders","neck"]', '["Twists spine in cobra position","Improves spinal flexibility","Massages abdominal organs"]', 'intermediate', '["Pregnancy","Severe back pain"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-sphinx-pose', 'Sphinx Pose', NULL, 'asana', '["spine"]', '["shoulders"]', '["Gentle backbend","Strengthens spine","Opens chest"]', 'beginner', '["Severe back pain"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-shalabhasana', 'Shalabhasana', 'Shalabhasana', 'asana', '["spine"]', '["core","hips"]', '["Strengthens back muscles","Tones glutes","Improves posture"]', 'intermediate', '["Pregnancy","Abdominal surgery"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-dhanurasana', 'Dhanurasana', 'Dhanurasana', 'asana', '["spine"]', '["shoulders","hips"]', '["Deep backbend","Opens chest and shoulders","Strengthens back"]', 'intermediate', '["Pregnancy","Hernia","High blood pressure"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-makarasana', 'Makarasana', 'Makarasana', 'asana', '["spine"]', '["shoulders"]', '["Relaxes back muscles","Reduces stress","Gentle prone rest"]', 'beginner', '["Pregnancy (late trimester)"]', 'exhale', TRUE);

-- =============================================
-- BACKBENDS (4 entries)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-ustrasana', 'Ustrasana', 'Ustrasana', 'asana', '["spine"]', '["hips","shoulders"]', '["Opens chest deeply","Stretches hip flexors","Strengthens back"]', 'intermediate', '["Severe back pain","Neck injury","Low blood pressure"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-chakrasana', 'Chakrasana', 'Chakrasana', 'asana', '["spine"]', '["shoulders","hips"]', '["Full body backbend","Opens chest and shoulders","Energizes body"]', 'advanced', '["Wrist injury","Back injury","High blood pressure"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-anahatasana', 'Anahatasana', 'Anahatasana', 'asana', '["shoulders"]', '["spine"]', '["Opens heart space","Stretches upper back","Releases shoulder tension"]', 'beginner', '["Shoulder injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-uttana-shishosana', 'Uttana Shishosana', 'Uttana Shishosana', 'asana', '["shoulders"]', '["spine"]', '["Deep shoulder stretch","Opens upper back","Relieves tension"]', 'beginner', '["Knee injury"]', 'exhale', TRUE);

-- =============================================
-- SUPINE ASANAS (13 entries)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-setu-bandhasana', 'Setu Bandhasana', 'Setu Bandhasana', 'asana', '["spine"]', '["hips","core"]', '["Strengthens glutes and back","Opens chest","Calms nervous system"]', 'beginner', '["Neck injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-sarvangasana', 'Sarvangasana', 'Sarvangasana', 'asana', '["shoulders"]', '["spine","core"]', '["Stimulates thyroid","Calms nervous system","Improves circulation"]', 'intermediate', '["Neck injury","High blood pressure","Menstruation"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-halasana', 'Halasana', 'Halasana', 'asana', '["spine"]', '["shoulders","hamstrings"]', '["Stretches spine deeply","Calms the mind","Stimulates thyroid"]', 'intermediate', '["Neck injury","High blood pressure","Pregnancy"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-matsyasana', 'Matsyasana', 'Matsyasana', 'asana', '["spine"]', '["shoulders","neck"]', '["Counter-pose to shoulder stand","Opens chest","Stretches throat"]', 'intermediate', '["Neck injury","High blood pressure"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-pavanamuktasana', 'Pavanamuktasana', 'Pavanamuktasana', 'asana', '["core"]', '["spine","hips"]', '["Relieves gas and bloating","Massages abdominal organs","Relaxes lower back"]', 'beginner', '["Pregnancy","Abdominal surgery"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-supta-baddha-kon', 'Supta Baddha Konasana', 'Supta Baddha Konasana', 'asana', '["hips"]', '["spine"]', '["Opens hips passively","Deeply relaxing","Stimulates pelvic circulation"]', 'beginner', '["Groin injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-supta-matsyendrasana', 'Supta Matsyendrasana', 'Supta Matsyendrasana', 'asana', '["spine"]', '["hips"]', '["Releases spinal tension","Aids digestion","Opens chest in twist"]', 'beginner', '["Spinal disc issues"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-viparita-karani', 'Viparita Karani', 'Viparita Karani', 'asana', '["nervous_system"]', '["hips","calves"]', '["Reduces leg fatigue","Calms nervous system","Improves circulation"]', 'beginner', '["Glaucoma","Menstruation"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-uttanapadasana', 'Uttanapadasana', 'Uttanapadasana', 'asana', '["core"]', '["hips"]', '["Strengthens lower abdomen","Tones legs","Improves digestion"]', 'beginner', '["Lower back pain","Pregnancy"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-jathara-parivartan', 'Jathara Parivartanasana', 'Jathara Parivartanasana', 'asana', '["spine"]', '["core","hips"]', '["Deep supine twist","Massages abdominal organs","Releases lower back"]', 'beginner', '["Spinal disc issues"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-apanasana', 'Apanasana', 'Apanasana', 'asana', '["spine"]', '["hips"]', '["Gentle compression for lower back","Aids digestion","Releases tension"]', 'beginner', '["Pregnancy"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-stambha-asana', 'Stambha Asana', NULL, 'asana', '["core"]', '["hips","spine"]', '["Core stability without momentum","Improves coordination","Protects lower back"]', 'intermediate', '["Lower back injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-supta-virasana', 'Supta Virasana', 'Supta Virasana', 'asana', '["knees"]', '["hips","spine"]', '["Stretches thighs deeply","Opens hip flexors","Aids digestion"]', 'intermediate', '["Knee injury","Ankle injury"]', 'exhale', TRUE);

-- =============================================
-- HIP OPENING (5 entries)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-anjaneyasana', 'Anjaneyasana', 'Anjaneyasana', 'asana', '["hips"]', '["knees","spine"]', '["Opens hip flexors","Stretches groin","Strengthens legs"]', 'beginner', '["Knee injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-utthan-pristhasana', 'Utthan Pristhasana', 'Utthan Pristhasana', 'asana', '["hips"]', '["hamstrings"]', '["Deep hip opener","Stretches inner thighs","Prepares for splits"]', 'intermediate', '["Groin injury","Knee pain"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-eka-pada-rajakapo', 'Eka Pada Rajakapotasana', 'Eka Pada Rajakapotasana', 'asana', '["hips"]', '["spine","knees"]', '["Deep hip opener","Stretches piriformis","Releases stored emotions"]', 'intermediate', '["Knee injury","Sacroiliac joint issues"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-mandukasana', 'Mandukasana', 'Mandukasana', 'asana', '["hips"]', '["knees","core"]', '["Opens hips deeply","Stimulates abdominal organs","Stretches inner thighs"]', 'intermediate', '["Knee injury","Ankle injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-skandasana', 'Skandasana', 'Skandasana', 'asana', '["hips"]', '["hamstrings","ankles"]', '["Deep side lunge stretch","Improves hip mobility","Strengthens legs"]', 'intermediate', '["Knee injury","Groin injury"]', 'exhale', TRUE);

-- =============================================
-- PLANK / ARM SUPPORT (15 entries)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-phalakasana', 'Phalakasana', 'Phalakasana', 'asana', '["core"]', '["shoulders"]', '["Builds core strength","Strengthens arms and shoulders","Improves posture"]', 'beginner', '["Wrist injury","Shoulder injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-vasisthasana', 'Vasisthasana', 'Vasisthasana', 'asana', '["core"]', '["shoulders"]', '["Strengthens obliques","Builds arm balance","Improves wrist strength"]', 'intermediate', '["Wrist injury","Shoulder injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-chaturanga', 'Chaturanga Dandasana', 'Chaturanga Dandasana', 'asana', '["core"]', '["shoulders"]', '["Builds upper body strength","Strengthens core","Prepares for arm balances"]', 'intermediate', '["Wrist injury","Shoulder injury","Carpal tunnel"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-forearm-plank', 'Forearm Plank', NULL, 'asana', '["core"]', '["shoulders"]', '["Core endurance","Reduces wrist strain","Strengthens shoulders"]', 'intermediate', '["Shoulder injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-dolphin-pose', 'Dolphin Pose', NULL, 'asana', '["shoulders"]', '["core","hamstrings"]', '["Strengthens shoulders","Opens upper back","Builds forearm strength"]', 'intermediate', '["Shoulder injury","Neck injury"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-purvottanasana', 'Purvottanasana', 'Purvottanasana', 'asana', '["shoulders"]', '["core","spine"]', '["Opens chest","Strengthens wrists and arms","Counter-pose to forward bends"]', 'intermediate', '["Wrist injury","Neck injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-urdhva-mukha-svan', 'Urdhva Mukha Svanasana', 'Urdhva Mukha Svanasana', 'asana', '["spine"]', '["shoulders","core"]', '["Opens chest","Strengthens back","Energizing backbend"]', 'beginner', '["Back injury","Carpal tunnel"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-adho-mukha-svan', 'Adho Mukha Svanasana', 'Adho Mukha Svanasana', 'asana', '["shoulders"]', '["hamstrings","calves"]', '["Full body stretch","Calms the mind","Strengthens arms and legs"]', 'beginner', '["Carpal tunnel","High blood pressure","Late pregnancy"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-pincha-mayurasana', 'Pincha Mayurasana', 'Pincha Mayurasana', 'asana', '["shoulders"]', '["core","spine"]', '["Builds forearm balance","Strengthens shoulders","Improves focus"]', 'advanced', '["Shoulder injury","Neck injury","High blood pressure"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-hasta-uttanasana', 'Hasta Uttanasana', 'Hasta Uttanasana', 'asana', '["spine"]', '["shoulders"]', '["Gentle backbend","Opens chest","Stretches abdomen"]', 'beginner', '["Severe back pain"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-parvatasana', 'Parvatasana', 'Parvatasana', 'asana', '["shoulders"]', '["hamstrings","calves"]', '["Stretches back and legs","Strengthens arms","Calms the mind"]', 'beginner', '["Wrist injury","High blood pressure"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-balasana', 'Balasana', 'Balasana', 'asana', '["spine"]', '["hips","shoulders"]', '["Resting pose","Calms nervous system","Gently stretches back"]', 'beginner', '["Knee injury","Pregnancy (use modified)"]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-samsthiti', 'Samsthiti', 'Samsthiti', 'asana', '["spine"]', '["ankles"]', '["Centering posture","Grounds awareness","Aligns body"]', 'beginner', '[]', 'exhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-ashta-chandrasana', 'Ashta Chandrasana', 'Ashta Chandrasana', 'asana', '["hips"]', '["spine","shoulders"]', '["Opens hip flexors","Stretches entire front body","Builds balance"]', 'intermediate', '["Knee injury"]', 'inhale', TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('a-uttana-mandukasana', 'Uttana Mandukasana', 'Uttana Mandukasana', 'asana', '["core"]', '["hips"]', '["Stimulates digestive organs","Strengthens core","Stretches abdomen"]', 'intermediate', '["Knee injury","Peptic ulcer"]', 'exhale', TRUE);

-- =============================================
-- PRANAYAMA (8 entries)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('pr-anulom-vilom', 'Anulom Vilom', 'Anulom Vilom', 'pranayama', '["respiratory"]', '["nervous_system"]', '["Balances left and right brain","Calms nervous system","Improves lung capacity"]', 'beginner', '["Severe nasal congestion"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('pr-bhramari', 'Bhramari', 'Bhramari', 'pranayama', '["nervous_system"]', '["respiratory"]', '["Calms anxiety","Reduces anger","Improves concentration"]', 'beginner', '["Ear infection"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('pr-kapalabhati', 'Kapalabhati', 'Kapalabhati', 'pranayama', '["core"]', '["respiratory"]', '["Cleanses nasal passages","Energizes body","Strengthens abdominals"]', 'intermediate', '["High blood pressure","Pregnancy","Heart disease"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('pr-nadi-shodhana', 'Nadi Shodhana', 'Nadi Shodhana', 'pranayama', '["nervous_system"]', '["respiratory"]', '["Purifies energy channels","Deeply calming","Balances hemispheres"]', 'beginner', '["Severe nasal congestion"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('pr-sheetali', 'Sheetali', 'Sheetali', 'pranayama', '["respiratory"]', '["nervous_system"]', '["Cools the body","Reduces pitta/heat","Calms the mind"]', 'beginner', '["Asthma","Cold weather practice"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('pr-bhastrika', 'Bhastrika', 'Bhastrika', 'pranayama', '["respiratory"]', '["core"]', '["Increases energy","Oxygenates blood","Strengthens lungs"]', 'intermediate', '["High blood pressure","Heart disease","Pregnancy"]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('pr-sectional-breathing', 'Sectional Breathing', NULL, 'pranayama', '["respiratory"]', '["core"]', '["Develops breath awareness","Expands lung capacity","Foundation for pranayama"]', 'beginner', '[]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('pr-yogic-deep-breathing', 'Yogic Deep Breathing', NULL, 'pranayama', '["respiratory"]', '["nervous_system"]', '["Full lung utilization","Calms the mind","Improves oxygen intake"]', 'beginner', '[]', NULL, TRUE);

-- =============================================
-- RELAXATION (2 entries)
-- =============================================

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('rl-shavasana', 'Shavasana', 'Shavasana', 'relaxation', '["nervous_system"]', '["spine"]', '["Deep relaxation","Integrates practice benefits","Activates parasympathetic system"]', 'beginner', '[]', NULL, TRUE);

INSERT IGNORE INTO asanas (id, name, sanskrit_name, type, primary_body_areas, secondary_body_areas, benefits, difficulty, contraindications, breathing_cue, is_active) VALUES
('rl-yoga-nidra', 'Yoga Nidra', NULL, 'relaxation', '["nervous_system"]', '[]', '["Deep conscious relaxation","Reduces stress profoundly","Improves sleep quality"]', 'beginner', '[]', NULL, TRUE);

-- =============================================
-- Summary:
--   Exercises:  17
--   Kriyas:      4
--   Standing:   29
--   Seated:     19
--   Arm Balance: 3
--   Prone:       6
--   Backbends:   4
--   Supine:     13
--   Hip Opening: 5
--   Plank/Arm:  15
--   Pranayama:   8
--   Relaxation:  2
--   TOTAL:     125 individual asanas
-- =============================================

-- =============================================
-- STEP 2: REMAP — Update session_plans & session_executions JSON
-- to replace old UUID-based asana IDs with new slug-based IDs.
-- Now that new records exist (from INSERTs above), we can JOIN
-- old records to new records by name and replace IDs in JSON.
-- =============================================

-- Remap old individual asana IDs in session_plans
UPDATE session_plans sp
  JOIN asanas old_a ON old_a.type = 'exercise' AND old_a.id NOT LIKE 'ex-%'
  JOIN asanas new_a ON new_a.type = 'exercise' AND new_a.id LIKE 'ex-%' AND new_a.name = old_a.name
  SET sp.sections = REPLACE(sp.sections, old_a.id, new_a.id)
  WHERE sp.sections LIKE CONCAT('%', old_a.id, '%');

UPDATE session_plans sp
  JOIN asanas old_a ON old_a.type = 'kriya' AND old_a.id NOT LIKE 'kr-%'
  JOIN asanas new_a ON new_a.type = 'kriya' AND new_a.id LIKE 'kr-%' AND new_a.name = old_a.name
  SET sp.sections = REPLACE(sp.sections, old_a.id, new_a.id)
  WHERE sp.sections LIKE CONCAT('%', old_a.id, '%');

UPDATE session_plans sp
  JOIN asanas old_a ON old_a.type = 'asana' AND old_a.id NOT LIKE 'a-%'
  JOIN asanas new_a ON new_a.type = 'asana' AND new_a.id LIKE 'a-%' AND new_a.name = old_a.name
  SET sp.sections = REPLACE(sp.sections, old_a.id, new_a.id)
  WHERE sp.sections LIKE CONCAT('%', old_a.id, '%');

UPDATE session_plans sp
  JOIN asanas old_a ON old_a.type = 'pranayama' AND old_a.id NOT LIKE 'pr-%'
  JOIN asanas new_a ON new_a.type = 'pranayama' AND new_a.id LIKE 'pr-%' AND new_a.name = old_a.name
  SET sp.sections = REPLACE(sp.sections, old_a.id, new_a.id)
  WHERE sp.sections LIKE CONCAT('%', old_a.id, '%');

UPDATE session_plans sp
  JOIN asanas old_a ON old_a.type = 'relaxation' AND old_a.id NOT LIKE 'rl-%'
  JOIN asanas new_a ON new_a.type = 'relaxation' AND new_a.id LIKE 'rl-%' AND new_a.name = old_a.name
  SET sp.sections = REPLACE(sp.sections, old_a.id, new_a.id)
  WHERE sp.sections LIKE CONCAT('%', old_a.id, '%');

-- Same for session_executions snapshots
UPDATE session_executions se
  JOIN asanas old_a ON old_a.id NOT LIKE 'ex-%' AND old_a.id NOT LIKE 'kr-%' AND old_a.id NOT LIKE 'a-%' AND old_a.id NOT LIKE 'pr-%' AND old_a.id NOT LIKE 'rl-%' AND old_a.id NOT LIKE 'sn-%' AND old_a.id NOT LIKE 'v-%'
  JOIN asanas new_a ON new_a.type = old_a.type AND new_a.name = old_a.name AND new_a.id != old_a.id
  SET se.sections_snapshot = REPLACE(se.sections_snapshot, old_a.id, new_a.id)
  WHERE se.sections_snapshot LIKE CONCAT('%', old_a.id, '%');

-- =============================================
-- STEP 3: SAFE CLEANUP — Delete old UUID-based asanas after remap
-- Safe because: asanas table has NO FK constraints (IDs only in JSON),
-- and REMAP above already updated all JSON references to new slug IDs.
-- Only deletes old records that have a matching new slug-based record
-- (same type + same name). Unique/renamed asanas are preserved.
-- =============================================
DELETE old_a FROM asanas old_a
  JOIN asanas new_a ON new_a.type = old_a.type AND new_a.name = old_a.name AND new_a.id != old_a.id
  WHERE old_a.id NOT LIKE 'ex-%' AND old_a.id NOT LIKE 'kr-%' AND old_a.id NOT LIKE 'a-%'
    AND old_a.id NOT LIKE 'pr-%' AND old_a.id NOT LIKE 'rl-%'
    AND old_a.id NOT LIKE 'sn-%' AND old_a.id NOT LIKE 'v-%';
