/**
 * Master seed function for session planning data.
 * Creates asanas, vinyasas, surya namaskars, and session plans.
 *
 * Usage: Import and call seedSessionPlanningData() from browser console or app init.
 * It writes directly to localStorage using the same service layer as the app.
 */

import { asanaService, sessionPlanService } from '../services';
import type { Asana, VinyasaItem, SectionItem, SessionPlanSection, IntensityLevel, SectionType } from '../types';
import { SECTION_ORDER } from '../types';
import { SEED_ASANAS } from './seed-asanas';
import { SEED_SURYA_NAMASKARS, SEED_VINYASAS } from './seed-vinyasas';
import type { VinyasaSeed } from './seed-vinyasas';
import { SEED_SESSION_PLANS } from './seed-session-plans';

/** Map of asana name (lowercase) → created Asana ID */
type AsanaMap = Map<string, string>;

function buildAsanaMap(): AsanaMap {
  const map = new Map<string, string>();
  const all = asanaService.getAll();
  for (const a of all) {
    map.set(a.name.toLowerCase(), a.id);
    if (a.sanskritName) {
      map.set(a.sanskritName.toLowerCase(), a.id);
    }
  }
  return map;
}

function resolveAsanaId(name: string, map: AsanaMap): string | null {
  const key = name.toLowerCase().trim();
  return map.get(key) || null;
}

function createVinyasaOrSurya(seed: VinyasaSeed, map: AsanaMap): Asana | null {
  const childAsanas: VinyasaItem[] = [];
  let order = 1;

  for (const childName of seed.childAsanaNames) {
    const id = resolveAsanaId(childName, map);
    if (id) {
      childAsanas.push({ asanaId: id, order: order++ });
    } else {
      console.warn(`[Seed] Child asana not found: "${childName}" in ${seed.name}`);
    }
  }

  try {
    return asanaService.create({
      name: seed.name,
      sanskritName: seed.sanskritName,
      type: seed.type,
      difficulty: seed.difficulty,
      primaryBodyAreas: seed.primaryBodyAreas,
      secondaryBodyAreas: seed.secondaryBodyAreas,
      benefits: seed.benefits,
      contraindications: seed.contraindications || [],
      breathingCue: seed.breathingCue,
      isActive: true,
      childAsanas,
    });
  } catch (e) {
    console.error(`[Seed] Failed to create ${seed.name}:`, e);
    return null;
  }
}

function buildSectionItems(
  items: { asanaName: string; intensity?: IntensityLevel; notes?: string; reps?: number; durationMinutes?: number }[],
  map: AsanaMap
): SectionItem[] {
  const result: SectionItem[] = [];
  let order = 1;

  for (const item of items) {
    const id = resolveAsanaId(item.asanaName, map);
    if (id) {
      result.push({
        asanaId: id,
        order: order++,
        intensity: item.intensity || 'medium',
        notes: item.notes,
        reps: item.reps,
        durationMinutes: item.durationMinutes,
      });
    } else {
      console.warn(`[Seed] Asana not found for plan item: "${item.asanaName}"`);
    }
  }

  return result;
}

export function seedSessionPlanningData(): { asanas: number; vinyasas: number; plans: number; warnings: string[] } {
  const warnings: string[] = [];
  const existingAsanas = asanaService.getAll();
  const existingPlans = sessionPlanService.getAll();

  if (existingAsanas.length > 0 || existingPlans.length > 0) {
    console.warn('[Seed] Session planning data already exists. Skipping seed to avoid duplicates.');
    console.warn(`  Existing: ${existingAsanas.length} asanas, ${existingPlans.length} plans`);
    return { asanas: 0, vinyasas: 0, plans: 0, warnings: ['Data already exists. Clear localStorage first to re-seed.'] };
  }

  console.log('[Seed] Starting session planning data seed...');

  // ========== STEP 1: Create individual asanas ==========
  let asanaCount = 0;
  for (const seed of SEED_ASANAS) {
    try {
      asanaService.create(seed);
      asanaCount++;
    } catch (e) {
      const msg = `Failed to create asana: ${seed.name}`;
      console.error(`[Seed] ${msg}`, e);
      warnings.push(msg);
    }
  }
  console.log(`[Seed] Created ${asanaCount} individual asanas`);

  // Build lookup map
  let map = buildAsanaMap();

  // ========== STEP 2: Create Surya Namaskars ==========
  let suryaCount = 0;
  for (const seed of SEED_SURYA_NAMASKARS) {
    const result = createVinyasaOrSurya(seed, map);
    if (result) suryaCount++;
  }
  console.log(`[Seed] Created ${suryaCount} Surya Namaskars`);

  // Rebuild map to include surya namaskars
  map = buildAsanaMap();

  // ========== STEP 3: Create Vinyasas ==========
  let vinyasaCount = 0;
  for (const seed of SEED_VINYASAS) {
    const result = createVinyasaOrSurya(seed, map);
    if (result) vinyasaCount++;
  }
  console.log(`[Seed] Created ${vinyasaCount} Vinyasas`);

  // Rebuild map to include all vinyasas
  map = buildAsanaMap();

  // ========== STEP 4: Create Session Plans ==========
  let planCount = 0;
  for (const planSeed of SEED_SESSION_PLANS) {
    const sections: SessionPlanSection[] = [];

    for (const sectionSeed of planSeed.sections) {
      const items = buildSectionItems(sectionSeed.items, map);
      sections.push({
        sectionType: sectionSeed.sectionType as SectionType,
        order: SECTION_ORDER[sectionSeed.sectionType as SectionType],
        items,
      });
    }

    try {
      sessionPlanService.create({
        name: planSeed.name,
        description: planSeed.description,
        level: planSeed.level,
        sections,
        isActive: true,
      });
      planCount++;
    } catch (e) {
      const msg = `Failed to create plan: ${planSeed.name}`;
      console.error(`[Seed] ${msg}`, e);
      warnings.push(msg);
    }
  }
  console.log(`[Seed] Created ${planCount} Session Plans`);

  const totalVinyasas = suryaCount + vinyasaCount;
  console.log(`[Seed] ✅ Done! ${asanaCount} asanas, ${totalVinyasas} vinyasas/surya namaskars, ${planCount} plans`);

  return { asanas: asanaCount, vinyasas: totalVinyasas, plans: planCount, warnings };
}
