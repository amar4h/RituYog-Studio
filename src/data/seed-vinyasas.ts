/**
 * Vinyasa and Surya Namaskar sequences.
 * childAsanaNames are resolved to IDs at seed time after individual asanas are created.
 */

import type { AsanaType, BodyArea, DifficultyLevel, BreathingCue } from '../types';

export interface VinyasaSeed {
  name: string;
  sanskritName?: string;
  type: AsanaType;
  difficulty: DifficultyLevel;
  primaryBodyAreas: BodyArea[];
  secondaryBodyAreas: BodyArea[];
  benefits: string[];
  contraindications?: string[];
  breathingCue?: BreathingCue;
  isActive: boolean;
  /** Child asana names in sequence order — resolved to IDs at seed time */
  childAsanaNames: string[];
}

export const SEED_SURYA_NAMASKARS: VinyasaSeed[] = [
  {
    name: 'Surya Namaskar - Ashtanga A',
    type: 'surya_namaskar',
    difficulty: 'intermediate',
    primaryBodyAreas: ['spine', 'shoulders'],
    secondaryBodyAreas: ['hamstrings', 'core'],
    benefits: ['Full body warm-up', 'Builds heat', 'Synchronizes breath with movement'],
    contraindications: ['Wrist injury', 'Severe back pain'],
    isActive: true,
    childAsanaNames: [
      'Samsthiti', 'Urdhva Hastasana', 'Uttanasana', 'Ardha Uttanasana',
      'Chaturanga Dandasana', 'Urdhva Mukha Svanasana', 'Adho Mukha Svanasana',
      'Ardha Uttanasana', 'Uttanasana', 'Urdhva Hastasana', 'Samsthiti',
    ],
  },
  {
    name: 'Surya Namaskar - Ashtanga B',
    type: 'surya_namaskar',
    difficulty: 'intermediate',
    primaryBodyAreas: ['spine', 'hips'],
    secondaryBodyAreas: ['shoulders', 'knees'],
    benefits: ['Full body conditioning', 'Builds strength and flexibility', 'Engages legs deeply'],
    contraindications: ['Knee injury', 'Wrist injury'],
    isActive: true,
    childAsanaNames: [
      'Samsthiti', 'Utkatasana', 'Uttanasana', 'Ardha Uttanasana',
      'Chaturanga Dandasana', 'Urdhva Mukha Svanasana', 'Adho Mukha Svanasana',
      'Virabhadrasana I', 'Chaturanga Dandasana', 'Urdhva Mukha Svanasana',
      'Adho Mukha Svanasana', 'Virabhadrasana I', 'Chaturanga Dandasana',
      'Urdhva Mukha Svanasana', 'Adho Mukha Svanasana',
      'Ardha Uttanasana', 'Uttanasana', 'Utkatasana', 'Samsthiti',
    ],
  },
  {
    name: 'Surya Namaskar - Sivananda',
    sanskritName: 'Sivananda Surya Namaskar',
    type: 'surya_namaskar',
    difficulty: 'beginner',
    primaryBodyAreas: ['spine'],
    secondaryBodyAreas: ['shoulders', 'hamstrings'],
    benefits: ['Traditional 12-step sequence', 'Gentle full body warm-up', 'Balances chakras'],
    contraindications: ['Severe back pain'],
    isActive: true,
    childAsanaNames: [
      'Samsthiti', 'Hasta Uttanasana', 'Padahastasana', 'Anjaneyasana',
      'Phalakasana', 'Chaturanga Dandasana', 'Bhujangasana',
      'Parvatasana', 'Anjaneyasana', 'Padahastasana',
      'Hasta Uttanasana', 'Samsthiti',
    ],
  },
];

export const SEED_VINYASAS: VinyasaSeed[] = [
  // =============================================
  // CORE STABILITY VINYASAS
  // =============================================
  {
    name: 'Controlled Core Flow',
    type: 'vinyasa',
    difficulty: 'intermediate',
    primaryBodyAreas: ['core'],
    secondaryBodyAreas: ['shoulders', 'spine'],
    benefits: ['Builds core endurance', 'Full body integration', 'Strengthens upper body'],
    isActive: true,
    childAsanaNames: [
      'Utkatasana', 'Parivrtta Utkatasana', 'Uttanasana',
      'Phalakasana', 'Vasisthasana', 'Chaturanga Dandasana',
      'Urdhva Mukha Svanasana', 'Adho Mukha Svanasana',
    ],
  },
  {
    name: 'Supine Core Practice',
    type: 'vinyasa',
    difficulty: 'intermediate',
    primaryBodyAreas: ['core'],
    secondaryBodyAreas: ['hips'],
    benefits: ['Core strength without wrist load', 'Supine stability work', 'Safe for lower back'],
    isActive: true,
    childAsanaNames: [
      'Samsthiti', 'Stambha Asana', 'Navasana', 'Apanasana',
    ],
  },

  // =============================================
  // SHOULDER / CHEST VINYASAS
  // =============================================
  {
    name: 'Standing Chest Opener',
    type: 'vinyasa',
    difficulty: 'intermediate',
    primaryBodyAreas: ['shoulders'],
    secondaryBodyAreas: ['spine', 'hips'],
    benefits: ['Opens chest progressively', 'Stretches shoulders', 'Builds standing strength'],
    isActive: true,
    childAsanaNames: [
      'Samsthiti', 'Reverse Prayer Arms', 'Virabhadrasana I', 'Prasarita Padottanasana',
    ],
  },
  {
    name: 'Restorative Heart Flow',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['spine'],
    secondaryBodyAreas: ['shoulders', 'hips'],
    benefits: ['Gentle heart opening', 'Deeply restorative', 'Balances energy'],
    isActive: true,
    childAsanaNames: [
      'Ardha Chakrasana', 'Supta Virasana', 'Matsyasana', 'Pavanamuktasana', 'Shavasana',
    ],
  },
  {
    name: 'Plank-Dolphin Flow',
    type: 'vinyasa',
    difficulty: 'intermediate',
    primaryBodyAreas: ['shoulders'],
    secondaryBodyAreas: ['core'],
    benefits: ['Builds shoulder strength', 'Core endurance', 'Prepares for inversions'],
    isActive: true,
    childAsanaNames: [
      'Phalakasana', 'Vasisthasana', 'Dolphin Pose',
      'Urdhva Mukha Svanasana', 'Balasana',
    ],
  },
  {
    name: 'Shoulder Stability Flow',
    type: 'vinyasa',
    difficulty: 'intermediate',
    primaryBodyAreas: ['shoulders'],
    secondaryBodyAreas: ['core'],
    benefits: ['Builds shoulder stability', 'Strengthens rotator cuff', 'Improves upper body endurance'],
    isActive: true,
    childAsanaNames: [
      'Phalakasana', 'Vasisthasana', 'Urdhva Mukha Svanasana',
      'Dolphin Pose', 'Balasana',
    ],
  },
  {
    name: 'Plank-Chaturanga Flow',
    type: 'vinyasa',
    difficulty: 'intermediate',
    primaryBodyAreas: ['core'],
    secondaryBodyAreas: ['shoulders'],
    benefits: ['Builds push strength', 'Core stability under load', 'Upper body conditioning'],
    isActive: true,
    childAsanaNames: [
      'Phalakasana', 'Vasisthasana', 'Chaturanga Dandasana',
      'Urdhva Mukha Svanasana', 'Adho Mukha Svanasana', 'Tadasana',
    ],
  },

  // =============================================
  // BREATH-LED VINYASAS (Plan 1)
  // =============================================
  {
    name: 'Grounding Breath Flow',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['nervous_system'],
    secondaryBodyAreas: ['spine', 'hamstrings'],
    benefits: ['Calms the mind', 'Grounds energy', 'Builds breath awareness'],
    isActive: true,
    childAsanaNames: [
      'Samsthiti', 'Urdhva Hastasana', 'Uttanasana',
      'Ardha Uttanasana', 'Adho Mukha Svanasana', 'Balasana',
    ],
  },
  {
    name: 'Wave-Like Breath Flow',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['spine'],
    secondaryBodyAreas: ['nervous_system'],
    benefits: ['Gentle spinal wave', 'Soothes nervous system', 'Rhythmic movement'],
    isActive: true,
    childAsanaNames: [
      'Balasana', 'Bhujangasana', 'Adho Mukha Svanasana', 'Balasana',
    ],
  },
  {
    name: 'Low Energy Restorative Vinyasa',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['nervous_system'],
    secondaryBodyAreas: ['spine'],
    benefits: ['Deeply restorative', 'Minimal effort', 'Activates parasympathetic system'],
    isActive: true,
    childAsanaNames: [
      'Apanasana', 'Supta Matsyendrasana', 'Shavasana',
    ],
  },
  {
    name: 'Long Exhale Reset Flow',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['nervous_system'],
    secondaryBodyAreas: ['hamstrings'],
    benefits: ['Activates relaxation response', 'Releases tension', 'Calms the mind'],
    isActive: true,
    childAsanaNames: [
      'Samsthiti', 'Uttanasana', 'Balasana', 'Shavasana',
    ],
  },
  {
    name: 'Minimal Pose Breath Cycle',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['nervous_system'],
    secondaryBodyAreas: ['spine'],
    benefits: ['Nervous system settling', 'Minimal movement', 'Deep breath awareness'],
    isActive: true,
    childAsanaNames: [
      'Balasana', 'Adho Mukha Svanasana', 'Balasana',
    ],
  },

  // =============================================
  // BREATH-LED VINYASAS (Plan 2)
  // =============================================
  {
    name: 'Long Exhale Flow',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['nervous_system'],
    secondaryBodyAreas: ['hamstrings'],
    benefits: ['Lengthens exhalation', 'Calms nervous system', 'Gentle forward fold'],
    isActive: true,
    childAsanaNames: [
      'Samsthiti', 'Uttanasana', 'Ardha Uttanasana', 'Balasana',
    ],
  },
  {
    name: 'Pause-Based Vinyasa',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['nervous_system'],
    secondaryBodyAreas: ['hips'],
    benefits: ['Teaches breath pausing', 'Mindful transitions', 'Deepens awareness'],
    isActive: true,
    childAsanaNames: [
      'Anjaneyasana', 'Adho Mukha Svanasana', 'Balasana',
    ],
  },
  {
    name: 'Nervous System Reset',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['nervous_system'],
    secondaryBodyAreas: ['spine'],
    benefits: ['Activates parasympathetic system', 'Full release', 'Reduces anxiety'],
    isActive: true,
    childAsanaNames: [
      'Supta Matsyendrasana', 'Apanasana', 'Shavasana',
    ],
  },
  {
    name: 'Seated Breath-Led Flow',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['spine'],
    secondaryBodyAreas: ['nervous_system'],
    benefits: ['Seated mindful movement', 'Gentle side bends and twists', 'Breath-guided transitions'],
    isActive: true,
    childAsanaNames: [
      'Sukhasana', 'Paschimottanasana', 'Sukhasana',
    ],
  },
  {
    name: 'Evening Wind-Down Flow',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['nervous_system'],
    secondaryBodyAreas: ['hips', 'spine'],
    benefits: ['Prepares for sleep', 'Parasympathetic activation', 'Deep relaxation'],
    isActive: true,
    childAsanaNames: [
      'Supta Baddha Konasana', 'Supta Matsyendrasana', 'Apanasana', 'Shavasana',
    ],
  },

  // =============================================
  // HIP / SPINAL VINYASAS
  // =============================================
  {
    name: 'Twisting Flow for Spinal Detox',
    type: 'vinyasa',
    difficulty: 'intermediate',
    primaryBodyAreas: ['spine'],
    secondaryBodyAreas: ['hips', 'core'],
    benefits: ['Detoxifies through twisting', 'Mobilizes spine', 'Stimulates digestion'],
    isActive: true,
    childAsanaNames: [
      'Parivrtta Utkatasana', 'Uttanasana', 'Ardha Matsyendrasana',
    ],
  },
  {
    name: 'Hip Mobility Warrior Flow',
    type: 'vinyasa',
    difficulty: 'intermediate',
    primaryBodyAreas: ['hips'],
    secondaryBodyAreas: ['spine', 'shoulders'],
    benefits: ['Opens hips dynamically', 'Builds leg strength', 'Improves balance'],
    isActive: true,
    childAsanaNames: [
      'Virabhadrasana II', 'Reverse Warrior', 'Extended Side Angle',
      'Trikonasana', 'Adho Mukha Svanasana',
    ],
  },
  {
    name: 'Spine Strengthening Flow',
    type: 'vinyasa',
    difficulty: 'intermediate',
    primaryBodyAreas: ['spine'],
    secondaryBodyAreas: ['shoulders', 'hips'],
    benefits: ['Strengthens back extensors', 'Builds spinal endurance', 'Opens chest'],
    isActive: true,
    childAsanaNames: [
      'Shalabhasana', 'Phalakasana', 'Parvatasana',
      'Virabhadrasana I', 'Parvatasana',
    ],
  },

  // =============================================
  // FULL BODY VINYASAS
  // =============================================
  {
    name: 'Full Body Hold Flow 1',
    type: 'vinyasa',
    difficulty: 'intermediate',
    primaryBodyAreas: ['hamstrings'],
    secondaryBodyAreas: ['hips', 'shoulders'],
    benefits: ['Builds endurance through holds', 'Develops patience', 'Full body stretch'],
    isActive: true,
    childAsanaNames: [
      'Parsvottanasana', 'Ardha Uttanasana', 'Anjaneyasana', 'Adho Mukha Svanasana',
    ],
  },
  {
    name: 'Full Body Hold Flow 2',
    type: 'vinyasa',
    difficulty: 'intermediate',
    primaryBodyAreas: ['hips'],
    secondaryBodyAreas: ['shoulders'],
    benefits: ['Hip opening through holds', 'Builds lower body strength', 'Develops stability'],
    isActive: true,
    childAsanaNames: [
      'Parsvakonasana', 'Vinamra Veerbhadrasana', 'Malasana', 'Adho Mukha Svanasana',
    ],
  },
  {
    name: 'Full Body Hold Flow 3',
    type: 'vinyasa',
    difficulty: 'intermediate',
    primaryBodyAreas: ['hips'],
    secondaryBodyAreas: ['core', 'shoulders'],
    benefits: ['Combined holds with dynamic movement', 'Full body conditioning', 'Builds heat'],
    isActive: true,
    childAsanaNames: [
      'Prasarita Padottanasana', 'Anjaneyasana', 'Chaturanga Dandasana',
      'Urdhva Mukha Svanasana', 'Adho Mukha Svanasana',
    ],
  },
  {
    name: 'Vinyasa 360',
    type: 'vinyasa',
    difficulty: 'advanced',
    primaryBodyAreas: ['core'],
    secondaryBodyAreas: ['shoulders', 'hips'],
    benefits: ['Full body challenge', 'Builds power and control', 'Comprehensive conditioning'],
    isActive: true,
    childAsanaNames: [
      'Utkatasana', 'Uttanasana', 'Ardha Uttanasana', 'Phalakasana',
      'Chaturanga Dandasana', 'Urdhva Mukha Svanasana', 'Adho Mukha Svanasana',
      'Utthan Pristhasana', 'Parsvakonasana', 'Vasisthasana',
      'Phalakasana', 'Chaturanga Dandasana',
      'Urdhva Mukha Svanasana', 'Adho Mukha Svanasana',
      'Ardha Uttanasana', 'Uttanasana', 'Utkatasana',
    ],
  },

  // =============================================
  // FLEXIBILITY / RELAXATION VINYASAS
  // =============================================
  {
    name: 'Flexibility Flow',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['hamstrings'],
    secondaryBodyAreas: ['hips', 'spine'],
    benefits: ['Gentle stretching sequence', 'Promotes flexibility', 'Calming'],
    isActive: true,
    childAsanaNames: [
      'Paschimottanasana', 'Baddha Konasana', 'Supta Matsyendrasana',
    ],
  },

  // =============================================
  // WARM-UP VINYASAS
  // =============================================
  {
    name: 'Core Warm-Up Flow',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['core'],
    secondaryBodyAreas: ['shoulders'],
    benefits: ['Warms up core', 'Activates plank muscles', 'Prepares for practice'],
    isActive: true,
    childAsanaNames: [
      'Phalakasana', 'Apanasana', 'Forearm Plank', 'Balasana',
    ],
  },
  {
    name: 'Heart Opening Warm-Up',
    type: 'vinyasa',
    difficulty: 'beginner',
    primaryBodyAreas: ['shoulders'],
    secondaryBodyAreas: ['spine'],
    benefits: ['Opens chest gently', 'Prepares shoulders', 'Energizes upper body'],
    isActive: true,
    childAsanaNames: [
      'Samsthiti', 'Urdhva Hastasana', 'Anahatasana', 'Sphinx Pose',
    ],
  },
  {
    name: 'Warrior I-II Flow',
    type: 'vinyasa',
    difficulty: 'intermediate',
    primaryBodyAreas: ['hips'],
    secondaryBodyAreas: ['shoulders', 'knees'],
    benefits: ['Builds warrior transitions', 'Strengthens legs', 'Opens hips'],
    isActive: true,
    childAsanaNames: [
      'Virabhadrasana I', 'Virabhadrasana II',
    ],
  },
];
