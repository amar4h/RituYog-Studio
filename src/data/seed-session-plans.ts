/**
 * Session plans from Yoga Plans PDF.
 * Asana references are by name — resolved to IDs at seed time.
 * Each plan maps to the 5-section structure: WARM_UP, SURYA_NAMASKARA, ASANA_SEQUENCE, PRANAYAMA, SHAVASANA
 */

import type { DifficultyLevel, IntensityLevel, SectionType } from '../types';

export interface SectionItemSeed {
  asanaName: string;
  intensity?: IntensityLevel;
  notes?: string;
  reps?: number;
  durationMinutes?: number;
}

export interface SessionPlanSeed {
  name: string;
  description?: string;
  level: DifficultyLevel;
  sections: {
    sectionType: SectionType;
    items: SectionItemSeed[];
  }[];
}

export const SEED_SESSION_PLANS: SessionPlanSeed[] = [
  // =============================================
  // FULL BODY PLANS
  // =============================================
  {
    name: 'Full Body (1)',
    description: 'Full body practice with Ashtanga B variation including Uttan Prishta and Malasana',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation' },
        { asanaName: 'Squat with Hand Raise' },
        { asanaName: 'Ardha Uttanasana', notes: 'Palm under toes, knee and hip movement' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga B', notes: 'With Uttan Prishta and Malasana', reps: 4 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Parsvakonasana', intensity: 'medium' },
        { asanaName: 'Standing Half Split', intensity: 'medium' },
        { asanaName: 'Ardha Hanumanasana', intensity: 'medium', notes: 'Backward + forward' },
        { asanaName: 'Piston Squat', intensity: 'high' },
        { asanaName: 'Parivritta Janu Sirshasana', intensity: 'medium' },
        { asanaName: 'Chakrasana', intensity: 'high' },
        { asanaName: 'Pavanamuktasana', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Full Body (2)',
    description: 'Full body with humble warrior and shoulder stand sequence',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation' },
        { asanaName: 'On Cat Pose Knee Rotations' },
        { asanaName: 'Anjaneyasana', notes: 'Ek Pada Adhumukha to Parivrita dynamic' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga B', notes: 'With Uttan Prishta and Skandasana', reps: 4 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Vinamra Veerbhadrasana', intensity: 'medium' },
        { asanaName: 'Prasarita Padottanasana', intensity: 'medium', notes: 'With wheel towards back of legs' },
        { asanaName: 'Forearm Plank', intensity: 'high', notes: 'Elbow plank with knee on elbow' },
        { asanaName: 'Janu Sirshasana', intensity: 'medium' },
        { asanaName: 'Parivritta Upavistha Konasana', intensity: 'medium' },
        { asanaName: 'Sarvangasana', intensity: 'medium' },
        { asanaName: 'Matsyasana', intensity: 'medium' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Full Body (3)',
    description: 'Full body with backbends and lateral stretches',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation' },
        { asanaName: 'Shoulder Rotation with Strap', notes: 'Forward/backward and left/right' },
        { asanaName: 'Elephant Walk' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga B', notes: 'With Ashta Chandrasana', reps: 4 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Prasarita Padottanasana', intensity: 'medium', notes: 'With block' },
        { asanaName: 'Parivritta Trikonasana', intensity: 'medium', notes: 'Use wheel' },
        { asanaName: 'Natarajasana', intensity: 'high', notes: 'With strap' },
        { asanaName: 'One Arm High Plank', intensity: 'high' },
        { asanaName: 'Ustrasana', intensity: 'high', notes: 'Lateral stretch with Ustrasana legs (wheel)' },
        { asanaName: 'Chakrasana', intensity: 'high' },
        { asanaName: 'Pavanamuktasana', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Full Body (2026)',
    description: 'Full body with Ashtanga B Veerbhadra variation and balance poses',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation' },
        { asanaName: 'Squat with Hand Raise', notes: 'Sit ups with hand raised' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga B', notes: 'Variation: Veerbhadra 2 + Skandasana', reps: 4 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Ek Pada Angusthasana', intensity: 'medium' },
        { asanaName: 'Urdhva Prasarita Eka Padasana', intensity: 'medium', notes: 'With wheel' },
        { asanaName: 'Kakasana', intensity: 'high' },
        { asanaName: 'Mandukasana', intensity: 'medium' },
        { asanaName: 'Halasana', intensity: 'medium' },
        { asanaName: 'Matsyasana', intensity: 'medium' },
        { asanaName: 'Pavanamuktasana', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Full Body - Surya Namaskar Focus',
    description: 'Surya Namaskar heavy practice with Sivananda and Ashtanga A',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Cat-Cow', reps: 20 },
        { asanaName: 'Dynamic Paschimottanasana', reps: 5 },
        { asanaName: 'Dynamic Setu Bandhasana', reps: 5 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Sivananda', reps: 4, notes: 'Modern 24 Steps' },
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 3 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: []},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Full Body - 360',
    description: 'Advanced full body 360 vinyasa sequence',
    level: 'advanced',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Cat-Cow', reps: 20 },
        { asanaName: 'Dynamic Paschimottanasana', reps: 5 },
        { asanaName: 'Dynamic Setu Bandhasana', reps: 5 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: []},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Vinyasa 360', intensity: 'high', notes: '3 rounds, repeat both sides' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Full Body - Vinyasa Hold',
    description: 'Full body with three hold-based vinyasa sequences',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Cat-Cow', reps: 20 },
        { asanaName: 'Dynamic Paschimottanasana', reps: 5 },
        { asanaName: 'Dynamic Setu Bandhasana', reps: 5 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 6 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Full Body Hold Flow 1', intensity: 'medium', notes: '3 rounds' },
        { asanaName: 'Full Body Hold Flow 2', intensity: 'medium', notes: '3 rounds' },
        { asanaName: 'Full Body Hold Flow 3', intensity: 'medium', notes: '3 rounds' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },

  // =============================================
  // STRENGTH & BALANCE
  // =============================================
  {
    name: 'Strength & Balance (1)',
    description: 'Focus on single-leg balance and arm balances',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation' },
        { asanaName: 'Low Lunge Dynamic' },
        { asanaName: 'Triyak Tadasana', notes: 'Sitting variation' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga B', reps: 4 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Ek Pada Angusthasana', intensity: 'medium' },
        { asanaName: 'Urdhva Prasarita Eka Padasana', intensity: 'medium' },
        { asanaName: 'Kakasana', intensity: 'high' },
        { asanaName: 'Mandukasana', intensity: 'medium' },
        { asanaName: 'Malasana', intensity: 'low' },
        { asanaName: 'Halasana', intensity: 'medium' },
        { asanaName: 'Pavanamuktasana', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },

  // =============================================
  // SHOULDER & UPPER BACK
  // =============================================
  {
    name: 'Shoulder & Upper Back',
    description: 'Focused shoulder and upper back opening with scapular strength flows',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation' },
        { asanaName: 'Uttana Shishosana', notes: 'Puppy Pose warm-up' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 4 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Gomukhasana', intensity: 'medium' },
        { asanaName: 'Dolphin Pose', intensity: 'medium' },
        { asanaName: 'Sphinx Pose', intensity: 'low' },
        { asanaName: 'Uttana Shishosana', intensity: 'low' },
        { asanaName: 'Eagle Arms', intensity: 'low' },
        { asanaName: 'Reverse Prayer Arms', intensity: 'medium' },
        { asanaName: 'Thread the Needle', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },

  // =============================================
  // CHEST OPENING
  // =============================================
  {
    name: 'Chest Opening & Heart Space',
    description: 'Heart-opening practice with chest openers and supported backbends',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation' },
        { asanaName: 'Vaksha Shakti Vikasaka Kriya' },
        { asanaName: 'Heart Opening Warm-Up' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 4 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Standing Chest Opener', intensity: 'medium' },
        { asanaName: 'Restorative Heart Flow', intensity: 'low' },
        { asanaName: 'Uttana Shishosana', intensity: 'low', notes: 'Heart-melting pose' },
        { asanaName: 'Sphinx Pose', intensity: 'low' },
        { asanaName: 'Purvottanasana', intensity: 'medium' },
        { asanaName: 'Matsyasana', intensity: 'medium' },
        { asanaName: 'Sarvangasana', intensity: 'medium' },
        { asanaName: 'Supta Baddha Konasana', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },

  // =============================================
  // CORE STABILITY
  // =============================================
  {
    name: 'Core Stability',
    description: 'Core-focused practice with controlled flows and supine work',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation' },
        { asanaName: 'Core Warm-Up Flow' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 4 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Controlled Core Flow', intensity: 'high' },
        { asanaName: 'Supine Core Practice', intensity: 'medium' },
        { asanaName: 'Dandasana', intensity: 'low' },
        { asanaName: 'Navasana', intensity: 'high' },
        { asanaName: 'Dolphin Pose', intensity: 'medium' },
        { asanaName: 'Tolangulasana', intensity: 'high' },
        { asanaName: 'Setu Bandhasana', intensity: 'medium', notes: 'Active bridge' },
        { asanaName: 'Pavanamuktasana', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },

  // =============================================
  // BREATH-LED SLOW VINYASA
  // =============================================
  {
    name: 'Breath-Led Slow Vinyasa (1)',
    description: 'Slow breath-guided flows for nervous system regulation',
    level: 'beginner',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation' },
        { asanaName: 'Griva Shakti Vikasaka Kriya' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: []},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Grounding Breath Flow', intensity: 'low' },
        { asanaName: 'Wave-Like Breath Flow', intensity: 'low' },
        { asanaName: 'Low Energy Restorative Vinyasa', intensity: 'low' },
        { asanaName: 'Long Exhale Reset Flow', intensity: 'low' },
        { asanaName: 'Minimal Pose Breath Cycle', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Breath-Led Slow Vinyasa (2)',
    description: 'Pause-based and evening wind-down flows',
    level: 'beginner',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation' },
        { asanaName: 'Griva Shakti Vikasaka Kriya' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: []},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Long Exhale Flow', intensity: 'low' },
        { asanaName: 'Pause-Based Vinyasa', intensity: 'low' },
        { asanaName: 'Nervous System Reset', intensity: 'low' },
        { asanaName: 'Seated Breath-Led Flow', intensity: 'low' },
        { asanaName: 'Evening Wind-Down Flow', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },

  // =============================================
  // HIP PLANS
  // =============================================
  {
    name: 'Hip Flexibility (1)',
    description: 'Hip opening with twisting spinal detox vinyasa',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Butterfly' },
        { asanaName: 'Low Lunge Dynamic' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga B', notes: 'With Uttan Prishta and Malasana', reps: 4 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Twisting Flow for Spinal Detox', intensity: 'medium' },
        { asanaName: 'Anjaneyasana', intensity: 'medium' },
        { asanaName: 'Utthan Pristhasana', intensity: 'medium' },
        { asanaName: 'Upavistha Konasana', intensity: 'medium', notes: 'Side variation' },
        { asanaName: 'Parivritta Janu Sirshasana', intensity: 'medium' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Hip Flexibility (2)',
    description: 'Hip opening variation 2 with twisting flow',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Butterfly' },
        { asanaName: 'Low Lunge Dynamic' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga B', notes: 'With Uttan Prishta and Malasana', reps: 4 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Twisting Flow for Spinal Detox', intensity: 'medium' },
        { asanaName: 'Anjaneyasana', intensity: 'medium' },
        { asanaName: 'Utthan Pristhasana', intensity: 'medium' },
        { asanaName: 'Upavistha Konasana', intensity: 'medium', notes: 'Side variation' },
        { asanaName: 'Parivritta Janu Sirshasana', intensity: 'medium' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Hip Mobility',
    description: 'Hip mobility with warrior flow vinyasa',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Butterfly', reps: 20 },
        { asanaName: 'Low Lunge Dynamic', reps: 10 },
        { asanaName: 'Lying Pigeon Prep', reps: 5 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 6 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Hip Mobility Warrior Flow', intensity: 'medium', notes: '3 rounds' },
        { asanaName: 'Anjaneyasana', intensity: 'medium' },
        { asanaName: 'Utthan Pristhasana', intensity: 'medium' },
        { asanaName: 'Upavistha Konasana', intensity: 'medium', notes: 'Side variation' },
        { asanaName: 'Setu Bandhasana', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Hip Opening',
    description: 'Deep hip opening with pigeon and puppy pose',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Butterfly', reps: 20 },
        { asanaName: 'Butterfly', notes: 'Variation with hand raise up and forward', reps: 5 },
        { asanaName: 'Malasana', notes: 'Alternate hand raise', reps: 5 },
        { asanaName: 'Frog Pose Rotations', reps: 10 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga B', reps: 4 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Anjaneyasana', intensity: 'medium', reps: 2 },
        { asanaName: 'Utthan Pristhasana', intensity: 'medium', reps: 2 },
        { asanaName: 'Eka Pada Rajakapotasana', intensity: 'medium', reps: 2 },
        { asanaName: 'Uttana Shishosana', intensity: 'low', reps: 2 },
        { asanaName: 'Matsyasana', intensity: 'medium', notes: 'Wheel under spine' },
        { asanaName: 'Pavanamuktasana', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Kapalabhati', notes: '30-40 pumps' },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Hips & Lower Body',
    description: 'Lower body focus with prone backbends',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Butterfly', reps: 20 },
        { asanaName: 'Anjaneyasana', reps: 5, notes: 'Stretch' },
        { asanaName: 'Frog Pose Rotations', reps: 10 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 6 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Triyak Bhujangasana', intensity: 'medium' },
        { asanaName: 'Shalabhasana', intensity: 'medium' },
        { asanaName: 'Dhanurasana', intensity: 'high' },
        { asanaName: 'Matsyasana', intensity: 'medium', notes: 'Wheel under spine' },
        { asanaName: 'Pavanamuktasana', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Kapalabhati', notes: '30-40 pumps' },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },

  // =============================================
  // SPINE & BACK
  // =============================================
  {
    name: 'Spinal Strength (1)',
    description: 'Spinal strength with twisting detox flow and supported poses',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Cat-Cow', reps: 10 },
        { asanaName: 'Wrist and Shoulder Rotation' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 4 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Twisting Flow for Spinal Detox', intensity: 'medium' },
        { asanaName: 'Balasana', intensity: 'low', notes: 'Side stretch variation' },
        { asanaName: 'Thread the Needle', intensity: 'low' },
        { asanaName: 'Janu Sirshasana', intensity: 'medium' },
        { asanaName: 'Matsyasana', intensity: 'medium', notes: 'Supported' },
        { asanaName: 'Supta Matsyendrasana', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Spinal Strength (2)',
    description: 'Spinal strength with forward bends and shoulder stand',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Cat-Cow', reps: 10 },
        { asanaName: 'Wrist and Shoulder Rotation' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 4 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Twisting Flow for Spinal Detox', intensity: 'medium' },
        { asanaName: 'Uttana Shishosana', intensity: 'low', notes: 'Heart-melting pose' },
        { asanaName: 'Paschimottanasana', intensity: 'medium' },
        { asanaName: 'Setu Bandhasana', intensity: 'medium', notes: 'Supported' },
        { asanaName: 'Sarvangasana', intensity: 'medium' },
        { asanaName: 'Pavanamuktasana', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Spine & Back (1)',
    description: 'Spine strengthening with locust-warrior vinyasa',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation', reps: 5 },
        { asanaName: 'Low Lunge Dynamic', reps: 10 },
        { asanaName: 'Bhujangasana', notes: 'Cobra to Mountain dynamic', reps: 5 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 6 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Spine Strengthening Flow', intensity: 'medium', notes: '6 rounds' },
        { asanaName: 'Setu Bandhasana', intensity: 'low' },
        { asanaName: 'Sarvangasana', intensity: 'medium' },
        { asanaName: 'Matsyasana', intensity: 'medium' },
        { asanaName: 'Jathara Parivartanasana', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Spine & Back (2)',
    description: 'Spine and back with warrior flow and hip openers',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Supta Matsyendrasana', notes: 'Seated twists', reps: 5 },
        { asanaName: 'Cat-Cow', reps: 10 },
        { asanaName: 'Wrist and Shoulder Rotation', reps: 10 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 6 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Warrior I-II Flow', intensity: 'medium', notes: '3 rounds' },
        { asanaName: 'Malasana', intensity: 'medium', notes: 'Keep spine long, knees wide' },
        { asanaName: 'Baddha Konasana', intensity: 'low' },
        { asanaName: 'Eka Pada Rajakapotasana', intensity: 'medium' },
        { asanaName: 'Setu Bandhasana', intensity: 'medium', notes: 'Wheel under sacrum' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Bhramari', reps: 7 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },

  // =============================================
  // BACKBEND / CHEST
  // =============================================
  {
    name: 'Backbend Progression',
    description: 'Progressive backbend practice from sphinx to full wheel',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Cat-Cow', reps: 10 },
        { asanaName: 'Dynamic Setu Bandhasana', reps: 5, notes: '1 leg variation' },
        { asanaName: 'Dynamic Sphinx', reps: 5 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 6 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Sphinx Pose', intensity: 'low' },
        { asanaName: 'Dhanurasana', intensity: 'medium' },
        { asanaName: 'Ustrasana', intensity: 'medium' },
        { asanaName: 'Chakrasana', intensity: 'high', notes: 'Wheel under mid-back' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Bhramari', reps: 7 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Shoulder & Core Stability',
    description: 'Combined shoulder and core work with plank flows',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation', reps: 10 },
        { asanaName: 'Thread the Needle', reps: 5 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 6 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Plank-Chaturanga Flow', intensity: 'high', notes: '3 rounds' },
        { asanaName: 'Purvottanasana', intensity: 'medium' },
        { asanaName: 'Navasana', intensity: 'high' },
        { asanaName: 'Utkatasana', intensity: 'medium' },
        { asanaName: 'Chakrasana', intensity: 'high' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Bhramari', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Shoulder & Chest Opening',
    description: 'Shoulder and chest opening with plank-dolphin flow',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation', reps: 10 },
        { asanaName: 'Uttana Shishosana', notes: 'Puppy stretch 30 sec' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 6 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Plank-Dolphin Flow', intensity: 'medium', notes: '3 rounds' },
        { asanaName: 'Ustrasana', intensity: 'medium', notes: 'Thighs grounded, chest lifted' },
        { asanaName: 'Gomukhasana', intensity: 'medium', notes: 'Shoulder stretch, sit tall' },
        { asanaName: 'Purvottanasana', intensity: 'medium', notes: 'Lift chest, engage core' },
        { asanaName: 'Matsyasana', intensity: 'medium', notes: 'Wheel under spine' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Shoulders & Chest',
    description: 'Shoulder stability and chest opening with Nadi Shodhana',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation', reps: 10, notes: 'Arm circles' },
        { asanaName: 'Griva Shakti Vikasaka Kriya', notes: 'Neck rotations 2 min' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 6 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Shoulder Stability Flow', intensity: 'medium', notes: '3 rounds' },
        { asanaName: 'Ustrasana', intensity: 'medium', notes: 'Lift chest, thighs grounded' },
        { asanaName: 'Gomukhasana', intensity: 'medium', notes: 'Shoulder stretch, sit tall' },
        { asanaName: 'Purvottanasana', intensity: 'medium', notes: 'Engage core, lift chest' },
        { asanaName: 'Matsyasana', intensity: 'medium', notes: 'Wheel under spine' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Nadi Shodhana', reps: 10 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },

  // =============================================
  // FLEXIBILITY & RELAXATION / LATERAL
  // =============================================
  {
    name: 'Flexibility & Relaxation',
    description: 'Gentle flexibility practice with Sheetali pranayama for cooling',
    level: 'beginner',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Wrist and Shoulder Rotation', reps: 10 },
        { asanaName: 'Griva Shakti Vikasaka Kriya', notes: 'Neck rolls', reps: 5 },
        { asanaName: 'Triyak Tadasana', notes: 'Seated side bends', reps: 10 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 6 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Flexibility Flow', intensity: 'low', notes: '3 rounds' },
        { asanaName: 'Paschimottanasana', intensity: 'low', notes: 'Lengthen spine, hinge from hips' },
        { asanaName: 'Supta Baddha Konasana', intensity: 'low' },
        { asanaName: 'Viparita Karani', intensity: 'low', notes: 'Legs vertical, sacrum neutral' },
        { asanaName: 'Matsyasana', intensity: 'low', notes: 'Supported, spine on wheel' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Sheetali', reps: 7 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Lateral Bending',
    description: 'Side body opening and lateral flexibility',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Low Lunge Dynamic', notes: 'Knee bend with one leg stretch laterally', reps: 10 },
        { asanaName: 'Triyak Tadasana', reps: 5 },
        { asanaName: 'Triyak Tadasana', notes: 'Seated side bends', reps: 10 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: [
        { asanaName: 'Surya Namaskar - Ashtanga A', reps: 6 },
      ]},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Parsvakonasana', intensity: 'medium', notes: 'With wheel front rolling' },
        { asanaName: 'Ardha Chandrasana', intensity: 'medium', notes: 'With wheel or block' },
        { asanaName: 'Parighasana', intensity: 'medium' },
        { asanaName: 'Ardha Mandala Asana', intensity: 'medium' },
        { asanaName: 'Parivritta Janu Sirshasana', intensity: 'medium' },
        { asanaName: 'Halasana', intensity: 'medium' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Bhramari', reps: 7 },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },

  // =============================================
  // YOGA PROTOCOL
  // =============================================
  {
    name: 'Yoga Protocol',
    description: 'Traditional yoga protocol with Sthula Vyayama and comprehensive asana set',
    level: 'beginner',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Griva Shakti Vikasaka Kriya', notes: 'I, II, III, IV' },
        { asanaName: 'Wrist and Shoulder Rotation' },
        { asanaName: 'Kati Shakti Vikasaka Kriya', notes: 'I, II, III, IV, V' },
        { asanaName: 'Pindali Vikasak Kriya', notes: 'Knee movement Jangha Shakti Vikasaka' },
        { asanaName: 'Sarvanga Pushti' },
        { asanaName: 'Hrid Gati (Engine Daud)' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: []},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Tadasana', intensity: 'low' },
        { asanaName: 'Vrikshasana', intensity: 'low' },
        { asanaName: 'Ardha Chakrasana', intensity: 'low' },
        { asanaName: 'Padahastasana', intensity: 'medium' },
        { asanaName: 'Kati Chakrasana', intensity: 'low' },
        { asanaName: 'Trikonasana', intensity: 'low' },
        { asanaName: 'Dandasana', intensity: 'low' },
        { asanaName: 'Vajrasana', intensity: 'low' },
        { asanaName: 'Bhadrasana', intensity: 'low' },
        { asanaName: 'Mandukasana', intensity: 'medium' },
        { asanaName: 'Ustrasana', intensity: 'medium' },
        { asanaName: 'Shashankasana', intensity: 'low' },
        { asanaName: 'Uttana Mandukasana', intensity: 'medium' },
        { asanaName: 'Paschimottanasana', intensity: 'medium' },
        { asanaName: 'Purvottanasana', intensity: 'medium' },
        { asanaName: 'Vakrasana', intensity: 'low' },
        { asanaName: 'Gomukhasana', intensity: 'medium' },
        { asanaName: 'Bhujangasana', intensity: 'medium' },
        { asanaName: 'Shalabhasana', intensity: 'medium' },
        { asanaName: 'Makarasana', intensity: 'low' },
        { asanaName: 'Pavanamuktasana', intensity: 'low' },
        { asanaName: 'Uttanapadasana', intensity: 'medium' },
        { asanaName: 'Halasana', intensity: 'medium', notes: 'Ardha Halasana variation' },
        { asanaName: 'Setu Bandhasana', intensity: 'medium' },
        { asanaName: 'Viparita Karani', intensity: 'low' },
        { asanaName: 'Matsyasana', intensity: 'medium' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Sectional Breathing', notes: 'Abdominal, thoracic and clavicular' },
        { asanaName: 'Yogic Deep Breathing' },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', notes: 'With sectional breathing', durationMinutes: 5 },
      ]},
    ],
  },

  // =============================================
  // MEDITATION PLANS
  // =============================================
  {
    name: 'Meditation Wednesday (1)',
    description: 'Gentle asana flow followed by So Hum meditation',
    level: 'beginner',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Cat-Cow', reps: 5 },
        { asanaName: 'Tadasana', notes: 'Seated Tadasana and Triyak Tadasana', reps: 5 },
        { asanaName: 'Urdhva Mukha Svanasana', notes: 'Child Pose to Upward Dog dynamic', reps: 5 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: []},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Hasta Uttanasana', intensity: 'low' },
        { asanaName: 'Tadasana', intensity: 'low' },
        { asanaName: 'Ardha Chakrasana', intensity: 'low' },
        { asanaName: 'Ustrasana', intensity: 'medium' },
        { asanaName: 'Ardha Matsyendrasana', intensity: 'medium' },
        { asanaName: 'Anjaneyasana', intensity: 'medium' },
        { asanaName: 'Bhujangasana', intensity: 'low' },
        { asanaName: 'Setu Bandhasana', intensity: 'low' },
        { asanaName: 'Supta Baddha Konasana', intensity: 'low' },
        { asanaName: 'Matsyasana', intensity: 'medium' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', notes: 'So Hum Practice' },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },
  {
    name: 'Meditation Wednesday (2)',
    description: 'Shorter asana set with Box Breathing and Yoga Nidra',
    level: 'beginner',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Cat-Cow', reps: 5 },
        { asanaName: 'Tadasana', notes: 'Seated Tadasana and Triyak Tadasana', reps: 5 },
        { asanaName: 'Urdhva Mukha Svanasana', notes: 'Child Pose to Upward Dog dynamic', reps: 5 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: []},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Tadasana', intensity: 'low' },
        { asanaName: 'Ardha Chakrasana', intensity: 'low' },
        { asanaName: 'Anjaneyasana', intensity: 'medium' },
        { asanaName: 'Pincha Mayurasana', intensity: 'high', notes: 'With wheel support' },
        { asanaName: 'Setu Bandhasana', intensity: 'low' },
        { asanaName: 'Supta Baddha Konasana', intensity: 'low' },
        { asanaName: 'Matsyasana', intensity: 'medium' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Bhastrika', notes: 'Box Breathing or Pranva Jap and Bhastrika' },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Yoga Nidra', durationMinutes: 10 },
      ]},
    ],
  },
  {
    name: 'Meditation Wednesday (3)',
    description: 'Balance-focused with Pranava Jap meditation',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', items: [
        { asanaName: 'Griva Shakti Vikasaka Kriya', notes: 'Kriya 1-3', reps: 5 },
        { asanaName: 'Wrist and Shoulder Rotation', reps: 5 },
        { asanaName: 'Cat-Cow', reps: 5 },
        { asanaName: 'Pindali Vikasak Kriya', reps: 5 },
        { asanaName: 'Sarvanga Pushti', reps: 5 },
        { asanaName: 'Adho Mukha Svanasana', notes: 'Downward Dog to Upward Dog dynamic', reps: 5 },
      ]},
      { sectionType: 'SURYA_NAMASKARA', items: []},
      { sectionType: 'ASANA_SEQUENCE', items: [
        { asanaName: 'Tadasana', intensity: 'low' },
        { asanaName: 'Vrikshasana', intensity: 'medium' },
        { asanaName: 'Garudasana', intensity: 'medium' },
        { asanaName: 'Ek Pada Angusthasana', intensity: 'medium' },
        { asanaName: 'Natarajasana', intensity: 'high' },
        { asanaName: 'Jathara Parivartanasana', intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', items: [
        { asanaName: 'Anulom Vilom', notes: 'Pranava Jap Meditation' },
      ]},
      { sectionType: 'SHAVASANA', items: [
        { asanaName: 'Shavasana', durationMinutes: 5 },
      ]},
    ],
  },
];
