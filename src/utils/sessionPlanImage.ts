/**
 * Session Plan Image Generator
 * Renders a compact, branded session plan as a JPG image for download/sharing.
 *
 * Uses Canvas 2D API directly for pixel-perfect rendering.
 * Previous html2canvas approach had issues with flex, table-cell, float, and
 * negative margin alignment that could not be fixed reliably.
 */

import type { SectionType } from '../types';

// ============================================
// TYPES
// ============================================

export interface SessionPlanImageItem {
  name: string;
  sanskritName?: string;
  variation?: string;
  durationMinutes?: number;
  reps?: number;
  breathingCue?: 'inhale' | 'exhale' | 'hold';
  isVinyasa: boolean;
  childSteps?: string[];
}

export interface SessionPlanImageSection {
  sectionType: SectionType;
  label: string;
  items: SessionPlanImageItem[];
}

export interface SessionPlanImageData {
  planName: string;
  planLevel: string;
  planDescription?: string;
  sections: SessionPlanImageSection[];
  studioName: string;
  logoData?: string;
  slotTime?: string;
  date?: string;
}

// ============================================
// CONSTANTS
// ============================================

const BRAND = '#4F46E5';
const BRAND_LIGHT = '#EEF2FF';
const W = 360;         // canvas width — matches common phone CSS width
const SCALE = 3;       // 3x retina → 1080px wide JPG (matches most phones)
const PAD = 12;        // horizontal padding
const FONT = 'Segoe UI, Roboto, Helvetica, Arial, sans-serif';

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  beginner: { bg: '#D1FAE5', text: '#065F46' },
  intermediate: { bg: '#FEF3C7', text: '#92400E' },
  advanced: { bg: '#FEE2E2', text: '#991B1B' },
};

const CUE_COLORS: Record<string, { bg: string; text: string }> = {
  inhale: { bg: '#DBEAFE', text: '#2563EB' },
  exhale: { bg: '#F3E8FF', text: '#7C3AED' },
  hold: { bg: '#FFEDD5', text: '#EA580C' },
};

const CUE_ABBREV: Record<string, string> = { inhale: 'In', exhale: 'Ex', hold: 'Ho' };

// Height targets for phone-screen fit:
// JPG = 1080px wide (360×3). On a 1080×1920 phone (16:9), image fills exactly.
// MAX_H = 16:9 ratio → image never exceeds smallest phone screen.
// MIN_H = same → image always fills the screen (extra space at bottom if content is short).
const MAX_H = Math.round(W * 16 / 9);  // 640
const MIN_H = MAX_H;                    // always fill 9:16 screen
const HEADER_H = 34;

// ============================================
// SIZE TIERS
// ============================================

interface Tier {
  title: number;
  section: number;
  item: number;
  pad: number;
  gap: number;
  showSanskrit: boolean;
  maxChild: number;
  maxTitle: number;
  maxDesc: number;
}

function getTier(n: number): Tier {
  if (n <= 8)  return { title: 18, section: 13, item: 13, pad: 4, gap: 5, showSanskrit: true,  maxChild: 42, maxTitle: 30, maxDesc: 45 };
  if (n <= 15) return { title: 17, section: 12, item: 12, pad: 3, gap: 4, showSanskrit: true,  maxChild: 36, maxTitle: 34, maxDesc: 48 };
  if (n <= 22) return { title: 16, section: 11, item: 11, pad: 2, gap: 3, showSanskrit: true,  maxChild: 30, maxTitle: 38, maxDesc: 52 };
  return            { title: 14, section: 10, item: 10, pad: 1, gap: 2, showSanskrit: false, maxChild: 24, maxTitle: 42, maxDesc: 60 };
}

// ============================================
// HELPERS
// ============================================

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').substring(0, 50);
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.substring(0, max - 1) + '…';
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 'normal', italic = false): void {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Wrap text into lines that fit within maxWidth (word-boundary aware) */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Estimate number of wrapped lines without a canvas (for height calculation) */
function estimateChildLines(text: string, fontSize: number, maxWidth: number): number {
  const avgCharW = fontSize * 0.55;
  const charsPerLine = Math.max(1, Math.floor(maxWidth / avgCharW));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

// ============================================
// HEIGHT CALCULATION & AUTO-FIT
// ============================================

function calcHeight(t: Tier, sections: SessionPlanImageSection[], hasDesc: boolean, hasFooter: boolean): number {
  const titleH = t.title + 4;
  const descH = hasDesc ? 15 : 0;
  const sectionH = t.section + 5;
  const itemH = t.item + 4 + t.pad * 2;
  const childFont = t.item - 1;
  const childLineH = childFont + 2;
  const childAvailW = W - PAD * 2 - 22;

  let h = HEADER_H + 4 + titleH + descH + 2;
  for (const sec of sections) {
    if (sec.items.length === 0) continue;
    h += sectionH;
    h += sec.items.length * itemH;
    h += Math.max(0, sec.items.length - 1); // separators
    // Extra height for vinyasa child step wrapping
    for (const item of sec.items) {
      if (item.isVinyasa && sec.sectionType !== 'SURYA_NAMASKARA' && item.childSteps && item.childSteps.length > 0) {
        const flow = item.childSteps.join(' → ');
        h += estimateChildLines(flow, childFont, childAvailW) * childLineH;
      }
    }
    h += t.gap;
  }
  if (hasFooter) h += 16;
  h += 6;
  return h;
}

/** Progressively compress tier until content fits MAX_H */
function fitToScreen(t: Tier, sections: SessionPlanImageSection[], hasDesc: boolean, hasFooter: boolean): void {
  // Step 1: reduce padding
  while (t.pad > 0 && calcHeight(t, sections, hasDesc, hasFooter) > MAX_H) {
    t.pad--;
  }
  // Step 2: reduce section gap
  while (t.gap > 0 && calcHeight(t, sections, hasDesc, hasFooter) > MAX_H) {
    t.gap--;
  }
  // Step 3: reduce font sizes (minimum 5px)
  while (t.item > 5 && calcHeight(t, sections, hasDesc, hasFooter) > MAX_H) {
    t.item--;
    t.section = Math.max(5, t.section - 1);
    t.title = Math.max(7, t.title - 1);
  }
}

// ============================================
// MAIN EXPORT
// ============================================

export async function downloadSessionPlanAsJPG(data: SessionPlanImageData): Promise<void> {
  const totalItems = data.sections.reduce((sum, s) => sum + s.items.length, 0);
  const t = getTier(totalItems);
  const hasDesc = !!(data.planDescription && totalItems < 20);
  const hasFooter = !!(data.date || data.slotTime);

  // Auto-compress tier so image fits on mobile screen
  fitToScreen(t, data.sections, hasDesc, hasFooter);

  // Load logo
  const logo = data.logoData ? await loadImage(data.logoData) : null;

  // ---- Sizing derived from (possibly compressed) tier ----
  const titleH = t.title + 4;
  const sectionH = t.section + 5;
  const itemH = t.item + 4 + t.pad * 2;

  const totalH = Math.max(calcHeight(t, data.sections, hasDesc, hasFooter), MIN_H);

  // ---- Create canvas ----
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = Math.ceil(totalH * SCALE);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, totalH);

  let y = 0;

  // ================================================================
  // HEADER BAR
  // ================================================================
  ctx.fillStyle = BRAND;
  ctx.fillRect(0, 0, W, HEADER_H);
  const hcy = HEADER_H / 2; // vertical center

  let hx = PAD;

  // Logo
  if (logo) {
    const ls = 21;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, hx, hcy - ls / 2, ls, ls, 2);
    ctx.fill();
    ctx.drawImage(logo, hx, hcy - ls / 2, ls, ls);
    hx += ls + 5;
  }

  // Studio name
  ctx.fillStyle = '#ffffff';
  setFont(ctx, 14, '600');
  ctx.textBaseline = 'middle';
  ctx.fillText(truncate(data.studioName, 22), hx, hcy);

  // Level badge (right side)
  const lc = LEVEL_COLORS[data.planLevel] || LEVEL_COLORS.beginner;
  const lvlText = data.planLevel.charAt(0).toUpperCase() + data.planLevel.slice(1);
  setFont(ctx, 11, '600');
  const lvlW = ctx.measureText(lvlText).width + 10;
  const lvlH = 18;
  const lvlX = W - PAD - lvlW;
  const lvlY = hcy - lvlH / 2;
  ctx.fillStyle = lc.bg;
  roundRect(ctx, lvlX, lvlY, lvlW, lvlH, 2);
  ctx.fill();
  ctx.fillStyle = lc.text;
  ctx.textBaseline = 'middle';
  ctx.fillText(lvlText, lvlX + 4, hcy);

  y = HEADER_H + 4;

  // ================================================================
  // WATERMARK (behind content)
  // ================================================================
  if (logo) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    const ws = 120;
    ctx.drawImage(logo, W / 2 - ws / 2, totalH / 2 - ws / 2, ws, ws);
    ctx.restore();
  }

  // ================================================================
  // TITLE
  // ================================================================
  ctx.fillStyle = '#111827';
  setFont(ctx, t.title, 'bold');
  ctx.textBaseline = 'top';
  ctx.fillText(truncate(data.planName, t.maxTitle), PAD, y);
  y += titleH;

  // ================================================================
  // DESCRIPTION
  // ================================================================
  if (hasDesc && data.planDescription) {
    ctx.fillStyle = '#6B7280';
    setFont(ctx, 11, 'normal', true);
    ctx.textBaseline = 'top';
    ctx.fillText(`— ${truncate(data.planDescription, t.maxDesc)}`, PAD, y);
    y += 15;
  }

  y += 2; // gap

  // ================================================================
  // SECTIONS
  // ================================================================
  for (const sec of data.sections) {
    if (sec.items.length === 0) continue;

    // ---- Section header ----
    const shY = y;
    // Background
    ctx.fillStyle = BRAND_LIGHT;
    ctx.fillRect(PAD + 3, shY, W - PAD * 2 - 3, sectionH);
    // Left border
    ctx.fillStyle = BRAND;
    ctx.fillRect(PAD, shY, 3, sectionH);
    // Label
    const shCy = shY + sectionH / 2;
    ctx.fillStyle = '#1E1B4B';
    setFont(ctx, t.section, '600');
    ctx.textBaseline = 'middle';
    ctx.fillText(sec.label, PAD + 8, shCy);
    // Count
    ctx.fillStyle = '#6366F1';
    setFont(ctx, t.section - 1);
    const cntText = `(${sec.items.length})`;
    const cntW = ctx.measureText(cntText).width;
    ctx.fillText(cntText, W - PAD - cntW, shCy);

    y += sectionH;

    // ---- Items ----
    for (let i = 0; i < sec.items.length; i++) {
      const item = sec.items[i];

      // Separator line (before item, except first)
      if (i > 0) {
        ctx.strokeStyle = '#F3F4F6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD + 4, y + 0.5);
        ctx.lineTo(W - PAD, y + 0.5);
        ctx.stroke();
        y += 1;
      }

      const cy = y + itemH / 2; // vertical center of row

      // ---- Right side (draw first so we know available width) ----
      let rx = W - PAD; // right edge cursor

      // Duration/reps
      const durParts = [
        item.durationMinutes ? `${item.durationMinutes}m` : '',
        item.reps ? `${item.reps}x` : '',
      ].filter(Boolean);
      const durText = durParts.join(' ');

      if (durText) {
        ctx.fillStyle = '#4F46E5';
        setFont(ctx, t.item - 1, '500');
        const dw = ctx.measureText(durText).width;
        rx -= dw;
        ctx.textBaseline = 'middle';
        ctx.fillText(durText, rx, cy);
        rx -= 3;
      }

      // Breathing cue badge
      if (item.breathingCue) {
        const cc = CUE_COLORS[item.breathingCue] || CUE_COLORS.inhale;
        const ct = CUE_ABBREV[item.breathingCue] || '';
        setFont(ctx, t.item - 2, '600');
        const cw = ctx.measureText(ct).width;
        const bw = cw + 4;
        const bh = t.item;
        rx -= bw;
        // Badge bg
        ctx.fillStyle = cc.bg;
        roundRect(ctx, rx, cy - bh / 2, bw, bh, 2);
        ctx.fill();
        // Badge text
        ctx.fillStyle = cc.text;
        ctx.textBaseline = 'middle';
        ctx.fillText(ct, rx + 2, cy);
        rx -= 3;
      }

      // ---- Left side ----
      const nameMaxX = rx - 2; // max x for name text

      // Row number
      ctx.fillStyle = '#4F46E5';
      setFont(ctx, t.item - 1, '600');
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}.`, PAD + 3, cy);

      let nx = PAD + 20; // name start x

      const showChild = item.isVinyasa && sec.sectionType !== 'SURYA_NAMASKARA';

      if (item.isVinyasa) {
        // Vinyasa name (pink)
        ctx.fillStyle = '#DB2777';
        setFont(ctx, t.item, '500');
        ctx.fillText(item.name, nx, cy);
        nx += ctx.measureText(item.name).width;

      } else {
        // Regular name
        ctx.fillStyle = '#1F2937';
        setFont(ctx, t.item, '500');
        ctx.fillText(item.name, nx, cy);
        nx += ctx.measureText(item.name).width;

        // Sanskrit name (italic gray) - skip if same as main name
        if (t.showSanskrit && item.sanskritName && item.sanskritName !== item.name && nx < nameMaxX - 20) {
          const sText = ` (${item.sanskritName})`;
          ctx.fillStyle = '#6B7280';
          setFont(ctx, t.item, 'normal', true);
          ctx.fillText(sText, nx, cy);
          nx += ctx.measureText(sText).width;
        }

        // Variation
        if (item.variation && nx < nameMaxX - 20) {
          const vText = ` • ${item.variation}`;
          ctx.fillStyle = '#7C3AED';
          setFont(ctx, t.item - 1);
          ctx.fillText(vText, nx, cy);
        }
      }

      y += itemH;

      // Wrapped child steps below vinyasa name
      if (showChild && item.childSteps && item.childSteps.length > 0) {
        const flow = item.childSteps.join(' → ');
        const childFont = t.item - 1;
        setFont(ctx, childFont);
        ctx.fillStyle = '#6B7280';
        ctx.textBaseline = 'top';
        const childX = PAD + 22;
        const childMaxW = W - PAD - childX;
        const lines = wrapText(ctx, flow, childMaxW);
        const childLineH = childFont + 2;
        for (const line of lines) {
          ctx.fillText(line, childX, y);
          y += childLineH;
        }
      }
    }

    y += t.gap;
  }

  // ================================================================
  // FOOTER
  // ================================================================
  if (hasFooter) {
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y + 0.5);
    ctx.lineTo(W - PAD, y + 0.5);
    ctx.stroke();
    y += 4;

    ctx.fillStyle = '#9CA3AF';
    setFont(ctx, 11);
    ctx.textBaseline = 'top';
    const ft = [data.date, data.slotTime].filter(Boolean).join(' · ');
    const ftw = ctx.measureText(ft).width;
    ctx.fillText(ft, (W - ftw) / 2, y);
  }

  // ================================================================
  // EXPORT JPEG
  // ================================================================
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to create image'))),
      'image/jpeg',
      0.92
    );
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(data.planName)}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
